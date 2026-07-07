// kernel/windowManager/constants.ts
// Layered z-index model — replaces ad-hoc magic numbers scattered across components.
export const LAYERS = {
  BACKGROUND: 0,      // desktop widgets, icons
  DESKTOP_UI: 10,     // normal WindowFrames
  ALWAYS_ON_TOP: 9000, // pinned windows — below OS overlays
  OVERLAY_UI: 9500,   // StartMenu, Taskbar flyouts, hover previews
  MODAL: 9900,        // TaskSwitcher, LockScreen
  CONTEXT_MENU: 9999, // always on top
} as const;

// Snap trigger bands (px from viewport edges).
export const SNAP_EDGE_THRESHOLD = 50;   // cursor within 50px of an edge
export const SNAP_CORNER_THRESHOLD = 30; // and 30px of a corner → quarter zone
export const SNAP_HOVER_DELAY_MS = 250;  // Maximize-button hover → layouts picker

// Minimum sizes a snapped rect can have (tiny screens).
export const MIN_SNAPPED_W = 320;
export const MIN_SNAPPED_H = 200;

// Reserved height at the bottom of the viewport for the taskbar.
export const TASKBAR_RESERVED = 56;

// Desktop icon snap-to-grid.
export const ICON_GRID_SIZE = 10;

// Z-index compaction threshold.
export const Z_INDEX_COMPACT_AT = 5000;
export const Z_INDEX_SEED = 100;
