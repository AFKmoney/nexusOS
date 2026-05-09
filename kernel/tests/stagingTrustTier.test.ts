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

import { stagingManager, StagedArtifact } from '../stagingManager';
import { trustTierEngine, TRUST_TIER_RANK } from '../trustTierEngine';
import { autonomyEventLog } from '../autonomyEventLog';

// ═══════════════════════════════════════════════════════════════════
// STAGING MANAGER TESTS
// ═══════════════════════════════════════════════════════════════════

describe('StagingManager', () => {
  before(() => {
    // Clear event log state between describe blocks
    autonomyEventLog.startRun();
  });

  it('stages an artifact with status "staged"', () => {
    const a = stagingManager.stage('prop-1', 'config-patch', 'settings/theme', { color: 'blue' }, { color: 'red' });
    assert.strictEqual(a.status, 'staged');
    assert.strictEqual(a.proposalId, 'prop-1');
    assert.strictEqual(a.kind, 'config-patch');
    assert.strictEqual(a.key, 'settings/theme');
    assert.strictEqual(a.version, 1);
    assert.ok(a.id.length > 0);
    assert.ok(a.createdAt > 0);
  });

  it('increments version on re-stage of same key', () => {
    stagingManager.stage('prop-2', 'vfs-file', '/data/file.txt', 'v1', null);
    const v2 = stagingManager.stage('prop-2', 'vfs-file', '/data/file.txt', 'v2', 'v1');
    assert.strictEqual(v2.version, 2);
  });

  it('seals a staged artifact', () => {
    const a = stagingManager.stage('prop-3', 'generic', 'seal-test', {}, {});
    const sealed = stagingManager.seal(a.id);
    assert.ok(sealed);
    assert.strictEqual(sealed.status, 'sealed');
    assert.ok(sealed.sealedAt && sealed.sealedAt > 0);
  });

  it('seal returns null for non-existent artifact', () => {
    const result = stagingManager.seal('non-existent-id');
    assert.strictEqual(result, null);
  });

  it('seal returns null for already-sealed artifact', () => {
    const a = stagingManager.stage('prop-4', 'generic', 'double-seal', {}, {});
    stagingManager.seal(a.id);
    const second = stagingManager.seal(a.id);
    assert.strictEqual(second, null);
  });

  it('sealAll seals all staged artifacts for a proposal', () => {
    stagingManager.stage('prop-5', 'store-patch', 'key-a', {}, {});
    stagingManager.stage('prop-5', 'store-patch', 'key-b', {}, {});
    const sealed = stagingManager.sealAll('prop-5');
    assert.strictEqual(sealed.length, 2);
    sealed.forEach(a => assert.strictEqual(a.status, 'sealed'));
  });

  it('promote applies artifacts and marks them promoted', async () => {
    const a = stagingManager.stage('prop-6', 'config-patch', 'promote-key', { v: 2 }, { v: 1 });
    stagingManager.seal(a.id);

    const applied: StagedArtifact[] = [];
    const record = await stagingManager.promote('prop-6', async art => { applied.push(art); });

    assert.strictEqual(record.status, 'complete');
    assert.strictEqual(applied.length, 1);
    const promoted = stagingManager.get(a.id);
    assert.strictEqual(promoted?.status, 'promoted');
    assert.ok(promoted?.promotedAt && promoted.promotedAt > 0);
  });

  it('promote fails gracefully when applyFn throws', async () => {
    const a = stagingManager.stage('prop-7', 'generic', 'fail-key', {}, {});
    stagingManager.seal(a.id);

    const record = await stagingManager.promote('prop-7', async () => {
      throw new Error('disk full');
    });

    assert.strictEqual(record.status, 'failed');
    assert.ok(record.failureReason?.includes('disk full'));
  });

  it('revert marks artifacts as reverted and calls restoreFn', async () => {
    const a = stagingManager.stage('prop-8', 'vfs-file', '/revert/me', 'new', 'old');
    const restored: StagedArtifact[] = [];
    await stagingManager.revert('prop-8', async art => { restored.push(art); });
    assert.strictEqual(restored.length, 1);
    const art = stagingManager.get(a.id);
    assert.strictEqual(art?.status, 'reverted');
  });

  it('getByStatus returns only matching artifacts', () => {
    stagingManager.stage('prop-9', 'generic', 'status-query', {}, {});
    const staged = stagingManager.getByStatus('staged');
    assert.ok(staged.length >= 1);
    staged.forEach(a => assert.strictEqual(a.status, 'staged'));
  });

  it('getActiveCount returns staged + sealed count', () => {
    const before = stagingManager.getActiveCount();
    stagingManager.stage('prop-10', 'generic', 'count-key', {}, {});
    assert.strictEqual(stagingManager.getActiveCount(), before + 1);
  });

  it('emits staging-artifact-added event to autonomy log', () => {
    const beforeLen = autonomyEventLog.getAll().length;
    stagingManager.stage('prop-evt', 'generic', 'event-test', {}, {});
    const after = autonomyEventLog.getAll();
    const added = after.slice(beforeLen).find(e => e.kind === 'staging-artifact-added');
    assert.ok(added, 'staging-artifact-added event should be emitted');
    assert.strictEqual(added.subsystem, 'staging-manager');
  });

  it('subscribe fires with current artifacts immediately', async () => {
    let called = false;
    const unsub = stagingManager.subscribe(artifacts => {
      called = true;
      assert.ok(Array.isArray(artifacts));
    });
    assert.ok(called);
    unsub();
  });
});

// ═══════════════════════════════════════════════════════════════════
// TRUST TIER ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

describe('TrustTierEngine', () => {
  it('classifies read-state as doc tier', () => {
    const { tier } = trustTierEngine.classify('read-state', 'user');
    assert.strictEqual(tier, 'doc');
  });

  it('classifies read-file as doc tier', () => {
    const { tier } = trustTierEngine.classify('read-file', 'app');
    assert.strictEqual(tier, 'doc');
  });

  it('classifies open-app as ui tier', () => {
    const { tier } = trustTierEngine.classify('open-app', 'user');
    assert.strictEqual(tier, 'ui');
  });

  it('classifies network-request as ui tier', () => {
    const { tier } = trustTierEngine.classify('network-request', 'app');
    assert.strictEqual(tier, 'ui');
  });

  it('classifies install-app as app-logic tier', () => {
    const { tier } = trustTierEngine.classify('install-app', 'user');
    assert.strictEqual(tier, 'app-logic');
  });

  it('classifies delete-file as app-logic tier', () => {
    const { tier } = trustTierEngine.classify('delete-file', 'user');
    assert.strictEqual(tier, 'app-logic');
  });

  it('classifies self-modify-code as kernel tier', () => {
    const { tier } = trustTierEngine.classify('self-modify-code', 'system');
    assert.strictEqual(tier, 'kernel');
  });

  it('classifies modify-kernel-rules as kernel tier', () => {
    const { tier } = trustTierEngine.classify('modify-kernel-rules', 'system');
    assert.strictEqual(tier, 'kernel');
  });

  it('classifies system-reset as kernel tier', () => {
    const { tier } = trustTierEngine.classify('system-reset', 'system');
    assert.strictEqual(tier, 'kernel');
  });

  it('classifies any kernel-scope action as kernel tier', () => {
    const { tier } = trustTierEngine.classify('run-command', 'kernel');
    assert.strictEqual(tier, 'kernel');
  });

  it('doc tier has auto approval gate', () => {
    const { policy } = trustTierEngine.classify('read-file', 'user');
    assert.strictEqual(policy.approvalGate, 'auto');
    assert.strictEqual(policy.allowSelfDeploy, true);
    assert.strictEqual(policy.requireFullTestSuite, false);
  });

  it('ui tier has validate-only approval gate', () => {
    const { policy } = trustTierEngine.classify('open-app', 'user');
    assert.strictEqual(policy.approvalGate, 'validate-only');
  });

  it('app-logic tier has user-approval gate and no self-deploy', () => {
    const { policy } = trustTierEngine.classify('install-app', 'user');
    assert.strictEqual(policy.approvalGate, 'user-approval');
    assert.strictEqual(policy.allowSelfDeploy, false);
  });

  it('kernel tier has admin-approval gate and requires full test suite', () => {
    const { policy } = trustTierEngine.classify('self-modify-code', 'system');
    assert.strictEqual(policy.approvalGate, 'admin-approval');
    assert.strictEqual(policy.requireFullTestSuite, true);
    assert.strictEqual(policy.allowSelfDeploy, false);
  });

  it('TRUST_TIER_RANK is strictly ascending doc < ui < app-logic < kernel', () => {
    assert.ok(TRUST_TIER_RANK['doc'] < TRUST_TIER_RANK['ui']);
    assert.ok(TRUST_TIER_RANK['ui'] < TRUST_TIER_RANK['app-logic']);
    assert.ok(TRUST_TIER_RANK['app-logic'] < TRUST_TIER_RANK['kernel']);
  });

  it('canActAtTier allows actor at same rank', () => {
    const result = trustTierEngine.canActAtTier('app-logic', 'app-logic');
    assert.strictEqual(result.allowed, true);
  });

  it('canActAtTier allows actor at higher rank', () => {
    const result = trustTierEngine.canActAtTier('kernel', 'ui');
    assert.strictEqual(result.allowed, true);
  });

  it('canActAtTier blocks actor at lower rank', () => {
    const result = trustTierEngine.canActAtTier('ui', 'kernel');
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason.includes('insufficient'));
  });

  it('approvalGateFor returns correct gate', () => {
    assert.strictEqual(trustTierEngine.approvalGateFor('read-state', 'user'), 'auto');
    assert.strictEqual(trustTierEngine.approvalGateFor('open-app', 'user'), 'validate-only');
    assert.strictEqual(trustTierEngine.approvalGateFor('install-app', 'user'), 'user-approval');
    assert.strictEqual(trustTierEngine.approvalGateFor('self-modify-code', 'system'), 'admin-approval');
  });

  it('setGlobalTierOverride records to event log', () => {
    const before = autonomyEventLog.getAll().length;
    trustTierEngine.setGlobalTierOverride('ui', 'test override');
    const events = autonomyEventLog.getAll();
    const ev = events.slice(before).find(e => e.kind === 'trust-tier-override');
    assert.ok(ev, 'trust-tier-override event should be emitted');
    trustTierEngine.setGlobalTierOverride(null, 'clear override');
  });

  it('subscribeOverride fires immediately and on change', () => {
    const received: Array<string | null> = [];
    const unsub = trustTierEngine.subscribeOverride(t => received.push(t));
    // immediate call with current value (null after previous test cleared it)
    assert.strictEqual(received[0], null);
    trustTierEngine.setGlobalTierOverride('kernel', 'subscriber test');
    assert.strictEqual(received[1], 'kernel');
    trustTierEngine.setGlobalTierOverride(null, 'cleanup');
    assert.strictEqual(received[2], null);
    unsub();
    // no more calls after unsub
    trustTierEngine.setGlobalTierOverride('doc', 'post-unsub');
    assert.strictEqual(received.length, 3);
    // cleanup
    trustTierEngine.setGlobalTierOverride(null, 'cleanup');
  });

  it('getGlobalTierOverride returns null by default after clear', () => {
    assert.strictEqual(trustTierEngine.getGlobalTierOverride(), null);
  });

  it('getTiersAscending returns 4 tiers in order', () => {
    const tiers = trustTierEngine.getTiersAscending();
    assert.strictEqual(tiers.length, 4);
    assert.strictEqual(tiers[0], 'doc');
    assert.strictEqual(tiers[3], 'kernel');
  });

  it('getAllPolicies returns 4 policies', () => {
    const policies = trustTierEngine.getAllPolicies();
    assert.strictEqual(policies.length, 4);
  });
});
