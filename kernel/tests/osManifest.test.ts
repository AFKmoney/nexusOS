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

if (typeof global.fetch === 'undefined') {
  (global as any).fetch = async () => ({ ok: false, json: async () => ({}) });
}

// In standard node test with experimental-strip-types, we don't rewrite app files.
// But we *must* rewrite test file imports if they are local, so we add .ts.
import { parseOsActions, generateOSManifest, bindOsStore } from '../osManifest.ts';
import { vfs } from '../fileSystem.ts';

test('parseOsActions - parses action with no arguments', () => {
  const text = 'OS::DO_SOMETHING';
  const actions = parseOsActions(text);
  const action = actions[0];
  assert.strictEqual(actions.length, 1);
  assert.strictEqual(action?.type, 'DO_SOMETHING');
  assert.deepStrictEqual(action?.args, []);
  assert.strictEqual(action?.raw, 'OS::DO_SOMETHING');
});

test('parseOsActions - parses action with one argument', () => {
  const text = 'OS::OPEN_APP:terminal';
  const actions = parseOsActions(text);
  const action = actions[0];
  assert.strictEqual(actions.length, 1);
  assert.strictEqual(action?.type, 'OPEN_APP');
  assert.deepStrictEqual(action?.args, ['terminal']);
  assert.strictEqual(action?.raw, 'OS::OPEN_APP:terminal');
});

test('parseOsActions - parses action with multiple arguments including colons', () => {
  // OPEN_APP can have an extra arg (the path to open)
  const text = 'OS::OPEN_APP:hyperide:/home/user/app.ts';
  const actions = parseOsActions(text);
  const action = actions[0];
  assert.strictEqual(actions.length, 1);
  assert.strictEqual(action?.type, 'OPEN_APP');
  // NOTE: Except for WRITE_FILE, the code simply takes everything after the first colon as args[0].
  assert.deepStrictEqual(action?.args, ['hyperide:/home/user/app.ts']);
  assert.strictEqual(action?.raw, 'OS::OPEN_APP:hyperide:/home/user/app.ts');
});

test('parseOsActions - parses WRITE_FILE converting \\n to newlines', () => {
  const text = 'OS::WRITE_FILE:/home/user/test.txt:Line1\\nLine2';
  const actions = parseOsActions(text);
  const action = actions[0];
  assert.strictEqual(actions.length, 1);
  assert.strictEqual(action?.type, 'WRITE_FILE');
  assert.deepStrictEqual(action?.args, ['/home/user/test.txt', 'Line1\nLine2']);
  assert.strictEqual(action?.raw, 'OS::WRITE_FILE:/home/user/test.txt:Line1\\nLine2');
});

test('parseOsActions - parses WRITE_FILE missing content', () => {
  const text = 'OS::WRITE_FILE:/home/user/test.txt';
  const actions = parseOsActions(text);
  const action = actions[0];
  assert.strictEqual(actions.length, 1);
  assert.strictEqual(action?.type, 'WRITE_FILE');
  assert.deepStrictEqual(action?.args, ['/home/user/test.txt']);
  assert.strictEqual(action?.raw, 'OS::WRITE_FILE:/home/user/test.txt');
});

test('parseOsActions - ignores non-action text', () => {
  const text = `
    This is some normal conversational text from the AI.
    It explains something and then decides to open an app.
    OS::OPEN_APP:dashboard
    And here is some more text afterwards.
  `;
  const actions = parseOsActions(text);
  const action = actions[0];
  assert.strictEqual(actions.length, 1);
  assert.strictEqual(action?.type, 'OPEN_APP');
  assert.deepStrictEqual(action?.args, ['dashboard']);
});

test('parseOsActions - parses multiple actions', () => {
  const text = `
    OS::CREATE_FOLDER:/home/test
    OS::WRITE_FILE:/home/test/hello.txt:Hello World
    OS::OPEN_APP:notepad:/home/test/hello.txt
  `;
  const actions = parseOsActions(text);
  assert.strictEqual(actions.length, 3);

  const first = actions[0];
  const second = actions[1];
  const third = actions[2];

  assert.strictEqual(first?.type, 'CREATE_FOLDER');
  assert.deepStrictEqual(first?.args, ['/home/test']);

  assert.strictEqual(second?.type, 'WRITE_FILE');
  assert.deepStrictEqual(second?.args, ['/home/test/hello.txt', 'Hello World']);

  assert.strictEqual(third?.type, 'OPEN_APP');
  assert.deepStrictEqual(third?.args, ['notepad:/home/test/hello.txt']);
});

test('parseOsActions - handles empty text and whitespace', () => {
  const text = `


    OS::NOTIFY:Test:  Whitespace
  `;
  const actions = parseOsActions(text);
  const action = actions[0];
  assert.strictEqual(actions.length, 1);
  assert.strictEqual(action?.type, 'NOTIFY');
  assert.deepStrictEqual(action?.args, ['Test:  Whitespace']);
  // The raw string keeps whatever was after trimming
  assert.strictEqual(action?.raw, 'OS::NOTIFY:Test:  Whitespace');
});

// generateOSManifest v3 emits an ultra-compressed token-budgeted format
// (see header in kernel/osManifest.ts). The legacy verbose section format
// — [OPEN WINDOWS], [VFS WORKSPACE], [RELEVANT MEMORY] — was retired.
// Each tier emits compact, pipe/comma-delimited lines.

test('generateOSManifest - empty state', () => {
  bindOsStore(() => ({ windows: [], registry: [] }));
  const originalListDir = vfs.listDir;
  vfs.listDir = (_path: string) => [];

  try {
    const manifest = generateOSManifest();

    assert.match(manifest, /\[OS\] NexusOS\|ai:/);
    assert.match(manifest, /apps:0/);
    assert.match(manifest, /open:none/);
    // Core OS line is always present and reports no open windows.
    assert.match(manifest, /\[OS\] NexusOS\|ai:[^|]+\|apps:0\|open:none/);
    // Minimal tier (no query) always includes the example + protocol lines.
    assert.match(manifest, /\[EX\] /);
    assert.match(manifest, /\[PROTO\] You are NexusOS AI\./);
  } finally {
    vfs.listDir = originalListDir;
  }
});

test('generateOSManifest - with active windows', () => {
  bindOsStore(() => ({
    windows: [
      { title: 'Terminal', appId: 'terminal', isMinimized: false },
      { title: 'Editor', appId: 'hyperide', isMinimized: true }
    ],
    registry: []
  }));
  const originalListDir = vfs.listDir;
  vfs.listDir = (_path: string) => [];

  try {
    const manifest = generateOSManifest();

    assert.match(manifest, /open:terminal,hyperide\(min\)/);
    // v3 emits open windows comma-separated on the [OS] line; minimized
    // windows are tagged with "(min)" right after the appId.
    assert.match(manifest, /\[OS\][^\n]*\|open:terminal,hyperide\(min\)/);
  } finally {
    vfs.listDir = originalListDir;
  }
});

test('generateOSManifest - with VFS snapshot (full tier via query)', () => {
  bindOsStore(() => ({ windows: [], registry: [] }));
  const originalListDir = vfs.listDir;

  // v3 only emits the VFS line in the "full" tier, which is selected when the
  // query contains a file/app keyword. The new format is a single-level
  // comma-separated listing of /home/user — no recursion, no stat() calls.
  vfs.listDir = (path: string) => {
    if (path === '/home/user') return ['docs', 'notes.txt'];
    return [];
  };

  try {
    let manifest = generateOSManifest(undefined, 'file'); // 'file' triggers full tier

    manifest = generateOSManifest([], 'open the file docs');
    assert.match(manifest, /\[VFS\] docs,notes\.txt/);
  } finally {
    vfs.listDir = originalListDir;
  }
});

test('generateOSManifest - with relevant memory', () => {
  bindOsStore(() => ({ windows: [], registry: [] }));
  const originalListDir = vfs.listDir;
  vfs.listDir = (_path: string) => [];

  try {
    const memory = [
      { id: '1', timestamp: Date.now(), content: 'User likes dark mode.', tags: [], embeddingVector: [], importance: 0.9 },
      { id: '2', timestamp: Date.now(), content: 'Project is named "NexusOS"', tags: [], embeddingVector: [], importance: 0.9 }
    ];
    const manifest = generateOSManifest(memory);

    assert.match(manifest, /\[MEM\] User likes dark mode\. | Project is named "NexusOS"/);
    // Memory is pipe-delimited on a single [MEM] line, sorted by importance*recency.
    assert.match(manifest, /\[MEM\] /);
    assert.ok(manifest.includes('User likes dark mode.'));
    assert.ok(manifest.includes('Project is named "NexusOS"'));
  } finally {
    vfs.listDir = originalListDir;
  }
});