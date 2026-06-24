import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultStoreState, makeStoreId } from '../../store/osStore';

describe('store defaults and ids', () => {
  it('creates a stable default store state', () => {
    const state = createDefaultStoreState();

    assert.equal(typeof state, 'object');
    assert.ok(state !== null);
    assert.equal(typeof state.id, 'string');
    assert.ok(state.id.length > 0);
    assert.equal(state.id, makeStoreId());
    assert.ok(Array.isArray(state.apps));
    assert.ok(Array.isArray(state.recentFiles));
    assert.ok(Array.isArray(state.favorites));
  });

  it('creates a deterministic store id format', () => {
    const id = makeStoreId('kernel');
    assert.equal(id.startsWith('os-store-'), true);
    assert.equal(id.includes('kernel'), true);
  });

  it('uses a unique id when no seed is provided', () => {
    const id1 = makeStoreId();
    const id2 = makeStoreId();

    assert.equal(typeof id1, 'string');
    assert.equal(typeof id2, 'string');
    assert.ok(id1.length > 0);
    assert.ok(id2.length > 0);
  });
});