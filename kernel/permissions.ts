/**
 * PERMISSION SYSTEM — Enforces app permissions declared in appRegistry
 */

import { SYSTEM_APPS } from '../appRegistry';

export type Permission = 'vfs.read' | 'vfs.write' | 'network' | 'kernel.modify';

const PERMISSION_SET = new Set<Permission>(['vfs.read', 'vfs.write', 'network', 'kernel.modify']);

function isPermission(value: string): value is Permission {
  return PERMISSION_SET.has(value as Permission);
}

function isSafeAppId(appId: string): boolean {
  return typeof appId === 'string' && appId.length > 0 && appId.length <= 128 && !appId.includes('\0');
}

class PermissionSystem {
  private overrides: Map<string, Set<Permission>> = new Map();

  /** Check if an app has a specific permission */
  hasPermission(appId: string, permission: Permission): boolean {
    if (!isSafeAppId(appId) || !isPermission(permission)) return false;

    const override = this.overrides.get(appId);
    if (override?.has(permission)) return true;

    const manifest = SYSTEM_APPS.find(a => a.id === appId);
    if (!manifest) return false;
    return Array.isArray(manifest.permissions) && manifest.permissions.includes(permission);
  }

  /** Enforce permission — throws if denied */
  enforce(appId: string, permission: Permission, action?: string) {
    if (!this.hasPermission(appId, permission)) {
      const msg = `Permission denied: "${appId}" requires [${permission}]${action ? ` for ${action}` : ''}`;
      console.warn(`[Permissions] ${msg}`);
      throw new Error(msg);
    }
  }

  /** Grant a temporary permission override */
  grant(appId: string, permission: Permission) {
    if (!isSafeAppId(appId) || !isPermission(permission)) return;
    if (!this.overrides.has(appId)) this.overrides.set(appId, new Set());
    this.overrides.get(appId)!.add(permission);
  }

  /** Revoke a temporary permission override */
  revoke(appId: string, permission: Permission) {
    if (!isSafeAppId(appId) || !isPermission(permission)) return;
    this.overrides.get(appId)?.delete(permission);
  }

  /** List all permissions for an app */
  getPermissions(appId: string): Permission[] {
    if (!isSafeAppId(appId)) return [];
    const manifest = SYSTEM_APPS.find(a => a.id === appId);
    const base = (manifest?.permissions || []).filter((p): p is Permission => isPermission(p));
    const extra = this.overrides.get(appId) ? [...this.overrides.get(appId)!] : [];
    return [...new Set([...base, ...extra])];
  }

  /** Check if an app exists in the registry */
  isRegistered(appId: string): boolean {
    return isSafeAppId(appId) && SYSTEM_APPS.some(a => a.id === appId);
  }
}

export const permissions = new PermissionSystem();