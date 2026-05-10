import { humanOverride } from './humanOverride';
import { autonomyHealthMonitor } from './autonomyHealthMonitor';
import { proposalEngine } from './proposalEngine';
import { stagingManager } from './stagingManager';
import { trustTierEngine } from './trustTierEngine';

// ═══════════════════════════════════════════════════════════════════
// GOVERNANCE BRIDGE — Syncs governance singletons to the OS store
// Called once at boot. Keeps GovernanceState in sync reactively.
// Now includes Phase 5 (staging) and Phase 8 (trust tiers).
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
        ...(state.reason !== undefined ? { overrideReason: state.reason } : {}),
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

    // Phase 5 — keep stagedArtifactCount and lastDeployStatus in sync
    stagingManager.subscribe(() => {
      const activeCount = stagingManager.getActiveCount();
      const records = stagingManager.getAllDeployRecords();
      const lastRecord = records.sort((a, b) => b.startedAt - a.startedAt)[0];
      useOS.getState().updateGovernance({
        stagedArtifactCount: activeCount,
        lastDeployStatus: lastRecord?.status ?? 'none',
      });
    });

    // Phase 8 — reflect global trust tier override into store reactively
    trustTierEngine.subscribeOverride(tier => {
      useOS.getState().updateGovernance({ activeTrustTierOverride: tier });
    });
  }).catch(e => console.warn('[GovernanceBridge] Store import failed:', e));
}
