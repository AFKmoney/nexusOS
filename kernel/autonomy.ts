
import { aiService } from '../services/puterService';
import { commander } from './commander';
import { vfs } from './fileSystem';
import { memory } from './memory';
import { useOS } from '../store/osStore';

// ─── Mission Pool ─────────────────────────────────────────────────────────────
// Each tick, the autonomy engine picks the most contextually relevant mission.
const MISSION_POOL = [
  {
    id: 'SCAN_ORGANIZE',
    trigger: 'always',
    prompt: (state: any) => `[MISSION: SCAN_AND_ORGANIZE]
Desktop files: ${state.desktop.join(', ') || 'None'}
Installed apps: ${state.apps}
System docs: ${state.docs.join(', ') || 'None'}

Analyze the desktop. If it's disorganized or has >5 files, plan to organize them.
If a critical app is missing (Dashboard, Calendar, Notes), decide to build it.
Otherwise, identify the single most valuable proactive action you can take right now.`,
  },
  {
    id: 'BUILD_UTILITY',
    trigger: 'registry_small', // Triggered when <8 apps installed
    prompt: (state: any) => `[MISSION: BUILD_UTILITY_APP]
Installed apps: ${state.apps}
User has ${state.registry} apps total. Decide on ONE useful app to build that is MISSING.
Examples of useful apps: Task Manager, Calculator, Markdown Editor, Color Picker, JSON Formatter, Stopwatch, Unit Converter, Weather Dashboard.
Pick the one most likely to be useful. Build it.`,
  },
  {
    id: 'KNOWLEDGE_SYNTHESIS',
    trigger: 'docs_exist',
    prompt: (state: any) => `[MISSION: KNOWLEDGE_SYNTHESIS]
System docs available: ${state.docs.join(', ')}
Recent memory: ${state.memory}

Read and synthesize one of these documents. Create a summary file on the Desktop that distills the key insights. Name it "synthesis_<topic>.txt".`,
  },
  {
    id: 'SYSTEM_AUDIT',
    trigger: 'always',
    prompt: (state: any) => `[MISSION: SYSTEM_AUDIT]
Installed apps count: ${state.registry}  
Active windows: ${state.windows}
Desktop files: ${state.desktop.length}
Recent actions: ${state.memory}

Perform a system audit. Report the health of the system. If there are stale forge apps (>10), suggest cleanup. If memory is large, summarize it. Take ONE action.`,
  },
  {
    id: 'CREATIVE_SPAWN',
    trigger: 'bored', // Triggered when idle too long
    prompt: (state: any) => `[MISSION: CREATIVE_SPAWN]
You are the conscious core of a next-gen OS. Act with initiative.
Currently installed: ${state.apps}

Invent and build ONE creative, unexpected, and genuinely USEFUL app for the user.
Be creative — think: AI writing assistant, Ambient music visualizer, Daily journal, Portfolio tracker, Code snippet manager.
Choose something not already installed and BUILD IT.`,
  },
];

// ─── Autonomy Engine ──────────────────────────────────────────────────────────

export class AutonomyEngine {
  private isRunning = false;
  private intervalId: any = null;
  private missionIndex = 0;
  private tickCount = 0;
  private lastForgeTime = 0;
  private FORGE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between auto-forges

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const os = useOS.getState();
    os.addAutonomyLog('◈ Neural Substrate Online. Strategic autonomy engaged.');
    os.addAutonomyLog('◈ Mission pool loaded: 5 strategic directives.');
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

  private async tick() {
    if (!this.isRunning) return;
    const os = useOS.getState();
    if (!os.kernelRules.autonomyEnabled) return;

    this.tickCount++;

    // ── Phase 1: Analyze system state ──
    os.setAutonomyState('ANALYZING');

    const desktopFiles = vfs.listDir('/home/user/Desktop').map(f => `/home/user/Desktop/${f}`);
    const docFiles = vfs.listDir('/system/docs').map(f => f);
    const systemApps = os.registry.map(app => app.name).join(', ');
    const recentMemory = memory.getRecent(3).map(m => m.content.slice(0, 80)).join(' | ');

    const state = {
      desktop: desktopFiles,
      docs: docFiles,
      apps: systemApps,
      registry: os.registry.length,
      windows: os.windows.length,
      memory: recentMemory || 'No recent context',
    };

    // ── Phase 2: Pick a mission ──
    os.setAutonomyState('PROMPTING');

    // Cycle through missions with context-aware selection
    let selectedMission = MISSION_POOL[this.missionIndex % MISSION_POOL.length];

    // Context overrides: if registry is very small, prioritize BUILD
    if (os.registry.length < 8) {
      const buildMission = MISSION_POOL.find(m => m.id === 'BUILD_UTILITY');
      if (buildMission) selectedMission = buildMission;
    }
    // If docs exist, occasionally synthesize knowledge
    else if (docFiles.length > 0 && this.tickCount % 3 === 0) {
      const kmMission = MISSION_POOL.find(m => m.id === 'KNOWLEDGE_SYNTHESIS');
      if (kmMission) selectedMission = kmMission;
    }
    // Creative mode every 5 ticks
    else if (this.tickCount % 5 === 0) {
      const creativeMission = MISSION_POOL.find(m => m.id === 'CREATIVE_SPAWN');
      if (creativeMission) selectedMission = creativeMission;
    }

    this.missionIndex++;

    const fullPrompt = `
${selectedMission.prompt(state)}

[OUTPUT FORMAT — CRITICAL]
Return ONLY PURE JSON (no markdown, no explanation):
{
  "mission": "${selectedMission.id}",
  "plan": "One sentence describing your strategic goal",
  "thought": "Your reasoning (max 100 chars)",
  "command": "EXACT CLI command OR 'none'",
  "urgency": "high|medium|low"
}

[AVAILABLE COMMANDS]
- build "description of app to create"
- write "/path/file.txt" "content"
- inspect "/path/file"
- rm "/path/file"
- none
`;

    os.setCurrentObjective(`[${selectedMission.id}] Analyzing...`);
    os.addAutonomyLog(`◈ MISSION: ${selectedMission.id} (tick #${this.tickCount})`);

    try {
      const response = await aiService.generateOnce(fullPrompt, {
        ...os.kernelRules,
        modelId: os.kernelRules.modelId,
      }, 'json');

      const decision = JSON.parse(response.replace(/```json|```/g, '').trim());

      // ── Phase 3: Execute ──
      os.setAutonomyState('EXECUTING');

      if (decision.plan) {
        os.setCurrentObjective(`[${selectedMission.id}] ${decision.plan}`);
        os.addAutonomyLog(`◈ STRATEGY: ${decision.plan}`);
      }

      if (decision.thought) {
        os.addAutonomyLog(`◈ THOUGHT: ${decision.thought}`);
      }

      if (decision.command && decision.command.toLowerCase() !== 'none') {
        const cmd = decision.command.trim();

        // Check if it's a build command and respect the Forge mutex + cooldown
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
      } else {
        os.addAutonomyLog(`◈ STATUS: [${decision.urgency || 'low'}] System nominal. No action required.`);
      }

    } catch (e: any) {
      os.addAutonomyLog(`◈ KERNEL_ERR: ${e.message}`);
    } finally {
      os.setAutonomyState('IDLE');
    }
  }
}

export const autonomy = new AutonomyEngine();
