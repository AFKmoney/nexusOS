import test from 'node:test';
import assert from 'node:assert';
import { VirtualFileSystem } from '../fileSystem';

test('VirtualFileSystem - Initialization Fallback', async (t) => {
  // Save original global methods to restore later
  const originalGetItem = global.localStorage?.getItem;
  const originalSetItem = global.localStorage?.setItem;

  await t.test('Initializes with existing VFS_STORAGE_KEY data', () => {
    // Mock global.localStorage
    const mockData = {
      testNode: {
        name: 'testNode',
        type: 'directory',
        permissions: 'rwx',
        children: {},
        created: 123456789,
        modified: 123456789
      }
    };

    global.localStorage = {
      ...global.localStorage,
      getItem: (key: string) => {
        if (key === 'nexus_vfs_v1') return JSON.stringify(mockData);
        return null;
      },
      setItem: () => {}
    } as any;

    const vfs = new VirtualFileSystem();
    const node = vfs.resolveNode('/testNode', false, 0);
    // Since our test node doesn't match the standard desktop path normalization perfectly, we resolve raw root
    // But `resolveNode` uses custom logic (defaults to /home/admin/Desktop/path).
    // Let's check `vfs.listDir('/')` which returns root children.
    const rootChildren = vfs.listDir('/');
    assert.deepStrictEqual(rootChildren, ['testNode']);
  });

  await t.test('Initializes with INITIAL_FS when no data is found', () => {
    let setItemCalled = false;
    global.localStorage = {
      ...global.localStorage,
      getItem: (key: string) => null,
      setItem: (key: string, value: string) => {
        if (key === 'nexus_vfs_v1') {
          setItemCalled = true;
        }
      }
    } as any;

    const vfs = new VirtualFileSystem();
    const rootChildren = vfs.listDir('/');

    // Check if system and home are in INITIAL_FS
    assert.ok(rootChildren.includes('home'));
    assert.ok(rootChildren.includes('system'));
    assert.strictEqual(setItemCalled, true, 'Should save INITIAL_FS to localStorage');
  });

  await t.test('Initializes with INITIAL_FS when localStorage throws an error', () => {
    let setItemCalled = false;
    global.localStorage = {
      ...global.localStorage,
      getItem: (key: string) => {
        throw new Error('localStorage is disabled');
      },
      setItem: (key: string, value: string) => {
        setItemCalled = true;
      }
    } as any;

    const vfs = new VirtualFileSystem();
    const rootChildren = vfs.listDir('/');

    // Verify fallback to INITIAL_FS
    assert.ok(rootChildren.includes('home'));
    assert.ok(rootChildren.includes('system'));
    // Should NOT call save() since it's in the catch block
    assert.strictEqual(setItemCalled, false, 'Should not attempt to save if getItem threw an error');
  });

  // Restore globals
  global.localStorage = {
    ...global.localStorage,
    getItem: originalGetItem,
    setItem: originalSetItem
  } as any;
});
