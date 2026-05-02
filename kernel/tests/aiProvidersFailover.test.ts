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

import { isTransientProviderError } from '../../services/aiProviders.ts';

test('failover - 5xx response is transient', () => {
  assert.strictEqual(isTransientProviderError(new Error('OpenAI API Error 503: Service Unavailable')), true);
  assert.strictEqual(isTransientProviderError(new Error('Anthropic API Error 502: Bad Gateway')), true);
  assert.strictEqual(isTransientProviderError(new Error('Gemini API Error 500: internal')), true);
});

test('failover - rate-limit (429) is transient', () => {
  assert.strictEqual(isTransientProviderError(new Error('OpenAI API Error 429: Too Many Requests')), true);
});

test('failover - timeout error is transient', () => {
  assert.strictEqual(isTransientProviderError(new Error('Request timeout after 30s')), true);
  assert.strictEqual(isTransientProviderError(new Error('fetch failed')), true);
  assert.strictEqual(isTransientProviderError(new Error('Operation aborted')), true);
});

test('failover - 4xx auth error is NOT transient', () => {
  assert.strictEqual(isTransientProviderError(new Error('OpenAI API Error 401: Invalid API key')), false);
  assert.strictEqual(isTransientProviderError(new Error('OpenAI API Error 403: Forbidden')), false);
  assert.strictEqual(isTransientProviderError(new Error('OpenAI API Error 404: Not Found')), false);
});

test('failover - 4xx bad-request is NOT transient', () => {
  // A malformed prompt should not trigger silent failover to a different
  // provider; the same prompt would fail there too.
  assert.strictEqual(isTransientProviderError(new Error('OpenAI API Error 400: invalid model')), false);
});

test('failover - non-Error values are not transient', () => {
  assert.strictEqual(isTransientProviderError('string error'), false);
  assert.strictEqual(isTransientProviderError(null), false);
  assert.strictEqual(isTransientProviderError(undefined), false);
  assert.strictEqual(isTransientProviderError({ message: 'hi' }), false);
});

test('failover - 408 / 425 / 429 are all transient', () => {
  assert.strictEqual(isTransientProviderError(new Error('API Error 408: Request Timeout')), true);
  assert.strictEqual(isTransientProviderError(new Error('API Error 425: Too Early')), true);
});
