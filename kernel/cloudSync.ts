// ═══════════════════════════════════════════════════════════════════
// CLOUD SYNC — Export/import VFS via GitHub Gist
//
// Lets the user sync their filesystem across devices by exporting
// the VFS as a GitHub Gist (private) and importing it on another
// device. Requires a GitHub Personal Access Token with gist scope.
//
// Security: the token is stored in localStorage only — it is NEVER
// bundled, committed, or sent anywhere except api.github.com over
// HTTPS. The gist itself is private (public: false).
// ═══════════════════════════════════════════════════════════════════

import { vfs } from './fileSystem';
import { kernelLog } from './log';

const GIST_API = 'https://api.github.com/gists';
const TOKEN_STORAGE_KEY = 'nexusos_github_token';
const GIST_ID_STORAGE_KEY = 'nexusos_gist_id';

export interface CloudSyncResult {
  success: boolean;
  gistId?: string;
  fileCount?: number;
  error?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  username?: string;
  error?: string;
}

class CloudSync {
  getToken(): string {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  hasToken(): boolean {
    return this.getToken().length > 0;
  }

  getGistId(): string {
    return localStorage.getItem(GIST_ID_STORAGE_KEY) || '';
  }

  private setGistId(id: string): void {
    localStorage.setItem(GIST_ID_STORAGE_KEY, id);
  }

  /**
   * Export the VFS to a GitHub Gist. Creates a new gist or updates
   * an existing one (if we've synced before).
   */
  async export(): Promise<CloudSyncResult> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'No GitHub token configured. Go to Settings → Cloud Sync.' };
    }

    const json = vfs.exportToJSON();
    const gistId = this.getGistId();
    const method = gistId ? 'PATCH' : 'POST';
    const url = gistId ? `${GIST_API}/${gistId}` : GIST_API;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          description: 'NexusOS VFS Backup',
          public: false,
          files: {
            'nexusos_vfs.json': {
              content: json,
            },
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: `GitHub API ${response.status}: ${text.slice(0, 200)}` };
      }

      const data = await response.json();
      this.setGistId(data.id);
      kernelLog.info('[CloudSync] Exported to gist:', data.id);
      const result: CloudSyncResult = { success: true, gistId: data.id as string };
      return result;
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error' };
    }
  }

  /**
   * Import the VFS from a GitHub Gist. Downloads the gist and
   * replaces the local VFS.
   */
  async import(gistId?: string): Promise<CloudSyncResult> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'No GitHub token configured.' };
    }

    const id = gistId || this.getGistId();
    if (!id) {
      return { success: false, error: 'No gist ID. Export first or provide a gist ID.' };
    }

    try {
      const response = await fetch(`${GIST_API}/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        return { success: false, error: `GitHub API ${response.status}` };
      }

      const data = await response.json();
      const file = data.files?.['nexusos_vfs.json'];
      if (!file) {
        return { success: false, error: 'Gist does not contain nexusos_vfs.json' };
      }

      const result = vfs.importFromJSON(file.content);
      if (result.success) {
        this.setGistId(id);
        kernelLog.info('[CloudSync] Imported from gist:', id);
        const out: CloudSyncResult = { success: true };
        if (result.fileCount !== undefined) out.fileCount = result.fileCount;
        return out;
      }
      const errOut: CloudSyncResult = { success: false };
      if (result.error) errOut.error = result.error;
      return errOut;
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error' };
    }
  }

  /**
   * Validate a GitHub token by making a test API call.
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        return { valid: false, error: `HTTP ${response.status}` };
      }
      const data = await response.json();
      const result: TokenValidationResult = { valid: true, username: data.login as string };
      return result;
    } catch (e: any) {
      return { valid: false, error: e?.message };
    }
  }
}

export const cloudSync = new CloudSync();
