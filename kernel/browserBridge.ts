// ═══════════════════════════════════════════════════════════════════
// BROWSER BRIDGE — AI control surface for the integrated browser
//
// The browser bridge is the single rendezvous point between:
//   - the AI pipeline (toolForge dispatches OS::BROWSE_* actions)
//   - the browser UI (NetRunner / WebRunner subscribe to commands)
//   - the Electron main process (real Chromium BrowserView, optional)
//
// Why a bridge instead of direct calls? The AI lives in the kernel and
// does not know which browser window is active, or whether we're in
// browser mode (proxy iframe) or Electron mode (real BrowserView). The
// bridge abstracts that: AI emits a command, the bridge routes it to
// whichever browser surface is currently registered.
//
// Lifecycle:
//   1. NetRunner mounts → browserBridge.register(surface) → it becomes
//      the active surface and starts receiving commands.
//   2. AI emits OS::BROWSE_NAVIGATE → toolForge calls browserBridge.navigate(url)
//      → bridge dispatches eventBus 'browser:navigate' → active surface
//      loads the URL and reports back via browserBridge.reportState().
//   3. NetRunner unmounts → browserBridge.unregister(surface).
//
// In Electron mode, the bridge also proxies commands to the main process
// via window.electron.invoke('browser-*') so a real Chromium BrowserView
// can render the page. The renderer-side surface stays in sync by
// listening to 'browser:state' events.
// ═══════════════════════════════════════════════════════════════════

import { eventBus } from './eventBus';
import { kernelLog } from './log';

export interface BrowserState {
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  /** True when running inside Electron with a real Chromium BrowserView */
  isNative: boolean;
}

export type BrowserCommand =
  | { kind: 'navigate'; url: string }
  | { kind: 'back' }
  | { kind: 'forward' }
  | { kind: 'reload' }
  | { kind: 'stop' }
  | { kind: 'scroll'; deltaX: number; deltaY: number }
  | { kind: 'click'; selector: string }
  | { kind: 'input'; selector: string; value: string }
  | { kind: 'extract'; selector?: string; maxChars?: number };

export interface BrowserExtractResult {
  url: string;
  title: string;
  text: string;
  html: string;
  links: { text: string; href: string }[];
}

type BrowserSurfaceId = string;

interface BrowserSurface {
  id: BrowserSurfaceId;
  execute: (command: BrowserCommand) => Promise<unknown>;
  getState: () => BrowserState;
}

class BrowserBridge {
  private surfaces = new Map<BrowserSurfaceId, BrowserSurface>();
  private activeId: BrowserSurfaceId | null = null;
  private currentState: BrowserState = {
    url: '',
    title: '',
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    isNative: false,
  };

  /** Register a browser surface. The most recently registered becomes active. */
  register(surface: BrowserSurface): () => void {
    this.surfaces.set(surface.id, surface);
    this.activeId = surface.id;
    this.currentState = surface.getState();
    eventBus.emit('browser:surface-changed', { activeId: surface.id, count: this.surfaces.size });
    kernelLog.info(`[BrowserBridge] surface registered: ${surface.id} (active)`);

    return () => this.unregister(surface.id);
  }

  unregister(id: BrowserSurfaceId): void {
    this.surfaces.delete(id);
    if (this.activeId === id) {
      // Pick the most recently registered remaining surface, or null.
      const remaining = Array.from(this.surfaces.keys());
      this.activeId = remaining[remaining.length - 1] ?? null;
      const active = this.activeId ? this.surfaces.get(this.activeId) : null;
      this.currentState = active?.getState() ?? {
        url: '', title: '', isLoading: false,
        canGoBack: false, canGoForward: false, isNative: false,
      };
      eventBus.emit('browser:surface-changed', { activeId: this.activeId, count: this.surfaces.size });
    }
    kernelLog.info(`[BrowserBridge] surface unregistered: ${id} (active=${this.activeId ?? 'none'})`);
  }

  getActiveSurfaceId(): BrowserSurfaceId | null {
    return this.activeId;
  }

  getState(): BrowserState {
    return { ...this.currentState };
  }

  /** Called by surfaces whenever their state changes (URL, title, loading…). */
  reportState(state: BrowserState): void {
    this.currentState = state;
    eventBus.emit('browser:state', state);
  }

  /** Dispatch a command to the active surface. Returns its result. */
  async dispatch(command: BrowserCommand): Promise<unknown> {
    if (!this.activeId) {
      const err = 'No active browser surface. Open NetRunner first.';
      kernelLog.warn(`[BrowserBridge] command rejected: ${err}`);
      throw new Error(err);
    }
    const surface = this.surfaces.get(this.activeId);
    if (!surface) {
      throw new Error(`Active surface ${this.activeId} not found.`);
    }
    kernelLog.info(`[BrowserBridge] dispatch ${command.kind} → ${this.activeId}`);
    return surface.execute(command);
  }

  // ─── Convenience wrappers for the AI pipeline ──────────────────────
  async navigate(url: string): Promise<void> {
    await this.dispatch({ kind: 'navigate', url });
  }

  async back(): Promise<void> {
    await this.dispatch({ kind: 'back' });
  }

  async forward(): Promise<void> {
    await this.dispatch({ kind: 'forward' });
  }

  async reload(): Promise<void> {
    await this.dispatch({ kind: 'reload' });
  }

  async extract(selector?: string, maxChars = 8000): Promise<BrowserExtractResult> {
    // Build the command without the optional fields to satisfy
    // exactOptionalPropertyTypes: only include `selector` / `maxChars`
    // when they are actually provided.
    const cmd: BrowserCommand = selector !== undefined
      ? { kind: 'extract', selector, maxChars }
      : { kind: 'extract', maxChars };
    const result = await this.dispatch(cmd);
    return result as BrowserExtractResult;
  }

  async click(selector: string): Promise<void> {
    await this.dispatch({ kind: 'click', selector });
  }

  async input(selector: string, value: string): Promise<void> {
    await this.dispatch({ kind: 'input', selector, value });
  }

  async scroll(deltaX: number, deltaY: number): Promise<void> {
    await this.dispatch({ kind: 'scroll', deltaX, deltaY });
  }
}

export const browserBridge = new BrowserBridge();
