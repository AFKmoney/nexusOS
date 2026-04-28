import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { permissions } from '../permissions';

describe('kernel permissions', () => {
  it('returns declared permissions for registered apps', () => {
    const terminalPermissions = permissions.getPermissions('terminal');

    assert.ok(Array.isArray(terminalPermissions));
    assert.ok(terminalPermissions.includes('vfs.read'));
    assert.ok(terminalPermissions.includes('vfs.write'));
  });

  it('rejects unknown apps and invalid ids', () => {
    assert.equal(permissions.isRegistered('terminal'), true);
    assert.equal(permissions.isRegistered('missing-app'), false);
    assert.deepStrictEqual(permissions.getPermissions(''), []);
  });

  it('supports temporary grants and revokes', () => {
    assert.equal(permissions.hasPermission('notepad', 'network'), false);

    permissions.grant('notepad', 'network');
    assert.equal(permissions.hasPermission('notepad', 'network'), true);

    permissions.revoke('notepad', 'network');
    assert.equal(permissions.hasPermission('notepad', 'network'), false);
  });

  it('throws on denied enforcement and allows declared permissions', () => {
    assert.doesNotThrow(() => permissions.enforce('terminal', 'vfs.read', 'read test file'));
    assert.throws(() => permissions.enforce('notepad', 'network', 'outbound request'));
  });
});
