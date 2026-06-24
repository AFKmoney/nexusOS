import { FileNode } from '../types';
import { eventBus } from './eventBus';
import { kernelLog } from './log';

const VFS_STORAGE_KEY = 'nexus_vfs_v1';
export const SYSTEM_VFS_APP_ID = '__system__';

const INITIAL_FS: { [key: string]: FileNode } = {
  home: {
    name: 'home',
    type: 'directory',
    permissions: 'rwx',
    created: Date.now(),
    modified: Date.now(),
    children: {
      user: {
        name: 'user',
        type: 'directory',
        permissions: 'rwx',
        created: Date.now(),
        modified: Date.now(),
        children: {
          Desktop: {
            name: 'Desktop',
            type: 'directory',
            permissions: 'rwx',
            created: Date.now(),
            modified: Date.now(),
            children: {
              'ReadMe.txt': {
                name: 'ReadMe.txt',
                type: 'file',
                permissions: 'rw-',
                content: 'Welcome to NexusOS v2.0.\nDAEMON AI Core is now recursive. Try "Refactor the Terminal" in Neural Forge.',
                created: Date.now(),
                modified: Date.now()
              }
            }
          },
          Wallpapers: {
            name: 'Wallpapers',
            type: 'directory',
            permissions: 'rwx',
            created: Date.now(),
            modified: Date.now(),
            children: {}
          },
          Trash: {
            name: 'Trash',
            type: 'directory',
            permissions: 'rwx',
            created: Date.now(),
            modified: Date.now(),
            children: {}
          }
        }
      },
      daemon: {
        name: 'daemon',
        type: 'directory',
        permissions: 'rwx',
        created: Date.now(),
        modified: Date.now(),
        children: {
          Desktop: {
            name: 'Desktop',
            type: 'directory',
            permissions: 'rwx',
            created: Date.now(),
            modified: Date.now(),
            children: {}
          }
        }
      }
    }
  },
  system: {
    name: 'system',
    type: 'directory',
    permissions: 'r-x',
    created: Date.now(),
    modified: Date.now(),
    children: {
      'kernel.log': {
        name: 'kernel.log',
        type: 'file',
        permissions: 'r--',
        content: '[BOOT] DAEMON Kernel v2.0 Initialized.\n[INFO] AI Self-Access Granted.',
        created: Date.now(),
        modified: Date.now()
      },
      docs: {
        name: 'docs',
        type: 'directory',
        permissions: 'r--',
        created: Date.now(),
        modified: Date.now(),
        children: {
          'daemon_whitepaper.txt': {
            name: 'daemon_whitepaper.txt',
            type: 'file',
            permissions: 'r--',
            content: `Fractal-State Intelligence (Daemon LLM) Architecture: Compact seed architectures (200 MB – 1.4 GB) that unfold into the expressive capacity of arbitrarily large models.`,
            created: Date.now(),
            modified: Date.now()
          }
        }
      },
      wallpapers: {
        name: 'wallpapers',
        type: 'directory',
        permissions: 'r--',
        created: Date.now(),
        modified: Date.now(),
        children: {}
      }
    }
  }
};

function normalizePath(path: string): string {
  const trimmed = typeof path === 'string' ? path.trim() : '';
  if (!trimmed || trimmed.includes('\0') || trimmed.includes('..')) return '';
  if (!trimmed.startsWith('/')) return '';
  return trimmed.replace(/\/+/g, '/');
}

function safeClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// IndexedDB Helper Setup
const DB_NAME = 'NexusOS_VFS';
const DB_VERSION = 1;
const STORE_NAME = 'vfs_store';
const RECORD_KEY = 'vfs_root';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<any> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(RECORD_KEY);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(data: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(data, RECORD_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export class VirtualFileSystem {
  private root: { [key: string]: FileNode };
  private isBatching = false;
  private isInitialized = false;
  private saveTimeout: any = null;

  constructor() {
    // Sync fallback so the OS doesn't crash on initial render before init()
    this.root = safeClone(INITIAL_FS);
  }

  public async init() {
    try {
      const data = await idbGet();
      if (data) {
        this.root = data;
      } else {
        // Fallback to legacy localStorage migration
        const saved = localStorage.getItem(VFS_STORAGE_KEY);
        if (saved) {
          this.root = JSON.parse(saved);
        } else {
          this.root = safeClone(INITIAL_FS);
        }
        await this.saveAsync();
      }
    } catch (e) {
      kernelLog.error('[VFS] Failed to initialize IndexedDB:', e);
      // Ultimate fallback
      const saved = localStorage.getItem(VFS_STORAGE_KEY);
      if (saved) this.root = JSON.parse(saved);
    }
    this.isInitialized = true;
    kernelLog.info('[VFS] Virtual File System Initialized via IndexedDB.');
  }

  // Seed system wallpaper files into /system/wallpapers/ if they are
  // missing. Called once at boot (after init()) by index.tsx. Idempotent:
  // existing files are never overwritten, so user modifications to system
  // wallpapers (if any) are preserved.
  public seedSystemWallpapers(library: Array<{ id: string; code: string }>): void {
    if (!this.isInitialized) return;
    const dir = this.resolveNode('/system/wallpapers');
    if (!dir || dir.type !== 'directory') {
      // Should never happen — INITIAL_FS creates /system/wallpapers/ —
      // but guard defensively in case a future migration changes the tree.
      kernelLog.warn('[VFS] /system/wallpapers not found, skipping wallpaper seed.');
      return;
    }
    if (!dir.children) dir.children = {};
    let added = 0;
    for (const wp of library) {
      const filename = `${wp.id}.html`;
      if (dir.children[filename]) continue; // Don't overwrite
      dir.children[filename] = {
        name: filename,
        type: 'file',
        permissions: 'r--',
        content: wp.code,
        created: Date.now(),
        modified: Date.now(),
      };
      added++;
    }
    if (added > 0) {
      this.save();
      kernelLog.info(`[VFS] Seeded ${added} system wallpapers into /system/wallpapers/`);
    }
  }

  public batch(fn: () => void) {
    this.isBatching = true;
    try {
      fn();
    } finally {
      this.isBatching = false;
      this.save();
    }
  }

  private save() {
    if (this.isBatching || !this.isInitialized) return;
    
    // Debounce the save to prevent transaction spam
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveAsync();
    }, 100);
  }

  private async saveAsync() {
    try {
      await idbPut(this.root);
    } catch (e) {
      kernelLog.warn('[VFS] IndexedDB save failed, falling back to LocalStorage:', e);
      try {
        localStorage.setItem(VFS_STORAGE_KEY, JSON.stringify(this.root));
      } catch (e2) {
        kernelLog.error('[VFS] CRITICAL: Storage Quota Exceeded!', e2);
      }
    }
  }

  private getHomeDir(): string {
    const desktopStore = (window as any).__OS_STORE__;
    const mobileStore = (window as any).__MOBILE_STORE__;
    
    let user = 'admin';
    if (desktopStore) {
      user = desktopStore.getState()?.currentUser?.id || 'admin';
    } else if (mobileStore) {
      user = mobileStore.getState()?.currentUser?.id || 'admin';
    }
    return `/home/${user}`;
  }

  private normalizeInputPath(path: string): string {
    const normalized = normalizePath(path);
    if (normalized) return normalized;
    if (!path.startsWith('/')) {
      const base = `${this.getHomeDir()}/Desktop/${path}`;
      return normalizePath(base);
    }
    return '';
  }

  public resolveNode(path: string, followSymlinks = true, depth = 0): FileNode | null {
    if (depth > 10) return null;
    const normalized = this.normalizeInputPath(path);
    if (!normalized) return null;
    if (normalized === '/') return { name: 'root', type: 'directory', children: this.root, permissions: 'rwx', created: 0, modified: 0 };

    const parts = normalized.split('/').filter(p => p);
    let current: { [key: string]: FileNode } = this.root;
    let node: FileNode | null = null;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) return null;
      if (i === 0) {
        node = current[part] || null;
      } else {
        if (node?.type !== 'directory' || !node.children) return null;
        node = node.children[part] || null;
      }
      if (!node) return null;

      if (node.type === 'symlink' && followSymlinks) {
        const target = this.resolveNode(node.targetPath || '', true, depth + 1);
        if (!target) return null;
        if (i === parts.length - 1) return target;
        node = target;
      }
    }
    return node;
  }

  private getParent(path: string): { parent: FileNode | { children: { [key: string]: FileNode } }, name: string } | null {
    const normalized = this.normalizeInputPath(path);
    if (!normalized) return null;

    const parts = normalized.split('/').filter(p => p);
    if (parts.length === 0) return null;
    const fileName = parts.pop();
    if (!fileName) return null;
    if (parts.length === 0) return { parent: { children: this.root }, name: fileName };

    const parentPath = '/' + parts.join('/');
    const parentNode = this.resolveNode(parentPath);
    if (parentNode && parentNode.type === 'directory') return { parent: parentNode, name: fileName };
    return null;
  }

  public listDir(path: string, appId?: string): string[] {
    if (!this.checkPermission(appId, 'vfs.read')) {
      kernelLog.error(`[Sandbox Enforcer] Blocked ${appId} from reading ${path}`);
      return [];
    }
    const node = this.resolveNode(path);
    if (node && node.type === 'directory' && node.children) return Object.keys(node.children);
    return [];
  }

  public readFile(path: string, appId?: string): string | null {
    if (!this.checkPermission(appId, 'vfs.read')) {
      kernelLog.error(`[Sandbox Enforcer] Blocked ${appId} from reading ${path}`);
      return null;
    }
    const node = this.resolveNode(path);
    if (node && node.type === 'file') return node.content || '';
    return null;
  }

  private checkPermission(appId: string | undefined, req: string): boolean {
    if (appId === SYSTEM_VFS_APP_ID) return true;
    if (!appId) {
      kernelLog.warn(`[Sandbox Enforcer] Missing appId for permission check (${req})`);
      return false;
    }
    
    const desktopStore = (window as any).__OS_STORE__;
    const mobileStore = (window as any).__MOBILE_STORE__;
    
    let registry = null;
    if (desktopStore) registry = desktopStore.getState()?.registry;
    else if (mobileStore) registry = mobileStore.getState()?.registry;
    
    if (!registry) return appId === SYSTEM_VFS_APP_ID;
    
    const app = registry.find((a: any) => a.id === appId);
    if (!app) return false;
    return Array.isArray(app.permissions) && app.permissions.includes(req);
  }

  public writeFile(path: string, content: string, appId?: string): boolean {
    if (!this.checkPermission(appId, 'vfs.write')) {
      kernelLog.error(`[Sandbox Enforcer] Blocked ${appId} from writing to ${path}`);
      return false;
    }
    const info = this.getParent(path);
    if (!info) return false;
    const { parent, name } = info;
    if (!parent.children) parent.children = {};
    const existing = parent.children[name];
    const isNew = !existing;
    parent.children[name] = {
      name, type: 'file', content, permissions: 'rw-',
      created: existing?.created || Date.now(),
      modified: Date.now()
    };
    this.save();
    eventBus.emit(isNew ? 'VFS_FILE_CREATED' : 'VFS_FILE_MODIFIED', { path, appId });
    return true;
  }

  public createDir(path: string, appId?: string): boolean {
    if (!this.checkPermission(appId, 'vfs.write')) {
      kernelLog.error(`[Sandbox Enforcer] Blocked ${appId} from creating dir ${path}`);
      return false;
    }
    const info = this.getParent(path);
    if (!info) return false;
    const { parent, name } = info;
    if (!parent.children) parent.children = {};
    if (parent.children[name]) return false;
    parent.children[name] = { name, type: 'directory', permissions: 'rwx', children: {}, created: Date.now(), modified: Date.now() };
    this.save();
    eventBus.emit('VFS_DIR_CREATED', { path, appId });
    return true;
  }

  // Recursively create a directory and all missing parents. Idempotent —
  // returns true if the directory exists at the end of the call, whether
  // it was just created or already existed. Used by the wallpaper system
  // and any other feature that needs a guaranteed-present nested path.
  public createDirRecursive(path: string, appId?: string): boolean {
    if (!this.checkPermission(appId, 'vfs.write')) {
      kernelLog.error(`[Sandbox Enforcer] Blocked ${appId} from creating dir ${path}`);
      return false;
    }
    const normalized = this.normalizeInputPath(path);
    if (!normalized || normalized === '/') return true;

    const parts = normalized.split('/').filter(p => p);
    let current: { [key: string]: FileNode } = this.root;

    for (const part of parts) {
      if (!current[part]) {
        current[part] = {
          name: part,
          type: 'directory',
          permissions: 'rwx',
          children: {},
          created: Date.now(),
          modified: Date.now(),
        };
      } else if (current[part].type !== 'directory') {
        return false; // A non-directory file already exists at this path
      }
      if (!current[part].children) current[part].children = {};
      current = current[part].children;
    }

    this.save();
    eventBus.emit('VFS_DIR_CREATED', { path: normalized, appId });
    return true;
  }

  public createSymlink(targetPath: string, linkPath: string, appId?: string): boolean {
    if (!this.checkPermission(appId, 'vfs.write')) return false;
    const info = this.getParent(linkPath);
    if (!info) return false;
    const { parent, name } = info;
    if (!parent.children) parent.children = {};
    if (parent.children[name]) return false;
    parent.children[name] = {
      name,
      type: 'symlink',
      targetPath,
      permissions: 'rwx',
      created: Date.now(),
      modified: Date.now()
    };
    this.save();
    return true;
  }

  public delete(path: string, appId?: string): boolean {
    if (!this.checkPermission(appId, 'vfs.write')) {
      kernelLog.error(`[Sandbox Enforcer] Blocked ${appId} from deleting ${path}`);
      return false;
    }
    const info = this.getParent(path);
    if (!info) return false;
    const { parent, name } = info;
    if (parent.children && parent.children[name]) {
      delete parent.children[name];
      this.save();
      eventBus.emit('VFS_FILE_DELETED', { path, appId });
      return true;
    }
    return false;
  }

  public stat(path: string): FileNode | null { return this.resolveNode(path); }

  public moveMany(moves: { oldPath: string, newPath: string }[], appId?: string): boolean {
    if (!this.checkPermission(appId, 'vfs.write')) {
      kernelLog.error(`[Sandbox Enforcer] Blocked ${appId} from performing moveMany`);
      return false;
    }

    const dirCache = new Map<string, FileNode | { children: { [key: string]: FileNode } } | null>();
    const getCachedDir = (dirPath: string) => {
      let dirNode = dirCache.get(dirPath);
      if (dirNode === undefined) {
        const info = this.getParent(dirPath + '/_dummy');
        dirNode = info ? info.parent : null;
        dirCache.set(dirPath, dirNode);
      }
      return dirNode;
    };

    let anyMoved = false;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      if (!move) continue;
      const oldPath = move.oldPath;
      const newPath = move.newPath;

      const lastSlashNew = newPath.lastIndexOf('/');
      const destDir = lastSlashNew > 0 ? newPath.substring(0, lastSlashNew) : '/';
      const destName = newPath.substring(lastSlashNew + 1);

      const destParent = getCachedDir(destDir);
      if (!destParent) continue;
      if (destParent.children?.[destName]) continue;

      const lastSlashOld = oldPath.lastIndexOf('/');
      const srcDir = lastSlashOld > 0 ? oldPath.substring(0, lastSlashOld) : '/';
      const srcName = oldPath.substring(lastSlashOld + 1);

      const srcParent = getCachedDir(srcDir);
      if (!srcParent || !srcParent.children) continue;

      const node = srcParent.children[srcName];
      if (node) {
        delete srcParent.children[srcName];
        node.name = destName;
        node.modified = Date.now();
        if (!destParent.children) destParent.children = {};
        destParent.children[destName] = node;

        if ('modified' in srcParent) srcParent.modified = Date.now();
        if ('modified' in destParent) destParent.modified = Date.now();

        anyMoved = true;
      }
    }

    if (anyMoved) this.save();
    return anyMoved;
  }

  public move(oldPath: string, newPath: string): boolean {
    const node = this.resolveNode(oldPath);
    if (!node) return false;
    const destInfo = this.getParent(newPath);
    if (!destInfo) return false;
    const { parent: destParent, name: destName } = destInfo;
    if (destParent.children?.[destName]) return false;
    this.delete(oldPath, SYSTEM_VFS_APP_ID);
    node.name = destName;
    if (!destParent.children) destParent.children = {};
    destParent.children[destName] = node;
    this.save();
    return true;
  }

  public moveToTrash(path: string): boolean {
    const trashDir = `${this.getHomeDir()}/Trash`;
    if (!this.resolveNode(trashDir)) this.createDir(trashDir, SYSTEM_VFS_APP_ID);

    if (path.startsWith(trashDir)) return this.delete(path, SYSTEM_VFS_APP_ID);
    const name = path.split('/').pop();
    if (!name) return false;
    return this.move(path, `${trashDir}/${name}_${Date.now()}`);
  }

  public updateMetadata(path: string, metadata: Partial<FileNode>): boolean {
    const node = this.resolveNode(path);
    if (!node) return false;
    Object.assign(node, metadata);
    this.save();
    return true;
  }

  public getStats(path: string): { size: number, files: number, folders: number } | null {
    const node = this.resolveNode(path);
    if (!node) return null;
    let size = 0, files = 0, folders = 0;
    const traverse = (n: FileNode) => {
      if (n.type === 'file') { size += (n.content?.length || 0); files++; }
      else { if (n !== node) folders++; if (n.children) Object.values(n.children).forEach(traverse); }
    };
    traverse(node);
    return { size, files, folders };
  }
}

export const vfs = new VirtualFileSystem();