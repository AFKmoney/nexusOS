import test from 'node:test';
import assert from 'node:assert';

// Provide shims for browser globals
global.localStorage = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
  clear: () => {},
  length: 0,
  key: (index: number) => null,
} as any;

Object.defineProperty(global, 'navigator', {
  value: {
    hardwareConcurrency: 4,
  },
  writable: true
});

// Node 22 has fetch, but if not we could mock it
if (typeof global.fetch === 'undefined') {
  (global as any).fetch = async () => ({ ok: false, json: async () => ({}) });
}

import { ErrorGuard } from '../errorGuard.ts';

test('ErrorGuard - validate unknown OS action', () => {
  const errorGuard = ErrorGuard.getInstance();
  const invalidText = "OS::FAKE_ACTION:some_data";
  const result = errorGuard.validate(invalidText);

  const hasInvalidActionError = result.errors.some(e =>
    e.type === 'OS_ACTION_INVALID' && e.message.includes('Unknown OS action: "OS::FAKE_ACTION"')
  );

  assert.ok(hasInvalidActionError, 'Should report OS_ACTION_INVALID for unknown action');
});

test('ErrorGuard - validate valid OS action', () => {
  const errorGuard = ErrorGuard.getInstance();
  const validText = "OS::OPEN_APP:terminal";
  const result = errorGuard.validate(validText);

  const hasInvalidActionError = result.errors.some(e => e.type === 'OS_ACTION_INVALID');

  assert.ok(!hasInvalidActionError, 'Should not report error for valid OS action');
});

test('ErrorGuard - validate WRITE_FILE missing content', () => {
  const errorGuard = ErrorGuard.getInstance();
  const invalidText = "OS::WRITE_FILE:/path/to/file";
  const result = errorGuard.validate(invalidText);

  const hasMissingContentError = result.errors.some(e =>
    e.type === 'OS_ACTION_INVALID' && e.message.includes('OS::WRITE_FILE missing content')
  );

  assert.ok(hasMissingContentError, 'Should report error for WRITE_FILE missing content');
});
