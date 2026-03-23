// ── File Watcher ──────────────────────────────────────────────────────────
// Watches VFS paths for changes and triggers callbacks
import { uuid } from '../utils/uuid';

export type WatchEvent = 'create' | 'modify' | 'delete';

interface Watcher {
  id: string;
  path: string;
  callback: (event: WatchEvent, path: string) => void;
  recursive: boolean;
}

class FileWatcher {
  private watchers: Map<string, Watcher> = new Map();
  private snapshots: Map<string, string> = new Map();

  watch(path: string, callback: (event: WatchEvent, path: string) => void, recursive = false): string {
    const id = uuid();
    this.watchers.set(id, { id, path, callback, recursive });
    return id;
  }

  unwatch(id: string) {
    this.watchers.delete(id);
  }

  // Called by VFS after any write/delete operation
  notify(event: WatchEvent, filePath: string) {
    this.watchers.forEach(w => {
      if (filePath === w.path || (w.recursive && filePath.startsWith(w.path))) {
        try { w.callback(event, filePath); } catch (e) { console.error('[FileWatcher] callback error:', e); }
      }
    });
  }

  listWatchers(): Watcher[] {
    return Array.from(this.watchers.values());
  }
}

export const fileWatcher = new FileWatcher();
