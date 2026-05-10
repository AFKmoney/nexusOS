import { autonomyEventLog } from './autonomyEventLog';
import { ActionClass, ActionScope } from './policyEngine';

// ═══════════════════════════════════════════════════════════════════
// TRUST TIER ENGINE v1.0 — Phase 8: Self-Evolution by Tier
//
// Trust hierarchy (ascending risk):
//   doc < ui < app-logic < kernel
//
// Each tier has its own approval gate, validation depth, and
// rollback requirements. AI may never self-escalate its trust tier.
// ═══════════════════════════════════════════════════════════════════

export type TrustTier = 'doc' | 'ui' | 'app-logic' | 'kernel';

export const TRUST_TIER_RANK: Record<TrustTier, number> = {
  doc: 0,
  ui: 1,
  'app-logic': 2,
  kernel: 3,
};

export type ApprovalGate =
  | 'auto'           // doc: no human needed
  | 'validate-only'  // ui: passes validation → auto-approved
  | 'user-approval'  // app-logic: human must click approve
  | 'admin-approval' // kernel: elevated approval, full test suite required

export interface TierPolicy {
  tier: TrustTier;
  approvalGate: ApprovalGate;
  requireFullTestSuite: boolean;
  requireRollbackPlan: boolean;
  allowSelfDeploy: boolean;
  description: string;
}

export const TIER_POLICIES: Record<TrustTier, TierPolicy> = {
  doc: {
    tier: 'doc',
    approvalGate: 'auto',
    requireFullTestSuite: false,
    requireRollbackPlan: false,
    allowSelfDeploy: true,
    description: 'Documentation changes. Auto-approved; no rollback plan required.',
  },
  ui: {
    tier: 'ui',
    approvalGate: 'validate-only',
    requireFullTestSuite: false,
    requireRollbackPlan: true,
    allowSelfDeploy: true,
    description: 'UI/theme/layout changes. Must pass validation; user review recommended.',
  },
  'app-logic': {
    tier: 'app-logic',
    approvalGate: 'user-approval',
    requireFullTestSuite: false,
    requireRollbackPlan: true,
    allowSelfDeploy: false,
    description: 'App-level logic changes. Require explicit user approval before staging.',
  },
  kernel: {
    tier: 'kernel',
    approvalGate: 'admin-approval',
    requireFullTestSuite: true,
    requireRollbackPlan: true,
    allowSelfDeploy: false,
    description: 'Kernel/security/permission changes. Require admin approval and full test suite.',
  },
};

export interface TierClassification {
  tier: TrustTier;
  policy: TierPolicy;
  reason: string;
  actionClass: ActionClass;
  scope: ActionScope;
}

// ── Classify an action class + scope into a trust tier ──────────────────────
const TIER_RULES: Array<{
  match: (actionClass: ActionClass, scope: ActionScope) => boolean;
  tier: TrustTier;
  reason: string;
}> = [
  // Kernel scope = kernel tier always
  {
    match: (_ac, scope) => scope === 'kernel',
    tier: 'kernel',
    reason: 'Kernel-scope operations are always classified at the kernel trust tier.',
  },
  // Code self-modification = kernel tier
  {
    match: ac => ac === 'self-modify-code',
    tier: 'kernel',
    reason: 'Self-modification of code is the highest-risk class.',
  },
  // Kernel/policy rule changes = kernel tier
  {
    match: ac => ac === 'modify-kernel-rules' || ac === 'modify-autonomy-policy',
    tier: 'kernel',
    reason: 'Governance and kernel rule changes are classified at the kernel trust tier.',
  },
  // System reset = kernel tier
  {
    match: ac => ac === 'system-reset',
    tier: 'kernel',
    reason: 'System reset is irreversible and classified at the kernel trust tier.',
  },
  // App install/uninstall = app-logic tier
  {
    match: ac => ac === 'install-app' || ac === 'uninstall-app',
    tier: 'app-logic',
    reason: 'App registry mutations are classified at the app-logic trust tier.',
  },
  // Command execution in system scope = app-logic tier
  {
    match: (ac, scope) => ac === 'run-command' && scope === 'system',
    tier: 'app-logic',
    reason: 'System-level command execution is classified at the app-logic trust tier.',
  },
  // File deletion = app-logic tier
  {
    match: ac => ac === 'delete-file',
    tier: 'app-logic',
    reason: 'File deletion is classified at the app-logic trust tier.',
  },
  // File writes to system paths = app-logic tier
  {
    match: (ac, scope) => ac === 'write-file' && scope === 'system',
    tier: 'app-logic',
    reason: 'System-path file writes are classified at the app-logic trust tier.',
  },
  // Network requests = ui tier (visible but non-destructive)
  {
    match: ac => ac === 'network-request',
    tier: 'ui',
    reason: 'Network requests are classified at the ui trust tier.',
  },
  // Open/close app = ui tier
  {
    match: ac => ac === 'open-app' || ac === 'close-app',
    tier: 'ui',
    reason: 'App window operations are classified at the ui trust tier.',
  },
  // User-scope file writes = ui tier
  {
    match: (ac, scope) => ac === 'write-file' && scope === 'user',
    tier: 'ui',
    reason: 'User-scope file writes are classified at the ui trust tier.',
  },
  // All reads = doc tier
  {
    match: ac => ac === 'read-file' || ac === 'read-state',
    tier: 'doc',
    reason: 'Read-only operations are classified at the doc trust tier.',
  },
];

const DEFAULT_TIER: TrustTier = 'app-logic';
const DEFAULT_TIER_REASON = 'No explicit rule matched — default app-logic tier applied.';

export interface TierEscalationResult {
  allowed: boolean;
  reason: string;
  requiredTier: TrustTier;
  currentTier: TrustTier;
}

type TierOverrideListener = (tier: TrustTier | null) => void;

class TrustTierEngine {
  private overrideTier: TrustTier | null = null;
  private listeners = new Set<TierOverrideListener>();

  // ── Subscribe to override changes ─────────────────────────────────────────
  subscribeOverride(listener: TierOverrideListener): () => void {
    this.listeners.add(listener);
    listener(this.overrideTier);
    return () => this.listeners.delete(listener);
  }

  classify(actionClass: ActionClass, scope: ActionScope): TierClassification {
    const rule = TIER_RULES.find(r => r.match(actionClass, scope));
    const tier = rule?.tier ?? DEFAULT_TIER;
    const reason = rule?.reason ?? DEFAULT_TIER_REASON;

    return {
      tier,
      policy: TIER_POLICIES[tier],
      reason,
      actionClass,
      scope,
    };
  }

  // ── Check whether an actor may act at a given tier ────────────────────────
  canActAtTier(
    actorTier: TrustTier,
    requiredTier: TrustTier
  ): TierEscalationResult {
    const actorRank = TRUST_TIER_RANK[actorTier];
    const requiredRank = TRUST_TIER_RANK[requiredTier];

    if (actorRank < requiredRank) {
      return {
        allowed: false,
        reason: `Actor tier '${actorTier}' (rank ${actorRank}) is insufficient for required tier '${requiredTier}' (rank ${requiredRank}). Tier escalation is not allowed.`,
        requiredTier,
        currentTier: actorTier,
      };
    }

    return {
      allowed: true,
      reason: `Actor tier '${actorTier}' satisfies required tier '${requiredTier}'.`,
      requiredTier,
      currentTier: actorTier,
    };
  }

  // ── Get the policy for a given tier ────────────────────────────────────────
  getPolicy(tier: TrustTier): TierPolicy {
    return TIER_POLICIES[tier];
  }

  // ── Determine approval gate for an actionClass + scope ────────────────────
  approvalGateFor(actionClass: ActionClass, scope: ActionScope): ApprovalGate {
    const { tier } = this.classify(actionClass, scope);
    return TIER_POLICIES[tier].approvalGate;
  }

  // ── Manual tier override for testing / emergency purposes ─────────────────
  setGlobalTierOverride(tier: TrustTier | null, reason: string): void {
    this.overrideTier = tier;
    autonomyEventLog.append({
      kind: 'trust-tier-override',
      subsystem: 'trust-tier-engine',
      actor: 'user',
      summary: tier
        ? `Trust tier override set to '${tier}': ${reason}`
        : `Trust tier override cleared: ${reason}`,
      metadata: { tier, reason },
    });
    this.listeners.forEach(l => l(tier));
  }

  getGlobalTierOverride(): TrustTier | null {
    return this.overrideTier;
  }

  // ── Summary of all tier policies ─────────────────────────────────────────
  getAllPolicies(): TierPolicy[] {
    return Object.values(TIER_POLICIES);
  }

  // ── Sorted tiers from least to most privileged ────────────────────────────
  getTiersAscending(): TrustTier[] {
    return (['doc', 'ui', 'app-logic', 'kernel'] as TrustTier[]);
  }
}

export const trustTierEngine = new TrustTierEngine();
