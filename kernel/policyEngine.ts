import { uuid } from '../utils/uuid';
import { useOS } from '../store/osStore';

// ═══════════════════════════════════════════════════════════════════
// POLICY ENGINE v1.0 — Centralized Autonomy Permission Gateway
// Deny-by-default. Every action class is classified before execution.
// Phase 2 of the Autonomy Roadmap.
// ═══════════════════════════════════════════════════════════════════

export type PolicyDecision = 'allow' | 'deny' | 'require-approval' | 'require-staged';

export type ActionClass =
  | 'read-state'
  | 'read-file'
  | 'write-file'
  | 'delete-file'
  | 'open-app'
  | 'close-app'
  | 'install-app'
  | 'uninstall-app'
  | 'run-command'
  | 'network-request'
  | 'modify-kernel-rules'
  | 'modify-autonomy-policy'
  | 'self-modify-code'
  | 'system-reset';

export type ActionScope =
  | 'user'
  | 'app'
  | 'system'
  | 'kernel';

export interface PolicyContext {
  actionClass: ActionClass;
  scope: ActionScope;
  initiator: 'ai' | 'user' | 'system';
  targetPath?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyResult {
  id: string;
  decision: PolicyDecision;
  reason: string;
  actionClass: ActionClass;
  scope: ActionScope;
  initiator: PolicyContext['initiator'];
  timestamp: number;
  requiresApprovalFrom?: 'user' | 'admin';
}

type PolicyRule = {
  match: (ctx: PolicyContext) => boolean;
  decision: PolicyDecision;
  reason: string;
  requiresApprovalFrom?: 'user' | 'admin';
};

const DEFAULT_RULES: PolicyRule[] = [
  // System-reset always requires admin approval
  {
    match: ctx => ctx.actionClass === 'system-reset',
    decision: 'require-approval',
    reason: 'System reset is irreversible and requires explicit admin confirmation.',
    requiresApprovalFrom: 'admin',
  },
  // Self-modification always requires staged validation
  {
    match: ctx => ctx.actionClass === 'self-modify-code',
    decision: 'require-staged',
    reason: 'Code self-modification must pass full test-validate-stage cycle.',
  },
  // Modifying autonomy policy or kernel rules requires user approval
  {
    match: ctx =>
      ctx.actionClass === 'modify-autonomy-policy' ||
      ctx.actionClass === 'modify-kernel-rules',
    decision: 'require-approval',
    reason: 'Governance and kernel rule changes require human review.',
    requiresApprovalFrom: 'user',
  },
  // Kernel-scope AI actions are denied by default
  {
    match: ctx => ctx.scope === 'kernel' && ctx.initiator === 'ai',
    decision: 'deny',
    reason: 'AI-initiated kernel-scope actions are denied by default. Elevate scope explicitly.',
  },
  // File deletion by AI requires user approval
  {
    match: ctx => ctx.actionClass === 'delete-file' && ctx.initiator === 'ai',
    decision: 'require-approval',
    reason: 'AI-initiated file deletion requires user confirmation.',
    requiresApprovalFrom: 'user',
  },
  // File writes to system paths by AI require approval
  {
    match: ctx =>
      ctx.actionClass === 'write-file' &&
      ctx.initiator === 'ai' &&
      (ctx.targetPath?.startsWith('/system') ?? false),
    decision: 'require-approval',
    reason: 'AI writes to system paths require user approval.',
    requiresApprovalFrom: 'user',
  },
  // App uninstallation by AI requires user approval
  {
    match: ctx => ctx.actionClass === 'uninstall-app' && ctx.initiator === 'ai',
    decision: 'require-approval',
    reason: 'AI-initiated app uninstall requires user confirmation.',
    requiresApprovalFrom: 'user',
  },
  // Safe read operations are auto-allowed
  {
    match: ctx =>
      ctx.actionClass === 'read-state' ||
      ctx.actionClass === 'read-file',
    decision: 'allow',
    reason: 'Read-only operations are auto-approved.',
  },
  // AI-initiated run-command requires approval if scope is system
  {
    match: ctx =>
      ctx.actionClass === 'run-command' &&
      ctx.initiator === 'ai' &&
      ctx.scope === 'system',
    decision: 'require-approval',
    reason: 'AI system-level command execution requires user sign-off.',
    requiresApprovalFrom: 'user',
  },
  // App install by AI requires user approval (app-logic tier)
  {
    match: ctx => ctx.actionClass === 'install-app' && ctx.initiator === 'ai',
    decision: 'require-approval',
    reason: 'AI-initiated app installation requires user confirmation.',
    requiresApprovalFrom: 'user',
  },
  // App open/close by AI is allowed (ui tier — visible, non-destructive)
  {
    match: ctx =>
      (ctx.actionClass === 'open-app' || ctx.actionClass === 'close-app') &&
      ctx.initiator === 'ai',
    decision: 'allow',
    reason: 'AI app open/close is allowed at the ui trust tier.',
  },
  // Network requests by AI are allowed (ui tier)
  {
    match: ctx => ctx.actionClass === 'network-request' && ctx.initiator === 'ai',
    decision: 'allow',
    reason: 'AI network requests are allowed at the ui trust tier.',
  },
  // User-scope command execution and VFS file writes by AI are allowed
  {
    match: ctx =>
      (ctx.actionClass === 'run-command' || ctx.actionClass === 'write-file') &&
      ctx.initiator === 'ai' &&
      ctx.scope === 'user',
    decision: 'allow',
    reason: 'AI user-scope shell commands and VFS writes are allowed.',
  },
  // User-initiated actions are allowed by default
  {
    match: ctx => ctx.initiator === 'user',
    decision: 'allow',
    reason: 'User-initiated actions are allowed by default.',
  },
  // Deny anything else as fallback
  {
    match: () => true,
    decision: 'deny',
    reason: 'No explicit policy rule matched. Deny-by-default applied.',
  },
];

class PolicyEngine {
  private rules: PolicyRule[] = [...DEFAULT_RULES];
  private decisionLog: PolicyResult[] = [];
  private readonly MAX_LOG = 500;

  evaluate(ctx: PolicyContext): PolicyResult {
    let effectiveInitiator: PolicyContext['initiator'] = ctx.initiator;
    if (ctx.initiator === 'ai') {
      try {
        const fullAutonomy = useOS.getState()?.kernelRules?.fullAutonomy === true;
        if (fullAutonomy) {
          effectiveInitiator = 'user';
        }
      } catch {}
    }
    const effectiveCtx: PolicyContext = { ...ctx, initiator: effectiveInitiator };
    const rule = this.rules.find(r => r.match(effectiveCtx));

    const result: PolicyResult = {
      id: uuid(),
      decision: rule?.decision ?? 'deny',
      reason: rule?.reason ?? 'Deny-by-default (no rule matched).',
      actionClass: ctx.actionClass,
      scope: ctx.scope,
      initiator: ctx.initiator,
      timestamp: Date.now(),
      ...(rule?.requiresApprovalFrom !== undefined ? { requiresApprovalFrom: rule.requiresApprovalFrom } : {}),
    };

    this.decisionLog.push(result);
    if (this.decisionLog.length > this.MAX_LOG) {
      this.decisionLog.splice(0, this.decisionLog.length - this.MAX_LOG);
    }

    return result;
  }

  isAllowed(ctx: PolicyContext): boolean {
    return this.evaluate(ctx).decision === 'allow';
  }

  getDecisionLog(): PolicyResult[] {
    return [...this.decisionLog];
  }

  getDecisionById(id: string): PolicyResult | undefined {
    return this.decisionLog.find(r => r.id === id);
  }

  addRule(rule: PolicyRule, prepend = true): void {
    if (prepend) {
      this.rules.unshift(rule);
    } else {
      // Insert before the final catch-all deny rule
      this.rules.splice(this.rules.length - 1, 0, rule);
    }
  }

  resetToDefaults(): void {
    this.rules = [...DEFAULT_RULES];
  }
}

export const policyEngine = new PolicyEngine();
