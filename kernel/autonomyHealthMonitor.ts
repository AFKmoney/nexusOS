import { autonomyEventLog, AutonomyEvent } from './autonomyEventLog';
import { humanOverride } from './humanOverride';

// ═══════════════════════════════════════════════════════════════════
// AUTONOMY HEALTH MONITOR v1.0 — Runtime Metrics & Anomaly Detection
// Tracks success rates, failure rates, rollback rates, latency.
// Degrades autonomy confidence on repeated failures.
// Phase 7 of the Autonomy Roadmap.
// ═══════════════════════════════════════════════════════════════════

export interface AutonomyMetrics {
  proposalsTotal: number;
  proposalsSucceeded: number;
  proposalsFailed: number;
  proposalsRolledBack: number;
  proposalsDenied: number;
  validationFailures: number;
  rollbackSuccesses: number;
  rollbackFailures: number;
  policyDenials: number;
  overrideActivations: number;
  successRate: number;
  rollbackRate: number;
  validationFailureRate: number;
  confidenceScore: number;
  healthStatus: HealthStatus;
  lastUpdated: number;
}

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'disabled';

interface AnomalyThresholds {
  maxRollbackRate: number;
  maxValidationFailureRate: number;
  minSuccessRate: number;
  criticalRollbackRate: number;
  criticalValidationFailureRate: number;
}

const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  maxRollbackRate: 0.3,
  maxValidationFailureRate: 0.4,
  minSuccessRate: 0.5,
  criticalRollbackRate: 0.6,
  criticalValidationFailureRate: 0.7,
};

class AutonomyHealthMonitor {
  private metrics: AutonomyMetrics = this.buildEmpty();
  private thresholds: AnomalyThresholds = { ...DEFAULT_THRESHOLDS };
  private listeners = new Set<(m: AutonomyMetrics) => void>();
  private sampledAt = 0;
  private readonly SAMPLE_WINDOW_MS = 60_000;

  constructor() {
    autonomyEventLog.subscribe(events => this.recompute(events));
  }

  getMetrics(): AutonomyMetrics {
    return { ...this.metrics };
  }

  setThresholds(overrides: Partial<AnomalyThresholds>): void {
    this.thresholds = { ...this.thresholds, ...overrides };
    this.recompute(autonomyEventLog.getAll());
  }

  subscribe(listener: (m: AutonomyMetrics) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.metrics });
    return () => this.listeners.delete(listener);
  }

  private recompute(events: AutonomyEvent[]): void {
    const now = Date.now();
    if (now - this.sampledAt < 500) return;
    this.sampledAt = now;

    const windowStart = now - this.SAMPLE_WINDOW_MS;
    const recent = events.filter(e => e.timestamp >= windowStart);

    const proposalsTotal = this.count(recent, 'proposal-created') + this.count(recent, 'proposal-denied');
    const proposalsSucceeded = this.count(recent, 'execution-succeeded');
    const proposalsFailed = this.count(recent, 'execution-failed');
    const proposalsRolledBack = this.count(recent, 'rollback-triggered');
    const proposalsDenied = this.count(recent, 'proposal-denied');
    const validationFailures = this.count(recent, 'proposal-rejected');
    const rollbackSuccesses = this.count(recent, 'rollback-succeeded');
    const rollbackFailures = this.count(recent, 'rollback-failed');
    const policyDenials = recent.filter(e => e.kind === 'policy-decision').length;
    const overrideActivations = this.count(recent, 'override-activated');

    const executed = proposalsSucceeded + proposalsFailed;
    const successRate = executed > 0 ? proposalsSucceeded / executed : 1;
    const rollbackRate = executed > 0 ? proposalsRolledBack / Math.max(executed, 1) : 0;
    const validationAttempts = validationFailures + proposalsSucceeded + proposalsFailed;
    const validationFailureRate = validationAttempts > 0 ? validationFailures / validationAttempts : 0;

    const confidenceScore = this.computeConfidence(successRate, rollbackRate, validationFailureRate);
    const healthStatus = this.computeHealthStatus(confidenceScore);

    const previous = this.metrics.healthStatus;

    this.metrics = {
      proposalsTotal,
      proposalsSucceeded,
      proposalsFailed,
      proposalsRolledBack,
      proposalsDenied,
      validationFailures,
      rollbackSuccesses,
      rollbackFailures,
      policyDenials,
      overrideActivations,
      successRate,
      rollbackRate,
      validationFailureRate,
      confidenceScore,
      healthStatus,
      lastUpdated: now,
    };

    if (previous !== healthStatus) {
      this.onHealthStatusChange(previous, healthStatus);
    }

    this.emit();
  }

  private count(events: AutonomyEvent[], kind: AutonomyEvent['kind']): number {
    return events.filter(e => e.kind === kind).length;
  }

  private computeConfidence(successRate: number, rollbackRate: number, validationFailureRate: number): number {
    const base = successRate * 0.5 + (1 - rollbackRate) * 0.3 + (1 - validationFailureRate) * 0.2;
    return Math.max(0, Math.min(1, base));
  }

  private computeHealthStatus(confidence: number): HealthStatus {
    if (humanOverride.currentMode === 'disabled') return 'disabled';
    if (confidence >= 0.75) return 'healthy';
    if (confidence >= 0.4) return 'degraded';
    return 'critical';
  }

  private onHealthStatusChange(from: HealthStatus, to: HealthStatus): void {
    autonomyEventLog.append({
      kind: to === 'critical' || to === 'disabled' ? 'health-degraded' : 'health-recovered',
      subsystem: 'health-monitor',
      actor: 'system',
      summary: `Autonomy health changed: ${from} → ${to} (confidence: ${(this.metrics.confidenceScore * 100).toFixed(1)}%)`,
      metadata: { from, to, metrics: this.metrics },
    });

    if (to === 'critical' && from !== 'critical' && from !== 'disabled') {
      humanOverride.enterSafeMode(
        `Autonomy confidence critically low (${(this.metrics.confidenceScore * 100).toFixed(1)}%). Auto-entering safe mode.`,
        { activatedBy: 'system', persistent: false }
      );
    }
  }

  private buildEmpty(): AutonomyMetrics {
    return {
      proposalsTotal: 0,
      proposalsSucceeded: 0,
      proposalsFailed: 0,
      proposalsRolledBack: 0,
      proposalsDenied: 0,
      validationFailures: 0,
      rollbackSuccesses: 0,
      rollbackFailures: 0,
      policyDenials: 0,
      overrideActivations: 0,
      successRate: 1,
      rollbackRate: 0,
      validationFailureRate: 0,
      confidenceScore: 1,
      healthStatus: 'healthy',
      lastUpdated: Date.now(),
    };
  }

  private emit(): void {
    const snap = { ...this.metrics };
    this.listeners.forEach(l => l(snap));
  }
}

export const autonomyHealthMonitor = new AutonomyHealthMonitor();
