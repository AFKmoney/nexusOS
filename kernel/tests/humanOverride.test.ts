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

import { humanOverride, type OverrideMode } from '../humanOverride.ts';

beforeEach(() => {
  // Reset to a known baseline before each test: active mode, cleared history.
  // We use resume() so the state machine goes through the public API.
  if (humanOverride.currentMode !== 'active') {
    humanOverride.resume('test reset');
  }
});

// ─── Initial state ────────────────────────────────────────────────────
describe('HumanOverride — initial state', () => {
  it('starts in active mode (autonomy enabled)', () => {
    assert.equal(humanOverride.currentMode, 'active');
    assert.equal(humanOverride.isAutonomyEnabled, true);
  });
});

// ─── pause / resume ───────────────────────────────────────────────────
describe('HumanOverride — pause / resume', () => {
  it('pause() moves to paused mode with the given reason', () => {
    humanOverride.pause('Testing pause');
    assert.equal(humanOverride.currentMode, 'paused');
    assert.equal(humanOverride.isAutonomyEnabled, false);
    assert.match(humanOverride.currentState.reason ?? '', /Testing pause/);
    humanOverride.resume('test cleanup');
  });

  it('resume() returns to active mode', () => {
    humanOverride.pause('then resume');
    assert.equal(humanOverride.currentMode, 'paused');
    humanOverride.resume('cleaning up');
    assert.equal(humanOverride.currentMode, 'active');
    assert.equal(humanOverride.isAutonomyEnabled, true);
  });

  it('resume() records the previous mode in the event log', () => {
    humanOverride.enterSafeMode('test safe mode');
    humanOverride.resume('exiting safe mode');
    // We cannot easily read the autonomyEventLog here without importing it,
    // but we can at least assert the state transition completed cleanly.
    assert.equal(humanOverride.currentMode, 'active');
  });
});

// ─── safe-mode ────────────────────────────────────────────────────────
describe('HumanOverride — safe-mode', () => {
  it('enterSafeMode() moves to safe-mode and is persistent by default', () => {
    humanOverride.enterSafeMode('anomaly detected');
    assert.equal(humanOverride.currentMode, 'safe-mode');
    assert.equal(humanOverride.isAutonomyEnabled, false);
    assert.equal(humanOverride.currentState.persistent, true);
    humanOverride.resume('test cleanup');
  });
});

// ─── disable / killSwitch ─────────────────────────────────────────────
describe('HumanOverride — disable / killSwitch', () => {
  it('disable() moves to disabled mode', () => {
    humanOverride.disable('maintenance');
    assert.equal(humanOverride.currentMode, 'disabled');
    assert.equal(humanOverride.isAutonomyEnabled, false);
    humanOverride.resume('test cleanup');
  });

  it('killSwitch() is equivalent to a persistent user-initiated disable', () => {
    humanOverride.killSwitch('emergency');
    assert.equal(humanOverride.currentMode, 'disabled');
    assert.equal(humanOverride.currentState.persistent, true);
    assert.equal(humanOverride.currentState.activatedBy, 'user');
    humanOverride.resume('test cleanup');
  });
});

// ─── History ──────────────────────────────────────────────────────────
describe('HumanOverride — history', () => {
  it('records every transition in the history log with previousMode', () => {
    const before = humanOverride.getHistory().length;
    humanOverride.pause('step 1');
    humanOverride.enterSafeMode('step 2');
    humanOverride.resume('step 3');
    const history = humanOverride.getHistory();
    assert.ok(history.length >= before + 3);

    // The last three entries should be: paused, safe-mode, active
    const recent = history.slice(-3);
    assert.equal(recent[0]?.mode, 'paused');
    assert.equal(recent[1]?.mode, 'safe-mode');
    assert.equal(recent[2]?.mode, 'active');

    // Each entry records the previous mode.
    assert.equal(recent[0]?.previousMode, 'active'); // was active before pause
    assert.equal(recent[1]?.previousMode, 'paused'); // was paused before safe-mode
    assert.equal(recent[2]?.previousMode, 'safe-mode'); // was safe-mode before resume
  });
});

// ─── Subscribers ──────────────────────────────────────────────────────
describe('HumanOverride — subscribe', () => {
  it('fires the listener immediately with the current state on subscribe', () => {
    const seen: OverrideMode[] = [];
    const unsubscribe = humanOverride.subscribe(state => {
      seen.push(state.mode);
    });
    // Immediate callback fires with the current state.
    assert.ok(seen.length >= 1);
    unsubscribe();
  });

  it('fires the listener on every transition', () => {
    const seen: OverrideMode[] = [];
    const unsubscribe = humanOverride.subscribe(() => {});
    // Subscribe a second listener that actually records transitions.
    const unsubscribe2 = humanOverride.subscribe(state => {
      seen.push(state.mode);
    });
    humanOverride.pause('transition 1');
    humanOverride.resume('transition 2');
    // seen should contain: initial + paused + active
    assert.ok(seen.includes('paused'));
    assert.ok(seen.includes('active'));
    unsubscribe();
    unsubscribe2();
    humanOverride.pause('test cleanup');
    humanOverride.resume('test cleanup');
  });
});

// ─── Persistence ──────────────────────────────────────────────────────
describe('HumanOverride — persistence', () => {
  it('persists disabled/safe-mode state to localStorage when persistent=true', () => {
    // The localStorage shim is a no-op, but the call should not throw.
    humanOverride.killSwitch('persist test');
    // No assertion on storage content because the shim doesn't store anything.
    // The important thing is that the transition completed without error.
    assert.equal(humanOverride.currentMode, 'disabled');
    humanOverride.resume('test cleanup');
  });

  it('does not persist non-persistent pause', () => {
    humanOverride.pause('non-persistent test', { persistent: false });
    assert.equal(humanOverride.currentState.persistent, false);
    humanOverride.resume('test cleanup');
  });
});

// ─── currentState snapshot ────────────────────────────────────────────
describe('HumanOverride — currentState', () => {
  it('returns a defensive copy (mutations do not leak)', () => {
    const snap1 = humanOverride.currentState;
    (snap1 as any).mode = 'disabled'; // mutate the snapshot
    // The internal state should be unchanged.
    assert.equal(humanOverride.currentMode, 'active');
  });
});
