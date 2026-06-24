import test from 'node:test';
import assert from 'node:assert';

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

import { computeTrustScore, _internal } from '../missionLearning.ts';

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;

test('missionLearning - empty history returns neutral score', () => {
  const score = computeTrustScore([], NOW);
  // Neutral = exact midpoint of [floor, ceiling].
  const expected = _internal.TRUST_FLOOR + 0.5 * (_internal.TRUST_CEILING - _internal.TRUST_FLOOR);
  assert.ok(Math.abs(score - expected) < 1e-9, `expected ${expected}, got ${score}`);
});

test('missionLearning - 5/5 successes pushes score above neutral', () => {
  const attempts = Array.from({ length: 5 }, () => ({ success: true, timestamp: NOW }));
  const score = computeTrustScore(attempts, NOW);
  assert.ok(score > 1.0, `expected score > 1.0 for 5/5 successes, got ${score}`);
  assert.ok(score <= _internal.TRUST_CEILING, `expected score <= ceiling, got ${score}`);
});

test('missionLearning - 0/5 successes pushes score below neutral', () => {
  const attempts = Array.from({ length: 5 }, () => ({ success: false, timestamp: NOW }));
  const score = computeTrustScore(attempts, NOW);
  assert.ok(score < 0.5, `expected score < 0.5 for 0/5 successes, got ${score}`);
  assert.ok(score >= _internal.TRUST_FLOOR, `expected score >= floor, got ${score}`);
});

test('missionLearning - mixed history sits between extremes', () => {
  const attempts = [
    { success: true, timestamp: NOW },
    { success: true, timestamp: NOW },
    { success: false, timestamp: NOW },
  ];
  const score = computeTrustScore(attempts, NOW);
  assert.ok(score > 0.4 && score < 1.2, `expected mid-range score, got ${score}`);
});

test('missionLearning - failures decay over time', () => {
  const recent = computeTrustScore([{ success: false, timestamp: NOW }], NOW);
  const old = computeTrustScore([{ success: false, timestamp: NOW - 24 * HOUR }], NOW);
  // A 24h-old failure should weigh less than a fresh one, so score is higher.
  assert.ok(old > recent, `old failure score ${old} should exceed fresh failure score ${recent}`);
});

test('missionLearning - successes also decay over time', () => {
  const recent = computeTrustScore([{ success: true, timestamp: NOW }], NOW);
  const old = computeTrustScore([{ success: true, timestamp: NOW - 24 * HOUR }], NOW);
  // A 24h-old success has less impact, so score is closer to neutral.
  const neutral = _internal.TRUST_FLOOR + 0.5 * (_internal.TRUST_CEILING - _internal.TRUST_FLOOR);
  assert.ok(Math.abs(old - neutral) < Math.abs(recent - neutral), 'old successes should decay toward neutral');
});

test('missionLearning - score is finite and bounded', () => {
  // Stress test with 1000 attempts to ensure numeric stability.
  const attempts = Array.from({ length: 1000 }, (_, i) => ({
    success: i % 2 === 0,
    timestamp: NOW - i * 1000,
  }));
  const score = computeTrustScore(attempts, NOW);
  assert.ok(Number.isFinite(score), 'score must be finite');
  assert.ok(score >= _internal.TRUST_FLOOR && score <= _internal.TRUST_CEILING, `score out of bounds: ${score}`);
});

test('missionLearning - storage key is namespaced', () => {
  assert.match(_internal.STORAGE_KEY, /^nexus_mission_history/);
});
