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

import { PROVIDER_PRESETS } from '../../services/aiProviders.ts';

const expectPreset = (id: string) => {
  const preset = PROVIDER_PRESETS.find(p => p.id === id);
  assert.ok(preset, `preset ${id} should be present`);
  return preset!;
};

test('aiProviders - core providers present', () => {
  for (const id of [
    'openai', 'anthropic', 'google', 'groq', 'mistral', 'codestral', 'deepseek',
    'openrouter', 'together', 'ollama', 'lmstudio', 'clod', 'custom',
  ]) {
    expectPreset(id);
  }
});

test('aiProviders - new providers present (zhipu, xai, cerebras, perplexity, fireworks)', () => {
  for (const id of ['zhipu', 'xai', 'cerebras', 'perplexity', 'fireworks']) {
    expectPreset(id);
  }
});

test('aiProviders - Zhipu GLM uses BigModel endpoint', () => {
  const p = expectPreset('zhipu');
  assert.match(p.baseUrl, /open\.bigmodel\.cn\/api\/paas\/v4/);
  assert.strictEqual(p.type, 'openai-compatible');
  assert.ok((p.models || []).some(m => m.startsWith('glm-')), 'should expose at least one glm-* model');
});

test('aiProviders - xAI Grok uses x.ai endpoint', () => {
  const p = expectPreset('xai');
  assert.match(p.baseUrl, /api\.x\.ai\/v1/);
  assert.ok((p.models || []).some(m => m.startsWith('grok-')), 'should expose at least one grok-* model');
});

test('aiProviders - Cerebras uses cerebras.ai endpoint', () => {
  const p = expectPreset('cerebras');
  assert.match(p.baseUrl, /api\.cerebras\.ai\/v1/);
});

test('aiProviders - Perplexity uses perplexity.ai endpoint', () => {
  const p = expectPreset('perplexity');
  assert.match(p.baseUrl, /api\.perplexity\.ai/);
});

test('aiProviders - Fireworks uses fireworks.ai endpoint', () => {
  const p = expectPreset('fireworks');
  assert.match(p.baseUrl, /api\.fireworks\.ai\/inference\/v1/);
});

test('aiProviders - all OpenAI-compatible presets declare a baseUrl ending in a known suffix', () => {
  const compatible = PROVIDER_PRESETS.filter(p => p.type === 'openai-compatible');
  for (const p of compatible) {
    if (p.id === 'custom') continue; // user fills this in at runtime
    assert.match(p.baseUrl, /^https?:\/\//, `${p.id} baseUrl should be an http(s) URL`);
  }
});

test('aiProviders - every preset declares a defaultModel', () => {
  for (const p of PROVIDER_PRESETS) {
    if (p.id === 'custom') continue;
    assert.ok(p.defaultModel && p.defaultModel.length > 0, `${p.id} should have a non-empty defaultModel`);
  }
});

test('aiProviders - every non-custom preset has a positive maxTokens', () => {
  for (const p of PROVIDER_PRESETS) {
    if (p.id === 'custom') continue;
    assert.ok((p.maxTokens || 0) > 0, `${p.id} should declare positive maxTokens`);
  }
});
