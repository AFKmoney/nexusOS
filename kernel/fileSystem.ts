
import { FileNode } from '../types';

const VFS_STORAGE_KEY = 'nexus_vfs_v1';

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
                content: 'Welcome to Aion OS v10.\nAI Core is now recursive. Try "Refactor the Terminal" in Neural Forge.',
                created: Date.now(),
                modified: Date.now()
              }
            }
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
        content: '[BOOT] Recursive Kernel v10.0 Initialized.\n[INFO] AI Self-Access Granted.',
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
      }
    }
  }
};

export class VirtualFileSystem {
  private root: { [key: string]: FileNode };
  private isBatching = false;

  constructor() {
    try {
        const saved = localStorage.getItem(VFS_STORAGE_KEY);
        if (saved) {
            this.root = JSON.parse(saved);
        } else {
            this.root = structuredClone(INITIAL_FS);
            this.save();
        }
    } catch (e) {
        this.root = structuredClone(INITIAL_FS);
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
    if (this.isBatching) return;
    localStorage.setItem(VFS_STORAGE_KEY, JSON.stringify(this.root));
  }

  private getHomeDir(): string {
      const state: any = (window as any).__OS_STORE__?.getState();
      const user = state?.currentUser?.id || 'admin';
      return `/home/${user}`;
  }

  public resolveNode(path: string, followSymlinks = true, depth = 0): FileNode | null {
    if (depth > 10) return null; // Prevent infinite loops
    if (path === '/') return { name: 'root', type: 'directory', children: this.root, permissions: 'rwx', created: 0, modified: 0 };
    
    // Normalize path
    let normalized = path;
    if (!path.startsWith('/')) {
        normalized = `${this.getHomeDir()}/Desktop/${path}`;
    }

    const parts = normalized.split('/').filter(p => p);
    let current: any = this.root;
    
    let node: FileNode | null = null;
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === 0) {
            node = current[part];
        } else {
            if (node?.type !== 'directory' || !node.children) return null;
            node = node.children[part];
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
    let normalized = path;
    if (!path.startsWith('/')) {
        normalized = `${this.getHomeDir()}/Desktop/${path}`;
    }
    
    const parts = normalized.split('/').filter(p => p);
    if (parts.length === 0) return null;
    const fileName = parts.pop()!;
    if (parts.length === 0) return { parent: { children: this.root } as any, name: fileName };
    
    const parentPath = '/' + parts.join('/');
    const parentNode = this.resolveNode(parentPath);
    if (parentNode && parentNode.type === 'directory') return { parent: parentNode, name: fileName };
    return null;
  }

  public listDir(path: string): string[] {
    const node = this.resolveNode(path);
    if (node && node.type === 'directory' && node.children) return Object.keys(node.children);
    return [];
  }

  public readFile(path: string, appId?: string): string | null {
    if (!this.checkPermission(appId, 'vfs.read')) {
        console.error(`[Sandbox Enforcer] Blocked ${appId} from reading ${path}`);
        return null;
    }
    const node = this.resolveNode(path);
    if (node && node.type === 'file') return node.content || '';
    return null;
  }

  private checkPermission(appId: string | undefined, req: string): boolean {
    if (!appId) return true; // System level bypass
    const state: any = (window as any).__OS_STORE__?.getState();
    if (!state) return true;
    const app = state.registry.find((a: any) => a.id === appId);
    if (!app) return false;
    return app.permissions.includes(req);
  }

  public writeFile(path: string, content: string, appId?: string): boolean {
    if (!this.checkPermission(appId, 'vfs.write')) {
        console.error(`[Sandbox Enforcer] Blocked ${appId} from writing to ${path}`);
        return false;
    }
    const info = this.getParent(path);
    if (!info) return false;
    const { parent, name } = info;
    if (!parent.children) parent.children = {};
    parent.children[name] = {
        name, type: 'file', content, permissions: 'rw-',
        created: parent.children[name]?.created || Date.now(),
        modified: Date.now()
    };
    this.save();
    return true;
  }

  public createDir(path: string, appId?: string): boolean {
    if (!this.checkPermission(appId, 'vfs.write')) {
        console.error(`[Sandbox Enforcer] Blocked ${appId} from creating dir ${path}`);
        return false;
    }
    const info = this.getParent(path);
    if (!info) return false;
    const { parent, name } = info;
    if (!parent.children) parent.children = {};
    if (parent.children[name]) return false;
    parent.children[name] = { name, type: 'directory', permissions: 'rwx', children: {}, created: Date.now(), modified: Date.now() };
    this.save();
    return true;
  }

  public createSymlink(targetPath: string, linkPath: string, appId?: string): boolean {
    if (!this.checkPermission(appId, 'vfs.write')) return false;
    const info = this.getParent(linkPath);
    if (!info) return false;
    const { parent, name } = info;
    if (!parent.children) parent.children = {};
    if (parent.children[name]) return false; // Already exists
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
        console.error(`[Sandbox Enforcer] Blocked ${appId} from deleting ${path}`);
        return false;
    }
    const info = this.getParent(path);
    if (!info) return false;
    const { parent, name } = info;
    if (parent.children && parent.children[name]) {
        delete parent.children[name];
        this.save();
        return true;
    }
    return false;
  }

  public stat(path: string): FileNode | null { return this.resolveNode(path); }

  public move(oldPath: string, newPath: string): boolean {
    const node = this.resolveNode(oldPath);
    if (!node) return false;
    const destInfo = this.getParent(newPath);
    if (!destInfo) return false;
    const { parent: destParent, name: destName } = destInfo;
    if (destParent.children?.[destName]) return false;
    this.delete(oldPath);
    node.name = destName;
    if (!destParent.children) destParent.children = {};
    destParent.children[destName] = node;
    this.save();
    return true;
  }
  
  public moveToTrash(path: string): boolean {
      const trashDir = `${this.getHomeDir()}/Trash`;
      if (!this.resolveNode(trashDir)) this.createDir(trashDir);
      
      if (path.startsWith(trashDir)) return this.delete(path);
      const name = path.split('/').pop()!;
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
