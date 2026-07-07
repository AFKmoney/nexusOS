// kernel/windowManager/types.ts
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SnapZone =
  | 'maximize'
  | 'left-half' | 'right-half'
  | 'top-half' | 'bottom-half'
  | 'top-left' | 'top-right'
  | 'bottom-left' | 'bottom-right'
  | 'center';

export interface Viewport {
  width: number;
  height: number; // already minus TASKBAR_RESERVED
}

// The window shape the engine operates on. Mirrors the persisted WindowState;
// optional fields default safely for legacy hydration.
export interface ExtendedWindowState {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  workspaceId?: number;
  data?: any;
  // New fields (all optional for back-compat):
  pinned?: boolean;
  opacity?: number;        // 0.4–1
  restoreRect?: Rect;      // saved before maximize/snap
  snapZone?: SnapZone;
  progress?: number;       // 0–100, optional taskbar badge
}

// Internal manager state — what the store passes in.
export interface ManagerState {
  windows: ExtendedWindowState[];
  activeWindowId: string | null;
  globalZIndex: number;
  activeWorkspace: number;
  focusStack: string[];    // window ids, most-recent-first
}
