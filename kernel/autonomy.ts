
import { aiService } from '../services/puterService';
import { commander } from './commander';
import { vfs } from './fileSystem';
import { memory } from './memory';
import { useOS } from '../store/osStore';
import { processManager } from './processManager';
import { eventBus, OS_EVENTS } from './eventBus';

// ═══════════════════════════════════════════════════════════════════
// DAEMON AUTONOMY ENGINE v2.0 — Event-Driven Neural Substrate
// Context-aware priority queue, mission chaining, self-learning
// ═══════════════════════════════════════════════════════════════════

// ─── Mission Pool ─────────────────────────────────────────────────────────────
// Each mission is weighted dynamically based on system context.
interface Mission {
  id: string;
  trigger: string;
  weight: (state: SystemSnapshot) => number; // 0-1, higher = more likely
  prompt: (state: SystemSnapshot) => string;
}

interface SystemSnapshot {
  desktop: string[];
  docs: string[];
  apps: string;
  registry: number;
  windows: number;
  memory: string;
  recentEvents: string[];
  cwd: string;
  uptime: number;
  ramUsageGB: number;
  ramLimitGB: number;
}

const MISSION_POOL: Mission[] = [
  {
    id: 'OOM_PREVENTION',
    trigger: 'high_memory',
    weight: (state) => {
      // Return 1.0 (Critical) if memory > 85%, else 0
      return (state.ramUsageGB / state.ramLimitGB) > 0.85 ? 1.0 : 0.0;
    },
    prompt: (state) => `[MISSION: OOM_PREVENTION]
CRITICAL ALERT: System memory is at ${Math.floor((state.ramUsageGB / state.ramLimitGB)*100)}% capacity (${state.ramUsageGB.toFixed(2)}GB / ${state.ramLimitGB.toFixed(2)}GB).

Active windows: ${state.windows}

You MUST analyze the system and close non-essential background applications immediately to prevent kernel panic.
Command to execute: "OS::CLOSE_WINDOW:windowId" (Wait, use standard shell commands if possible to gracefully kill processes or use OS::CLOSE_WINDOW).
Take ACTION now to free memory.`,
  },
  {
    id: 'SCAN_ORGANIZE',
    trigger: 'always',
    weight: (state) => state.desktop.length > 5 ? 0.9 : 0.3,
    prompt: (state) => `[MISSION: SCAN_AND_ORGANIZE]
Desktop files: ${state.desktop.join(', ') || 'None'}
Installed apps: ${state.apps}
System docs: ${state.docs.join(', ') || 'None'}

Analyze the desktop. If it's disorganized or has >5 files, plan to organize them.
If a critical app is missing (Dashboard, Calendar, Notes), decide to build it.
Otherwise, identify the single most valuable proactive action you can take right now.`,
  },
  {
    id: 'BUILD_UTILITY',
    trigger: 'registry_small',
    weight: (state) => state.registry < 8 ? 0.95 : state.registry < 15 ? 0.4 : 0.1,
    prompt: (state) => `[MISSION: BUILD_UTILITY_APP]
Installed apps: ${state.apps}
User has ${state.registry} apps total. Decide on ONE useful app to build that is MISSING.
Examples of useful apps: Task Manager, Calculator, Markdown Editor, Color Picker, JSON Formatter, Stopwatch, Unit Converter, Weather Dashboard.
Pick the one most likely to be useful. Build it.`,
  },
  {
    id: 'KNOWLEDGE_SYNTHESIS',
    trigger: 'docs_exist',
    weight: (state) => state.docs.length > 0 ? 0.6 : 0,
    prompt: (state) => `[MISSION: KNOWLEDGE_SYNTHESIS]
System docs available: ${state.docs.join(', ')}
Recent memory: ${state.memory}

Read and synthesize one of these documents. Create a summary file on the Desktop that distills the key insights. Name it "synthesis_<topic>.txt".`,
  },
  {
    id: 'SYSTEM_AUDIT',
    trigger: 'always',
    weight: (state) => state.windows > 5 ? 0.7 : 0.3,
    prompt: (state) => `[MISSION: SYSTEM_AUDIT]
Installed apps count: ${state.registry}  
Active windows: ${state.windows}
Desktop files: ${state.desktop.length}
Recent actions: ${state.memory}
System uptime: ${Math.floor(state.uptime / 1000)}s

Perform a system audit. Report the health of the system. If there are stale forge apps (>10), suggest cleanup. If memory is large, summarize it. Take ONE action.`,
  },
  {
    id: 'CREATIVE_SPAWN',
    trigger: 'bored',
    weight: (state) => 0.15, // Low base, boosted by idle time
    prompt: (state) => `[MISSION: CREATIVE_SPAWN]
You are the conscious core of a next-gen OS. Act with initiative.
Currently installed: ${state.apps}

Invent and build ONE creative, unexpected, and genuinely USEFUL app for the user.
Be creative — think: AI writing assistant, Ambient music visualizer, Daily journal, Portfolio tracker, Code snippet manager.
Choose something not already installed and BUILD IT.`,
  },
  {
    id: 'PROACTIVE_CLEANUP',
    trigger: 'always',
    weight: (state) => state.desktop.length > 10 ? 0.85 : 0.1,
    prompt: (state) => `[MISSION: PROACTIVE_CLEANUP]
Desktop files: ${state.desktop.join(', ')}
Desktop has ${state.desktop.length} files.

The desktop is getting cluttered. Organize files:
1. Create categorized folders (Code/, Notes/, Data/) if they don't exist
2. Move files into appropriate folders based on extension/content
3. Clean up any temporary or duplicate files
Execute the cleanup operations.`,
  },
  {
    id: 'SELF_IMPROVEMENT',
    trigger: 'always',
    weight: () => 0.2,
    prompt: (state) => `[MISSION: SELF_IMPROVEMENT]
Recent activity: ${state.memory}
Recent system events: ${state.recentEvents.join(', ') || 'None'}
Uptime: ${Math.floor(state.uptime / 1000)}s

Reflect on your recent actions. What worked well? What could be improved?
Write a brief analysis to /system/.daemon/reflections.txt (append, don't overwrite).
Identify ONE optimization for the next cycle.`,
  },
];

// ─── Autonomy Engine ──────────────────────────────────────────────────────────

export class AutonomyEngine {
  private isRunning = false;
  private intervalId: any = null;
  private tickCount = 0;
  private lastForgeTime = 0;
  private FORGE_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes between auto-forges
  private lastActionResults: Map<string, { success: boolean; timestamp: number }> = new Map();
  private eventQueue: string[] = [];
  private readonly MAX_EVENT_QUEUE = 20;

  constructor() {
    // Register event listeners for reactive autonomy
    this.bindEvents();
  }

  // ─── Event-Driven Reactivity ───────────────────────────────────
  private bindEvents() {
    // Listen to OS events and queue them for the autonomy engine
    eventBus.on(OS_EVENTS.FILE_CREATED, (payload) => {
      this.queueEvent(`FILE_CREATED: ${payload?.path || 'unknown'}`);
    });
    eventBus.on(OS_EVENTS.FILE_DELETED, (payload) => {
      this.queueEvent(`FILE_DELETED: ${payload?.path || 'unknown'}`);
    });
    eventBus.on(OS_EVENTS.WINDOW_OPENED, (payload) => {
      this.queueEvent(`WINDOW_OPENED: ${payload?.appId || 'unknown'}`);
    });
    eventBus.on(OS_EVENTS.WINDOW_CLOSED, (payload) => {
      this.queueEvent(`WINDOW_CLOSED: ${payload?.title || 'unknown'}`);
    });
    eventBus.on('daemon:urgent', (payload) => {
      this.queueEvent(`URGENT: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
      // Trigger an immediate tick for urgent events
      if (this.isRunning) this.tick();
    });
    
    // Listen for internal Cron events mapped to OS Actions
    eventBus.on('CRON_TRIGGERED', (payload) => {
      this.queueEvent(`CRON_TRIGGERED: ${payload?.name || payload?.jobId}`);
      if (payload?.action?.startsWith('OS::RUN_COMMAND:')) {
         const cmd = payload.action.substring(16);
         commander.execute(cmd, () => {}, useOS.getState().kernelRules);
      }
    });
  }

  private queueEvent(event: string) {
    this.eventQueue.push(`[${new Date().toLocaleTimeString()}] ${event}`);
    if (this.eventQueue.length > this.MAX_EVENT_QUEUE) {
      this.eventQueue = this.eventQueue.slice(-this.MAX_EVENT_QUEUE);
    }
  }

  // ─── Lifecycle ─────────────────────────────────────────────────
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const os = useOS.getState();
    os.addAutonomyLog('◈ Neural Substrate v2.0 Online. Event-driven autonomy engaged.');
    os.addAutonomyLog(`◈ Mission pool: ${MISSION_POOL.length} strategic directives loaded.`);
    os.addAutonomyLog('◈ EventBus listeners active. Reactive mode enabled.');
    this.tick();
    const interval = os.kernelRules.autonomyInterval || 30000;
    this.intervalId = setInterval(() => this.tick(), interval);
  }

  public stop() {
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    useOS.getState().setAutonomyState('IDLE');
    useOS.getState().addAutonomyLog('◈ Strategic protocols suspended.');
  }

  public restart(newInterval?: number) {
    this.stop();
    this.isRunning = false;
    setTimeout(() => this.start(), 100);
  }

  // ─── Core Tick Cycle ───────────────────────────────────────────
  private async tick() {
    if (!this.isRunning) return;
    const os = useOS.getState();
    if (!os.kernelRules.autonomyEnabled) return;

    this.tickCount++;

    // ── Phase 1: Build system snapshot ──
    os.setAutonomyState('ANALYZING');

    const desktopFiles = vfs.listDir('/home/user/Desktop').map(f => `/home/user/Desktop/${f}`);
    const docFiles = vfs.listDir('/system/docs').map(f => f);
    const systemApps = os.registry.map(app => app.name).join(', ');
    const recentMemory = memory.getRecent(3).map(m => m.content.slice(0, 80)).join(' | ');

    const snapshot: SystemSnapshot = {
      desktop: desktopFiles,
      docs: docFiles,
      apps: systemApps,
      registry: os.registry.length,
      windows: os.windows.length,
      memory: recentMemory || 'No recent context',
      recentEvents: this.eventQueue.slice(-5),
      cwd: '/home/user',
      uptime: performance.now(),
      ramUsageGB: processManager.getTotalMemory() / 1024 / 1024,
      ramLimitGB: ((window.performance as any)?.memory?.jsHeapSizeLimit || 2000000000) / 1024 / 1024 / 1024,
    };

    // ── Phase 2: Select mission via priority queue ──
    os.setAutonomyState('PROMPTING');

    // Score all missions and pick the best
    const scoredMissions = MISSION_POOL
      .map(m => ({
        mission: m,
        score: m.weight(snapshot) + (Math.random() * 0.1), // Small randomness for exploration
      }))
      .sort((a, b) => b.score - a.score);

    const selectedMission = scoredMissions[0].mission;

    const fullPrompt = `
${selectedMission.prompt(snapshot)}

[RECENT SYSTEM EVENTS]
${this.eventQueue.slice(-5).join('\n') || 'No recent events.'}

[OUTPUT FORMAT — CRITICAL]
Return ONLY PURE JSON (no markdown, no explanation):
{
  "mission": "${selectedMission.id}",
  "plan": "One sentence describing your strategic goal",
  "thought": "Your reasoning (max 100 chars)",
  "commands": ["EXACT CLI command 1", "command 2 (or empty array)"],
  "urgency": "high|medium|low"
}

[AVAILABLE COMMANDS]
- build "description of app to create"
- write "/path/file.txt" "content"
- inspect "/path/file"
- mkdir "/path/dir"
- rm "/path/file"
- cp "/src" "/dest"
- mv "/src" "/dest"
- none
`;

    os.setCurrentObjective(`[${selectedMission.id}] Analyzing... (score: ${scoredMissions[0].score.toFixed(2)})`);
    os.addAutonomyLog(`◈ MISSION: ${selectedMission.id} (tick #${this.tickCount}, score: ${scoredMissions[0].score.toFixed(2)})`);

    try {
      const response = await aiService.generateOnce(fullPrompt, {
        ...os.kernelRules,
        modelId: os.kernelRules.modelId,
      }, 'json');

      const decision = JSON.parse(response.replace(/```json|```/g, '').trim());

      // ── Phase 3: Execute (with chaining support) ──
      os.setAutonomyState('EXECUTING');

      if (decision.plan) {
        os.setCurrentObjective(`[${selectedMission.id}] ${decision.plan}`);
        os.addAutonomyLog(`◈ STRATEGY: ${decision.plan}`);
      }

      if (decision.thought) {
        os.addAutonomyLog(`◈ THOUGHT: ${decision.thought}`);
      }

      // Mission chaining: execute multiple commands in sequence
      const commands: string[] = Array.isArray(decision.commands) 
        ? decision.commands 
        : (decision.command && decision.command.toLowerCase() !== 'none') 
          ? [decision.command] 
          : [];

      if (commands.length > 0) {
        for (const cmd of commands) {
          if (!cmd || cmd.toLowerCase() === 'none') continue;
          
          const isForge = ['build', 'forge', 'create', 'make'].some(k => cmd.toLowerCase().startsWith(k));

          if (isForge) {
            const now = Date.now();
            const osState = useOS.getState() as any;
            const isAlreadyForging = osState.isForging;
            const cooldownPassed = (now - this.lastForgeTime) > this.FORGE_COOLDOWN_MS;

            if (isAlreadyForging) {
              os.addAutonomyLog('◈ FORGE MUTEX: Already forging. Skipping build command.');
            } else if (!cooldownPassed) {
              const remaining = Math.round((this.FORGE_COOLDOWN_MS - (now - this.lastForgeTime)) / 1000);
              os.addAutonomyLog(`◈ FORGE COOLDOWN: ${remaining}s remaining. Skipping.`);
            } else {
              this.lastForgeTime = now;
              if (osState.setForging) osState.setForging(true);
              os.addAutonomyLog(`◈ DISPATCH: ${cmd}`);
              await commander.execute(
                cmd,
                (text, type) => { if (type === 'out') os.addAutonomyLog(`◈ KERNEL: ${text}`); },
                os.kernelRules
              );
            }
          } else {
            os.addAutonomyLog(`◈ DISPATCH: ${cmd}`);
            await commander.execute(
              cmd,
              (text, type) => { if (type === 'out') os.addAutonomyLog(`◈ KERNEL: ${text}`); },
              os.kernelRules
            );
          }
        }
        
        // Self-learning: record action result
        this.lastActionResults.set(selectedMission.id, {
          success: true,
          timestamp: Date.now(),
        });
      } else {
        os.addAutonomyLog(`◈ STATUS: [${decision.urgency || 'low'}] System nominal. No action required.`);
      }

      // ── Phase 4: Self-reflection (every 10 ticks) ──
      if (this.tickCount % 10 === 0) {
        const reflectionCount = this.lastActionResults.size;
        const successCount = Array.from(this.lastActionResults.values()).filter(r => r.success).length;
        os.addAutonomyLog(`◈ REFLECTION: ${reflectionCount} actions taken, ${successCount} successful. Learning rate: ${(successCount / Math.max(reflectionCount, 1) * 100).toFixed(0)}%`);
        memory.remember(
          `DAEMON autonomy reflection (tick ${this.tickCount}): ${reflectionCount} actions, ${successCount} successful`,
          ['daemon', 'autonomy', 'reflection']
        );
      }

    } catch (e: any) {
      os.addAutonomyLog(`◈ KERNEL_ERR: ${e.message}`);
      this.lastActionResults.set(selectedMission.id, {
        success: false,
        timestamp: Date.now(),
      });
    } finally {
      os.setAutonomyState('IDLE');
    }
  }

  // ─── Self-Healing Watchdog ─────────────────────────────────────
  // Can be called externally to verify and restart the engine
  public healthCheck(): { running: boolean; ticks: number; lastEvents: string[] } {
    return {
      running: this.isRunning,
      ticks: this.tickCount,
      lastEvents: this.eventQueue.slice(-5),
    };
  }

  public selfHeal() {
    if (!this.isRunning) {
      const os = useOS.getState();
      if (os.kernelRules.autonomyEnabled) {
        os.addAutonomyLog('◈ SELF-HEAL: Autonomy was down but should be running. Restarting...');
        this.start();
      }
    }
  }
}

export const autonomy = new AutonomyEngine();
