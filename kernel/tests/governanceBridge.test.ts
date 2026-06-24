import { describe, it } from 'node:test';
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

import { initGovernanceBridge } from '../governanceBridge.ts';

// ─── Idempotency ──────────────────────────────────────────────────────
describe('GovernanceBridge — initialization', () => {
  it('initGovernanceBridge is idempotent (safe to call multiple times)', () => {
    assert.doesNotThrow(() => initGovernanceBridge());
    assert.doesNotThrow(() => initGovernanceBridge());
    assert.doesNotThrow(() => initGovernanceBridge());
  });

  it('does not throw if the OS store is unavailable (lazy import path)', async () => {
    // The bridge lazy-imports ../store/osStore which is browser-targeted.
    // In the Node test environment the import may or may not succeed
    // depending on whether the store's browser globals are shimmed. The
    // important contract is that the bridge does not throw synchronously
    // and does not crash the test process.
    assert.doesNotThrow(() => initGovernanceBridge());
    // Give the lazy import promise a tick to settle.
    await new Promise(r => setTimeout(r, 50));
  });
});
