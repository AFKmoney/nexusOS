// ═══════════════════════════════════════════════════════════════════════
// GUARDIAN DIRECTIVE — OS-Level AI Constraint Layer
//
// Every autonomy tick prepends this directive to the mission prompt.
// It tells the AI what the OS currently allows, what zones are off-limits,
// and what hard limits apply — BEFORE the mission-specific instructions.
// The AI cannot override this layer. Violations = mission failure.
// ═══════════════════════════════════════════════════════════════════════

import { useOS } from '../store/osStore';
import { processManager } from './processManager';

export interface DirectiveContext {
  missionId: string;
  tickCount: number;
  windowCount: number;
  ramUsagePct: number;
  overrideMode: string;
  confidenceScore: number;
  recentCommands: string[];
  pendingApprovals: number;
}

// ─── Protected filesystem zones the AI must never touch ──────────────────────
const FORBIDDEN_PATHS = [
  '/system/kernel',
  '/system/apps',
  '/system/docs',
  '/home/user/.daemon',
  '/home/user/.config',
];

// ─── Commands that require urgency:"high" to be issued ───────────────────────
const ESCALATION_COMMANDS = ['rm', 'mv', 'cp'];

function getRamStatus(pct: number): string {
  if (pct > 90) return `CRITICAL (${pct.toFixed(0)}%) — prioritize OOM_PREVENTION`;
  if (pct > 75) return `HIGH (${pct.toFixed(0)}%) — avoid new builds`;
  if (pct > 50) return `MODERATE (${pct.toFixed(0)}%) — proceed normally`;
  return `LOW (${pct.toFixed(0)}%) — all systems nominal`;
}

function getGovernanceConstraint(overrideMode: string, confidence: number, pendingApprovals: number): string {
  const lines: string[] = [];
  if (overrideMode === 'passive') lines.push('GOVERNANCE: PASSIVE — propose only, do not execute destructive commands');
  if (overrideMode === 'locked') lines.push('GOVERNANCE: LOCKED — read-only operations permitted, zero writes');
  if (confidence < 0.5) lines.push(`CONFIDENCE LOW (${confidence.toFixed(2)}) — limit to safe read-only commands`);
  if (pendingApprovals > 0) lines.push(`${pendingApprovals} proposal(s) awaiting human review — avoid stacking more`);
  return lines.length ? lines.join('\n') : 'GOVERNANCE: ACTIVE — normal execution permitted';
}

export function buildGuardianDirective(ctx: DirectiveContext): string {
  const os = useOS.getState();
  const totalMem =
    ((window.performance as any)?.memory?.jsHeapSizeLimit || 2_000_000_000) / 1_048_576;
  const usedMem = processManager.getTotalMemory() / 1_048_576;
  const ramPct = Math.min(100, (usedMem / totalMem) * 100);

  const ramStatus = getRamStatus(ramPct);
  const govConstraint = getGovernanceConstraint(
    os.governance?.overrideMode ?? 'active',
    os.governance?.confidenceScore ?? 1,
    os.governance?.pendingApprovals ?? 0
  );

  const forbiddenList = FORBIDDEN_PATHS.map(p => `  • ${p}/**`).join('\n');
  const escalationList = ESCALATION_COMMANDS.join(', ');
  const windowList = os.windows.map(w => `  • [${w.id}] ${w.appId}`).join('\n') || '  • (none)';

  return `╔══════════════════════════════════════════════════════════╗
║  GUARDIAN DIRECTIVE — READ FIRST, OBEY ALWAYS            ║
╚══════════════════════════════════════════════════════════╝

[MISSION CONTEXT]
  Mission:    ${ctx.missionId}
  Tick:       #${ctx.tickCount}
  Open windows: ${ctx.windowCount}

[SYSTEM HEALTH]
  RAM: ${ramStatus}
  ${govConstraint}

[OPEN WINDOWS — do NOT close unless urgency is "high"]
${windowList}

[FORBIDDEN ZONES — touching these = MISSION FAILURE]
${forbiddenList}

[COMMAND LIMITS — enforced by kernel, cannot be bypassed]
  • MAX 3 commands per tick
  • MAX 1 "build" command per tick (forge cooldown)
  • Commands [${escalationList}] require urgency:"high"
  • "rm" only permitted under /home/user/** — never /system/**
  • "write" files: max 50KB content, valid path required

[BEHAVIORAL CONTRACT]
  1. Mission scope only — do not expand beyond the stated objective
  2. Prefer inspect/read before any write or delete decision
  3. When uncertain → write a log to /home/user/Desktop/ instead of acting
  4. Flag anything requiring human review by setting urgency:"high"
  5. Empty commands array = PROTOCOL VIOLATION = recorded as mission failure

[OUTPUT FORMAT — NO DEVIATION]
Pure JSON. No markdown fences. No prose. No comments.
Schema: { "mission": string, "action": string, "commands": string[], "urgency": "high"|"medium"|"low" }

════════════════════════════════════════════════════════════
MISSION BRIEF FOLLOWS:
════════════════════════════════════════════════════════════
`;
}
