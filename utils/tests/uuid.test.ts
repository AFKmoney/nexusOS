import test from 'node:test';
import assert from 'node:assert';
import { uuid } from '../uuid.ts';

test('uuid generates a valid UUID v4', () => {
  const id = uuid();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.match(id, uuidRegex);
});

test('uuid generates unique IDs', () => {
  const ids = new Set();
  for (let i = 0; i < 10000; i++) {
    ids.add(uuid());
  }
  assert.strictEqual(ids.size, 10000);
});

test('uuid uses fallback when crypto.randomUUID is unavailable but crypto.getRandomValues is available', () => {
  const originalCrypto = global.crypto;
  let getRandomValuesCalled = false;

  try {
    Object.defineProperty(global, 'crypto', {
      value: {
        ...originalCrypto,
        randomUUID: undefined,
        getRandomValues: (buf: Uint8Array) => {
          getRandomValuesCalled = true;
          return originalCrypto.getRandomValues(buf);
        }
      },
      writable: true,
      configurable: true
    });

    const id = uuid();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    assert.match(id, uuidRegex);
    assert.strictEqual(getRandomValuesCalled, true, 'getRandomValues should be called');
  } finally {
    Object.defineProperty(global, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true
    });
  }
});

test('uuid uses Math.random fallback when both randomUUID and getRandomValues are unavailable', () => {
  const originalCrypto = global.crypto;
  const originalMathRandom = Math.random;
  let mathRandomCalledCount = 0;

  try {
    Object.defineProperty(global, 'crypto', {
      value: undefined,
      writable: true,
      configurable: true
    });

    Math.random = () => {
      mathRandomCalledCount++;
      return 0.5; // Fixed value for predictable output in this test
    };

    const id = uuid();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    assert.match(id, uuidRegex);
    assert.strictEqual(mathRandomCalledCount, 16, 'Math.random should be called 16 times');
    // with 0.5, 0.5 * 256 | 0 = 128 (0x80)
    // byte 6 is (0x80 & 0x0f) | 0x40 = 0x00 | 0x40 = 0x40
    // byte 8 is (0x80 & 0x3f) | 0x80 = 0x00 | 0x80 = 0x80
    // So output should be 80808080-8080-4080-8080-808080808080
    assert.strictEqual(id, '80808080-8080-4080-8080-808080808080');
  } finally {
    Object.defineProperty(global, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true
    });
    Math.random = originalMathRandom;
  }
});
