// ═══════════════════════════════════════════════════════════════════
// GIT KERNEL MODULE — Version control for the VFS and host projects
//
// Uses isomorphic-git to provide real Git operations that work both
// in the browser (against the VFS) and in Electron (against the host
// filesystem). This lets the AI commit work, review diffs, branch,
// and push — turning NexusOS from "an OS that has apps" into "an OS
// that ships code".
//
// Two backends:
//   - VFS mode (browser): uses a custom fs adapter that reads/writes
//     the NexusOS virtual file system.
//   - Host mode (Electron): uses the real filesystem via IPC.
// ═══════════════════════════════════════════════════════════════════

import git from 'isomorphic-git';
import { vfs, SYSTEM_VFS_APP_ID } from './fileSystem';
import { kernelLog } from './log';

// ─── VFS → isomorphic-git fs adapter ────────────────────────────────
// isomorphic-git expects a LightningFS-style fs object. We adapt the
// NexusOS VFS to that interface so git operations can run against the
// virtual file system.

interface GitFsAdapter {
  promises: {
    readFile: (path: string, opts?: { encoding?: string }) => Promise<Uint8Array | string>;
    writeFile: (path: string, data: Uint8Array | string, opts?: { encoding?: string }) => Promise<void>;
    mkdir: (path: string, opts?: { recursive?: boolean }) => Promise<void>;
    rmdir: (path: string) => Promise<void>;
    readdir: (path: string) => Promise<string[]>;
    stat: (path: string) => Promise<{ isDirectory: () => boolean; mtimeMs: number; size: number }>;
    unlink: (path: string) => Promise<void>;
    exists?: (path: string) => Promise<boolean>;
  };
}

function normalizeGitPath(p: string): string {
  // isomorphic-git uses POSIX-style paths relative to the repo root.
  // Our VFS uses absolute paths like /home/user/project. We strip the
  // leading slash and treat the repo root as the VFS dir.
  let normalized = p.replace(/\\/g, '/').replace(/^\//, '');
  // isomorphic-git sometimes prepends './' — normalize away.
  if (normalized.startsWith('./')) normalized = normalized.slice(2);
  return normalized;
}

function createVfsFsAdapter(repoRoot: string): GitFsAdapter {
  const toVfsPath = (gitPath: string) => {
    const n = normalizeGitPath(gitPath);
    return n ? `${repoRoot}/${n}` : repoRoot;
  };

  return {
    promises: {
      readFile: async (path, opts) => {
        const content = vfs.readFile(toVfsPath(path), SYSTEM_VFS_APP_ID);
        if (content === null) throw new Error(`ENOENT: ${path}`);
        if (opts?.encoding === 'utf8') return content;
        return new TextEncoder().encode(content) as unknown as Uint8Array;
      },
      writeFile: async (path, data) => {
        const content = typeof data === 'string' ? data : new TextDecoder().decode(data);
        vfs.createDirRecursive(toVfsPath(path).split('/').slice(0, -1).join('/'), SYSTEM_VFS_APP_ID);
        vfs.writeFile(toVfsPath(path), content, SYSTEM_VFS_APP_ID);
      },
      mkdir: async (_path) => {
        vfs.createDirRecursive(toVfsPath(_path), SYSTEM_VFS_APP_ID);
      },
      rmdir: async (_path) => {
        vfs.delete(toVfsPath(_path), SYSTEM_VFS_APP_ID);
      },
      readdir: async (path) => {
        return vfs.listDir(toVfsPath(path), SYSTEM_VFS_APP_ID) || [];
      },
      stat: async (path) => {
        const node = vfs.stat(toVfsPath(path));
        if (!node) throw new Error(`ENOENT: ${path}`);
        return {
          isDirectory: () => node.type === 'directory',
          mtimeMs: node.modified,
          size: node.content?.length ?? 0,
        };
      },
      unlink: async (path) => {
        vfs.delete(toVfsPath(path), SYSTEM_VFS_APP_ID);
      },
      exists: async (path) => {
        return vfs.stat(toVfsPath(path)) !== null;
      },
    },
  };
}

// ─── Host fs adapter (Electron only) ────────────────────────────────
async function createHostFsAdapter(_repoRoot: string): Promise<GitFsAdapter | null> {
  if (typeof window === 'undefined' || !(window as any).electron) return null;
  // In Electron, we delegate all fs operations to the main process
  // via IPC. The main process uses the real Node fs module.
  const electron = (window as any).electron;
  return {
    promises: {
      readFile: async (path, opts) => {
        const res = await electron.invoke('fs-read-file', { path, encoding: opts?.encoding });
        if (!res.success) throw new Error(res.error);
        return res.data;
      },
      writeFile: async (path, data) => {
        const content = typeof data === 'string' ? data : new TextDecoder().decode(data);
        const res = await electron.invoke('fs-write-file', { path, content });
        if (!res.success) throw new Error(res.error);
      },
      mkdir: async (path, opts) => {
        const res = await electron.invoke('fs-mkdir', { path, recursive: opts?.recursive ?? true });
        if (!res.success) throw new Error(res.error);
      },
      rmdir: async (path) => {
        const res = await electron.invoke('fs-rmdir', { path });
        if (!res.success) throw new Error(res.error);
      },
      readdir: async (path) => {
        const res = await electron.invoke('fs-readdir', { path });
        if (!res.success) throw new Error(res.error);
        return res.entries;
      },
      stat: async (path) => {
        const res = await electron.invoke('fs-stat', { path });
        if (!res.success) throw new Error(res.error);
        return {
          isDirectory: () => res.isDirectory,
          mtimeMs: res.mtimeMs,
          size: res.size,
        };
      },
      unlink: async (path) => {
        const res = await electron.invoke('fs-unlink', { path });
        if (!res.success) throw new Error(res.error);
      },
    },
  };
}

// ─── Git operations ─────────────────────────────────────────────────

export interface GitLogEntry {
  oid: string;
  message: string;
  author: { name: string; email: string; timestamp: number };
}

class GitKernel {
  private fsCache = new Map<string, GitFsAdapter>();

  private async getFs(repoRoot: string, useHost: boolean): Promise<GitFsAdapter> {
    const cacheKey = `${useHost ? 'host' : 'vfs'}:${repoRoot}`;
    if (this.fsCache.has(cacheKey)) return this.fsCache.get(cacheKey)!;

    let fs: GitFsAdapter | null;
    if (useHost) {
      fs = await createHostFsAdapter(repoRoot);
      if (!fs) {
        kernelLog.warn('[Git] Host fs unavailable, falling back to VFS');
        fs = createVfsFsAdapter(repoRoot);
      }
    } else {
      fs = createVfsFsAdapter(repoRoot);
    }
    this.fsCache.set(cacheKey, fs);
    return fs;
  }

  async init(repoRoot: string, useHost = false): Promise<string> {
    try {
      const fs = await this.getFs(repoRoot, useHost);
      await git.init({ fs: fs as any, dir: repoRoot });
      kernelLog.info(`[Git] Initialized repo at ${repoRoot}`);
      return `Repository initialized at ${repoRoot}`;
    } catch (e: any) {
      return `[Git init error] ${e.message}`;
    }
  }

  async add(repoRoot: string, filepath: string, useHost = false): Promise<string> {
    try {
      const fs = await this.getFs(repoRoot, useHost);
      await git.add({ fs: fs as any, dir: repoRoot, filepath });
      return `Added ${filepath}`;
    } catch (e: any) {
      return `[Git add error] ${e.message}`;
    }
  }

  async addAll(repoRoot: string, useHost = false): Promise<string> {
    try {
      const fs = await this.getFs(repoRoot, useHost);
      // List all files and add them. isomorphic-git doesn't have a
      // built-in "add all" — we walk the tree.
      const files: string[] = [];
      const walk = async (dir: string) => {
        const entries = await fs.promises.readdir(dir);
        for (const entry of entries) {
          if (entry === '.git') continue;
          const fullPath = dir === repoRoot ? entry : `${dir.replace(repoRoot + '/', '')}/${entry}`;
          const stat = await fs.promises.stat(`${repoRoot}/${fullPath}`);
          if (stat.isDirectory()) {
            await walk(`${repoRoot}/${fullPath}`);
          } else {
            files.push(fullPath);
          }
        }
      };
      await walk(repoRoot);
      for (const f of files) {
        await git.add({ fs: fs as any, dir: repoRoot, filepath: f });
      }
      return `Staged ${files.length} file(s)`;
    } catch (e: any) {
      return `[Git addAll error] ${e.message}`;
    }
  }

  async commit(
    repoRoot: string,
    message: string,
    author: { name: string; email: string },
    useHost = false
  ): Promise<string> {
    try {
      const fs = await this.getFs(repoRoot, useHost);
      const oid = await git.commit({
        fs: fs as any,
        dir: repoRoot,
        message,
        author: { name: author.name, email: author.email },
      });
      kernelLog.info(`[Git] Committed ${oid.slice(0, 8)}: ${message}`);
      return `Committed ${oid.slice(0, 8)} — ${message}`;
    } catch (e: any) {
      return `[Git commit error] ${e.message}`;
    }
  }

  async log(repoRoot: string, depth = 20, useHost = false): Promise<string> {
    try {
      const fs = await this.getFs(repoRoot, useHost);
      const entries = await git.log({ fs: fs as any, dir: repoRoot, depth });
      if (entries.length === 0) return 'No commits yet.';
      const lines = entries.map((e) => {
        const c = e.commit;
        const date = new Date(c.author.timestamp * 1000).toLocaleDateString();
        return `${e.oid.slice(0, 8)} ${date} ${c.author.name}\n    ${c.message.split('\n')[0]}`;
      });
      return lines.join('\n\n');
    } catch (e: any) {
      return `[Git log error] ${e.message}`;
    }
  }

  async diff(repoRoot: string, useHost = false): Promise<string> {
    try {
      const fs = await this.getFs(repoRoot, useHost);
      // Get staged changes (HEAD vs index)
      const statusMatrix = await git.statusMatrix({ fs: fs as any, dir: repoRoot });
      const changed = statusMatrix
        .filter(([_, head, workdir, stage]) => head !== workdir || head !== stage)
        .map(([filepath]) => filepath);
      if (changed.length === 0) return 'No changes.';
      return `Changed files (${changed.length}):\n${changed.map((f) => `  ${f}`).join('\n')}`;
    } catch (e: any) {
      return `[Git diff error] ${e.message}`;
    }
  }

  async status(repoRoot: string, useHost = false): Promise<string> {
    try {
      const fs = await this.getFs(repoRoot, useHost);
      const matrix = await git.statusMatrix({ fs: fs as any, dir: repoRoot });
      const lines: string[] = [];
      for (const [filepath, head, workdir, stage] of matrix) {
        const status =
          head === workdir && head === stage ? 'clean' :
          head !== workdir && workdir === stage ? 'modified' :
          head === workdir && workdir !== stage ? 'staged' :
          head !== workdir && head !== stage ? 'staged+modified' :
          'untracked';
        if (status !== 'clean') {
          lines.push(`  ${status.padEnd(16)} ${filepath}`);
        }
      }
      return lines.length > 0 ? `Status:\n${lines.join('\n')}` : 'Working tree clean.';
    } catch (e: any) {
      return `[Git status error] ${e.message}`;
    }
  }

  async branch(repoRoot: string, useHost = false): Promise<string> {
    try {
      const fs = await this.getFs(repoRoot, useHost);
      const branches = await git.listBranches({ fs: fs as any, dir: repoRoot });
      const current = await git.currentBranch({ fs: fs as any, dir: repoRoot, fullname: false });
      return `Branches: ${branches.join(', ')} (current: ${current ?? 'none'})`;
    } catch (e: any) {
      return `[Git branch error] ${e.message}`;
    }
  }

  async checkout(repoRoot: string, ref: string, useHost = false): Promise<string> {
    try {
      const fs = await this.getFs(repoRoot, useHost);
      await git.checkout({ fs: fs as any, dir: repoRoot, ref });
      return `Checked out ${ref}`;
    } catch (e: any) {
      return `[Git checkout error] ${e.message}`;
    }
  }
}

export const gitKernel = new GitKernel();
