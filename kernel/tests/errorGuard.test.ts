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

global.navigator = {
  hardwareConcurrency: 4,
} as any;

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

test('ErrorGuard - validateHTML: ignores plain text', () => {
  const errorGuard = ErrorGuard.getInstance();
  const validText = "Just some plain text without any HTML tags.";
  const result = errorGuard.validate(validText);

  const hasMissingDoctypeError = result.errors.some(e => e.type === 'HTML_MISSING_DOCTYPE');
  const hasIncompleteHtmlError = result.errors.some(e => e.type === 'HTML_INCOMPLETE');

  assert.ok(!hasMissingDoctypeError, 'Should not report HTML_MISSING_DOCTYPE for plain text');
  assert.ok(!hasIncompleteHtmlError, 'Should not report HTML_INCOMPLETE for plain text');
});

test('ErrorGuard - validateHTML: valid HTML', () => {
  const errorGuard = ErrorGuard.getInstance();
  const validHtml = "<!DOCTYPE html>\n<html>\n<head></head>\n<body>\n<h1>Hello</h1>\n</body>\n</html>";
  const result = errorGuard.validate(validHtml);

  const hasMissingDoctypeError = result.errors.some(e => e.type === 'HTML_MISSING_DOCTYPE');
  const hasIncompleteHtmlError = result.errors.some(e => e.type === 'HTML_INCOMPLETE');

  assert.ok(!hasMissingDoctypeError, 'Should not report HTML_MISSING_DOCTYPE for valid HTML');
  assert.ok(!hasIncompleteHtmlError, 'Should not report HTML_INCOMPLETE for valid HTML');
});

test('ErrorGuard - validateHTML: missing DOCTYPE', () => {
  const errorGuard = ErrorGuard.getInstance();
  const invalidHtml = "<html>\n<head></head>\n<body>\n<h1>Hello</h1>\n</body>\n</html>";
  const result = errorGuard.validate(invalidHtml);

  const hasMissingDoctypeError = result.errors.some(e => e.type === 'HTML_MISSING_DOCTYPE');

  assert.ok(hasMissingDoctypeError, 'Should report HTML_MISSING_DOCTYPE when missing <!DOCTYPE html>');
});

test('ErrorGuard - validateHTML: incomplete HTML', () => {
  const errorGuard = ErrorGuard.getInstance();
  const invalidHtml = "<!DOCTYPE html>\n<html>\n<head></head>\n<body>\n<h1>Hello</h1>";
  const result = errorGuard.validate(invalidHtml);

  const hasIncompleteHtmlError = result.errors.some(e => e.type === 'HTML_INCOMPLETE');

  assert.ok(hasIncompleteHtmlError, 'Should report HTML_INCOMPLETE when missing </html> and </body>');
});

test('ErrorGuard - validateHTML: missing DOCTYPE and incomplete', () => {
  const errorGuard = ErrorGuard.getInstance();
  const invalidHtml = "<html>\n<head></head>\n<body>\n<h1>Hello</h1>";
  const result = errorGuard.validate(invalidHtml);

  const hasMissingDoctypeError = result.errors.some(e => e.type === 'HTML_MISSING_DOCTYPE');
  const hasIncompleteHtmlError = result.errors.some(e => e.type === 'HTML_INCOMPLETE');

  assert.ok(hasMissingDoctypeError, 'Should report HTML_MISSING_DOCTYPE');
  assert.ok(hasIncompleteHtmlError, 'Should report HTML_INCOMPLETE');
});
