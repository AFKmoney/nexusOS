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
import { aiGateway, type AITool } from '../services/aiProviders';
import { useOS } from '../store/osStore';
import { toolForge } from './toolForge';
import { memory } from './memory';

const GOALS_FILE = '/system/.daemon/autopilot_goals.json';
const REFLECTIONS_FILE = '/system/.daemon/autopilot_reflections.txt';
const MAX_GOAL_TURNS = 10; // tool-loop turns per step (hard cap)

export interface GoalStep {
  description: string;
  status: 'pending' | 'done' | 'failed';
  result?: string;
}

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
  plan?: GoalStep[];         // structured decomposition for multi-step autonomy
  currentStepIndex?: number; // which plan step we're on
}

/** Pure, testable outcome classifier for a model turn. */
export type GoalOutcome = 'complete' | 'failed' | 'continue';
export function detectGoalOutcome(text: string): GoalOutcome {
  const t = text || '';
  if (/GOAL[:_-]?COMPLETE/i.test(t)) return 'complete';
  if (/GOAL[:_-]?FAILED/i.test(t)) return 'failed';
  if (/STEP[\s:_-]+COMPLETE/i.test(t) || /STEP[\s:_-]+DONE/i.test(t)) return 'complete';
  return 'continue';
}
export function extractFailure(text: string): string {
  return text.match(/GOAL(?:_|:|-)\s*FAILED[:]?\s*([^\n]+)/i)?.[1] || 'Unknown failure';
}

export interface AutoPilotState {
  enabled: boolean;
  currentGoalId?: string;
  tickCount: number;
  lastTickAt?: number;
  totalCompleted: number;
  totalFailed: number;
}

export class AutoPilotEngine {
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
            if (Array.isArray(g.plan)) reset.plan = g.plan;
            if (typeof g.currentStepIndex === 'number') reset.currentStepIndex = g.currentStepIndex;
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

  /** Attach a structured plan (list of steps) to a goal. */
  async planGoal(id: string, steps: string[]): Promise<boolean> {
    await this.load();
    const goal = this.goals.find(g => g.id === id);
    if (!goal) return false;
    goal.plan = (steps || [])
      .map(s => String(s).trim())
      .filter(Boolean)
      .map(description => ({ description, status: 'pending' as const }));
    goal.currentStepIndex = 0;
    this.persist();
    eventBus.emit('autopilot:goal-planned', goal);
    return true;
  }

  getPlan(id: string): GoalStep[] | undefined {
    return this.goals.find(g => g.id === id)?.plan;
  }

  /** Parse a plan the AI returned as JSON (testable, pure-ish). */
  static parsePlan(text: string): string[] {
    try {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) return [];
      const parsed = JSON.parse(m[0]);
      if (Array.isArray(parsed.steps)) return parsed.steps.map((s: any) => typeof s === 'string' ? s : (s?.description || ''));
      if (Array.isArray(parsed.plan)) return parsed.plan.map((s: any) => typeof s === 'string' ? s : (s?.description || ''));
    } catch { /* fall through */ }
    return [];
  }

  /**
   * Run ONE goal via a bounded multi-turn tool-using loop. Unlike the legacy
   * single-shot path, this actually executes the model's OS:: / MCP tool calls
   * and feeds results back so the AI can work a goal step-by-step instead of
   * one-shot. This is what makes AutoPilot autonomous rather than just chatty.
   *
   * `opts` lets callers inject a custom generator (tests) and tune budgets.
   */
  async executeGoal(
    goal: Goal,
    opts: {
      generate?: (systemPrompt: string, userPrompt: string, tools: AITool[]) => Promise<{ text: string; toolCalls: any[] }>;
      maxTurns?: number;
      maxChars?: number;
    } = {},
  ): Promise<{ outcome: GoalOutcome; text: string; transcript: string }> {
    const maxTurns = opts.maxTurns ?? MAX_GOAL_TURNS;
    const generate = opts.generate ?? (async (sys, usr, tools) => {
      const r = await aiGateway.generateWithTools(sys, usr, tools);
      return { text: r.text, toolCalls: r.toolCalls };
    });
    const maxChars = opts.maxChars ?? 4000;

    let tools: AITool[] = [];
    try {
      const { getOsActionTools } = await import('./aiTools');
      const { mcpBridge } = await import('./mcpBridge');
      tools = [...getOsActionTools(), ...mcpBridge.getToolDefinitions()];
    } catch { /* tools optional-fallback */ }

    const step = goal.plan?.[goal.currentStepIndex ?? 0];
    let transcript = '';
    let turn = 0;
    let lastText = '';

    while (turn < maxTurns) {
      const systemPrompt = this.buildGoalPrompt(goal, step?.description);
      const userPrompt = this.buildGoalStepPrompt(goal, step, transcript);
      // eslint-disable-next-line no-await-in-loop
      const { text, toolCalls } = await generate(systemPrompt, userPrompt, tools);
      lastText = text || '';
      transcript += `\n[AI] ${lastText}\n`;
      turn++;

      const outcome = detectGoalOutcome(lastText);
      if (outcome !== 'continue') {
        return { outcome, text: lastText, transcript };
      }

      // Execute the model's tool calls (real autonomy — it acts on the OS).
      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        // eslint-disable-next-line no-await-in-loop
        const results = await toolForge.executeToolCalls(toolCalls as any);
        if (results) transcript += `\n[TOOL RESULTS]\n${results.slice(0, maxChars)}\n`;
      } else {
        // Honor text-emitted OS:: lines too (some providers prefer that path).
        // eslint-disable-next-line no-await-in-loop
        const osResults = await toolForge.executeOsActions(lastText);
        if (osResults) transcript += `\n[TOOL RESULTS]\n${osResults.slice(0, maxChars)}\n`;
      }
    }

    return { outcome: 'continue', text: lastText, transcript };
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

    // Long-term mission memory: persist a compact summary so future AutoPilot
    // sessions recall what was done (semantic recall via memory.remember).
    try {
      memory.remember(
        `AUTOPILOT MISSION DONE: "${goal.description}" — ${(result || '(no result)').slice(0, 300)}`,
        ['mission', 'autopilot', 'goal-' + goal.id],
        'semantic',
        0.7,
      );
    } catch { /* non-fatal */ }

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
    try {
      memory.remember(
        `AUTOPILOT MISSION FAILED: "${goal.description}" — ${error.slice(0, 300)}`,
        ['mission', 'autopilot', 'goal-' + goal.id],
        'semantic',
        0.5,
      );
    } catch { /* non-fatal */ }
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

      // If the goal has no plan yet, ask the model to decompose it into steps.
      if (!goal.plan && goal.attempts <= 2) {
        try {
          const planText = await this.generatePlan(goal);
          const steps = AutoPilotEngine.parsePlan(planText);
          if (steps.length > 0) {
            await this.planGoal(goal.id, steps);
            const planned = this.getPlan(goal.id);
            if (planned) goal.plan = planned;
            useOS.getState().addAutonomyLog(`◈ AutoPilot: planned "${goal.description}" into ${steps.length} step(s)`);
          }
        } catch (e: any) {
          kernelLog.warn('[AutoPilot] plan generation failed:', e?.message);
        }
      }

      // Drive the goal through the tool-using loop (real autonomy).
      const { outcome, text } = await this.executeGoal(goal);

      if (outcome === 'failed') {
        const errorMsg = extractFailure(text);
        await this.failGoal(goal.id, errorMsg);
        useOS.getState().addAutonomyLog(`◈ AutoPilot: goal "${goal.description}" FAILED: ${errorMsg}`);
      } else if (outcome === 'complete') {
        // Mark the current step done and advance through a multi-step plan.
        const plan = goal.plan;
        if (plan) {
          const stepIdx = goal.currentStepIndex ?? 0;
          const step = plan[stepIdx];
          if (step) {
            step.status = 'done';
            step.result = text.slice(0, 500);
            goal.currentStepIndex = stepIdx + 1;
            this.persist();
            if (goal.currentStepIndex < plan.length) {
              // More steps remain - back to pending so the next tick continues.
              useOS.getState().addAutonomyLog(`◈ AutoPilot: step ${goal.currentStepIndex}/${plan.length} of "${goal.description}" done; continuing`);
              goal.status = 'pending';
              this.persist();
              delete this.state.currentGoalId;
              return;
            }
          }
        }
        await this.completeGoal(goal.id, text.slice(0, 2000));
        useOS.getState().addAutonomyLog(`◈ AutoPilot: goal "${goal.description}" COMPLETE`);
      } else {
        // 'continue' = hit the turn cap; record what we have and finish.
        await this.completeGoal(goal.id, text.slice(0, 2000));
        useOS.getState().addAutonomyLog(`◈ AutoPilot: goal "${goal.description}" done (turn limit)`);
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

  /** Build the system prompt. Optionally scoped to a current plan step, and
   *  pulling goal-linked + semantically-relevant long-term memory (not just
   *  the most recent 5 entries). */
  private buildGoalPrompt(goal: Goal, stepDescription?: string): string {
    let recalled: string[] = [];
    try {
      recalled = memory.recall(goal.description, 1200).map(m => m.content.slice(0, 200));
    } catch { /* fall back to recent */ }
    if (recalled.length === 0) recalled = memory.getRecent(5).map(m => m.content.slice(0, 200));
    const recentMem = recalled.join('\n- ') || 'None';
    const otherGoals = this.goals
      .filter(g => g.id !== goal.id && g.status === 'pending')
      .slice(0, 5)
      .map(g => `  • ${g.description} (${g.priority})`)
      .join('\n') || 'None';
    const stepInfo = stepDescription
      ? `[CURRENT STEP ${(goal.currentStepIndex ?? 0) + 1}/${goal.plan?.length ?? '?'}]:\n${stepDescription}`
      : '';

    return `[AUTOPILOT MODE] You are NexusOS AI running in autonomous mode.

CURRENT GOAL (attempt ${goal.attempts}):
${goal.description}
${stepInfo}

You have full OS access and can call tools. Actually EXECUTE OS:: actions, do not merely describe them.
- When the goal (or current step) is done, output a line "GOAL_COMPLETE" (optionally with a summary).
- If you cannot complete it after this attempt, output "GOAL_FAILED: <reason>".

CONTEXT:
- Relevant memory: ${recentMem}
- Other pending goals:\n${otherGoals}
- OS state: ${useOS.getState().windows.length} windows open, ${useOS.getState().registry.length} apps installed

STRATEGY:
1. Plan: decompose the goal into 1-3 concrete steps.
2. Execute each step using OS:: actions/tools.
3. Verify the result.
4. Output GOAL_COMPLETE or GOAL_FAILED.

Begin now.`;
  }

  /** Build the per-turn user prompt, which carries the tool-execution transcript
   *  so the model sees the results of the OS:: actions it already issued. */
  private buildGoalStepPrompt(goal: Goal, step: GoalStep | undefined, transcript: string): string {
    const stepNum = (goal.currentStepIndex ?? 0) + 1;
    const total = goal.plan?.length ?? '?';
    return `Step ${stepNum}/${total} for goal "${goal.description}".

${step ? `Current step: ${step.description}` : 'Work directly toward the goal.'}

Call tools / OS:: actions to make real progress. Your previous turns and their results:
${transcript || '(no transcript yet)'}

Continuing now. Do not repeat work already done. Output GOAL_COMPLETE when finished.`;
  }

  /** Ask the model to decompose a goal into concrete, ordered steps (JSON). */
  private async generatePlan(goal: Goal): Promise<string> {
    const sys = `[AUTOPILOT PLANNER] Decompose the following goal into 2-4 concrete, ordered, executable steps.
Return ONLY JSON of the form {"steps": ["...", "..."]}. No prose.`;
    const usr = `Goal: ${goal.description}`;
    const { text } = await aiGateway.generateWithTools(sys, usr, []);
    return text;
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
