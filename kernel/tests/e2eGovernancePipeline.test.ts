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

import { trustTierEngine } from '../trustTierEngine';
import { proposalEngine } from '../proposalEngine';
import { validationPipeline } from '../validationPipeline';
import { stagingManager } from '../stagingManager';
import { policyEngine } from '../policyEngine';
import { autonomyEventLog } from '../autonomyEventLog';

// ═══════════════════════════════════════════════════════════════════
// END-TO-END GOVERNANCE PIPELINE TEST
//
// Validates the full pipeline wired in autonomy.ts:
//   infer action class → classify tier → evaluate policy → route:
//     auto       → execute directly (no staging/proposal needed)
//     validate   → propose → validate → stage → promote
//     user/admin → propose → markPendingApproval → stage → seal
// ═══════════════════════════════════════════════════════════════════

describe('E2E Governance Pipeline', () => {
  before(() => {
    autonomyEventLog.startRun();
  });

  // ── Helper: mirrors inferActionClass logic from autonomy.ts ───────
  function inferActionClass(cmd: string, proposalType: string) {
    const lower = cmd.toLowerCase().trimStart();
    if (lower.startsWith('cat ') || lower.startsWith('ls ') || lower.startsWith('grep ')) {
      return { actionClass: 'read-file' as const, scope: 'user' as const };
    }
    if (lower.startsWith('rm ')) {
      return { actionClass: 'delete-file' as const, scope: 'user' as const };
    }
    if (lower.startsWith('write ') || lower.startsWith('touch ')) {
      return { actionClass: 'write-file' as const, scope: 'user' as const };
    }
    if (lower.startsWith('open ') || lower.startsWith('build ') || lower.startsWith('forge ')) {
      return { actionClass: 'open-app' as const, scope: 'user' as const };
    }
    if (proposalType === 'INSTALL_APP') {
      return { actionClass: 'install-app' as const, scope: 'system' as const };
    }
    if (proposalType === 'MODIFY_KERNEL_RULES') {
      return { actionClass: 'modify-kernel-rules' as const, scope: 'kernel' as const };
    }
    return { actionClass: 'run-command' as const, scope: 'user' as const };
  }

  // ──────────────────────────────────────────────────────────────────
  // 1. DOC TIER — auto gate: reads execute directly, no proposal needed
  // ──────────────────────────────────────────────────────────────────
  it('doc-tier read command: policy=allow, gate=auto, no proposal created', () => {
    const cmd = 'cat /home/user/Desktop/notes.txt';
    const { actionClass, scope } = inferActionClass(cmd, 'RUN_COMMAND');
    const { tier, policy: tierPolicy } = trustTierEngine.classify(actionClass, scope);
    const policyResult = policyEngine.evaluate({ actionClass, scope, initiator: 'ai' });

    // compute before assertions so TypeScript doesn't narrow the union away
    const needsApproval =
      policyResult.decision === 'require-approval' ||
      policyResult.decision === 'require-staged' ||
      tierPolicy.approvalGate === 'user-approval' ||
      tierPolicy.approvalGate === 'admin-approval';

    assert.strictEqual(tier, 'doc');
    assert.strictEqual(tierPolicy.approvalGate, 'auto');
    assert.strictEqual(policyResult.decision, 'allow');
    assert.strictEqual(needsApproval, false);
    assert.strictEqual(tierPolicy.allowSelfDeploy, true);
  });

  // ──────────────────────────────────────────────────────────────────
  // 2. UI TIER — validate-only gate: propose → validate → stage → promote
  // ──────────────────────────────────────────────────────────────────
  it('ui-tier open-app: full validate-only pipeline succeeds', async () => {
    const cmd = 'open notepad';
    const { actionClass, scope } = inferActionClass(cmd, 'RUN_COMMAND');
    const { tier, policy: tierPolicy } = trustTierEngine.classify(actionClass, scope);
    const policyResult = policyEngine.evaluate({ actionClass, scope, initiator: 'ai' });

    assert.strictEqual(tier, 'ui');
    assert.strictEqual(tierPolicy.approvalGate, 'validate-only');
    assert.strictEqual(policyResult.decision, 'allow');

    // Create proposal
    const proposal = proposalEngine.create({
      title: '[SCAN_ORGANIZE] open notepad',
      description: `Autonomous command from mission SCAN_ORGANIZE: ${cmd}`,
      actionClass,
      scope,
      riskLevel: 'low',
      affectedSubsystems: ['autonomy-loop', 'SCAN_ORGANIZE'],
      validationSteps: [],
      rollbackPlan: 'Revert via staging manager if needed.',
      payload: { cmd, missionId: 'SCAN_ORGANIZE', tier },
    });

    assert.strictEqual(proposal.status, 'draft');

    // Run validation pipeline — should pass and auto-approve
    const valRun = await validationPipeline.run(proposal.id);
    assert.strictEqual(valRun.status, 'passed');

    // After validation, proposal should be approved (approvalRequired=false for policy=allow)
    const proposalAfterVal = proposalEngine.get(proposal.id);
    assert.strictEqual(proposalAfterVal?.status, 'approved');

    // Mark executing
    proposalEngine.markExecuting(proposal.id);
    assert.strictEqual(proposalEngine.get(proposal.id)?.status, 'executing');

    // Stage artifact
    const artifact = stagingManager.stage(proposal.id, 'generic', cmd, cmd, null);
    stagingManager.seal(artifact.id);
    assert.strictEqual(stagingManager.get(artifact.id)?.status, 'sealed');

    // Promote (simulated applyFn)
    const executed: string[] = [];
    const deployRecord = await stagingManager.promote(proposal.id, async (art) => {
      executed.push(art.key);
    });

    assert.strictEqual(deployRecord.status, 'complete');
    assert.strictEqual(executed[0], cmd);

    // Mark succeeded
    proposalEngine.markSucceeded(proposal.id);
    assert.strictEqual(proposalEngine.get(proposal.id)?.status, 'succeeded');

    // Artifact promoted
    assert.strictEqual(stagingManager.get(artifact.id)?.status, 'promoted');
  });

  // ──────────────────────────────────────────────────────────────────
  // 3. APP-LOGIC TIER — user-approval gate: staged for dashboard
  // ──────────────────────────────────────────────────────────────────
  it('app-logic tier install-app: staged for user-approval, not executed', async () => {
    const cmd = 'INSTALL_APP calculator';
    const { actionClass, scope } = inferActionClass(cmd, 'INSTALL_APP');
    const { tier, policy: tierPolicy } = trustTierEngine.classify(actionClass, scope);

    const policyResult = policyEngine.evaluate({ actionClass, scope, initiator: 'ai' });

    // compute before assertions so TypeScript doesn't narrow the union away
    const needsHumanApproval =
      policyResult.decision === 'require-approval' ||
      policyResult.decision === 'require-staged' ||
      tierPolicy.approvalGate === 'user-approval' ||
      tierPolicy.approvalGate === 'admin-approval';

    assert.strictEqual(tier, 'app-logic');
    assert.strictEqual(tierPolicy.approvalGate, 'user-approval');
    assert.strictEqual(needsHumanApproval, true);

    // Create proposal
    const riskLevel = 'medium' as const;
    const proposal = proposalEngine.create({
      title: '[BUILD_UTILITY] INSTALL_APP calculator',
      description: `Autonomous command from mission BUILD_UTILITY: ${cmd}`,
      actionClass,
      scope,
      riskLevel,
      affectedSubsystems: ['autonomy-loop', 'BUILD_UTILITY'],
      validationSteps: [],
      rollbackPlan: 'No live state changed — artifact not yet promoted.',
      payload: { cmd, missionId: 'BUILD_UTILITY', tier },
    });

    // Force pending-approval (trust tier overrides policy auto-approve)
    proposalEngine.markPendingApproval(proposal.id);
    assert.strictEqual(proposalEngine.get(proposal.id)?.status, 'pending-approval');

    // Stage artifact and seal it
    const artifact = stagingManager.stage(
      proposal.id, 'generic', cmd, cmd, null,
      { tier, approvalGate: tierPolicy.approvalGate, missionId: 'BUILD_UTILITY' }
    );
    stagingManager.seal(artifact.id);

    // Artifact is sealed, waiting for human approval
    assert.strictEqual(stagingManager.get(artifact.id)?.status, 'sealed');

    // Proposal is pending — appears in dashboard
    const pending = proposalEngine.getPendingApprovals();
    const found = pending.find(p => p.id === proposal.id);
    assert.ok(found, 'proposal should be in pending-approval list');
    assert.strictEqual(found?.riskLevel, 'medium');
    assert.strictEqual(found?.payload?.tier, 'app-logic');
  });

  // ──────────────────────────────────────────────────────────────────
  // 4. KERNEL TIER — admin-approval gate: staged, requires admin review
  // ──────────────────────────────────────────────────────────────────
  it('kernel-tier modify-kernel-rules: staged for admin-approval', async () => {
    const cmd = 'modify-kernel-rules: allow all';
    const { actionClass, scope } = inferActionClass(cmd, 'MODIFY_KERNEL_RULES');
    const { tier, policy: tierPolicy } = trustTierEngine.classify(actionClass, scope);

    const policyResult = policyEngine.evaluate({ actionClass, scope, initiator: 'ai' });

    // compute before assertions so TypeScript doesn't narrow the union away
    const needsHumanApproval =
      policyResult.decision === 'require-approval' ||
      policyResult.decision === 'require-staged' ||
      tierPolicy.approvalGate === 'user-approval' ||
      tierPolicy.approvalGate === 'admin-approval';

    assert.strictEqual(tier, 'kernel');
    assert.strictEqual(tierPolicy.approvalGate, 'admin-approval');
    assert.strictEqual(tierPolicy.requireFullTestSuite, true);
    assert.strictEqual(tierPolicy.allowSelfDeploy, false);
    assert.strictEqual(needsHumanApproval, true);

    const proposal = proposalEngine.create({
      title: '[SELF_IMPROVEMENT] modify-kernel-rules',
      description: `Autonomous command: ${cmd}`,
      actionClass,
      scope,
      riskLevel: 'critical',
      affectedSubsystems: ['autonomy-loop', 'kernel'],
      validationSteps: [],
      rollbackPlan: 'No live state changed — artifact not yet promoted.',
      payload: { cmd, missionId: 'SELF_IMPROVEMENT', tier },
    });

    proposalEngine.markPendingApproval(proposal.id);

    const artifact = stagingManager.stage(
      proposal.id, 'generic', cmd, cmd, null,
      { tier: 'kernel', approvalGate: 'admin-approval' }
    );
    stagingManager.seal(artifact.id);

    assert.strictEqual(proposalEngine.get(proposal.id)?.status, 'pending-approval');
    assert.strictEqual(stagingManager.get(artifact.id)?.status, 'sealed');
    assert.strictEqual(proposalEngine.get(proposal.id)?.riskLevel, 'critical');
  });

  // ──────────────────────────────────────────────────────────────────
  // 5. FULL PIPELINE: dashboard approval → promote → succeed
  // ──────────────────────────────────────────────────────────────────
  it('dashboard approval flow: pending → approved → promoted → succeeded', async () => {
    // Simulate a proposal already staged and pending
    const proposal = proposalEngine.create({
      title: '[BUILD_UTILITY] write /home/user/Desktop/test.txt',
      description: 'Write a test file autonomously',
      actionClass: 'write-file',
      scope: 'user',
      riskLevel: 'low',
      affectedSubsystems: ['autonomy-loop'],
      validationSteps: [],
      rollbackPlan: 'Delete the file to revert.',
      payload: { cmd: 'write /home/user/Desktop/test.txt "hello"' },
    });
    proposalEngine.markPendingApproval(proposal.id);
    const artifact = stagingManager.stage(proposal.id, 'vfs-file', '/home/user/Desktop/test.txt', 'hello', null);
    stagingManager.seal(artifact.id);

    // User approves from dashboard
    proposalEngine.approve(proposal.id);
    assert.strictEqual(proposalEngine.get(proposal.id)?.status, 'approved');

    // Execute via promote
    proposalEngine.markExecuting(proposal.id);
    const deployed: string[] = [];
    const deployRecord = await stagingManager.promote(proposal.id, async (art) => {
      deployed.push(art.key);
    });
    assert.strictEqual(deployRecord.status, 'complete');
    assert.strictEqual(deployed[0], '/home/user/Desktop/test.txt');

    proposalEngine.markSucceeded(proposal.id);
    assert.strictEqual(proposalEngine.get(proposal.id)?.status, 'succeeded');

    // Full audit trail present
    const events = autonomyEventLog.getAll();
    const hasCreated = events.some(e => e.kind === 'proposal-created' && e.proposalId === proposal.id);
    const hasApproved = events.some(e => e.kind === 'proposal-approved' && e.proposalId === proposal.id);
    const hasSucceeded = events.some(e => e.kind === 'execution-succeeded' && e.proposalId === proposal.id);
    assert.ok(hasCreated, 'audit log: proposal-created event present');
    assert.ok(hasApproved, 'audit log: proposal-approved event present');
    assert.ok(hasSucceeded, 'audit log: execution-succeeded event present');
  });

  // ──────────────────────────────────────────────────────────────────
  // 6. REVERT FLOW: promote → revert → artifacts marked reverted
  // ──────────────────────────────────────────────────────────────────
  it('revert flow: staged artifact can be reverted with restoreFn', async () => {
    const proposal = proposalEngine.create({
      title: '[SYSTEM_AUDIT] rm /home/user/Desktop/old.txt',
      description: 'Remove old file autonomously',
      actionClass: 'delete-file',
      scope: 'user',
      riskLevel: 'medium',
      affectedSubsystems: ['autonomy-loop'],
      validationSteps: [],
      rollbackPlan: 'Restore original file from snapshot.',
      payload: { cmd: 'rm /home/user/Desktop/old.txt' },
    });

    const artifact = stagingManager.stage(
      proposal.id, 'vfs-file', '/home/user/Desktop/old.txt', null, 'original content'
    );

    const restored: string[] = [];
    await stagingManager.revert(proposal.id, async (art) => {
      restored.push(art.key);
    });

    assert.strictEqual(restored[0], '/home/user/Desktop/old.txt');
    assert.strictEqual(stagingManager.get(artifact.id)?.status, 'reverted');

    proposalEngine.markRolledBack(proposal.id);
    assert.strictEqual(proposalEngine.get(proposal.id)?.status, 'rolled-back');
  });

  // ──────────────────────────────────────────────────────────────────
  // 7. TRUST TIER RANK GATE enforced throughout pipeline
  // ──────────────────────────────────────────────────────────────────
  it('canActAtTier: doc actor cannot perform kernel action', () => {
    const result = trustTierEngine.canActAtTier('doc', 'kernel');
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason.includes('insufficient'));
  });

  it('canActAtTier: kernel actor can perform any action', () => {
    assert.strictEqual(trustTierEngine.canActAtTier('kernel', 'doc').allowed, true);
    assert.strictEqual(trustTierEngine.canActAtTier('kernel', 'ui').allowed, true);
    assert.strictEqual(trustTierEngine.canActAtTier('kernel', 'app-logic').allowed, true);
    assert.strictEqual(trustTierEngine.canActAtTier('kernel', 'kernel').allowed, true);
  });

  // ──────────────────────────────────────────────────────────────────
  // 8. STAGED ARTIFACT COUNT synced correctly
  // ──────────────────────────────────────────────────────────────────
  it('stagedArtifactCount reflects active (staged + sealed) artifacts', () => {
    const before = stagingManager.getActiveCount();
    const p1 = stagingManager.stage('count-test-1', 'generic', 'key-a', {}, null);
    const p2 = stagingManager.stage('count-test-2', 'generic', 'key-b', {}, null);
    assert.strictEqual(stagingManager.getActiveCount(), before + 2);
    stagingManager.seal(p1.id);
    // sealed still counts as active
    assert.strictEqual(stagingManager.getActiveCount(), before + 2);
    stagingManager.seal(p2.id);
    assert.strictEqual(stagingManager.getActiveCount(), before + 2);
  });
});
