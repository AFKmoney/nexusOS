import test from 'node:test';
import assert from 'node:assert';
import { nfrEngine } from './nfrEngine.ts';

test('nfrEngine.calculateEntropy - Empty string', () => {
  const entropy = nfrEngine.calculateEntropy('');
  assert.strictEqual(entropy, 0, 'Entropy of an empty string should be 0');
});

test('nfrEngine.calculateEntropy - Single character string', () => {
  const entropy = nfrEngine.calculateEntropy('a');
  assert.strictEqual(entropy, 0, 'Entropy of a single character should be 0');
});

test('nfrEngine.calculateEntropy - Identical characters', () => {
  const entropy = nfrEngine.calculateEntropy('aaaaaa');
  assert.strictEqual(entropy, 0, 'Entropy of identical characters should be 0');
});

test('nfrEngine.calculateEntropy - Uniformly distributed characters', () => {
  // "abcd": each char appears once, probability is 1/4
  // Entropy = - (4 * (1/4) * log2(1/4)) = -log2(1/4) = 2
  const entropy = nfrEngine.calculateEntropy('abcd');
  assert.strictEqual(entropy, 2, 'Entropy of uniformly distributed characters should be exactly 2');
});

test('nfrEngine.calculateEntropy - General string', () => {
  // "hello":
  // h: 1/5, e: 1/5, l: 2/5, o: 1/5
  // Entropy = - (3 * 0.2 * log2(0.2) + 0.4 * log2(0.4))
  // - (0.6 * -2.321928 + 0.4 * -1.321928) = 1.3931568 + 0.5287712 = 1.921928
  const entropy = nfrEngine.calculateEntropy('hello');

  // Checking with a small delta for floating point precision issues
  const expectedEntropy = 1.9219280948873623;
  assert.ok(Math.abs(entropy - expectedEntropy) < 1e-9, `Expected entropy to be close to ${expectedEntropy}, got ${entropy}`);
});

test('nfrEngine.calculateEntropy - Longer complex string', () => {
  const text = 'This is a test of the entropy calculation function.';
  const entropy = nfrEngine.calculateEntropy(text);
  assert.ok(entropy > 3 && entropy < 5, 'Entropy of a typical short English sentence should be reasonable (between 3 and 5)');
});
