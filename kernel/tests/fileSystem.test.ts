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

if (typeof global.window === 'undefined') {
  (global as any).window = {};
}

// Intercept console.error to avoid spamming the test output, but allow verifying it was called
let lastConsoleError = '';
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  lastConsoleError = args.join(' ');
};

import { VirtualFileSystem } from '../fileSystem.ts';

test('VirtualFileSystem - readFile without appId (system bypass)', () => {
  const vfs = new VirtualFileSystem();

  vfs.writeFile('/home/user/Desktop/test1.txt', 'system content');

  const content = vfs.readFile('/home/user/Desktop/test1.txt');
  assert.strictEqual(content, 'system content', 'Should read file successfully without appId');
});

test('VirtualFileSystem - readFile with appId that has vfs.read permission', () => {
  const vfs = new VirtualFileSystem();

  // Mock window.__OS_STORE__
  (global as any).window.__OS_STORE__ = {
    getState: () => ({
      currentUser: { id: 'user' },
      registry: [
        { id: 'app1', permissions: ['vfs.read', 'vfs.write'] }
      ]
    })
  };

  vfs.writeFile('/home/user/Desktop/test2.txt', 'app content');

  const content = vfs.readFile('/home/user/Desktop/test2.txt', 'app1');
  assert.strictEqual(content, 'app content', 'Should read file successfully with valid permissions');

  // Clean up
  delete (global as any).window.__OS_STORE__;
});

test('VirtualFileSystem - readFile with appId that lacks vfs.read permission', () => {
  const vfs = new VirtualFileSystem();

  // Mock window.__OS_STORE__
  (global as any).window.__OS_STORE__ = {
    getState: () => ({
      currentUser: { id: 'user' },
      registry: [
        { id: 'app2', permissions: ['vfs.write'] } // Missing vfs.read
      ]
    })
  };

  vfs.writeFile('/home/user/Desktop/test3.txt', 'secret content');

  lastConsoleError = '';
  const content = vfs.readFile('/home/user/Desktop/test3.txt', 'app2');

  assert.strictEqual(content, null, 'Should return null when permission is denied');
  assert.ok(lastConsoleError.includes('[Sandbox Enforcer] Blocked app2 from reading'), 'Should log permission error');

  // Clean up
  delete (global as any).window.__OS_STORE__;
});

test('VirtualFileSystem - readFile with unregistered appId', () => {
  const vfs = new VirtualFileSystem();

  // Mock window.__OS_STORE__
  (global as any).window.__OS_STORE__ = {
    getState: () => ({
      currentUser: { id: 'user' },
      registry: [
        { id: 'app1', permissions: ['vfs.read'] }
      ]
    })
  };

  vfs.writeFile('/home/user/Desktop/test4.txt', 'content');

  lastConsoleError = '';
  const content = vfs.readFile('/home/user/Desktop/test4.txt', 'unknown_app');

  assert.strictEqual(content, null, 'Should return null for unregistered app');
  assert.ok(lastConsoleError.includes('[Sandbox Enforcer] Blocked unknown_app from reading'), 'Should log permission error');

  // Clean up
  delete (global as any).window.__OS_STORE__;
});

test('VirtualFileSystem - readFile for non-existent file', () => {
  const vfs = new VirtualFileSystem();

  const content = vfs.readFile('/home/user/Desktop/does_not_exist.txt');
  assert.strictEqual(content, null, 'Should return null for non-existent file');
});

test('VirtualFileSystem - constructor handles localStorage errors by falling back to INITIAL_FS', () => {
  const originalGetItem = global.localStorage.getItem;
  try {
    global.localStorage.getItem = () => {
      throw new Error('localStorage is disabled');
    };
    const vfs = new VirtualFileSystem();

    // Test if it loaded INITIAL_FS by reading a known default file
    const content = vfs.readFile('/system/kernel.log');
    assert.ok(content !== null, 'Should load INITIAL_FS and be able to read system files');
    assert.ok(content?.includes('[BOOT]'), 'Content should match default system file');
  } finally {
    global.localStorage.getItem = originalGetItem;
  }
});

test('VirtualFileSystem - constructor handles invalid JSON by falling back to INITIAL_FS', () => {
  const originalGetItem = global.localStorage.getItem;
  try {
    global.localStorage.getItem = (key: string) => {
      if (key === 'nexus_vfs_v1') return '{bad json';
      return null;
    };
    const vfs = new VirtualFileSystem();

    const content = vfs.readFile('/system/kernel.log');
    assert.ok(content !== null, 'Should load INITIAL_FS and be able to read system files');
  } finally {
    global.localStorage.getItem = originalGetItem;
  }
});

test('VirtualFileSystem - constructor loads saved valid state from localStorage', () => {
  const originalGetItem = global.localStorage.getItem;
  try {
    const customState = {
      system: {
        name: 'system',
        type: 'directory',
        permissions: 'r-x',
        children: {
          'custom.log': {
            name: 'custom.log',
            type: 'file',
            permissions: 'r--',
            content: 'custom loaded content',
            created: 0,
            modified: 0
          }
        }
      }
    };

    global.localStorage.getItem = (key: string) => {
      if (key === 'nexus_vfs_v1') return JSON.stringify(customState);
      return null;
    };

    const vfs = new VirtualFileSystem();
    const content = vfs.readFile('/system/custom.log');
    assert.strictEqual(content, 'custom loaded content', 'Should load and parse valid JSON state from localStorage');
  } finally {
    global.localStorage.getItem = originalGetItem;
  }
});

// Restore console.error at the end
test('VirtualFileSystem - cleanup', () => {
  console.error = originalConsoleError;
});
