// kernel/windowManager/zIndexManager.ts
import { LAYERS, Z_INDEX_COMPACT_AT, Z_INDEX_SEED } from './constants.ts';
import type { ExtendedWindowState, ManagerState } from './types.ts';

export function layerFor(win: ExtendedWindowState): number {
  return win.pinned ? LAYERS.ALWAYS_ON_TOP : LAYERS.DESKTOP_UI;
}

export function assignZIndex(state: ManagerState, id: string, counter: number): ManagerState {
  const win = state.windows.find(w => w.id === id);
  if (!win) return state;
  const zIndex = layerFor(win) + counter;
  return { ...state, windows: state.windows.map(w => w.id === id ? { ...w, zIndex } : w) };
}

// Renumber visible windows by focus-stack position so globalZIndex stays bounded.
// Relative order is preserved exactly; the user perceives no change.
export function maybeCompact(state: ManagerState): ManagerState {
  if (state.globalZIndex < Z_INDEX_COMPACT_AT) return state;
  const visible = state.windows.filter(w => !w.isMinimized);
  // Index each visible window by its position in the focus stack (most-recent first).
  const stackIndex = new Map<string, number>();
  state.focusStack.forEach((id, i) => stackIndex.set(id, i));
  const offStack = visible.length;
  const rank = (id: string) => stackIndex.has(id) ? stackIndex.get(id)! : offStack;
  let normalCounter = 0;
  let pinnedCounter = 0;
  // Sort by rank ascending (lowest = oldest) so we assign increasing counters.
  const sorted = [...visible].sort((a, b) => rank(a.id) - rank(b.id)); // oldest first
  const renumbered = new Map<string, number>();
  for (const w of sorted) {
    if (w.pinned) { renumbered.set(w.id, LAYERS.ALWAYS_ON_TOP + pinnedCounter); pinnedCounter++; }
    else { renumbered.set(w.id, LAYERS.DESKTOP_UI + normalCounter); normalCounter++; }
  }
  const windows = state.windows.map(w => renumbered.has(w.id) ? { ...w, zIndex: renumbered.get(w.id)! } : w);
  const maxZ = Math.max(Z_INDEX_SEED, ...Array.from(renumbered.values()));
  return { ...state, windows, globalZIndex: maxZ + 1 };
}
