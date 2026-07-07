// kernel/windowManager/focusManager.ts
import { assignZIndex, maybeCompact } from './zIndexManager.ts';
import type { ManagerState } from './types.ts';

// Internal helper: recompute activeWindowId as the topmost (highest-zIndex)
// valid window — skipping minimized and out-of-workspace windows. This mirrors
// real OS behaviour: closing/minimising the active window focuses whatever is
// visually beneath it (highest zIndex), not merely the focus-stack head.
function recomputeActive(state: ManagerState): string | null {
  let bestId: string | null = null;
  let bestZ = -Infinity;
  for (const win of state.windows) {
    if (win.isMinimized) continue;
    if (win.workspaceId !== undefined && win.workspaceId !== state.activeWorkspace) continue;
    if (win.zIndex > bestZ) {
      bestZ = win.zIndex;
      bestId = win.id;
    }
  }
  return bestId;
}

export function focus(state: ManagerState, id: string, counter: number): ManagerState {
  const win = state.windows.find(w => w.id === id);
  if (!win) return state;
  let next = assignZIndex(state, id, counter);
  // Clear minimized, move id to stack head.
  next = {
    ...next,
    windows: next.windows.map(w => w.id === id ? { ...w, isMinimized: false } : w),
    focusStack: [id, ...state.focusStack.filter(x => x !== id)],
  };
  next = { ...next, activeWindowId: id, globalZIndex: counter + 1 };
  return maybeCompact(next);
}

export function closeWindow(state: ManagerState, id: string): ManagerState {
  const next: ManagerState = {
    ...state,
    windows: state.windows.filter(w => w.id !== id),
    focusStack: state.focusStack.filter(x => x !== id),
  };
  return { ...next, activeWindowId: recomputeActive(next) };
}

export function minimizeWindow(state: ManagerState, id: string): ManagerState {
  const next: ManagerState = {
    ...state,
    windows: state.windows.map(w => w.id === id ? { ...w, isMinimized: true } : w),
    focusStack: state.focusStack.filter(x => x !== id),
  };
  return { ...next, activeWindowId: recomputeActive(next) };
}

export function restoreWindow(state: ManagerState, id: string, counter: number): ManagerState {
  const cleared: ManagerState = {
    ...state,
    windows: state.windows.map(w => w.id === id ? { ...w, isMinimized: false } : w),
  };
  return focus(cleared, id, counter);
}

export function focusNextInWorkspace(state: ManagerState, counter: number): ManagerState {
  const visible = state.focusStack.filter(id => {
    const w = state.windows.find(x => x.id === id);
    return w && !w.isMinimized && (w.workspaceId === undefined || w.workspaceId === state.activeWorkspace);
  });
  if (visible.length === 0) return state;
  const currentIdx = visible.indexOf(state.activeWindowId ?? '');
  const nextId = visible[(currentIdx + 1) % visible.length] ?? visible[0]!;
  return focus(state, nextId, counter);
}

export function validateActiveWindow(state: ManagerState): ManagerState {
  const activeId = state.activeWindowId;
  if (!activeId) return state;
  const win = state.windows.find(w => w.id === activeId);
  if (!win || win.isMinimized || (win.workspaceId !== undefined && win.workspaceId !== state.activeWorkspace)) {
    return { ...state, activeWindowId: recomputeActive(state) };
  }
  return state;
}
