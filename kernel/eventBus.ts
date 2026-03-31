/**
 * EVENT BUS — Centralized pub/sub system for inter-app communication
 */

export type EventHandler = (payload: any) => void;

class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private history: { event: string; payload: any; timestamp: number }[] = [];
  private maxHistory = 100;

  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    // Return unsubscribe function
    return () => { this.listeners.get(event)?.delete(handler); };
  }

  once(event: string, handler: EventHandler): () => void {
    const wrapper: EventHandler = (payload) => {
      handler(payload);
      this.listeners.get(event)?.delete(wrapper);
    };
    return this.on(event, wrapper);
  }

  emit(event: string, payload?: any) {
    this.history.push({ event, payload, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();
    this.listeners.get(event)?.forEach(handler => {
      try { handler(payload); } catch (e) { console.error(`[EventBus] Error in handler for "${event}":`, e); }
    });
    // Wildcard listeners
    this.listeners.get('*')?.forEach(handler => {
      try { handler({ event, payload }); } catch (e) {}
    });
  }

  off(event: string, handler?: EventHandler) {
    if (handler) {
      this.listeners.get(event)?.delete(handler);
    } else {
      this.listeners.delete(event);
    }
  }

  getHistory(limit = 20): { event: string; payload: any; timestamp: number }[] {
    return this.history.slice(-limit);
  }

  listEvents(): string[] {
    return Array.from(this.listeners.keys());
  }

  clear() {
    this.listeners.clear();
    this.history = [];
  }
}

export const eventBus = new EventBus();

// ── Standard OS Events ──────────────────────────────────────────────────────
export const OS_EVENTS = {
  WINDOW_OPENED: 'os:window:opened',
  WINDOW_CLOSED: 'os:window:closed',
  WINDOW_FOCUSED: 'os:window:focused',
  WINDOW_MINIMIZED: 'os:window:minimized',
  APP_LAUNCHED: 'os:app:launched',
  FILE_CREATED: 'os:file:created',
  FILE_DELETED: 'os:file:deleted',
  FILE_MODIFIED: 'os:file:modified',
  NOTIFICATION: 'os:notification',
  CLIPBOARD_COPY: 'os:clipboard:copy',
  CLIPBOARD_PASTE: 'os:clipboard:paste',
  THEME_CHANGED: 'os:theme:changed',
  MODEL_LOADED: 'os:model:loaded',
  AI_RESPONSE: 'os:ai:response',
  SEARCH_REQUESTED: 'os:search:requested',
  LOCK_SCREEN: 'os:lock',
  UNLOCK_SCREEN: 'os:unlock',
  DAEMON_DRAW_HOLO: 'daemon:draw_holo',
} as const;
