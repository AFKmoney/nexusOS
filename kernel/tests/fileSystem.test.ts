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

// Restore console.error at the end
test('VirtualFileSystem - cleanup', () => {
  console.error = originalConsoleError;
});
