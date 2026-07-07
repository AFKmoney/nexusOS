import test from 'node:test';
import assert from 'node:assert';
import { computeSnapRect, snapWindow, unsnapWindow, beginDragRestore, detectSnapZone } from '../windowManager/snapEngine.ts';
import { TASKBAR_RESERVED } from '../windowManager/constants.ts';
import type { ExtendedWindowState, ManagerState } from '../windowManager/types.ts';

// Standard test viewport: 1920×1080 screen, viewport height = 1080 - taskbar.
const VP = { width: 1920, height: 1080 - TASKBAR_RESERVED };

function makeWindow(over: Partial<ExtendedWindowState> = {}): ExtendedWindowState {
  return {
    id: 'w1', appId: 'a', title: 'A',
    x: 100, y: 100, width: 800, height: 600,
    zIndex: 10, isMinimized: false, isMaximized: false,
    workspaceId: 1, ...over,
  };
}

function makeState(windows: ExtendedWindowState[] = []): ManagerState {
  return {
    windows, activeWindowId: null, globalZIndex: 100, activeWorkspace: 1,
    focusStack: windows.map(w => w.id),
  };
}

test('computeSnapRect - maximize fills viewport', () => {
  const r = computeSnapRect('maximize', VP);
  assert.equal(r.x, 0);
  assert.equal(r.y, 0);
  assert.equal(r.width, 1920);
  assert.equal(r.height, 1080 - TASKBAR_RESERVED);
});

test('computeSnapRect - left-half is left half', () => {
  const r = computeSnapRect('left-half', VP);
  assert.equal(r.x, 0);
  assert.equal(r.y, 0);
  assert.equal(r.width, 960);
  assert.equal(r.height, VP.height);
});

test('computeSnapRect - top-right quarter', () => {
  const r = computeSnapRect('top-right', VP);
  assert.equal(r.x, 960);
  assert.equal(r.y, 0);
  assert.equal(r.width, 960);
  assert.equal(r.height, VP.height / 2);
});

test('computeSnapRect - bottom-left quarter', () => {
  const r = computeSnapRect('bottom-left', VP);
  assert.equal(r.x, 0);
  assert.equal(r.y, VP.height / 2);
  assert.equal(r.width, 960);
  assert.equal(r.height, VP.height / 2);
});

test('computeSnapRect - center is 80% centered', () => {
  const r = computeSnapRect('center', VP);
  assert.equal(r.width, Math.round(1920 * 0.8));
  assert.equal(r.height, Math.round(VP.height * 0.8));
  assert.equal(r.x, Math.round((1920 - r.width) / 2));
  assert.equal(r.y, Math.round((VP.height - r.height) / 2));
});

test('computeSnapRect - tiny viewport still respects MIN sizes', () => {
  const tiny = { width: 400, height: 300 };
  const r = computeSnapRect('top-left', tiny);
  assert.ok(r.width >= 1, 'quarter width positive on tiny screen');
  assert.ok(r.height >= 1, 'quarter height positive on tiny screen');
});

test('snapWindow - saves restoreRect only on first snap', () => {
  const w = makeWindow({ x: 10, y: 20, width: 300, height: 400 });
  const s1 = snapWindow(makeState([w]), 'w1', 'left-half', VP);
  const snapped = s1.windows[0]!;
  assert.deepEqual(snapped.restoreRect, { x: 10, y: 20, width: 300, height: 400 });
  assert.equal(snapped.snapZone, 'left-half');

  // Re-snap to a different zone — restoreRect must NOT be overwritten.
  const s2 = snapWindow(s1, 'w1', 'right-half', VP);
  assert.deepEqual(s2.windows[0]!.restoreRect, { x: 10, y: 20, width: 300, height: 400 });
  assert.equal(s2.windows[0]!.snapZone, 'right-half');
});

test('unsnapWindow - restores rect and clears fields', () => {
  const w = makeWindow({ x: 5, y: 6, width: 700, height: 500 });
  const snapped = snapWindow(makeState([w]), 'w1', 'maximize', VP);
  const restored = unsnapWindow(snapped, 'w1');
  const win = restored.windows[0]!;
  assert.equal(win.x, 5);
  assert.equal(win.y, 6);
  assert.equal(win.width, 700);
  assert.equal(win.height, 500);
  assert.equal(win.snapZone, undefined);
  assert.equal(win.restoreRect, undefined);
  assert.equal(win.isMaximized, false);
});

test('beginDragRestore - unsnaps and centers under cursor', () => {
  const w = makeWindow({ width: 800, height: 600 });
  const snapped = snapWindow(makeState([w]), 'w1', 'left-half', VP);
  const dragging = beginDragRestore(snapped, 'w1', 500, 400);
  const win = dragging.windows[0]!;
  assert.equal(win.snapZone, undefined);
  // Window centered on cursor (cursor at center of window).
  assert.equal(win.x, 500 - 400);
  assert.equal(win.y, 400 - 300);
});

test('detectSnapZone - edges and corners', () => {
  const h = VP.height;
  assert.equal(detectSnapZone(10, h / 2, VP), 'left-half');
  assert.equal(detectSnapZone(VP.width - 5, h / 2, VP), 'right-half');
  assert.equal(detectSnapZone(VP.width / 2, 5, VP), 'top-half');
  assert.equal(detectSnapZone(VP.width / 2, h - 5, VP), 'bottom-half');
  assert.equal(detectSnapZone(5, 5, VP), 'top-left');
  assert.equal(detectSnapZone(VP.width - 5, h - 5, VP), 'bottom-right');
  // Center of screen → no snap.
  assert.equal(detectSnapZone(VP.width / 2, h / 2, VP), null);
});
