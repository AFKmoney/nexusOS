import { test, describe, mock, afterEach } from 'node:test';
import * as assert from 'node:assert';
import { uuid } from './uuid.ts';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('uuid', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('generates a valid UUID v4', () => {
    const id = uuid();
    assert.strictEqual(typeof id, 'string');
    assert.match(id, UUID_V4_REGEX);
  });

  test('generates unique UUIDs', () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i++) {
      ids.add(uuid());
    }
    assert.strictEqual(ids.size, 1000);
  });

  test('fallback behavior when crypto.randomUUID is absent', () => {
    // Mock crypto.randomUUID to be undefined to force fallback to getRandomValues
    const originalRandomUUID = globalThis.crypto.randomUUID;
    (globalThis.crypto as any).randomUUID = undefined;

    try {
      const id = uuid();
      assert.match(id, UUID_V4_REGEX);
    } finally {
      globalThis.crypto.randomUUID = originalRandomUUID;
    }
  });

  test('fallback behavior when crypto.randomUUID and crypto.getRandomValues are absent', () => {
    // Mock crypto.randomUUID and crypto.getRandomValues to be undefined to force Math.random fallback
    const originalRandomUUID = globalThis.crypto.randomUUID;
    const originalGetRandomValues = globalThis.crypto.getRandomValues;
    (globalThis.crypto as any).randomUUID = undefined;
    (globalThis.crypto as any).getRandomValues = undefined;

    try {
      const id = uuid();
      assert.match(id, UUID_V4_REGEX);
    } finally {
      globalThis.crypto.randomUUID = originalRandomUUID;
      globalThis.crypto.getRandomValues = originalGetRandomValues;
    }
  });
});

describe('uuid - crypto completely undefined', () => {
  test('fallback behavior when crypto is completely undefined', () => {
    // Save original descriptor
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

    // Remove crypto entirely
    Object.defineProperty(globalThis, 'crypto', {
      get: () => undefined,
      configurable: true
    });

    try {
      const id = uuid();
      assert.match(id, UUID_V4_REGEX);
    } finally {
      // Restore original
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'crypto', originalDescriptor);
      }
    }
  });
});
