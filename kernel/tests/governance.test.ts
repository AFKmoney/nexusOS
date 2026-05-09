import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

// ── Browser shims ──────────────────────────────────────────────────
const localStorageStore: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
  length: 0,
  key: () => null,
};

import { policyEngine } from '../policyEngine';
import { autonomyEventLog } from '../autonomyEventLog';
import { proposalEngine } from '../proposalEngine';
import { validationPipeline } from '../validationPipeline';
import { rollbackManager } from '../rollbackManager';
import { humanOverride } from '../humanOverride';

// ═══════════════════════════════════════════════════════════════════
// POLICY ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

describe('PolicyEngine', () => {
  it('allows read-state for AI', () => {
    const result = policyEngine.evaluate({ actionClass: 'read-state', scope: 'user', initiator: 'ai' });
    assert.strictEqual(result.decision, 'allow');
  });

  it('allows read-file for AI', () => {
    const result = policyEngine.evaluate({ actionClass: 'read-file', scope: 'user', initiator: 'ai' });
    assert.strictEqual(result.decision, 'allow');
  });

  it('requires admin approval for system-reset', () => {
    const result = policyEngine.evaluate({ actionClass: 'system-reset', scope: 'system', initiator: 'ai' });
    assert.strictEqual(result.decision, 'require-approval');
    assert.strictEqual(result.requiresApprovalFrom, 'admin');
  });

  it('requires staged execution for self-modify-code', () => {
    const result = policyEngine.evaluate({ actionClass: 'self-modify-code', scope: 'system', initiator: 'ai' });
    assert.strictEqual(result.decision, 'require-staged');
  });

  it('denies kernel-scope AI actions', () => {
    const result = policyEngine.evaluate({ actionClass: 'run-command', scope: 'kernel', initiator: 'ai' });
    assert.strictEqual(result.decision, 'deny');
  });

  it('requires user approval for AI delete-file', () => {
    const result = policyEngine.evaluate({ actionClass: 'delete-file', scope: 'user', initiator: 'ai' });
    assert.strictEqual(result.decision, 'require-approval');
    assert.strictEqual(result.requiresApprovalFrom, 'user');
  });

  it('allows user-initiated actions by default', () => {
    const result = policyEngine.evaluate({ actionClass: 'run-command', scope: 'system', initiator: 'user' });
    assert.strictEqual(result.decision, 'allow');
  });

  it('isAllowed returns true for reads, false for denies', () => {
    assert.ok(policyEngine.isAllowed({ actionClass: 'read-state', scope: 'user', initiator: 'ai' }));
    assert.ok(!policyEngine.isAllowed({ actionClass: 'system-reset', scope: 'system', initiator: 'ai' }));
    assert.ok(!policyEngine.isAllowed({ actionClass: 'run-command', scope: 'kernel', initiator: 'ai' }));
  });

  it('populates the decision log with id and timestamp', () => {
    policyEngine.evaluate({ actionClass: 'read-file', scope: 'app', initiator: 'ai' });
    const log = policyEngine.getDecisionLog();
    assert.ok(log.length > 0);
    const last = log[log.length - 1]!;
    assert.ok(last.id);
    assert.ok(last.timestamp > 0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// AUTONOMY EVENT LOG TESTS
// ═══════════════════════════════════════════════════════════════════

describe('AutonomyEventLog', () => {
  it('append returns event with id, runId, and timestamp', () => {
    const event = autonomyEventLog.append({
      kind: 'proposal-created',
      subsystem: 'proposal-engine',
      actor: 'ai',
      summary: 'Test event',
    });
    assert.ok(event.id);
    assert.ok(event.runId);
    assert.strictEqual(event.kind, 'proposal-created');
    assert.ok(event.timestamp > 0);
  });

  it('getByKind filters correctly', () => {
    autonomyEventLog.append({ kind: 'execution-started', subsystem: 'autonomy-loop', actor: 'ai', summary: 'exec1' });
    const started = autonomyEventLog.getByKind('execution-started');
    assert.ok(started.length > 0);
    started.forEach(e => assert.strictEqual(e.kind, 'execution-started'));
  });

  it('startRun returns a new distinct runId', () => {
    const run1 = autonomyEventLog.getCurrentRunId();
    const run2 = autonomyEventLog.startRun();
    assert.notStrictEqual(run1, run2);
    assert.strictEqual(autonomyEventLog.getCurrentRunId(), run2);
  });

  it('getByRunId returns only events for that run', () => {
    const runId = autonomyEventLog.startRun();
    autonomyEventLog.append({ kind: 'proposal-created', subsystem: 'proposal-engine', actor: 'ai', summary: 'run event' });
    const events = autonomyEventLog.getByRunId(runId);
    assert.ok(events.length >= 1);
    events.forEach(e => assert.strictEqual(e.runId, runId));
  });

  it('getRecent respects the limit', () => {
    const recent = autonomyEventLog.getRecent(3);
    assert.ok(recent.length <= 3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PROPOSAL ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

const makeProposal = (overrides: Partial<Parameters<typeof proposalEngine.create>[0]> = {}) =>
  proposalEngine.create({
    title: 'Test proposal',
    description: 'A proposal for testing',
    actionClass: 'open-app',
    scope: 'user',
    riskLevel: 'low',
    affectedSubsystems: ['app-registry'],
    validationSteps: [{ name: 'check-app', description: 'Verify app exists', required: true }],
    rollbackPlan: 'Close the opened window',
    ...overrides,
  });

describe('ProposalEngine', () => {
  it('create returns a proposal with draft or denied status', () => {
    const p = makeProposal();
    assert.ok(p.id);
    assert.ok(['draft', 'denied'].includes(p.status));
  });

  it('kernel-scope AI proposals are denied immediately', () => {
    const p = makeProposal({ scope: 'kernel' });
    assert.strictEqual(p.status, 'denied');
    assert.ok(p.rejectionReason);
  });

  it('system-reset proposals require approval', () => {
    const p = makeProposal({ actionClass: 'system-reset', scope: 'system' });
    assert.strictEqual(p.approvalRequired, true);
  });

  it('approve transitions from pending-approval to approved', () => {
    const p = makeProposal();
    if (p.status === 'denied') return;
    proposalEngine.markPendingApproval(p.id);
    const approved = proposalEngine.approve(p.id);
    assert.strictEqual(approved?.status, 'approved');
    assert.ok(approved?.approvedAt);
  });

  it('deny records the rejection reason', () => {
    const p = makeProposal();
    if (p.status === 'denied') return;
    const denied = proposalEngine.deny(p.id, 'Too risky');
    assert.strictEqual(denied?.status, 'denied');
    assert.strictEqual(denied?.rejectionReason, 'Too risky');
  });

  it('markSucceeded transitions from executing to succeeded', () => {
    const p = makeProposal();
    if (p.status === 'denied') return;
    proposalEngine.approve(p.id);
    proposalEngine.markExecuting(p.id);
    const done = proposalEngine.markSucceeded(p.id);
    assert.strictEqual(done?.status, 'succeeded');
    assert.ok(done?.completedAt);
  });

  it('getPendingApprovals returns only pending-approval proposals', () => {
    const p = makeProposal({ actionClass: 'system-reset', scope: 'system' });
    proposalEngine.markValidating(p.id);
    proposalEngine.markPendingApproval(p.id);
    const pending = proposalEngine.getPendingApprovals();
    assert.ok(pending.some(x => x.id === p.id));
    pending.forEach(x => assert.strictEqual(x.status, 'pending-approval'));
  });
});

// ═══════════════════════════════════════════════════════════════════
// VALIDATION PIPELINE TESTS
// ═══════════════════════════════════════════════════════════════════

describe('ValidationPipeline', () => {
  it('well-formed low-risk proposal passes all validation steps', async () => {
    const p = proposalEngine.create({
      title: 'Open Calculator',
      description: 'Open the calculator app for the user',
      actionClass: 'open-app',
      scope: 'user',
      riskLevel: 'low',
      affectedSubsystems: ['window-manager'],
      validationSteps: [],
      rollbackPlan: 'Close the calculator window',
    });
    if (p.status === 'denied') return;
    const run = await validationPipeline.run(p.id);
    assert.strictEqual(run.status, 'passed');
    assert.ok(run.results.length > 0);
    run.results.forEach(r => assert.ok(r.passed));
  });

  it('proposal with empty title fails completeness check', async () => {
    const p = proposalEngine.create({
      title: '',
      description: 'Missing title proposal',
      actionClass: 'open-app',
      scope: 'user',
      riskLevel: 'low',
      affectedSubsystems: ['window-manager'],
      validationSteps: [],
      rollbackPlan: 'Nothing to rollback',
    });
    if (p.status === 'denied') return;
    const run = await validationPipeline.run(p.id);
    assert.strictEqual(run.status, 'failed');
    assert.ok(run.failureReason);
  });

  it('delete-file with "none" rollback plan fails rollback-adequacy check', async () => {
    const p = proposalEngine.create({
      title: 'Delete temp file',
      description: 'Remove a temp file from the desktop',
      actionClass: 'delete-file',
      scope: 'user',
      riskLevel: 'medium',
      affectedSubsystems: ['vfs'],
      validationSteps: [],
      rollbackPlan: 'none',
    });
    if (p.status === 'denied') return;
    const run = await validationPipeline.run(p.id);
    assert.strictEqual(run.status, 'failed');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ROLLBACK MANAGER TESTS
// ═══════════════════════════════════════════════════════════════════

describe('RollbackManager', () => {
  it('stores and retrieves snapshot data', () => {
    const snap = rollbackManager.snapshot('store-state', 'os-state', { windows: [], apps: [] });
    assert.ok(snap.id);
    assert.strictEqual(snap.kind, 'store-state');
    const retrieved = rollbackManager.getSnapshot(snap.id);
    assert.deepStrictEqual(retrieved?.data, { windows: [], apps: [] });
  });

  it('deep-clones snapshot data', () => {
    const original = { value: 42, nested: { x: 1 } };
    const snap = rollbackManager.snapshot('kernel-rules', 'main', original);
    original.value = 99;
    original.nested.x = 2;
    const retrieved = rollbackManager.getSnapshot(snap.id);
    assert.strictEqual((retrieved?.data as typeof original).value, 42);
  });

  it('rollback calls restoreFn and returns succeeded', async () => {
    const snap = rollbackManager.snapshot('vfs-file', '/home/test.txt', 'original content');
    let restored = '';
    const record = await rollbackManager.rollback([snap.id], async (s) => {
      restored = s.data as string;
    });
    assert.strictEqual(record.status, 'succeeded');
    assert.strictEqual(restored, 'original content');
  });

  it('rollback with missing snapshot id returns failed', async () => {
    const record = await rollbackManager.rollback(['nonexistent-id'], async () => {});
    assert.strictEqual(record.status, 'failed');
    assert.ok(record.failureReason?.includes('not found'));
  });

  it('getLatestSnapshot returns the most recent for kind+key', () => {
    rollbackManager.snapshot('app-registry', 'main', { apps: [1] });
    rollbackManager.snapshot('app-registry', 'main', { apps: [1, 2] });
    const latest = rollbackManager.getLatestSnapshot('app-registry', 'main');
    assert.deepStrictEqual((latest?.data as { apps: number[] }).apps, [1, 2]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// HUMAN OVERRIDE TESTS
// ═══════════════════════════════════════════════════════════════════

describe('HumanOverride', () => {
  before(() => {
    humanOverride.resume('Test suite setup');
  });

  it('starts (or resets) in active mode', () => {
    assert.strictEqual(humanOverride.currentMode, 'active');
    assert.ok(humanOverride.isAutonomyEnabled);
  });

  it('pause disables autonomy', () => {
    humanOverride.pause('Testing pause');
    assert.strictEqual(humanOverride.currentMode, 'paused');
    assert.ok(!humanOverride.isAutonomyEnabled);
    humanOverride.resume('Cleanup');
  });

  it('disable disables autonomy', () => {
    humanOverride.disable('Testing disable', { persistent: false });
    assert.strictEqual(humanOverride.currentMode, 'disabled');
    assert.ok(!humanOverride.isAutonomyEnabled);
    humanOverride.resume('Cleanup');
  });

  it('safe-mode disables autonomy', () => {
    humanOverride.enterSafeMode('Testing safe mode', { activatedBy: 'system', persistent: false });
    assert.strictEqual(humanOverride.currentMode, 'safe-mode');
    assert.ok(!humanOverride.isAutonomyEnabled);
    humanOverride.resume('Cleanup');
  });

  it('resume restores active mode', () => {
    humanOverride.pause('Before resume test');
    humanOverride.resume('Back to active');
    assert.strictEqual(humanOverride.currentMode, 'active');
    assert.ok(humanOverride.isAutonomyEnabled);
  });

  it('killSwitch sets persistent disabled mode', () => {
    humanOverride.killSwitch('Emergency stop test');
    assert.strictEqual(humanOverride.currentMode, 'disabled');
    assert.ok(humanOverride.currentState.persistent);
    humanOverride.resume('Cleanup after kill switch');
  });

  it('getHistory records mode transitions', () => {
    humanOverride.resume('Start history test');
    const before = humanOverride.getHistory().length;
    humanOverride.pause('History test pause');
    humanOverride.resume('History test resume');
    const after = humanOverride.getHistory().length;
    assert.ok(after >= before + 2);
  });

  it('subscribe notifies on state change', () => {
    const modes: string[] = [];
    const unsub = humanOverride.subscribe(s => modes.push(s.mode));
    humanOverride.pause('Subscription test');
    humanOverride.resume('Cleanup');
    unsub();
    assert.ok(modes.includes('paused'));
    assert.ok(modes.includes('active'));
  });
});
