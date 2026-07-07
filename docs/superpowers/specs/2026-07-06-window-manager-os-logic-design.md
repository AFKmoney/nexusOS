# Window Manager & OS Logic — Audit & Major Improvement

**Date**: 2026-07-06
**Status**: Approved design, pending implementation plan
**Scope**: Windows (focus, snapping, z-index), Desktop icons (selection, snap, store), Taskbar behavior
**Reference OS behavior**: Windows 11 (snap layouts, hover preview, snap assist)
**Migration approach**: Extract a dedicated `windowManager` kernel module
**Testing**: Unit tests on the windowManager logic

---

## 1. Problem Statement (Audit)

The current window/icon/taskbar logic is fragmented and exhibits several real bugs and
missing OS-grade behaviors. The logic is scattered across:

- `store/osStoreSlices.ts` — window state + actions
- `components/WindowFrame.tsx` — local state for `alwaysOnTop` / `opacity`, hardcoded `zIndex: 9999`
- `App.tsx` — global keyboard shortcuts + `DesktopIconGrid`
- `components/Taskbar.tsx` — `handleWindowClick`
- `localStorage` (raw) — desktop icon positions, bypassing the store entirely

### 1.1 Bugs (correctness)

| # | Bug | Impact |
|---|-----|--------|
| B1 | `activeWindowId` is not cleared when the active window is closed | Focus points at a dead window; keyboard shortcuts targeting "active" hit nothing |
| B2 | `globalZIndex` is persisted and grows monotonically, never compacted | After many sessions z-index loses its meaning; ordering can drift |
| B3 | `Ctrl+W` closes `windows.at(-1)` (last opened) instead of the active window | User closes the wrong window |
| B4 | `alwaysOnTop` + `opacity` are local `WindowFrame` state, set via `zIndex: 9999` | Lost on re-render; collides with StartMenu (`z-[9990]`), ContextMenu (`z-[9999]`), TaskSwitcher (`z-[9999]`) |
| B5 | `activeWindowId` can point to a window in another workspace | Workspace switching leaves phantom focus |
| B6 | No `restoreRect` saved before maximize | Restore is approximate; window "remembers" nothing |
| B7 | Desktop icon positions live in raw `localStorage` | Inconsistent state, no reset, no multi-user sync, bypasses Zustand dev tools |

### 1.2 Missing OS behaviors

| # | Gap | Reference |
|---|-----|-----------|
| G1 | No window snapping (half / quarter / maximize-by-drag) | Windows 7+ |
| G2 | No snap layouts picker (Alt+Z / hover-Maximize popover) | Windows 11 |
| G3 | No drag-to-restore from maximized (restore-rect under cursor) | Windows 11 |
| G4 | No Snap Assist panel after a half-snap | Windows 11 |
| G5 | `autoArrangeWindows` is a fixed 3-col grid; no side-by-side / cascade / smart layouts | — |
| G6 | No session restore on reboot | macOS / Windows |
| G7 | No hover preview on taskbar items | Windows 11 |
| G8 | No jump list (right-click) richer than today | Windows 11 |
| G9 | "Show Desktop" minimizes all but does not toggle | Windows |
| G10 | No multi-selection / box-select / snap-to-grid toggle on desktop icons | Windows / macOS |
| G11 | No grouped drag of multiple selected icons | Windows |

### 1.3 Out of scope (explicitly)

- Session restore on reboot (G6) — deferred to a later spec; the `restoreRect` groundwork is laid here but full persistence of the open-window set is not part of this iteration.
- Tiling-by-default mode — not pursued; floating-with-snap is the model.
- Thumbnail DOM previews on hover (too expensive); we use info-cards only.
- Custom keyboard mapping UI; shortcuts are hard-coded constants for now.

---

## 2. Architecture

### 2.1 New module: `kernel/windowManager/`

A pure, React-agnostic authority for focus, z-index, snapping and layouts. The Zustand
store delegates to it; components read the store and render.

```
kernel/windowManager/
├── constants.ts        # LAYERS, SnapZone, snap trigger thresholds, grid size
├── types.ts            # WindowState (extended), SnapZone, Rect, WindowLayout
├── focusManager.ts     # focus stack, activeWindowId always valid, workspace filter
├── zIndexManager.ts    # compaction, alwaysOnTop layering
├── snapEngine.ts       # computeSnapRect(zone, viewport), snap/unsnap, restoreRect
├── layoutEngine.ts     # cascade, side-by-side, snap assist candidates
└── index.ts            # public API consumed by the store
```

**Purity contract**: every function takes the current window array (and relevant state)
and returns a new array + derived fields. No DOM access, no React. This makes the whole
engine unit-testable without a jsdom environment.

### 2.2 State ownership changes

The following fields move **out of local component state / raw localStorage** and **into
the Zustand store** (`WindowState` / `OSStateShape`):

| Field | Was | Now |
|-------|-----|-----|
| `pinned: boolean` (always-on-top) | local `WindowFrame` state | `WindowState.pinned` |
| `opacity: number` (0.4–1) | local `WindowFrame` state | `WindowState.opacity` |
| `restoreRect?: Rect` | absent | `WindowState.restoreRect` (saved before maximize/snap) |
| `snapZone?: SnapZone` | absent | `WindowState.snapZone` |
| `progress?: number` (0–100) | absent | `WindowState.progress` (optional, for taskbar badge) |
| `desktopIconPositions` | raw `localStorage['nexusos_desktop_positions']` | `OSStateShape.desktopIconPositions` |
| `desktopIconSelection: string[]` | absent | `OSStateShape.desktopIconSelection` |
| `desktopGridSnap: boolean` | absent (hard-coded 10px) | `OSStateShape.desktopGridSnap` (default true) |
| `showDesktopState: 'none' \| 'showing-desktop'` | absent | `OSStateShape.showDesktopState` |

**Migration**: on first boot after upgrade, if `desktopIconPositions` is empty in the
store but `localStorage['nexusos_desktop_positions']` exists, import it once then delete
the legacy key. `globalZIndex` stops being persisted (re-seeded to `LAYERS.DESKTOP_UI`
floor on boot).

### 2.3 Layer model (z-index)

Replaces the magic `9999`. Immutable constants:

```ts
export const LAYERS = {
  BACKGROUND:    0,      // desktop widgets, icons
  DESKTOP_UI:    10,     // normal WindowFrames
  ALWAYS_ON_TOP: 9000,   // pinned windows — below OS overlays
  OVERLAY_UI:    9500,   // StartMenu, Taskbar flyouts, hover previews
  MODAL:         9900,   // TaskSwitcher, LockScreen
  CONTEXT_MENU:  9999,   // always on top
} as const;
```

- Normal windows receive `zIndex = LAYERS.DESKTOP_UI + relativeZ` where `relativeZ` is
  the per-window focus counter.
- Pinned windows receive `zIndex = LAYERS.ALWAYS_ON_TOP + relativeZ` (so multiple pinned
  windows still order correctly among themselves).
- `globalZIndex` is **not persisted** and is compacted when it exceeds 5000 (renumber
  visible windows by stack order; user-perceived order unchanged).

---

## 3. Focus & z-index (focusManager / zIndexManager)

### 3.1 Focus stack

Internally the manager maintains a `focusStack: string[]` (window ids, most-recent-first).
`activeWindowId` is always `focusStack[0]` (or `null` when empty). This makes B1
impossible by construction: closing a window removes its id from the stack, and the new
top becomes active automatically.

### 3.2 Operations

- `focus(state, id)` — bump `globalZIndex`, move `id` to head of stack, clear `isMinimized`.
- `closeWindow(state, id)` — remove from windows array **and** focus stack; recompute
  `activeWindowId` from the stack top.
- `minimizeWindow(state, id)` — set `isMinimized`, remove from focus stack (a minimized
  window cannot be active), recompute `activeWindowId`.
- `restoreWindow(state, id)` — clear `isMinimized`, then `focus(state, id)`.
- `focusNextInWorkspace(state)` — Alt+Tab: cycle through non-minimized windows in the
  active workspace, in stack order.
- `validateActiveWindow(state)` — if `activeWindowId`'s window is in another workspace
  or minimized, set `activeWindowId = null`. Called on workspace switch and on render
  gate. Fixes B5.

### 3.3 Z-index compaction

`maybeCompact(state)` — if `globalZIndex > 5000`, renumber all visible (non-minimized)
windows by their focus-stack position: the head gets the highest zIndex within its layer.
`globalZIndex` resets to the new maximum + 1. No re-render flicker because relative order
is preserved.

### 3.4 Keyboard shortcuts (corrected)

| Shortcut | Action | Today |
|----------|--------|-------|
| `Ctrl+W` | close **active** window (was: last opened) | B3 fix |
| `Alt+Tab` | `focusNextInWorkspace` | new |
| `Win+←/→` | snap half-left / half-right | new |
| `Win+↑` | maximize (or grow vertically if already half) | new |
| `Win+↓` | restore → minimize | new |
| `Win+NumPad1..9` | snap to quarters / halves by numpad position | new |
| `Alt+Z` | open snap layouts picker for active window | new |

(`Win` = the OS meta key when available, else `Ctrl+Shift` fallback so it doesn't fight
browser shortcuts. Final mapping decided in implementation; documented in USER_MANUAL.)

---

## 4. Snap engine (snapEngine.ts)

### 4.1 Snap zones

```ts
export type SnapZone =
  | 'maximize'
  | 'left-half' | 'right-half'
  | 'top-half' | 'bottom-half'
  | 'top-left' | 'top-right'
  | 'bottom-left' | 'bottom-right'
  | 'center';
```

### 4.2 Geometry (pure math, unit-tested)

```ts
computeSnapRect(zone: SnapZone, viewport: { w: number; h: number }, taskbarReserved: number): Rect
```

`viewport.h` is `window.innerHeight - taskbarReserved`. All rects are clamped to >=
`MIN_SNAPPED_W` (320) and `MIN_SNAPPED_H` (200) so a quarter can't go negative on tiny
screens.

### 4.3 Snap / unsnap

- `snapWindow(state, id, zone)`:
  1. Save current `{x, y, width, height}` as `restoreRect` (only if not already snapped —
     otherwise we'd overwrite the original rect with a snapped one).
  2. Apply `computeSnapRect(zone, ...)`.
  3. Set `snapZone = zone`, `isMaximized = (zone === 'maximize')`.
  4. Focus the window.
- `unsnapWindow(state, id)`:
  1. If `restoreRect` exists, restore it; else leave position.
  2. Clear `snapZone`, `isMaximized`, `restoreRect`.

### 4.4 Drag-to-restore gesture

While dragging a snapped/maximized window, on `dragStart` we **immediately unsnap** and
position the `restoreRect` centered under the cursor (Windows 11 behavior). The user
keeps dragging the now-free window. Implementation: `onDragStart` in `WindowFrame` calls
`beginDragRestore(state, id, cursorX, cursorY)` which calls `unsnapWindow` then centers.

### 4.5 Snap triggers (three complementary mechanisms)

1. **Drag-to-edge** — during drag of a non-maximized window, if the cursor enters a
   trigger band (50px from any edge, 30px from corners), show a translucent overlay of
   the target zone via a `<SnapOverlay>` component. On `dragStop` inside a trigger band,
   call `snapWindow(id, detectedZone)`.
2. **Snap layouts picker** — hovering the Maximize button of the title bar for >250ms
   shows a 6-layout popover (`<SnapLayoutsPicker>`). Click a cell → `snapWindow`. Also
   triggered by `Alt+Z` for the active window.
3. **Keyboard** — see §3.4.

### 4.6 Snap Assist (optional, toggleable)

After a half-snap, if ≥1 other non-minimized window exists in the active workspace, show
a `<SnapAssist>` strip offering those windows; clicking one snaps it to the opposite
half. Dismissible; defaulted **off** in Settings (`snapAssistEnabled: false`) for the
first iteration to keep scope tight. The hook is in place; flipping the toggle is a
one-liner.

---

## 5. Layout engine (layoutEngine.ts)

Replaces the current fixed 3-column `autoArrangeWindows`.

- `autoArrange(state, mode)` where `mode ∈ {'cascade' | 'side-by-side' | 'stacked' | 'grid'}`.
  - `cascade` — classic diagonal offset (current behavior, generalized).
  - `side-by-side` — N columns equal width.
  - `stacked` — N rows equal height.
  - `grid` — closest-to-square grid.
- All modes respect the viewport (minus taskbar) and re-flow when N exceeds screen
  capacity (graceful degradation: switch to side-by-side with horizontal scroll hint).
- ContextMenu "Taskbar" section gains a "Arrange windows ▸" submenu with the four modes.

`autoArrangeWindows()` (existing API) is kept as a thin wrapper defaulting to `cascade`
for backward compatibility.

---

## 6. Taskbar behavior

### 6.1 `handleWindowClick` (corrected)

```
click on a window tab:
  if window.isMinimized         -> restore + focus
  else if window is active      -> minimize   (toggle off)
  else                          -> focus
```

(Previously the minimized-restored and focus cases were conflated.)

### 6.2 Hover preview

- On mouseenter over a taskbar window tab, start a 400ms timer.
- If still hovering, render a small info-card above the tab: app icon, title, state
  badge (`Minimized` / `Active` / `Snapped: left-half`).
- No DOM thumbnail (cost too high); info-card only.
- Closes on mouseleave or click.

### 6.3 Jump list (right-click)

Reuses the existing `ContextMenu` with `targetType: 'window'`. New entries inserted into
that section:

- "Snap left" / "Snap right" / "Maximize" / "Restore"  (contextual)
- "Move to workspace ▸ 2 / 3"
- "Always on top" toggle (reads `window.pinned`)
- existing: "Close window"

### 6.4 Show Desktop toggle

- First click: snapshot the set of currently visible (non-minimized) window ids into
  `showDesktopSnapshot: string[]`, minimize them all, set `showDesktopState = 'showing-desktop'`.
- Second click: restore exactly those ids (in their previous z-order), clear snapshot,
  reset state.
- Snapshot is cleared if the user manually opens/focuses a window in the meantime
  (one-shot semantics, like Windows).

### 6.5 Progress badge (optional)

- `WindowState.progress?: number` (0–100).
- Taskbar renders a thin accent ring under the tab icon when `progress` is set and `< 100`.
- Instrumented only on NeuralForge in this iteration (proof of concept). Other apps can
  opt in by calling `updateWindow(id, { progress })`.

---

## 7. Desktop icons

### 7.1 State migration

`desktopIconPositions` moves into the store. One-time import from the legacy
`localStorage` key on boot (see §2.2). The `DesktopIconGrid` component reads from the
store instead of local state.

### 7.2 New interactions

- **Single selection** — click an icon → it becomes the sole selection.
- **Toggle add** — Ctrl+click → toggles membership in `desktopIconSelection`.
- **Range select** — Shift+click → selects the range between the anchor and the clicked
  icon (alphabetical order, simple deterministic definition).
- **Clear** — click on empty desktop clears the selection.
- **Marquee / box-select** — mouse-down on empty desktop + drag draws a `<MarqueeRect>`
  overlay; on mouse-up, every icon whose bbox intersects the marquee is selected.
- **Snap-to-grid toggle** — `desktopGridSnap` (default true). When on, `setIconPosition`
  rounds to the 10px grid via `snapIconToGrid`. Toggle surfaced in Settings → Desktop.
- **Sort / auto-align** — ContextMenu (desktop) entry "Sort icons": arranges all icons
  in alphabetical columns from the top-left, respecting the grid.
- **Grouped drag** — when dragging an icon that is part of a multi-selection, all
  selected icons move together, preserving their relative offsets. On drop, each
  selected icon's new position is committed via `setIconPosition`.

### 7.3 Persistence

`desktopIconPositions` is part of the persisted slice (replaces the raw localStorage
key). `desktopIconSelection` is **not** persisted (transient).

---

## 8. Testing strategy

Unit tests live in `kernel/tests/windowManager.test.ts` and cover the pure engine only
(no React, no DOM). Areas:

1. **focusManager**
   - `focus` bumps z-index and moves id to stack head.
   - `closeWindow` on the active window picks a new valid active (stack top).
   - `closeWindow` on a non-active window leaves active unchanged.
   - `minimizeWindow` removes from stack and recomputes active.
   - `focusNextInWorkspace` cycles only within the active workspace, skips minimized.
   - `validateActiveWindow` clears active when it belongs to another workspace.
2. **zIndexManager**
   - Normal windows sit in `LAYERS.DESKTOP_UI` band.
   - Pinned windows sit in `LAYERS.ALWAYS_ON_TOP` band, above any normal window.
   - `maybeCompact` preserves relative order after renumbering.
3. **snapEngine**
   - `computeSnapRect` for every `SnapZone` on a 1920×1080 viewport (with a 56px
     taskbar reserved) matches expected rects.
   - Edge cases: very small viewport (320×240) still yields >= MIN_SNAPPED_W/H.
   - `snapWindow` saves `restoreRect` only on the first snap (not when re-snapping).
   - `unsnapWindow` restores `restoreRect` and clears the fields.
   - `beginDragRestore` centers the rect under the cursor.
4. **layoutEngine**
   - `autoArrange('side-by-side', N=3)` produces 3 equal columns within viewport.
   - `autoArrange('grid', N=5)` produces a 2×3 (or 3×2) grid.
   - All modes clamp to viewport.

Plus a regression check: `autoArrangeWindows()` (legacy API) still works and delegates
to `autoArrange('cascade')`.

UI is covered by the existing typecheck + e2e smoke (`npm run e2e`).

---

## 9. File impact

| Area | File | Change |
|------|------|--------|
| New engine | `kernel/windowManager/constants.ts` | new |
| New engine | `kernel/windowManager/types.ts` | new |
| New engine | `kernel/windowManager/focusManager.ts` | new |
| New engine | `kernel/windowManager/zIndexManager.ts` | new |
| New engine | `kernel/windowManager/snapEngine.ts` | new |
| New engine | `kernel/windowManager/layoutEngine.ts` | new |
| New engine | `kernel/windowManager/index.ts` | new (public API) |
| New UI | `components/SnapOverlay.tsx` | new |
| New UI | `components/SnapLayoutsPicker.tsx` | new |
| New UI | `components/SnapAssist.tsx` | new (toggleable, off by default) |
| New UI | `components/MarqueeRect.tsx` | new |
| Store types | `types.ts` | extend `WindowState`, add `Rect`, `SnapZone` |
| Store | `store/osStoreSlices.ts` | window/desktop-icon actions delegate to windowManager |
| Store | `store/osStore.ts` | add new state fields, stop persisting `globalZIndex`, add new persisted fields |
| Store | `store/osStoreConstants.ts` | add `desktopGridSnap` default, snap-assist default |
| Views | `components/WindowFrame.tsx` | remove local `alwaysOnTop`/`opacity` state; read from store; integrate snap overlay + picker + drag-to-restore |
| Views | `components/Taskbar.tsx` | corrected click handler, hover preview, jump list hook, Show Desktop toggle, progress badge |
| Views | `App.tsx` (`DesktopIconGrid`) | read positions from store; multi-select; marquee; grouped drag; sort |
| Views | `components/ContextMenu.tsx` | add Snap / Move-to-workspace / Arrange submenu entries |
| Shortcuts | `App.tsx` (keyboard effect) | corrected Ctrl+W, add Win+arrows / Alt+Z / Alt+Tab |
| Tests | `kernel/tests/windowManager.test.ts` | new |

---

## 10. Migration & rollback

- **Backward compatibility**: the existing `openWindow` / `closeWindow` / `focusWindow` /
  `minimizeWindow` / `restoreWindow` / `toggleMaximizeWindow` / `updateWindow` /
  `autoArrangeWindows` store APIs keep their signatures. They internally delegate to the
  windowManager. No app component needs to change its calls.
- **State migration**: `WindowState` gains optional fields (`pinned`, `opacity`,
  `restoreRect`, `snapZone`, `progress`) with sensible defaults; existing persisted
  windows hydrate fine (missing fields default).
- **Desktop icon migration**: one-shot import from legacy localStorage key, then the key
  is deleted. Idempotent — if the store already has positions, the import is skipped.
- **Rollback**: if the windowManager misbehaves, the old `osStoreSlices.ts` behavior can
  be restored from git without touching app components (the store API is unchanged).
  Snap UI components are additive and can be feature-flagged off by simply not rendering
  `<SnapOverlay>` etc.

---

## 11. Open questions resolved during brainstorming

- **Reference OS**: Windows 11 (snap layouts, hover preview, snap assist).
- **Migration approach**: extract a dedicated `windowManager` module (not in-place, not
  full rewrite).
- **Testing**: unit tests on the windowManager engine; typecheck + existing e2e smoke
  for the UI.
- **Snap Assist**: hook in place, defaulted off for v1 to keep scope tight.
- **Session restore**: explicitly out of scope for this iteration ( groundwork only).
