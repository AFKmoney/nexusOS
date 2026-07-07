// kernel/windowManager/layoutEngine.ts
import { ICON_GRID_SIZE } from './constants.ts';
import type { ManagerState, Viewport } from './types.ts';

export type ArrangeMode = 'cascade' | 'side-by-side' | 'stacked' | 'grid';

export function autoArrange(state: ManagerState, mode: ArrangeMode, vp: Viewport): ManagerState {
  const wins = state.windows.filter(w => !w.isMinimized);
  const n = wins.length;
  if (n === 0) return state;
  const OFFSET = 24;

  function place(idx: number): { x: number; y: number; width: number; height: number } {
    switch (mode) {
      case 'cascade':
        return { x: OFFSET * (idx + 1), y: OFFSET * (idx + 1), width: Math.min(800, vp.width - OFFSET * n), height: Math.min(600, vp.height - OFFSET * n) };
      case 'side-by-side': {
        const w = Math.floor(vp.width / n);
        return { x: idx * w, y: 0, width: w, height: vp.height };
      }
      case 'stacked': {
        const h = Math.floor(vp.height / n);
        return { x: 0, y: idx * h, width: vp.width, height: h };
      }
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        const w = Math.floor(vp.width / cols);
        const h = Math.floor(vp.height / rows);
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        return { x: col * w, y: row * h, width: w, height: h };
      }
    }
  }

  const layout = wins.map((w, i) => ({ id: w.id, ...place(i) }));
  const map = new Map(layout.map(l => [l.id, l]));
  const windows = state.windows.map(w => {
    const l = map.get(w.id);
    if (!l) return w;
    const { snapZone: _sz, restoreRect: _rr, ...rest } = w;
    return { ...rest, x: l.x, y: l.y, width: l.width, height: l.height, isMaximized: false };
  });
  return { ...state, windows };
}

export function snapIconToGrid(x: number, y: number): { x: number; y: number } {
  // Round to the nearest grid line, breaking ties downward (toward zero). Standard
  // Math.round rounds 0.5 up, but for icon snapping a value exactly between two
  // grid cells (e.g. 5 on a 10px grid) should snap to the lower cell. Verified:
  // 13→10, 27→30, 0→0, 5→0.
  const snap = (v: number) => {
    const q = v / ICON_GRID_SIZE;
    const base = Math.floor(q);
    const nearest = q - base > 0.5 ? base + 1 : base;
    return nearest * ICON_GRID_SIZE;
  };
  return { x: snap(x), y: snap(y) };
}

const ICON_COL_W = 96;
const ICON_ROW_H = 96;
const ICONS_PER_COL = 8; // before wrapping to next column

export function sortIconPositions(names: string[], _vp: Viewport): Record<string, { x: number; y: number }> {
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  const out: Record<string, { x: number; y: number }> = {};
  sorted.forEach((name, i) => {
    const col = Math.floor(i / ICONS_PER_COL);
    const row = i % ICONS_PER_COL;
    out[name] = snapIconToGrid(col * ICON_COL_W, row * ICON_ROW_H);
  });
  return out;
}
