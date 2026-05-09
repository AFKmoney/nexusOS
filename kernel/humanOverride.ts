import { autonomyEventLog } from './autonomyEventLog';

// ═══════════════════════════════════════════════════════════════════
// HUMAN OVERRIDE v1.0 — Hard Kill Switch & Emergency Controls
// A human can always stop, inspect, and recover the system.
// Human override dominates self-healing loops.
// Phase 9 of the Autonomy Roadmap.
// ═══════════════════════════════════════════════════════════════════

export type OverrideMode = 'active' | 'paused' | 'safe-mode' | 'disabled';

export interface OverrideState {
  mode: OverrideMode;
  reason?: string;
  activatedBy: 'user' | 'admin' | 'system';
  activatedAt: number;
  persistent: boolean;
}

export interface OverrideHistoryEntry extends OverrideState {
  id: string;
  previousMode: OverrideMode;
}

type OverrideListener = (state: OverrideState) => void;

const STORAGE_KEY = 'nexusos:override-state';

class HumanOverride {
  private state: OverrideState = {
    mode: 'active',
    activatedBy: 'system',
    activatedAt: Date.now(),
    persistent: false,
  };
  private history: OverrideHistoryEntry[] = [];
  private listeners = new Set<OverrideListener>();
  private readonly MAX_HISTORY = 100;

  constructor() {
    this.loadFromStorage();
  }

  get isAutonomyEnabled(): boolean {
    return this.state.mode === 'active';
  }

  get currentMode(): OverrideMode {
    return this.state.mode;
  }

  get currentState(): OverrideState {
    return { ...this.state };
  }

  pause(reason: string, options: { activatedBy?: OverrideState['activatedBy']; persistent?: boolean } = {}): void {
    this.transition('paused', reason, options.activatedBy ?? 'user', options.persistent ?? false);
  }

  enterSafeMode(reason: string, options: { activatedBy?: OverrideState['activatedBy']; persistent?: boolean } = {}): void {
    this.transition('safe-mode', reason, options.activatedBy ?? 'system', options.persistent ?? true);

    autonomyEventLog.append({
      kind: 'safe-mode-entered',
      subsystem: 'human-override',
      actor: options.activatedBy === 'user' ? 'user' : 'system',
      summary: `Safe mode entered: ${reason}`,
      metadata: { reason },
    });
  }

  disable(reason: string, options: { activatedBy?: OverrideState['activatedBy']; persistent?: boolean } = {}): void {
    this.transition('disabled', reason, options.activatedBy ?? 'user', options.persistent ?? true);

    autonomyEventLog.append({
      kind: 'override-activated',
      subsystem: 'human-override',
      actor: options.activatedBy === 'user' ? 'user' : 'system',
      summary: `Autonomy DISABLED: ${reason}`,
      metadata: { reason, persistent: options.persistent ?? true },
    });
  }

  resume(reason = 'User resumed autonomy'): void {
    const previousMode = this.state.mode;
    this.transition('active', reason, 'user', false);

    autonomyEventLog.append({
      kind: previousMode === 'safe-mode' ? 'safe-mode-exited' : 'override-deactivated',
      subsystem: 'human-override',
      actor: 'user',
      summary: `Autonomy resumed from ${previousMode}: ${reason}`,
      metadata: { previousMode, reason },
    });
  }

  killSwitch(reason = 'Emergency kill switch activated'): void {
    this.transition('disabled', reason, 'user', true);
    this.saveToStorage();

    autonomyEventLog.append({
      kind: 'override-activated',
      subsystem: 'human-override',
      actor: 'user',
      summary: `KILL SWITCH: ${reason}`,
      metadata: { reason, persistent: true, killSwitch: true },
    });
  }

  getHistory(): OverrideHistoryEntry[] {
    return [...this.history];
  }

  subscribe(listener: OverrideListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  private transition(
    mode: OverrideMode,
    reason: string,
    activatedBy: OverrideState['activatedBy'],
    persistent: boolean
  ): void {
    const previousMode = this.state.mode;

    const entry: OverrideHistoryEntry = {
      id: `override-${Date.now()}`,
      previousMode,
      mode,
      reason,
      activatedBy,
      activatedAt: Date.now(),
      persistent,
    };

    this.history.push(entry);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.splice(0, this.history.length - this.MAX_HISTORY);
    }

    this.state = { mode, reason, activatedBy, activatedAt: Date.now(), persistent };

    if (persistent) {
      this.saveToStorage();
    }

    this.emit();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage unavailable — state is still in memory
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as OverrideState;
      if (saved.persistent && (saved.mode === 'disabled' || saved.mode === 'safe-mode')) {
        this.state = saved;
      }
    } catch {
      // Corrupt storage — start fresh
    }
  }

  private emit(): void {
    const snap = { ...this.state };
    this.listeners.forEach(l => l(snap));
  }
}

export const humanOverride = new HumanOverride();
