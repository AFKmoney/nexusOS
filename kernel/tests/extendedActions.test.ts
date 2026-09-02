// Extended OS:: actions test — validates the new append/path/count/analyze
// capabilities plus the native function-calling mapping in executeToolCalls.
// These go through the real dispatch path (ToolForge.executeOsActions) the AI
// uses in production.

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
import { toolForge } from '../toolForge.ts';
import { getOsActionTools } from '../aiTools.ts';

toolForge.bindOsActions(async () => 'ok');

test('APPEND_FILE appends to an existing file', async () => {
  vfs.writeFile('/home/user/append_test.txt', 'start-', SYSTEM_VFS_APP_ID);
  const result = await toolForge.executeOsActions('OS::APPEND_FILE:/home/user/append_test.txt|end');
  assert.match(result, /✅.*append_test\.txt.*appended/i, `got: ${result}`);
  assert.strictEqual(vfs.readFile('/home/user/append_test.txt', SYSTEM_VFS_APP_ID), 'start-end');
});

test('APPEND_FILE errors on a missing file', async () => {
  const result = await toolForge.executeOsActions('OS::APPEND_FILE:/home/user/nope.txt|data');
  assert.match(result, /⚠.*not found/i, `got: ${result}`);
});

test('PATH_INFO reports type and totals', async () => {
  vfs.createDirRecursive('/home/user/path_info_dir', SYSTEM_VFS_APP_ID);
  vfs.writeFile('/home/user/path_info_dir/a.txt', '12', SYSTEM_VFS_APP_ID);
  const result = await toolForge.executeOsActions('OS::PATH_INFO:/home/user/path_info_dir');
  assert.match(result, /"type":"directory"/, `got: ${result}`);
  assert.match(result, /"files":1/, `got: ${result}`);
  assert.match(result, /"bytes":2/, `got: ${result}`);
});

test('COUNT_FILES counts recursively', async () => {
  vfs.createDirRecursive('/home/user/count_dir/sub', SYSTEM_VFS_APP_ID);
  vfs.writeFile('/home/user/count_dir/x.txt', '1', SYSTEM_VFS_APP_ID);
  vfs.writeFile('/home/user/count_dir/sub/y.txt', '123', SYSTEM_VFS_APP_ID);
  const result = await toolForge.executeOsActions('OS::COUNT_FILES:/home/user/count_dir');
  assert.match(result, /"files":2/, `got: ${result}`);
  assert.match(result, /"folders":1/, `got: ${result}`);
  assert.match(result, /"bytes":4/, `got: ${result}`);
});

test('ANALYZE_DATA understands a JSON array of objects', async () => {
  const data = '[{"name":"alice","age":30},{"name":"bob","age":25}]';
  const result = await toolForge.executeOsActions(`OS::ANALYZE_DATA:${data}`);
  assert.match(result, /"kind":"json-array"/, `got: ${result}`);
  assert.match(result, /"length":2/, `got: ${result}`);
  assert.match(result, /"age":"number"/, `got: ${result}`);
});

test('ANALYZE_DATA understands CSV with header', async () => {
  // The native function-calling path JSON-encodes the content so newlines
  // survive the OS:: text medium. Test through executeToolCalls.
  const data = 'id,name\n1,alice\n2,bob';
  const result = await toolForge.executeToolCalls([
    { name: 'analyze_data', arguments: { data } } as any,
  ]);
  assert.match(result, /"kind":"csv"/, `got: ${result}`);
  assert.match(result, /"columns":\["id","name"\]/, `got: ${result}`);
  assert.match(result, /"rows":2/, `got: ${result}`);
});

test('ANALYZE_DATA falls back to text for plain input', async () => {
  const result = await toolForge.executeOsActions('OS::ANALYZE_DATA:hello world foo');
  assert.match(result, /"kind":"text"/, `got: ${result}`);
  assert.match(result, /"words":3/, `got: ${result}`);
});

test('native schema exposes the new tools', () => {
  const tools = getOsActionTools();
  const names = tools.map(t => t.name);
  for (const expected of ['append_file', 'path_info', 'count_files', 'analyze_data', 'schedule_cron', 'list_jobs', 'cancel_job', 'session_save', 'session_list', 'session_restore', 'arrange_windows', 'clipboard_read']) {
    assert.ok(names.includes(expected), `expected tool ${expected} to be exposed, got ${names.join(',')}`);
  }
});

test('executeToolCalls maps append_file through the real dispatch', async () => {
  vfs.writeFile('/home/user/tc_append.txt', 'A', SYSTEM_VFS_APP_ID);
  const result = await toolForge.executeToolCalls([
    { name: 'append_file', arguments: { path: '/home/user/tc_append.txt', content: 'B' } } as any,
  ]);
  assert.match(result, /✅.*tc_append\.txt.*appended/i, `got: ${result}`);
  assert.strictEqual(vfs.readFile('/home/user/tc_append.txt', SYSTEM_VFS_APP_ID), 'AB');
});

test('executeToolCalls appends multi-line content safely', async () => {
  vfs.writeFile('/home/user/tc_append_ml.txt', 'A', SYSTEM_VFS_APP_ID);
  const result = await toolForge.executeToolCalls([
    { name: 'append_file', arguments: { path: '/home/user/tc_append_ml.txt', content: 'line1\nline2' } } as any,
  ]);
  assert.match(result, /✅.*appended/i, `got: ${result}`);
  assert.strictEqual(vfs.readFile('/home/user/tc_append_ml.txt', SYSTEM_VFS_APP_ID), 'Aline1\nline2');
});

test('executeToolCalls maps count_files and path_info', async () => {
  vfs.createDirRecursive('/home/user/tc_dir', SYSTEM_VFS_APP_ID);
  vfs.writeFile('/home/user/tc_dir/z.txt', 'hello', SYSTEM_VFS_APP_ID);
  const count = await toolForge.executeToolCalls([
    { name: 'count_files', arguments: { path: '/home/user/tc_dir' } } as any,
  ]);
  assert.match(count, /"files":1/, `got: ${count}`);
  const info = await toolForge.executeToolCalls([
    { name: 'path_info', arguments: { path: '/home/user/tc_dir' } } as any,
  ]);
  assert.match(info, /"type":"directory"/, `got: ${info}`);
});
