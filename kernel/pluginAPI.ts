/**
 * PLUGIN / EXTENSION API — Allows apps to extend each other
 */

import { eventBus } from './eventBus';

export interface PluginHook {
  id: string;
  appId: string;       // Which app provides this hook
  hookName: string;    // e.g. 'contextMenu:extra', 'editor:toolbar', 'search:provider'
  label: string;
  handler: (context: any) => any;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  appId: string;       // Parent app
  hooks: string[];     // Hook points this plugin connects to
  enabled: boolean;
}

const PLUGINS_KEY = 'nexus_plugins_v1';

class PluginAPI {
  private hooks: Map<string, PluginHook[]> = new Map(); // hookName -> hooks[]
  private plugins: PluginManifest[] = [];

  constructor() {
    this.loadManifests();
  }

  private loadManifests() {
    try {
      const raw = localStorage.getItem(PLUGINS_KEY);
      if (raw) this.plugins = JSON.parse(raw);
    } catch {}
  }

  private persistManifests() {
    localStorage.setItem(PLUGINS_KEY, JSON.stringify(this.plugins));
  }

  /** Register a hook point (called by host apps) */
  registerHook(appId: string, hookName: string, label: string, handler: (ctx: any) => any) {
    const hook: PluginHook = {
      id: `${appId}:${hookName}:${Date.now()}`,
      appId,
      hookName,
      label,
      handler,
    };
    if (!this.hooks.has(hookName)) this.hooks.set(hookName, []);
    this.hooks.get(hookName)!.push(hook);
    eventBus.emit('plugin:registered', { hookName, appId });
  }

  /** Execute all hooks for a given hook point */
  executeHooks(hookName: string, context: any): any[] {
    const hooks = this.hooks.get(hookName) || [];
    return hooks.map(h => {
      try { return h.handler(context); } catch (e) { console.error(`[Plugin] Hook ${h.hookName} failed:`, e); return null; }
    }).filter(Boolean);
  }

  /** Get all registered hooks */
  getHooks(hookName?: string): PluginHook[] {
    if (hookName) return this.hooks.get(hookName) || [];
    const all: PluginHook[] = [];
    this.hooks.forEach(hooks => all.push(...hooks));
    return all;
  }

  /** Register a plugin manifest */
  registerPlugin(manifest: PluginManifest) {
    this.plugins = this.plugins.filter(p => p.id !== manifest.id);
    this.plugins.push(manifest);
    this.persistManifests();
  }

  /** Toggle plugin enabled state */
  togglePlugin(pluginId: string) {
    const p = this.plugins.find(p => p.id === pluginId);
    if (p) { p.enabled = !p.enabled; this.persistManifests(); }
  }

  /** List all plugins */
  listPlugins(): PluginManifest[] { return [...this.plugins]; }

  /** Standard hook points */
  static HOOKS = {
    CONTEXT_MENU_EXTRA: 'contextMenu:extra',
    EDITOR_TOOLBAR: 'editor:toolbar',
    SEARCH_PROVIDER: 'search:provider',
    TASKBAR_WIDGET: 'taskbar:widget',
    DASHBOARD_CARD: 'dashboard:card',
    FILE_PREVIEW: 'file:preview',
    TERMINAL_COMMAND: 'terminal:command',
  } as const;
}

export const pluginAPI = new PluginAPI();
