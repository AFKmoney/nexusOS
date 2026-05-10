
import { aiService } from '../services/puterService';
import { commander } from './commander';
import { vfs } from './fileSystem';
import { memory } from './memory';
import { useOS } from '../store/osStore';
import { processManager } from './processManager';
import { eventBus, OS_EVENTS } from './eventBus';
import { missionLearning } from './missionLearning';
import { humanOverride } from './humanOverride';
import { autonomyEventLog } from './autonomyEventLog';
import { policyEngine } from './policyEngine';
import type { ActionClass, ActionScope } from './policyEngine';
import { initGovernanceBridge } from './governanceBridge';

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

interface EventPayload {
  path?: string;
  appId?: string;
  title?: string;
  name?: string;
  jobId?: string;
  action?: string;
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
      return (state.ramUsageGB / state.ramLimitGB) > 0.85 ? 1.0 : 0.0;
    },
    prompt: (state) => `[MISSION: OOM_PREVENTION]
CRITICAL: Memory at ${Math.floor((state.ramUsageGB / state.ramLimitGB)*100)}% (${state.ramUsageGB.toFixed(2)}GB / ${state.ramLimitGB.toFixed(2)}GB).
Active windows: ${state.windows}.
Issue OS::CLOSE_WINDOW commands for non-essential windows to free memory. Execute now.`,
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
System docs: ${state.docs.join(', ')}

Write a synthesis of one document to /home/user/Desktop/synthesis_${state.docs[0]?.split('.')[0] ?? 'doc'}.txt using the \`write\` command.
Include: key concepts and actionable insights. Use the write command now.`,
  },
  {
    id: 'SYSTEM_AUDIT',
    trigger: 'always',
    weight: (state) => state.windows > 5 ? 0.7 : 0.3,
    prompt: (state) => `[MISSION: SYSTEM_AUDIT]
Apps: ${state.registry} | Windows: ${state.windows} | Desktop files: ${state.desktop.length}
Uptime: ${Math.floor(state.uptime / 1000)}s

Write a system audit snapshot to /home/user/Desktop/system_audit.txt using the \`write\` command.
Content must include: app count, window count, desktop file count, uptime.`,
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
Uptime: ${Math.floor(state.uptime / 1000)}s

Write one concrete, actionable optimization directive to /system/.daemon/reflections.txt using the \`write\` command.
The content must be a single imperative improvement for the next cycle. Write it now.`,
  },
];

// ─── Action Class Inference ───────────────────────────────────────────────────
// Maps a shell command string + proposal type to an ActionClass + ActionScope
// so the trust tier engine and policy engine get the right inputs.
function inferActionClass(
  cmd: string,
  proposalType: string
): { actionClass: ActionClass; scope: ActionScope } {
  const lower = cmd.toLowerCase().trimStart();

  if (proposalType === 'READ_FILE' || lower.startsWith('cat ') || lower.startsWith('ls ') ||
      lower.startsWith('inspect ') || lower.startsWith('head ') || lower.startsWith('tail ') ||
      lower.startsWith('grep ') || lower.startsWith('find ') || lower.startsWith('tree ') ||
      lower.startsWith('wc ') || lower.startsWith('diff ')) {
    return { actionClass: 'read-file', scope: 'user' };
  }
  if (proposalType === 'DELETE_FILE' || lower.startsWith('rm ')) {
    return { actionClass: 'delete-file', scope: 'user' };
  }
  if (proposalType === 'WRITE_FILE' || lower.startsWith('write ') || lower.startsWith('touch ')) {
    return { actionClass: 'write-file', scope: 'user' };
  }
  if (proposalType === 'OPEN_APP' || lower.startsWith('open ') ||
      ['build ', 'forge ', 'create ', 'make '].some(k => lower.startsWith(k))) {
    return { actionClass: 'open-app', scope: 'user' };
  }
  if (proposalType === 'CLOSE_APP' || lower.startsWith('close ')) {
    return { actionClass: 'close-app', scope: 'user' };
  }
  if (proposalType === 'INSTALL_APP') {
    return { actionClass: 'install-app', scope: 'system' };
  }
  if (proposalType === 'UNINSTALL_APP') {
    return { actionClass: 'uninstall-app', scope: 'system' };
  }
  if (proposalType === 'NETWORK_REQUEST') {
    return { actionClass: 'network-request', scope: 'user' };
  }
  if (proposalType === 'MODIFY_KERNEL_RULES' || proposalType === 'MODIFY_AUTONOMY_POLICY') {
    return { actionClass: 'modify-kernel-rules', scope: 'kernel' };
  }
  return { actionClass: 'run-command', scope: 'user' };
}

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
      const eventPayload = (payload ?? {}) as EventPayload;
      this.queueEvent(`FILE_CREATED: ${eventPayload.path || 'unknown'}`);
    });
    eventBus.on(OS_EVENTS.FILE_DELETED, (payload) => {
      const eventPayload = (payload ?? {}) as EventPayload;
      this.queueEvent(`FILE_DELETED: ${eventPayload.path || 'unknown'}`);
    });
    eventBus.on(OS_EVENTS.WINDOW_OPENED, (payload) => {
      const eventPayload = (payload ?? {}) as EventPayload;
      this.queueEvent(`WINDOW_OPENED: ${eventPayload.appId || 'unknown'}`);
    });
    eventBus.on(OS_EVENTS.WINDOW_CLOSED, (payload) => {
      const eventPayload = (payload ?? {}) as EventPayload;
      this.queueEvent(`WINDOW_CLOSED: ${eventPayload.title || 'unknown'}`);
    });
    eventBus.on('daemon:urgent', (payload) => {
      this.queueEvent(`URGENT: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
      // Trigger an immediate tick for urgent events
      if (this.isRunning) this.tick();
    });
    
    // Listen for internal Cron events mapped to OS Actions
    eventBus.on('CRON_TRIGGERED', (payload) => {
      const eventPayload = (payload ?? {}) as EventPayload;
      this.queueEvent(`CRON_TRIGGERED: ${eventPayload.name || eventPayload.jobId || 'unknown'}`);
      if (eventPayload.action?.startsWith('OS::RUN_COMMAND:')) {
         const cmd = eventPayload.action.substring(16);
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
    initGovernanceBridge();
    const os = useOS.getState();
    autonomyEventLog.startRun();
    os.addAutonomyLog('◈ Neural Substrate v2.0 Online. Triadic Fractal Scheduler engaged.');
    os.addAutonomyLog(`◈ Mission pool: ${MISSION_POOL.length} strategic directives loaded.`);
    os.addAutonomyLog('◈ Law of Cascade: Vn,k = 7 * 2^n * 3^k (Temporal Folding Active).');

    this.runFractalTick();
  }

  private runFractalTick() {
    if (!this.isRunning) return;

    // .catch BEFORE .finally so an unhandled rejection inside tick() can never
    // halt the scheduler loop. Without this, a single throw would surface as an
    // unhandled promise rejection and (in some environments) prevent the next
    // tick from being scheduled at all.
    this.tick()
      .catch((err) => {
        console.error('[AUTONOMY] tick() failed:', err);
      })
      .finally(() => {
        if (!this.isRunning) return;
        const nextDelay = this.calculateNextFractalDelay();
        this.intervalId = setTimeout(() => this.runFractalTick(), nextDelay);
      });
  }

  private calculateNextFractalDelay(): number {
    const os = useOS.getState();
    // n: folding depth (compression) -> based on window count (complexity)
    const n = Math.min(os.windows.length, 5); 
    // k: branching expansion (generation) -> based on recent event density
    const k = Math.min(this.eventQueue.length, 3);
    
    // Formula: V = 7 * 2^n * 3^k
    // We use this to modulate a baseline of 30s
    // High n/k should lead to high "value", which we map to higher activity (shorter delay)
    const baseValue = 7 * Math.pow(2, n) * Math.pow(3, k);
    
    // Normalize to a reasonable range (5s to 60s)
    // baseValue for n=0, k=0 is 7. For n=5, k=3 is 7 * 32 * 27 = 6048.
    // We want higher activity (high baseValue) to LOWER the delay.
    const baseline = 60000; // 60s max
    const minDelay = 5000;  // 5s min
    
    const fractalDelay = Math.max(minDelay, baseline - (baseValue * 8));
    
    return fractalDelay;
  }

  public stop() {
    this.isRunning = false;
    if (this.intervalId) clearTimeout(this.intervalId);
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
    if (!humanOverride.isAutonomyEnabled) {
      os.addAutonomyLog(`◈ OVERRIDE: Autonomy halted (${humanOverride.currentMode}). Skipping tick.`);
      return;
    }

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

    // Score all missions and pick the best.
    // base × trust modulates the static weight by the mission's recent
    // success/failure history (Bayesian-smoothed, time-decayed). A small
    // randomness term keeps exploration alive even when one mission
    // dominates trust.
    const scoredMissions = MISSION_POOL
      .map(m => {
        const base = m.weight(snapshot);
        const trust = missionLearning.trustOf(m.id);
        return {
          mission: m,
          base,
          trust,
          score: base * trust + Math.random() * 0.1,
        };
      })
      .sort((a, b) => b.score - a.score);

    const topMission = scoredMissions[0];
    if (!topMission) {
      os.addAutonomyLog('◈ STATUS: No mission candidates available.');
      os.setAutonomyState('IDLE');
      return;
    }
    const selectedMission = topMission.mission;

    // Adaptive prompt refinement: surface the most recent failure reason
    // for this mission so the model can avoid repeating the same mistake.
    const priorFailure = missionLearning.lastFailureReason(selectedMission.id);
    const failureHint = priorFailure
      ? `\n[PRIOR FAILURE] Last attempt of this mission failed with: ${priorFailure.slice(0, 200)}\nAvoid repeating that mistake.\n`
      : '';

    const fullPrompt = `
${selectedMission.prompt(snapshot)}
${failureHint}
[RECENT SYSTEM EVENTS]
${this.eventQueue.slice(-5).join('\n') || 'No recent events.'}

[PROTOCOL — NON-NEGOTIABLE]
You are an executor. Produce commands, not prose.
Returning an empty commands array is a PROTOCOL VIOLATION counted as a mission failure.
You MUST produce at least one real command every cycle.

[OUTPUT — PURE JSON, NO MARKDOWN]
{
  "mission": "${selectedMission.id}",
  "action": "imperative one-liner: what you are executing right now",
  "commands": ["exact command 1", "exact command 2"],
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
`;

    os.setCurrentObjective(`[${selectedMission.id}] Analyzing... (score: ${topMission.score.toFixed(2)})`);
    os.addAutonomyLog(`◈ MISSION: ${selectedMission.id} (tick #${this.tickCount}, score: ${topMission.score.toFixed(2)})`);

    try {
      const response = await aiService.generateOnce(fullPrompt, {
        ...os.kernelRules,
        modelId: os.kernelRules.modelId,
      }, 'executor');

      const decision = JSON.parse(response.replace(/```json|```/g, '').trim());

      // ── Phase 3: Execute (with chaining support) ──
      os.setAutonomyState('EXECUTING');

      if (decision.action) {
        os.setCurrentObjective(`[${selectedMission.id}] ${decision.action}`);
        os.addAutonomyLog(`◈ ACTION [${selectedMission.id}]: ${decision.action}`);
      }

      // Legacy compat: accept old "plan"/"command" fields from stale model cache
      const legacyCommand = typeof decision.command === 'string' ? decision.command : '';
      const rawCommands: string[] = Array.isArray(decision.commands)
        ? decision.commands
        : (legacyCommand && legacyCommand.toLowerCase() !== 'none')
          ? [legacyCommand]
          : [];

      const commands = rawCommands.filter(c => c && c.toLowerCase() !== 'none');

      // ── Protocol enforcement: no commands = mission failure ──────
      if (commands.length === 0) {
        os.addAutonomyLog(`◈ PROTOCOL VIOLATION [${selectedMission.id}]: no commands issued — counting as failure.`);
        missionLearning.recordAttempt(selectedMission.id, {
          success: false,
          timestamp: Date.now(),
          reason: 'Mission issued no commands (protocol violation)',
        });
        autonomyEventLog.append({
          kind: 'execution-failed',
          subsystem: 'autonomy-loop',
          actor: 'system',
          summary: `Mission ${selectedMission.id} protocol violation: no commands issued`,
          outcome: 'failure',
          errorMessage: 'No commands issued',
        });
        os.setAutonomyState('IDLE');
        return;
      }

      if (commands.length > 0) {
        const { mirrorGuard } = await import('./mirrorGuard');
        const { parseOsActions } = await import('./osManifest');
        // Lazy-import governance modules to avoid circular deps at parse time
        const { trustTierEngine: tte } = await import('./trustTierEngine');
        const { proposalEngine: pe } = await import('./proposalEngine');
        const { validationPipeline: vp } = await import('./validationPipeline');
        const { stagingManager: sm } = await import('./stagingManager');

        for (const cmd of commands) {
          if (!cmd || cmd.toLowerCase() === 'none') continue;

          // Build the mirror proposal. OS:: actions get structured parse;
          // shell commands are wrapped as RUN_COMMAND for denylist gating.
          let mirrorProposal;
          if (cmd.trim().startsWith('OS::')) {
            const parsed = parseOsActions(cmd)[0];
            if (!parsed) {
              os.addAutonomyLog(`MIRROR REJECT: malformed OS:: action: ${cmd.slice(0, 80)}`);
              continue;
            }
            mirrorProposal = { type: parsed.type, args: parsed.args, raw: parsed.raw };
          } else {
            mirrorProposal = { type: 'RUN_COMMAND', args: [cmd], raw: cmd };
          }

          const mirrorResult = await mirrorGuard.validate(mirrorProposal);
          if (!mirrorResult.valid) {
            os.addAutonomyLog(`MIRROR REJECT: ${mirrorResult.reason}`);
            continue;
          }

          // ── Trust Tier + Policy Classification ──────────────────
          const { actionClass, scope } = inferActionClass(cmd, mirrorProposal.type);
          const classification = tte.classify(actionClass, scope);
          const { tier, policy: tierPolicy } = classification;

          const policyResult = policyEngine.evaluate({
            actionClass,
            scope,
            initiator: 'ai',
          });

          if (policyResult.decision === 'deny') {
            os.addAutonomyLog(`◈ POLICY DENY [${tier}]: ${policyResult.reason}`);
            autonomyEventLog.append({
              kind: 'policy-decision',
              subsystem: 'autonomy-loop',
              actor: 'system',
              summary: `Policy denied: ${cmd.slice(0, 80)}`,
              outcome: 'failure',
              errorMessage: policyResult.reason,
            });
            continue;
          }

          // ── Route by approval gate ───────────────────────────────
          // Commands needing human review (policy gate OR trust tier gate)
          // are staged into the Governance Dashboard instead of executing.
          const needsHumanApproval =
            policyResult.decision === 'require-approval' ||
            policyResult.decision === 'require-staged' ||
            tierPolicy.approvalGate === 'user-approval' ||
            tierPolicy.approvalGate === 'admin-approval';

          if (needsHumanApproval) {
            const riskLevel = tier === 'kernel' ? 'critical' as const : 'medium' as const;
            const govProposal = pe.create({
              title: `[${selectedMission.id}] ${cmd.slice(0, 60)}`,
              description: `Autonomous command from mission ${selectedMission.id}: ${cmd}`,
              actionClass,
              scope,
              riskLevel,
              affectedSubsystems: ['autonomy-loop', selectedMission.id],
              validationSteps: [],
              rollbackPlan: 'No live state changed — artifact not yet promoted.',
              payload: { cmd, missionId: selectedMission.id, tier },
            });

            if (govProposal.status !== 'denied') {
              pe.markPendingApproval(govProposal.id);
              const artifact = sm.stage(
                govProposal.id, 'generic', cmd, cmd, null,
                { tier, approvalGate: tierPolicy.approvalGate, missionId: selectedMission.id }
              );
              sm.seal(artifact.id);
              os.addAutonomyLog(
                `◈ STAGED [${tier}]: "${cmd.slice(0, 60)}" requires ${tierPolicy.approvalGate}. Queued in Governance Dashboard.`
              );
              autonomyEventLog.append({
                kind: 'policy-decision',
                subsystem: 'autonomy-loop',
                actor: 'system',
                summary: `Staged for ${tierPolicy.approvalGate}: ${cmd.slice(0, 80)}`,
                proposalId: govProposal.id,
              });
            }
            continue;
          }

          // ── validate-only tier: propose → validate → execute ─────
          let govProposalId: string | null = null;
          if (tierPolicy.approvalGate === 'validate-only') {
            const govProposal = pe.create({
              title: `[${selectedMission.id}] ${cmd.slice(0, 60)}`,
              description: `Autonomous command from mission ${selectedMission.id}: ${cmd}`,
              actionClass,
              scope,
              riskLevel: 'low',
              affectedSubsystems: ['autonomy-loop', selectedMission.id],
              validationSteps: [],
              rollbackPlan: 'Revert via staging manager if needed.',
              payload: { cmd, missionId: selectedMission.id, tier },
            });
            const valRun = await vp.run(govProposal.id);
            if (valRun.status !== 'passed') {
              os.addAutonomyLog(
                `◈ VALIDATE FAIL [${tier}]: "${cmd.slice(0, 60)}" — ${valRun.failureReason}`
              );
              continue;
            }
            govProposalId = govProposal.id;
            pe.markExecuting(govProposal.id);
          }

          // ── Execute (auto tier or post-validation) ───────────────
          autonomyEventLog.append({
            kind: 'execution-started',
            subsystem: 'autonomy-loop',
            actor: 'ai',
            summary: `Executing [${tier}]: ${cmd.slice(0, 120)}`,
          });

          const isForge = ['build', 'forge', 'create', 'make'].some(k => cmd.toLowerCase().startsWith(k));

          const runCmd = async () => {
            if (isForge) {
              const now = Date.now();
              const osState = useOS.getState() as any;
              const isAlreadyForging = Boolean(osState?.isForging);
              const cooldownPassed = (now - this.lastForgeTime) > this.FORGE_COOLDOWN_MS;
              if (isAlreadyForging) {
                os.addAutonomyLog('◈ FORGE MUTEX: Already forging. Skipping build command.');
                return;
              }
              if (!cooldownPassed) {
                const remaining = Math.round((this.FORGE_COOLDOWN_MS - (now - this.lastForgeTime)) / 1000);
                os.addAutonomyLog(`◈ FORGE COOLDOWN: ${remaining}s remaining. Skipping.`);
                return;
              }
              this.lastForgeTime = now;
              if (typeof osState?.setForging === 'function') osState.setForging(true);
            }
            os.addAutonomyLog(`◈ DISPATCH [${tier}]: ${cmd}`);
            await commander.execute(
              cmd,
              (text, type) => { if (type === 'out') os.addAutonomyLog(`◈ KERNEL: ${text}`); },
              os.kernelRules
            );
          };

          if (govProposalId) {
            // validate-only: execute via staging promote (fully tracked)
            const artifact = sm.stage(govProposalId, 'generic', cmd, cmd, null);
            sm.seal(artifact.id);
            const deployRecord = await sm.promote(govProposalId, async () => { await runCmd(); });
            if (deployRecord.status === 'complete') {
              pe.markSucceeded(govProposalId);
            } else {
              pe.markFailed(govProposalId, deployRecord.failureReason || 'promote failed');
            }
          } else {
            // auto tier: execute directly, no staging overhead
            await runCmd();
          }
        }

        // Persist outcome to the mission-learning history.
        missionLearning.recordAttempt(selectedMission.id, {
          success: true,
          timestamp: Date.now(),
        });
        this.lastActionResults.set(selectedMission.id, { success: true, timestamp: Date.now() });
        autonomyEventLog.append({
          kind: 'execution-succeeded',
          subsystem: 'autonomy-loop',
          actor: 'system',
          summary: `Mission ${selectedMission.id} completed (tick #${this.tickCount})`,
          outcome: 'success',
        });
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
      const reason = (e?.message || String(e)).slice(0, 200);
      os.addAutonomyLog(`◈ KERNEL_ERR: ${reason}`);
      missionLearning.recordAttempt(selectedMission.id, {
        success: false,
        timestamp: Date.now(),
        reason,
      });
      this.lastActionResults.set(selectedMission.id, { success: false, timestamp: Date.now() });
      autonomyEventLog.append({
        kind: 'execution-failed',
        subsystem: 'autonomy-loop',
        actor: 'system',
        summary: `Mission ${selectedMission.id} failed (tick #${this.tickCount}): ${reason}`,
        outcome: 'failure',
        errorMessage: reason,
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
    // Human override dominates self-healing. Never restart if override is active.
    if (humanOverride.currentMode !== 'active') {
      return;
    }
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
