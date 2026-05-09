import { humanOverride } from './humanOverride';
import { autonomyHealthMonitor } from './autonomyHealthMonitor';
import { proposalEngine } from './proposalEngine';

// ═══════════════════════════════════════════════════════════════════
// GOVERNANCE BRIDGE — Syncs governance singletons to the OS store
// Called once at boot. Keeps GovernanceState in sync reactively.
// ═══════════════════════════════════════════════════════════════════

let initialized = false;

export function initGovernanceBridge(): void {
  if (initialized) return;
  initialized = true;

  // Lazy import to avoid circular dep at module parse time
  import('../store/osStore').then(({ useOS }) => {
    humanOverride.subscribe(state => {
      useOS.getState().updateGovernance({
        overrideMode: state.mode,
        overrideReason: state.reason,
      });
    });

    autonomyHealthMonitor.subscribe(metrics => {
      useOS.getState().updateGovernance({
        healthStatus: metrics.healthStatus,
        confidenceScore: metrics.confidenceScore,
        totalProposals: metrics.proposalsTotal,
        totalRollbacks: metrics.proposalsRolledBack,
      });
    });

    proposalEngine.subscribe(proposals => {
      const pending = proposals.filter(p => p.status === 'pending-approval').length;
      useOS.getState().updateGovernance({ pendingApprovals: pending });
    });
  }).catch(e => console.warn('[GovernanceBridge] Store import failed:', e));
}
