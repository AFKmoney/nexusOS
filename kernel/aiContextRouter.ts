// ── AI Context Router ─────────────────────────────────────────────────────
// Routes AI requests with context enrichment based on active app, window state, and history

import { vfs } from './fileSystem';
import { memory } from './memory';

export interface AIContext {
  activeApp: string;
  activeFile?: string;
  windowTitle?: string;
  recentActions: string[];
  vfsSnapshot: string[];
  memoryRecall: string[];
  systemState: Record<string, any>;
}

class AIContextRouter {
  private recentActions: string[] = [];
  private maxActions = 20;

  logAction(action: string) {
    this.recentActions.push(`[${new Date().toLocaleTimeString()}] ${action}`);
    if (this.recentActions.length > this.maxActions) this.recentActions.shift();
  }

  buildContext(activeApp: string, activeFile?: string, windowTitle?: string): AIContext {
    // Recall relevant memories
    const query = activeFile || windowTitle || activeApp;
    const memories = memory.recall(query);

    return {
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
    };
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
