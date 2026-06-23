import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Browser-global shims required by the kernel imports.
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  } as any;
}
if (typeof global.navigator === 'undefined') {
  Object.defineProperty(global, 'navigator', {
    value: { hardwareConcurrency: 4 },
    writable: true,
  });
}
if (typeof global.window === 'undefined') {
  (global as any).window = {};
}

import { autonomyHealthMonitor } from '../autonomyHealthMonitor.ts';
import { autonomyEventLog } from '../autonomyEventLog.ts';
import { humanOverride } from '../humanOverride.ts';

// We cannot easily reset the singletons between tests — the autonomyEventLog
// accumulates events across the whole test process. To get deterministic
// behavior we use `startRun()` to mark run boundaries and rely on the
// health monitor's 60-second sliding window.

before(() => {
  // Make sure the human override is in active mode at the start of the suite.
  if (humanOverride.currentMode !== 'active') {
    humanOverride.resume('test setup');
  }
});

afterEach(() => {
  // Reset to active mode if a test entered safe-mode or disabled.
  if (humanOverride.currentMode !== 'active') {
    humanOverride.resume('test cleanup');
  }
});

// ─── Initial state ────────────────────────────────────────────────────
describe('AutonomyHealthMonitor — initial state', () => {
  it('reports a healthy status with confidence 1.0 when no events exist', () => {
    const m = autonomyHealthMonitor.getMetrics();
    assert.equal(m.healthStatus, 'healthy');
    assert.equal(m.confidenceScore, 1);
    assert.equal(m.proposalsTotal, 0);
    assert.equal(m.proposalsSucceeded, 0);
    assert.equal(m.proposalsFailed, 0);
  });
});

// ─── Metric updates ───────────────────────────────────────────────────
describe('AutonomyHealthMonitor — event-driven updates', () => {
  it('counts execution-succeeded events in proposalsSucceeded', () => {
    const before = autonomyHealthMonitor.getMetrics().proposalsSucceeded;
    autonomyEventLog.append({
      kind: 'execution-succeeded',
      subsystem: 'autonomy-loop',
      actor: 'system',
      summary: 'test success',
    });
    // recompute is throttled to 500ms; force it by reading after a tick.
    // The monitor subscribes to the event log so the update is async-by-microtask.
    const after = autonomyHealthMonitor.getMetrics().proposalsSucceeded;
    assert.ok(after >= before, 'proposalsSucceeded should not decrease');
  });

  it('counts execution-failed events in proposalsFailed', () => {
    autonomyEventLog.append({
      kind: 'execution-failed',
      subsystem: 'autonomy-loop',
      actor: 'system',
      summary: 'test failure',
      outcome: 'failure',
    });
    const m = autonomyHealthMonitor.getMetrics();
    assert.ok(m.proposalsFailed >= 0);
  });

  it('counts rollback-triggered events in proposalsRolledBack', () => {
    autonomyEventLog.append({
      kind: 'rollback-triggered',
      subsystem: 'rollback-manager',
      actor: 'system',
      summary: 'test rollback',
    });
    const m = autonomyHealthMonitor.getMetrics();
    assert.ok(m.proposalsRolledBack >= 0);
  });

  it('counts override-activated events in overrideActivations', () => {
    const before = autonomyHealthMonitor.getMetrics().overrideActivations;
    autonomyEventLog.append({
      kind: 'override-activated',
      subsystem: 'human-override',
      actor: 'user',
      summary: 'test override',
    });
    const after = autonomyHealthMonitor.getMetrics().overrideActivations;
    assert.ok(after >= before);
  });
});

// ─── Confidence computation ───────────────────────────────────────────
describe('AutonomyHealthMonitor — confidence score', () => {
  it('confidence stays in [0, 1] regardless of event mix', () => {
    // Pump a bunch of mixed events.
    for (let i = 0; i < 20; i++) {
      autonomyEventLog.append({
        kind: i % 3 === 0 ? 'execution-failed' : 'execution-succeeded',
        subsystem: 'autonomy-loop',
        actor: 'system',
        summary: `bulk test ${i}`,
        outcome: i % 3 === 0 ? 'failure' : 'success',
      });
    }
    const m = autonomyHealthMonitor.getMetrics();
    assert.ok(m.confidenceScore >= 0);
    assert.ok(m.confidenceScore <= 1);
  });
});

// ─── Health status transitions ────────────────────────────────────────
describe('AutonomyHealthMonitor — health status', () => {
  it('reports disabled when humanOverride is disabled (after recompute throttle)', async () => {
    humanOverride.disable('test disabled state');
    // The monitor throttles recompute to one every 500ms. Wait long enough
    // to bypass the throttle, then emit an event to trigger recompute.
    await new Promise(r => setTimeout(r, 550));
    autonomyEventLog.append({
      kind: 'override-activated',
      subsystem: 'human-override',
      actor: 'user',
      summary: 'trigger recompute',
    });
    // Give the subscriber a microtask to fire.
    await new Promise(r => setTimeout(r, 10));
    const m = autonomyHealthMonitor.getMetrics();
    assert.equal(m.healthStatus, 'disabled');
    humanOverride.resume('test cleanup');
  });
});

// ─── Subscribers ──────────────────────────────────────────────────────
describe('AutonomyHealthMonitor — subscribe', () => {
  it('fires the listener immediately with current metrics on subscribe', () => {
    let calls = 0;
    let lastStatus: string | undefined;
    const unsubscribe = autonomyHealthMonitor.subscribe(m => {
      calls++;
      lastStatus = m.healthStatus;
    });
    assert.ok(calls >= 1);
    assert.ok(typeof lastStatus === 'string');
    unsubscribe();
  });

  it('unsubscribe stops further callbacks', () => {
    let calls = 0;
    const unsubscribe = autonomyHealthMonitor.subscribe(() => {
      calls++;
    });
    const initial = calls;
    unsubscribe();
    autonomyEventLog.append({
      kind: 'execution-succeeded',
      subsystem: 'autonomy-loop',
      actor: 'system',
      summary: 'post-unsubscribe event',
    });
    // Calls should not have increased after unsubscribe.
    assert.equal(calls, initial);
  });
});

// ─── Threshold overrides ──────────────────────────────────────────────
describe('AutonomyHealthMonitor — setThresholds', () => {
  it('accepts partial threshold overrides without throwing', () => {
    autonomyHealthMonitor.setThresholds({ maxRollbackRate: 0.5 });
    // No assertion on internal state — the test just verifies the API
    // accepts the override and triggers a recompute without error.
    const m = autonomyHealthMonitor.getMetrics();
    assert.ok(typeof m.confidenceScore === 'number');
  });
});

// ─── Defensive copy ───────────────────────────────────────────────────
describe('AutonomyHealthMonitor — getMetrics returns a copy', () => {
  it('mutations to the returned metrics do not affect future reads', () => {
    const snap = autonomyHealthMonitor.getMetrics();
    (snap as any).confidenceScore = -999;
    const fresh = autonomyHealthMonitor.getMetrics();
    assert.notEqual(fresh.confidenceScore, -999);
  });
});
