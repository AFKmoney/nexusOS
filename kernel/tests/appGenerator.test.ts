// Regression test: appGenerator.generate() must use mode='json', not
// 'architect'. The 'architect' mode system prompt ("OUTPUT HTML ONLY, start
// with <!DOCTYPE html>") contradicts the app-generator's JSON request, so the
// model returns markdown-wrapped/truncated JSON → JSON.parse fails → no app
// ever built. 'json' mode ("Output PURE JSON only") yields valid JSON.

import test from 'node:test';
import assert from 'node:assert';

if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null, setItem: () => {}, removeItem: () => {},
    clear: () => {}, length: 0, key: () => null,
  } as any;
}
if (typeof global.window === 'undefined') (global as any).window = {};

import { vfs, SYSTEM_VFS_APP_ID } from '../fileSystem.ts';
import { useOS } from '../store/osStore.ts';
import { aiService } from '../../services/puterService.ts';
import { appGenerator } from '../appGenerator.ts';

// Capture the mode generateOnce is called with.
let capturedMode: string | undefined;
const FAKE_APP_JSON = JSON.stringify({
  name: 'Test Calc',
  description: 'A test calculator',
  icon: '🧮',
  category: 'utility',
  version: '1.0.0',
  indexHtml: '<!DOCTYPE html><html><head><link rel="stylesheet" href="styles.css"></head><body><div id="app"></div><script src="app.js"></script></body></html>',
  stylesCss: 'body { background: #0a0a0f; color: #10b981; }',
  appJs: 'document.getElementById("app").textContent = "Calc loaded";',
  readme: '# Test Calc\n\nA generated test app.',
});

(aiService as any).generateOnce = async (_prompt: string, _rules: any, mode: string) => {
  capturedMode = mode;
  return FAKE_APP_JSON;
};

test('appGenerator.generate uses json mode (not architect) so AI returns valid JSON', async () => {
  capturedMode = undefined;

  const app = await appGenerator.generate('a simple calculator');

  // The bug: generate was called with 'architect' mode, whose system prompt
  // contradicts the JSON request. It must use 'json'.
  assert.strictEqual(capturedMode, 'json',
    `expected mode 'json', got '${capturedMode}' — architect mode breaks JSON parsing`);

  // Real folder + files must be created in the VFS.
  assert.ok(app.path.startsWith('/system/apps/gen_'),
    `app path should be under /system/apps/, got ${app.path}`);
  assert.ok(vfs.stat(app.path), 'app directory must exist in VFS');
  const expectedFiles = ['index.html', 'styles.css', 'app.js', 'README.md', 'manifest.json'];
  for (const f of expectedFiles) {
    assert.ok(vfs.readFile(`${app.path}/${f}`, SYSTEM_VFS_APP_ID) !== null,
      `${f} must be written to VFS`);
  }
  // Manifest must parse and carry the app metadata.
  const manifest = JSON.parse(vfs.readFile(`${app.path}/manifest.json`, SYSTEM_VFS_APP_ID)!);
  assert.strictEqual(manifest.name, 'Test Calc');
  assert.strictEqual(manifest.entry, 'index.html');
});

test('getInlinedEntry inlines CSS + JS into the HTML for iframe rendering', async () => {
  await appGenerator.generate('test app for inlining');
  const apps = appGenerator.list();
  const last = apps[apps.length - 1];
  assert.ok(last, 'should have at least one generated app');
  const inlined = appGenerator.getInlinedEntry(last.id);
  assert.ok(inlined, 'inlined entry should be returned');
  assert.match(inlined, /<style>/, 'CSS should be inlined into a <style> tag');
  assert.match(inlined, /Calc loaded/, 'JS should be inlined and present');
});
