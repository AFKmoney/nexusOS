// Skill forge pipeline test: validates the OS::FORGE_SKILL → LIST_SKILLS →
// DELETE_SKILL lifecycle through toolForge.executeOsActions (the real dispatch
// path the AI uses). execute() runs in a Web Worker in production; here we
// verify registration, persistence to VFS, listing, and deletion.

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
import { skillForge } from '../skillForge.ts';
import { toolForge } from '../toolForge.ts';

// Ensure toolForge's OS-action handler is bound (some actions need it).
toolForge.bindOsActions(async () => 'ok');

test('FORGE_SKILL registers a skill and persists it to VFS', async () => {
  const result = await toolForge.executeOsActions(
    'OS::FORGE_SKILL:double-it|doubles a number|return ctx.args * 2;'
  );
  assert.match(result, /✅.*double-it.*registered/i,
    `forge should report registration, got: ${result}`);
  // VFS should now contain the skill file.
  const files = vfs.listDir('/system/skills', SYSTEM_VFS_APP_ID) || [];
  assert.ok(files.some(f => f.includes('double-it')),
    `skill file should be persisted in VFS, found: ${files.join(',')}`);
});

test('LIST_SKILLS shows the forged skill', async () => {
  const result = await toolForge.executeOsActions('OS::LIST_SKILLS');
  assert.match(result, /double-it/i, `list should include double-it: ${result}`);
});

test('FORGE_SKILL rejects invalid names (safety)', async () => {
  const result = await toolForge.executeOsActions(
    'OS::FORGE_SKILL:evil-name!|bad|code'
  );
  assert.match(result, /⚠|Invalid|error/i,
    `invalid skill name should be rejected: ${result}`);
});

test('FORGE_SKILL rejects code with syntax errors', async () => {
  const result = await toolForge.executeOsActions(
    'OS::FORGE_SKILL:broken|desc|this is not valid js {{{'
  );
  assert.match(result, /⚠|Syntax|error/i,
    `syntax-broken code should be rejected: ${result}`);
});

test('DELETE_SKILL removes the forged skill', async () => {
  // ensure it exists first
  await toolForge.executeOsActions('OS::FORGE_SKILL:temp-skill|temp|return 1;');
  const del = await toolForge.executeOsActions('OS::DELETE_SKILL:temp-skill');
  assert.match(del, /✅|deleted/i, `delete should succeed: ${del}`);
  const files = vfs.listDir('/system/skills', SYSTEM_VFS_APP_ID) || [];
  assert.ok(!files.some(f => f.includes('temp-skill')),
    'temp-skill should be gone from VFS after delete');
});
