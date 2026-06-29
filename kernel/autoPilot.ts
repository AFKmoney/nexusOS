// ═══════════════════════════════════════════════════════════════════
// AUTOPILOT — Continuous autonomy loop with goal queue + self-prompting
//
// The AI's "always-on" mode. AutoPilot maintains a persistent goal
// queue, picks the next goal, generates a plan, executes it, and
// marks complete/failed. Goals persist in VFS at
// /system/.daemon/autopilot_goals.json so they survive restarts.
//
// AutoPilot is OFF by default. Engage via OS::SET_AUTOPILOT:on.
// ═══════════════════════════════════════════════════════════════════

import { vfs, SYSTEM_VFS_APP_ID } from './fileSystem';
import { eventBus } from './eventBus';
import { humanOverride } from './humanOverride';
import { autonomyEventLog } from './autonomyEventLog';
import { kernelLog } from './log';
import { aiService } from '../services/puterService';
import { useOS } from '../store/osStore';
import { memory } from './memory';

const GOALS_FILE = '/system/.daemon/autopilot_goals.json';
const REFLECTIONS_FILE = '/system/.daemon/autopilot_reflections.txt';

export interface Goal {
  id: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  attempts: number;
  lastError?: string;
  result?: string;
  recurring?: 'none' | 'hourly' | 'daily' | 'weekly';
}

export interface AutoPilotState {
  enabled: boolean;
  currentGoalId?: string;
  tickCount: number;
  lastTickAt?: number;
  totalCompleted: number;
  totalFailed: number;
}

class AutoPilotEngine {
  private goals: Goal[] = [];
  private state: AutoPilotState = {
    enabled: false,
    tickCount: 0,
    totalCompleted: 0,
    totalFailed: 0,
  };
  private intervalId: ReturnType<typeof setTimeout> | null = null;
  private isLoaded = false;
  private isTicking = false;

  async load(): Promise<void> {
    if (this.isLoaded) return;
    this.isLoaded = true;
    try {
      const raw = vfs.readFile(GOALS_FILE, SYSTEM_VFS_APP_ID);
      if (raw) {
        const parsed = JSON.parse(raw) as Goal[];
        if (Array.isArray(parsed)) {
          // Reset in-progress goals to pending (they were interrupted)
          this.goals = parsed.map(g => {
            const reset: Goal = {
              id: g.id,
              description: g.description,
              status: g.status === 'in-progress' ? 'pending' : g.status,
              priority: g.priority,
              createdAt: g.createdAt,
              attempts: g.attempts,
            };
            if (g.completedAt !== undefined) reset.completedAt = g.completedAt;
            if (g.lastError !== undefined) reset.lastError = g.lastError;
            if (g.result !== undefined) reset.result = g.result;
            if (g.recurring !== undefined) reset.recurring = g.recurring;
            return reset;
          });
        }
      }
    } catch (e: any) {
      kernelLog.warn('[AutoPilot] Load failed:', e?.message);
    }
  }

  private persist(): void {
    try {
      const dir = '/system/.daemon';
      if (!vfs.stat(dir)) {
        vfs.createDirRecursive(dir, SYSTEM_VFS_APP_ID);
      }
      vfs.writeFile(GOALS_FILE, JSON.stringify(this.goals, null, 2), SYSTEM_VFS_APP_ID);
    } catch (e: any) {
      kernelLog.warn('[AutoPilot] Persist failed:', e?.message);
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    await this.load();
    if (enabled === this.state.enabled) return;
    this.state.enabled = enabled;
    if (enabled) {
      autonomyEventLog.append({
        kind: 'override-deactivated',
        subsystem: 'autopilot',
        actor: 'user',
        summary: 'AutoPilot engaged. AI will now self-prompt on the goal queue.',
      });
      useOS.getState().addAutonomyLog('◈ AutoPilot ENGAGED. AI self-prompting active.');
      this.scheduleTick(5000);
    } else {
      if (this.intervalId) {
        clearTimeout(this.intervalId);
        this.intervalId = null;
      }
      autonomyEventLog.append({
        kind: 'override-activated',
        subsystem: 'autopilot',
        actor: 'user',
        summary: 'AutoPilot disengaged.',
      });
      useOS.getState().addAutonomyLog('◈ AutoPilot DISENGAGED.');
    }
  }

  isEnabled(): boolean {
    return this.state.enabled;
  }

  getState(): AutoPilotState {
    return { ...this.state };
  }

  async addGoal(description: string, priority: Goal['priority'] = 'normal', recurring: Goal['recurring'] = 'none'): Promise<Goal> {
    await this.load();
    const goal: Goal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description,
      status: 'pending',
      priority,
      createdAt: Date.now(),
      attempts: 0,
      recurring,
    };
    this.goals.push(goal);
    this.persist();
    eventBus.emit('autopilot:goal-added', goal);
    return goal;
  }

  async completeGoal(id: string, result?: string): Promise<boolean> {
    await this.load();
    const goal = this.goals.find(g => g.id === id);
    if (!goal) return false;
    goal.status = 'completed';
    goal.completedAt = Date.now();
    if (result !== undefined) goal.result = result;
    this.state.totalCompleted++;
    this.persist();
    eventBus.emit('autopilot:goal-completed', goal);

    if (goal.recurring && goal.recurring !== 'none') {
      const next: Goal = {
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: goal.description,
        status: 'pending',
        priority: goal.priority,
        createdAt: Date.now(),
        attempts: 0,
        recurring: goal.recurring,
      };
      this.goals.push(next);
    }
    return true;
  }

  async failGoal(id: string, error: string): Promise<boolean> {
    await this.load();
    const goal = this.goals.find(g => g.id === id);
    if (!goal) return false;
    goal.status = 'failed';
    goal.lastError = error;
    goal.attempts++;
    this.state.totalFailed++;
    this.persist();
    eventBus.emit('autopilot:goal-failed', goal);
    return true;
  }

  async cancelGoal(id: string): Promise<boolean> {
    await this.load();
    const goal = this.goals.find(g => g.id === id);
    if (!goal) return false;
    goal.status = 'cancelled';
    this.persist();
    return true;
  }

  getGoals(filter?: Goal['status']): Goal[] {
    if (filter) return this.goals.filter(g => g.status === filter);
    return [...this.goals];
  }

  private scheduleTick(delayMs?: number): void {
    if (!this.state.enabled) return;
    if (this.intervalId) clearTimeout(this.intervalId);
    const delay = delayMs ?? this.calculateDelay();
    this.intervalId = setTimeout(() => {
      this.tick().catch(err => {
        kernelLog.error('[AutoPilot] tick failed:', err);
      }).finally(() => {
        this.scheduleTick();
      });
    }, delay);
  }

  private calculateDelay(): number {
    const pendingCount = this.goals.filter(g => g.status === 'pending').length;
    if (pendingCount === 0) return 300_000;
    if (pendingCount > 5) return 60_000;
    return 120_000;
  }

  private async tick(): Promise<void> {
    if (!this.state.enabled) return;
    if (this.isTicking) return;
    if (!humanOverride.isAutonomyEnabled) {
      kernelLog.info('[AutoPilot] Skipped tick — humanOverride inactive');
      return;
    }

    this.isTicking = true;
    this.state.tickCount++;
    this.state.lastTickAt = Date.now();

    try {
      await this.load();
      const pending = this.goals
        .filter(g => g.status === 'pending')
        .sort((a, b) => {
          const prio = { critical: 0, high: 1, normal: 2, low: 3 };
          const pDiff = prio[a.priority] - prio[b.priority];
          if (pDiff !== 0) return pDiff;
          return a.createdAt - b.createdAt;
        });

      if (pending.length === 0) {
        await this.reflect();
        return;
      }

      const goal = pending[0];
      if (!goal) return;
      goal.status = 'in-progress';
      goal.startedAt = Date.now();
      goal.attempts++;
      this.state.currentGoalId = goal.id;
      this.persist();

      useOS.getState().addAutonomyLog(`◈ AutoPilot: working on "${goal.description}" (attempt ${goal.attempts})`);

      const systemPrompt = this.buildGoalPrompt(goal);
      const os = useOS.getState();
      const result = await aiService.generateOnce(systemPrompt, os.kernelRules, 'architect');

      if (result.includes('GOAL_COMPLETE') || result.includes('GOAL:COMPLETE')) {
        await this.completeGoal(goal.id, result.slice(0, 2000));
        useOS.getState().addAutonomyLog(`◈ AutoPilot: goal "${goal.description}" COMPLETE`);
      } else if (result.includes('GOAL_FAILED') || result.includes('GOAL:FAILED')) {
        const errorMsg = result.match(/GOAL(?:_|\:)FAILED:?\s*([^\n]+)/i)?.[1] || 'Unknown failure';
        await this.failGoal(goal.id, errorMsg);
        useOS.getState().addAutonomyLog(`◈ AutoPilot: goal "${goal.description}" FAILED: ${errorMsg}`);
      } else {
        await this.completeGoal(goal.id, result.slice(0, 2000));
        useOS.getState().addAutonomyLog(`◈ AutoPilot: goal "${goal.description}" done (ambiguous result)`);
      }
    } catch (e: any) {
      kernelLog.error('[AutoPilot] Tick error:', e?.message);
      const goalId = this.state.currentGoalId;
      if (goalId) {
        await this.failGoal(goalId, e?.message || 'Tick error');
      }
    } finally {
      delete this.state.currentGoalId;
      this.isTicking = false;
    }
  }

  private buildGoalPrompt(goal: Goal): string {
    const recentMem = memory.getRecent(5).map(m => m.content.slice(0, 200)).join('\n- ') || 'None';
    const otherGoals = this.goals
      .filter(g => g.id !== goal.id && g.status === 'pending')
      .slice(0, 5)
      .map(g => `  • ${g.description} (${g.priority})`)
      .join('\n') || 'None';

    return `[AUTOPILOT MODE] You are NexusOS AI running in autonomous mode.

CURRENT GOAL (attempt ${goal.attempts}):
${goal.description}

You have full OS access. Use OS:: actions to complete the goal.
- When the goal is done, output a line "GOAL_COMPLETE" (optionally with a summary).
- If you cannot complete it after this attempt, output "GOAL_FAILED: <reason>".

CONTEXT:
- Recent memory: ${recentMem}
- Other pending goals:\n${otherGoals}
- OS state: ${useOS.getState().windows.length} windows open, ${useOS.getState().registry.length} apps installed

STRATEGY:
1. Plan: decompose the goal into 1-3 concrete steps.
2. Execute each step using OS:: actions.
3. Verify the result.
4. Output GOAL_COMPLETE or GOAL_FAILED.

Begin now.`;
  }

  private async reflect(): Promise<void> {
    try {
      const recentMem = memory.getRecent(10).map(m => m.content.slice(0, 100)).join('\n- ') || 'None';
      const completedGoals = this.goals.filter(g => g.status === 'completed').length;
      const failedGoals = this.goals.filter(g => g.status === 'failed').length;
      const os = useOS.getState();

      const prompt = `[AUTOPILOT REFLECTION]
You have ${completedGoals} completed goals, ${failedGoals} failed goals, and no pending goals.
Recent memory:
- ${recentMem}

Write ONE concrete improvement directive for the next AutoPilot session. Be specific:
- What should the AI proactively do next?
- What skill should it forge?
- What should it remember?
- What system pattern did it observe?

Output a single 2-3 sentence directive, nothing else.`;

      const reflection = await aiService.generateOnce(prompt, os.kernelRules, 'chat');

      const dir = '/system/.daemon';
      if (!vfs.stat(dir)) vfs.createDirRecursive(dir, SYSTEM_VFS_APP_ID);
      const existing = vfs.readFile(REFLECTIONS_FILE, SYSTEM_VFS_APP_ID) || '';
      const timestamp = new Date().toISOString();
      const newEntry = `\n--- ${timestamp} ---\n${reflection.trim()}\n`;
      vfs.writeFile(REFLECTIONS_FILE, existing + newEntry, SYSTEM_VFS_APP_ID);

      const parts = (existing + newEntry).split(/^--- /m);
      if (parts.length > 50) {
        const trimmed = '--- ' + parts.slice(-50).join('--- ');
        vfs.writeFile(REFLECTIONS_FILE, trimmed, SYSTEM_VFS_APP_ID);
      }

      useOS.getState().addAutonomyLog('◈ AutoPilot: idle-time reflection written');
    } catch (e: any) {
      kernelLog.warn('[AutoPilot] Reflection failed:', e?.message);
    }
  }

  getReflections(): string {
    return vfs.readFile(REFLECTIONS_FILE, SYSTEM_VFS_APP_ID) || '';
  }
}

export const autoPilot = new AutoPilotEngine();
