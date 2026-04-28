import test from 'node:test';
import assert from 'node:assert';
import { createRegistryActions, createWindowActions } from '../../store/osStoreSlices.ts';

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
  writable: true,
  configurable: true
});

if (typeof global.window === 'undefined') {
  (global as any).window = {};
}

import { SYSTEM_VFS_APP_ID, VirtualFileSystem } from '../fileSystem.ts';
import { ErrorGuard } from '../errorGuard.ts';

test('generated runtime coverage - VFS resolves safe absolute paths and rejects traversal-like input', () => {
  const vfs = new VirtualFileSystem();

  vfs.writeFile('/home/user/Desktop/generated-runtime.txt', 'hello', SYSTEM_VFS_APP_ID);
  assert.strictEqual(vfs.readFile('/home/user/Desktop/generated-runtime.txt', SYSTEM_VFS_APP_ID), 'hello');
  assert.strictEqual(vfs.readFile('../../etc/passwd', SYSTEM_VFS_APP_ID), null);
});

test('generated runtime coverage - ErrorGuard validates known and unknown OS actions', () => {
  const errorGuard = ErrorGuard.getInstance();

  const invalidResult = errorGuard.validate('OS::FAKE_ACTION:some_data');
  assert.ok(invalidResult.errors.some((e: any) => e.type === 'OS_ACTION_INVALID'));

  const validResult = errorGuard.validate('OS::OPEN_APP:terminal');
  assert.ok(!validResult.errors.some((e: any) => e.type === 'OS_ACTION_INVALID'));
});

test('generated runtime coverage - registry actions deduplicate installs and pins', () => {
  let state = {
    registry: [],
    installedApps: ['terminal'],
    pinnedApps: ['terminal']
  };

  const set = (partial: any) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...next };
  };

  const actions = createRegistryActions(set);

  actions.installApp('terminal');
  actions.installApp('notepad');
  actions.pinApp('terminal');
  actions.pinApp('notepad');
  actions.unpinApp('terminal');

  assert.deepStrictEqual(state.installedApps, ['terminal', 'notepad']);
  assert.deepStrictEqual(state.pinnedApps, ['notepad']);
});

test('generated runtime coverage - window actions reuse singleton apps and restore minimized windows', () => {
  let focusCalls = 0;
  let restoreCalls = 0;
  let state: any = {
    windows: [
      {
        id: 'terminal-1',
        appId: 'terminal',
        title: 'Terminal',
        x: 0,
        y: 0,
        width: 700,
        height: 480,
        zIndex: 1,
        isMinimized: true,
        isMaximized: false,
        workspaceId: 1
      }
    ],
    registry: [
      {
        id: 'terminal',
        name: 'Terminal',
        icon: () => null,
        permissions: [],
        defaultSize: { width: 700, height: 480 }
      }
    ],
    activeWorkspace: 1,
    globalZIndex: 10,
    focusWindow: (id: string) => {
      focusCalls += 1;
      state.activeWindowId = id;
    },
    restoreWindow: (id: string) => {
      restoreCalls += 1;
      state.windows = state.windows.map((window: any) =>
        window.id === id ? { ...window, isMinimized: false } : window
      );
    }
  };

  const set = (partial: any) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...next };
  };

  const get = () => state;
  const actions = createWindowActions(set, get);

  actions.openWindow('terminal');

  assert.equal(state.windows.length, 1);
  assert.equal(focusCalls, 1);
  assert.equal(restoreCalls, 1);
  assert.equal(state.windows[0].isMinimized, false);
});
