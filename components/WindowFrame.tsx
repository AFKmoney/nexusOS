import React, { Suspense, useEffect, useState, type ComponentType } from 'react';
import { Rnd } from 'react-rnd';
import { X, Minus, Square, Minimize2, Box, Pin, PinOff, Droplet } from 'lucide-react';
import { useOS } from '../store/osStore';
import { sounds } from '../kernel/sounds';
import { ErrorBoundary } from './ErrorBoundary';
import CustomAppRunner from '../apps/CustomAppRunner';
import { detectSnapZone } from '../kernel/windowManager/snapEngine.ts';
import { LAYERS, TASKBAR_RESERVED } from '../kernel/windowManager/constants.ts';
import type { SnapZone } from '../kernel/windowManager/types.ts';
import { SnapLayoutsPicker } from './SnapLayoutsPicker';
import { SnapOverlay } from './SnapOverlay';

export const WindowFrame: React.FC<{ windowState: any }> = ({ windowState }) => {
  const {
    closeWindow, focusWindow, minimizeWindow, toggleMaximizeWindow, updateWindow,
    activeWindowId, openContextMenu, registry,
    snapWindow, beginDragRestore, togglePinned, setWindowOpacity,
  } = useOS();

  const [isOpening, setIsOpening] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [showSnapPicker, setShowSnapPicker] = useState(false);
  const [previewZone, setPreviewZone] = useState<SnapZone | null>(null);

  const isActive = activeWindowId === windowState.id;
  const pinned = windowState.pinned ?? false;
  const opacity = windowState.opacity ?? 1;

  useEffect(() => {
    const t = setTimeout(() => setIsOpening(false), 200);
    return () => clearTimeout(t);
  }, []);

  // Layered z-index: pinned windows sit in the ALWAYS_ON_TOP band.
  const layer = pinned ? LAYERS.ALWAYS_ON_TOP : LAYERS.DESKTOP_UI;
  const zIndex = layer + windowState.zIndex;

  const handleClose = () => {
    setIsClosing(true);
    sounds.windowClose();
    setTimeout(() => closeWindow(windowState.id), 180);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'window', targetId: windowState.id });
  };

  const app = registry.find(a => a.id === windowState.appId);
  const IconComponent = app?.icon || Box;
  let AppComponent = app?.component as ComponentType<{ windowId: string }> | undefined;
  if (!AppComponent && app?.isCustom && app?.sourcePath) AppComponent = CustomAppRunner;

  if (windowState.isMinimized) return null;

  const viewport = () => ({ width: window.innerWidth, height: window.innerHeight - TASKBAR_RESERVED });

  const handleDrag = (e: any, d: { x: number; y: number }) => {
    // Live snap preview during drag — use the window center X and the title-bar Y.
    const zone = detectSnapZone(d.x + windowState.width / 2, d.y, viewport());
    setPreviewZone(zone);
  };

  const handleDragStart = () => {
    focusWindow(windowState.id);
    // Windows 11 gesture: dragging a snapped/maximized window unsnaps first,
    // centering the restoreRect under the cursor so it keeps dragging freely.
    if (windowState.snapZone || windowState.isMaximized) {
      beginDragRestore(windowState.id, windowState.x + windowState.width / 2, windowState.y + 20);
    }
  };

  const handleDragStop = (e: any, d: { x: number; y: number }) => {
    setPreviewZone(null);
    const zone = detectSnapZone(d.x + windowState.width / 2, d.y, viewport());
    if (zone) {
      snapWindow(windowState.id, zone);
    } else {
      // Clamp so the title bar stays accessible.
      const clampedX = Math.max(-windowState.width + 100, Math.min(window.innerWidth - 100, d.x));
      const clampedY = Math.max(0, Math.min(window.innerHeight - 48, d.y));
      updateWindow(windowState.id, { x: clampedX, y: clampedY });
    }
  };

  const handleResizeStop = (e: any, direction: any, ref: any, delta: any, position: any) => {
    updateWindow(windowState.id, { width: ref.offsetWidth, height: ref.offsetHeight, ...position });
  };

  return (
    <>
      {previewZone && <SnapOverlay zone={previewZone} />}
      <Rnd
        size={{
          width: windowState.isMaximized ? '100%' : windowState.width,
          height: windowState.isMaximized ? '100%' : windowState.height,
        }}
        position={{ x: windowState.isMaximized ? 0 : windowState.x, y: windowState.isMaximized ? 0 : windowState.y }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        onResizeStart={() => focusWindow(windowState.id)}
        disableDragging={false}
        enableResizing={!windowState.isMaximized && !windowState.snapZone}
        minWidth={320}
        minHeight={200}
        bounds="parent"
        dragHandleClassName="window-title-bar"
        style={{ zIndex, display: 'flex', pointerEvents: 'auto' }}
        className={`window-frame transition-opacity duration-200 ${isClosing ? 'opacity-0 scale-95' : 'opacity-100'}`}
      >
        <div
          className={`flex flex-col w-full h-full overflow-hidden relative
            ${windowState.isMaximized ? 'rounded-none' : 'rounded-xl'}
            ${isActive
              ? 'shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.12)] ring-1 ring-emerald-500/20'
              : 'shadow-[0_8px_30px_rgba(0,0,0,0.4)]'
            }
            bg-[#08080a]/95 backdrop-blur-2xl border border-white/10
          `}
          style={{
            opacity,
            transform: isOpening ? 'scale(0.96) translateY(10px)' : 'scale(1) translateY(0)',
            transition: isOpening ? 'transform 0.2s ease-out, opacity 0.2s ease-out' : 'none',
          }}
        >
          {/* Title Bar */}
          <div
            onContextMenu={handleContextMenu}
            onDoubleClick={() => toggleMaximizeWindow(windowState.id)}
            className="window-title-bar h-11 flex items-center justify-between px-4 cursor-default select-none border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent relative z-10 shrink-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-1.5 rounded-lg border border-white/10 transition-colors shrink-0 ${isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-black/20 text-zinc-500'}`}>
                <IconComponent size={14} className={isActive ? 'drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]' : ''} />
              </div>
              <span className={`text-xs font-bold tracking-wide transition-colors truncate max-w-[260px] ${isActive ? 'text-zinc-100' : 'text-zinc-500'}`}>
                {windowState.title}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0 relative" onMouseDown={(e) => e.stopPropagation()}>
              <button
                onClick={() => setWindowOpacity(windowState.id, opacity === 1 ? 0.7 : opacity === 0.7 ? 0.4 : 1)}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors"
                title="Opacity"
              >
                <Droplet size={13} />
              </button>
              <button
                onClick={() => togglePinned(windowState.id)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${pinned ? 'bg-emerald-500/15 text-emerald-400' : 'hover:bg-white/10 text-zinc-500 hover:text-white'}`}
                title="Always on top"
              >
                {pinned ? <Pin size={13} /> : <PinOff size={13} />}
              </button>
              <div className="w-px h-5 bg-white/10 mx-1" />
              <button
                onClick={() => minimizeWindow(windowState.id)}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                title="Minimize"
              >
                <Minus size={16} />
              </button>
              <div
                className="relative"
                onMouseEnter={() => { setTimeout(() => setShowSnapPicker(true), 250); }}
                onMouseLeave={() => setShowSnapPicker(false)}
              >
                <button
                  onClick={() => toggleMaximizeWindow(windowState.id)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  title={windowState.isMaximized ? 'Restore' : 'Maximize'}
                >
                  {windowState.isMaximized ? <Minimize2 size={14} /> : <Square size={12} />}
                </button>
                {showSnapPicker && <SnapLayoutsPicker onPick={(zone) => { snapWindow(windowState.id, zone); setShowSnapPicker(false); }} />}
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center hover:bg-red-500 text-zinc-400 hover:text-white rounded-lg transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className="flex-1 overflow-hidden relative bg-transparent min-h-0"
            onContextMenu={(e) => {
              if (!(e.target as HTMLElement).closest('textarea, input, [contenteditable], .custom-context')) {
                e.preventDefault();
                e.stopPropagation();
                openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'window', targetId: windowState.id });
              }
            }}
          >
            {AppComponent ? (
              <ErrorBoundary appId={windowState.appId} windowId={windowState.id}>
                <Suspense fallback={
                  <div className="h-full w-full flex flex-col items-center justify-center text-zinc-500">
                    <Box size={32} className="opacity-30 mb-3 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-widest animate-pulse">Loading…</span>
                  </div>
                }>
                  <AppComponent windowId={windowState.id} />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-zinc-700">
                <Box size={40} className="opacity-10 mb-3" />
                <span className="text-[10px] font-bold uppercase tracking-widest">No Component</span>
              </div>
            )}
            {!isActive && <div className="absolute inset-0 bg-black/5 pointer-events-none" />}
          </div>
        </div>
      </Rnd>
    </>
  );
};
