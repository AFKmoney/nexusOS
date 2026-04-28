// ── AI Context Router ─────────────────────────────────────────────────────
// Routes AI requests with context enrichment based on active app, window state, and history

import { vfs } from './fileSystem';
import { memory } from './memory';

export interface AIContext {
  activeApp: string;
  activeFile: string | undefined;
  windowTitle: string | undefined;
  recentActions: string[];
  vfsSnapshot: string[];
  memoryRecall: string[];
  systemState: Record<string, any>;
}

export type AIContextRequest = {
  actionType: string;
  appId: string;
  activeWindowCount: number;
  activeWorkspace: string | null;
  currentUserId: string | null;
};

class AIContextRouter {
  private recentActions: string[] = [];
  private maxActions = 20;

  logAction(action: string) {
    this.recentActions.push(`[${new Date().toLocaleTimeString()}] ${action}`);
    if (this.recentActions.length > this.maxActions) this.recentActions.shift();
  }

  collect(request: AIContextRequest): string[] {
    const snapshots = [
      `Action type: ${request.actionType}`,
      `Target app: ${request.appId}`,
      `Active windows: ${request.activeWindowCount}`,
      `Active workspace: ${request.activeWorkspace ?? 'none'}`,
      `Current user: ${request.currentUserId ?? 'none'}`
    ];

    const path = request.currentUserId ? `/home/${request.currentUserId}` : '/home/user';
    const safeListing = vfs.listDir(path).slice(0, 10);
    if (safeListing.length > 0) {
      snapshots.push(`Workspace files: ${safeListing.join(', ')}`);
    }

    return snapshots;
  }

  buildContext(activeApp: string, activeFile?: string, windowTitle?: string): AIContext {
    const query = activeFile || windowTitle || activeApp;
    const memories = memory.recall(query);

    const context = {
      activeApp,
      activeFile,
      windowTitle,
      recentActions: [...this.recentActions],
      vfsSnapshot: vfs.listDir('/home/user').slice(0, 30),
      memoryRecall: memories.slice(0, 5).map(m => m.content),
      systemState: {
        timestamp: new Date().toISOString(),
        uptime: Math.floor(performance.now() / 1000),
        online: navigator.onLine,
        language: navigator.language,
      },
    } satisfies AIContext;

    return context;
  }

  buildSystemPromptInjection(ctx: AIContext): string {
    const parts: string[] = [
      `[OS_CONTEXT]`,
      `Active App: ${ctx.activeApp}`,
    ];
    if (ctx.activeFile) parts.push(`Active File: ${ctx.activeFile}`);
    if (ctx.windowTitle) parts.push(`Window: ${ctx.windowTitle}`);
    if (ctx.recentActions.length > 0) parts.push(`Recent Actions:\n${ctx.recentActions.slice(-5).join('\n')}`);
    if (ctx.memoryRecall.length > 0) parts.push(`Relevant Memories:\n${ctx.memoryRecall.join('\n---\n')}`);
    parts.push(`[/OS_CONTEXT]`);
    return parts.join('\n');
  }

  getRecentActions(): string[] {
    return [...this.recentActions];
  }

  clearActions() {
    this.recentActions = [];
  }
}

export const aiContextRouter = new AIContextRouter();
