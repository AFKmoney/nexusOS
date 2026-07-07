// kernel/windowManager/snapEngine.ts
import { SNAP_EDGE_THRESHOLD, SNAP_CORNER_THRESHOLD, MIN_SNAPPED_W, MIN_SNAPPED_H } from './constants.ts';
import type { ExtendedWindowState, ManagerState, Rect, SnapZone, Viewport } from './types.ts';

export function computeSnapRect(zone: SnapZone, vp: Viewport): Rect {
  const W = Math.max(vp.width, MIN_SNAPPED_W);
  const H = Math.max(vp.height, MIN_SNAPPED_H);
  const halfW = Math.floor(W / 2);
  const halfH = Math.floor(H / 2);
  switch (zone) {
    case 'maximize':      return { x: 0, y: 0, width: W, height: H };
    case 'left-half':     return { x: 0, y: 0, width: halfW, height: H };
    case 'right-half':    return { x: W - halfW, y: 0, width: halfW, height: H };
    case 'top-half':      return { x: 0, y: 0, width: W, height: halfH };
    case 'bottom-half':   return { x: 0, y: H - halfH, width: W, height: halfH };
    case 'top-left':      return { x: 0, y: 0, width: halfW, height: halfH };
    case 'top-right':     return { x: W - halfW, y: 0, width: halfW, height: halfH };
    case 'bottom-left':   return { x: 0, y: H - halfH, width: halfW, height: halfH };
    case 'bottom-right':  return { x: W - halfW, y: H - halfH, width: halfW, height: halfH };
    case 'center': {
      const w = Math.round(W * 0.8);
      const h = Math.round(H * 0.8);
      return { x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), width: w, height: h };
    }
  }
}

export function detectSnapZone(x: number, y: number, vp: Viewport): SnapZone | null {
  const nearLeft = x <= SNAP_EDGE_THRESHOLD;
  const nearRight = x >= vp.width - SNAP_EDGE_THRESHOLD;
  const nearTop = y <= SNAP_EDGE_THRESHOLD;
  const nearBottom = y >= vp.height - SNAP_EDGE_THRESHOLD;
  const cornerLeft = x <= SNAP_CORNER_THRESHOLD;
  const cornerRight = x >= vp.width - SNAP_CORNER_THRESHOLD;
  const cornerTop = y <= SNAP_CORNER_THRESHOLD;
  const cornerBottom = y >= vp.height - SNAP_CORNER_THRESHOLD;
  // Corners take priority (smaller band) → quarter zones.
  if (cornerLeft && cornerTop) return 'top-left';
  if (cornerRight && cornerTop) return 'top-right';
  if (cornerLeft && cornerBottom) return 'bottom-left';
  if (cornerRight && cornerBottom) return 'bottom-right';
  // Edges (away from corners) → half zones. Top edge is the half, not maximize —
  // full maximize is triggered explicitly elsewhere (maximize button / double-click title bar).
  if (nearLeft) return 'left-half';
  if (nearRight) return 'right-half';
  if (nearTop) return 'top-half';
  if (nearBottom) return 'bottom-half';
  return null;
}

export function snapWindow(state: ManagerState, id: string, zone: SnapZone, vp: Viewport): ManagerState {
  const win = state.windows.find(w => w.id === id);
  if (!win) return state;
  const rect = computeSnapRect(zone, vp);
  // Save restoreRect only if not already snapped (don't overwrite the original).
  const restoreRect: Rect = win.snapZone
    ? (win.restoreRect ?? { x: win.x, y: win.y, width: win.width, height: win.height })
    : { x: win.x, y: win.y, width: win.width, height: win.height };
  const updated: ExtendedWindowState = {
    ...win,
    x: rect.x, y: rect.y, width: rect.width, height: rect.height,
    restoreRect, snapZone: zone,
    isMaximized: zone === 'maximize',
  };
  return {
    ...state,
    windows: state.windows.map(w => w.id === id ? updated : w),
  };
}

export function unsnapWindow(state: ManagerState, id: string): ManagerState {
  const win = state.windows.find(w => w.id === id);
  if (!win) return state;
  const r = win.restoreRect;
  // Strip restoreRect/snapZone by omission (exactOptionalPropertyTypes-safe).
  const { restoreRect: _rr, snapZone: _sz, ...rest } = win;
  const updated: ExtendedWindowState = {
    ...rest,
    x: r ? r.x : win.x,
    y: r ? r.y : win.y,
    width: r ? r.width : win.width,
    height: r ? r.height : win.height,
    isMaximized: false,
  };
  return { ...state, windows: state.windows.map(w => w.id === id ? updated : w) };
}

// Windows 11 gesture: dragging a maximized/snapped window first unsnaps and
// centers the restoreRect under the cursor so the user keeps dragging freely.
export function beginDragRestore(state: ManagerState, id: string, cursorX: number, cursorY: number): ManagerState {
  const win = state.windows.find(w => w.id === id);
  if (!win || (!win.snapZone && !win.isMaximized)) return state;
  const unsnapped = unsnapWindow(state, id);
  const w = unsnapped.windows.find(w => w.id === id)!;
  const updated: ExtendedWindowState = {
    ...w,
    x: cursorX - Math.round(w.width / 2),
    y: cursorY - Math.round(w.height / 2),
  };
  return { ...unsnapped, windows: unsnapped.windows.map(x => x.id === id ? updated : x) };
}
