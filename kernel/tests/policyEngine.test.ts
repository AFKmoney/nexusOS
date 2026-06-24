import { describe, it, beforeEach } from 'node:test';
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

import { policyEngine, type PolicyContext } from '../policyEngine.ts';

// ─── Helpers ──────────────────────────────────────────────────────────
function ctx(partial: Partial<PolicyContext>): PolicyContext {
  return {
    actionClass: 'read-state',
    scope: 'user',
    initiator: 'user',
    ...partial,
  };
}

beforeEach(() => {
  policyEngine.resetToDefaults();
});

// ─── Deny-by-default & catch-all ──────────────────────────────────────
describe('PolicyEngine — deny-by-default', () => {
  it('falls back to deny when no rule matches', () => {
    // Construct a context that should not match any of the explicit rules.
    // The fallback catch-all rule at the end of DEFAULT_RULES handles this.
    // We use a kernel-scope system-initiated action that is not covered by
    // the explicit AI-kernel deny rule.
    const result = policyEngine.evaluate({
      actionClass: 'run-command',
      scope: 'kernel',
      initiator: 'system',
    });
    assert.equal(result.decision, 'deny');
    assert.match(result.reason, /Deny-by-default/);
  });
});

// ─── Read operations ──────────────────────────────────────────────────
describe('PolicyEngine — read operations', () => {
  it('auto-allows read-state regardless of initiator', () => {
    for (const initiator of ['user', 'system', 'ai'] as const) {
      const result = policyEngine.evaluate(ctx({ actionClass: 'read-state', initiator }));
      assert.equal(result.decision, 'allow', `read-state should be allowed for initiator=${initiator}`);
    }
  });

  it('auto-allows read-file regardless of initiator', () => {
    const result = policyEngine.evaluate(ctx({ actionClass: 'read-file', initiator: 'ai' }));
    assert.equal(result.decision, 'allow');
  });
});

// ─── Critical actions ─────────────────────────────────────────────────
describe('PolicyEngine — critical actions', () => {
  it('system-reset always requires admin approval', () => {
    const result = policyEngine.evaluate(ctx({ actionClass: 'system-reset', initiator: 'admin' as any }));
    assert.equal(result.decision, 'require-approval');
    assert.equal(result.requiresApprovalFrom, 'admin');
  });

  it('self-modify-code always requires staged validation', () => {
    const result = policyEngine.evaluate(ctx({ actionClass: 'self-modify-code', initiator: 'user' }));
    assert.equal(result.decision, 'require-staged');
  });

  it('modify-kernel-rules requires user approval', () => {
    const result = policyEngine.evaluate(ctx({ actionClass: 'modify-kernel-rules', initiator: 'user' }));
    assert.equal(result.decision, 'require-approval');
    assert.equal(result.requiresApprovalFrom, 'user');
  });

  it('modify-autonomy-policy requires user approval', () => {
    const result = policyEngine.evaluate(ctx({ actionClass: 'modify-autonomy-policy', initiator: 'user' }));
    assert.equal(result.decision, 'require-approval');
    assert.equal(result.requiresApprovalFrom, 'user');
  });
});

// ─── AI-initiated actions ─────────────────────────────────────────────
describe('PolicyEngine — AI-initiated actions', () => {
  it('denies AI-initiated kernel-scope actions by default', () => {
    const result = policyEngine.evaluate({
      actionClass: 'run-command',
      scope: 'kernel',
      initiator: 'ai',
    });
    assert.equal(result.decision, 'deny');
    assert.match(result.reason, /denied by default/);
  });

  it('requires approval for AI-initiated delete-file', () => {
    const result = policyEngine.evaluate({
      actionClass: 'delete-file',
      scope: 'user',
      initiator: 'ai',
      targetPath: '/home/user/foo.txt',
    });
    assert.equal(result.decision, 'require-approval');
    assert.equal(result.requiresApprovalFrom, 'user');
  });

  it('requires approval for AI-initiated writes to /system', () => {
    const result = policyEngine.evaluate({
      actionClass: 'write-file',
      scope: 'system',
      initiator: 'ai',
      targetPath: '/system/config.json',
    });
    assert.equal(result.decision, 'require-approval');
    assert.equal(result.requiresApprovalFrom, 'user');
  });

  it('allows AI-initiated writes to /home/user (user scope)', () => {
    const result = policyEngine.evaluate({
      actionClass: 'write-file',
      scope: 'user',
      initiator: 'ai',
      targetPath: '/home/user/notes.md',
    });
    assert.equal(result.decision, 'allow');
  });

  it('requires approval for AI-initiated uninstall-app', () => {
    const result = policyEngine.evaluate({
      actionClass: 'uninstall-app',
      scope: 'app',
      initiator: 'ai',
    });
    assert.equal(result.decision, 'require-approval');
  });

  it('requires approval for AI-initiated install-app', () => {
    const result = policyEngine.evaluate({
      actionClass: 'install-app',
      scope: 'app',
      initiator: 'ai',
    });
    assert.equal(result.decision, 'require-approval');
  });

  it('requires approval for AI system-level run-command', () => {
    const result = policyEngine.evaluate({
      actionClass: 'run-command',
      scope: 'system',
      initiator: 'ai',
    });
    assert.equal(result.decision, 'require-approval');
  });

  it('allows AI user-scope run-command', () => {
    const result = policyEngine.evaluate({
      actionClass: 'run-command',
      scope: 'user',
      initiator: 'ai',
    });
    assert.equal(result.decision, 'allow');
  });

  it('allows AI open-app and close-app', () => {
    assert.equal(
      policyEngine.evaluate({ actionClass: 'open-app', scope: 'user', initiator: 'ai' }).decision,
      'allow'
    );
    assert.equal(
      policyEngine.evaluate({ actionClass: 'close-app', scope: 'user', initiator: 'ai' }).decision,
      'allow'
    );
  });

  it('allows AI network-request', () => {
    const result = policyEngine.evaluate({
      actionClass: 'network-request',
      scope: 'user',
      initiator: 'ai',
    });
    assert.equal(result.decision, 'allow');
  });
});

// ─── User-initiated actions ───────────────────────────────────────────
describe('PolicyEngine — user-initiated actions', () => {
  it('allows user-initiated actions by default (after specific AI rules do not match)', () => {
    // write-file by user is not matched by any AI-specific rule, so it
    // falls through to the "user-initiated actions are allowed" rule.
    const result = policyEngine.evaluate({
      actionClass: 'write-file',
      scope: 'user',
      initiator: 'user',
      targetPath: '/home/user/notes.md',
    });
    assert.equal(result.decision, 'allow');
  });
});

// ─── Decision log ─────────────────────────────────────────────────────
describe('PolicyEngine — decision log', () => {
  it('logs every evaluation with a unique id', () => {
    const before = policyEngine.getDecisionLog().length;
    policyEngine.evaluate(ctx({ actionClass: 'read-state' }));
    policyEngine.evaluate(ctx({ actionClass: 'read-file' }));
    const log = policyEngine.getDecisionLog();
    assert.equal(log.length, before + 2);
    const last = log[log.length - 1];
    const secondLast = log[log.length - 2];
    assert.ok(last && secondLast);
    assert.notEqual(last.id, secondLast.id);
  });

  it('can retrieve a decision by id', () => {
    const result = policyEngine.evaluate(ctx({ actionClass: 'system-reset' }));
    const fetched = policyEngine.getDecisionById(result.id);
    assert.ok(fetched);
    assert.equal(fetched.id, result.id);
    assert.equal(fetched.decision, result.decision);
  });

  it('returns undefined for an unknown id', () => {
    const fetched = policyEngine.getDecisionById('does-not-exist');
    assert.equal(fetched, undefined);
  });
});

// ─── Custom rules ─────────────────────────────────────────────────────
describe('PolicyEngine — custom rules', () => {
  it('prepends custom rules so they take priority', () => {
    policyEngine.addRule({
      match: c => c.actionClass === 'read-state',
      decision: 'deny',
      reason: 'Custom deny for testing.',
    });
    const result = policyEngine.evaluate(ctx({ actionClass: 'read-state' }));
    assert.equal(result.decision, 'deny');
    assert.match(result.reason, /Custom deny/);
  });

  it('resetToDefaults removes custom rules', () => {
    policyEngine.addRule({
      match: c => c.actionClass === 'read-state',
      decision: 'deny',
      reason: 'Custom deny for testing.',
    });
    policyEngine.resetToDefaults();
    const result = policyEngine.evaluate(ctx({ actionClass: 'read-state' }));
    assert.equal(result.decision, 'allow');
  });
});

// ─── isAllowed convenience ────────────────────────────────────────────
describe('PolicyEngine — isAllowed', () => {
  it('returns true for allowed decisions and false otherwise', () => {
    assert.equal(policyEngine.isAllowed(ctx({ actionClass: 'read-state' })), true);
    assert.equal(
      policyEngine.isAllowed({ actionClass: 'self-modify-code', scope: 'user', initiator: 'user' }),
      false
    );
    assert.equal(
      policyEngine.isAllowed({ actionClass: 'system-reset', scope: 'system', initiator: 'user' }),
      false
    );
  });
});
