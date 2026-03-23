import React, { useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import { X, Minus, Square, Minimize2, Box, Pin, PinOff, Droplet, Loader2 } from 'lucide-react';
import { useOS } from '../store/osStore';
import { WindowState } from '../types';

interface Props {
  windowState: WindowState;
}

export const WindowFrame: React.FC<Props> = ({ windowState }) => {
  const { closeWindow, focusWindow, updateWindow, minimizeWindow, toggleMaximizeWindow, openContextMenu, registry } = useOS();
  const AppConfig = registry.find(a => a.id === windowState.appId);
  const [isOpening, setIsOpening] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setIsOpening(false), 200);
    const loadTimer = setTimeout(() => setIsAppLoading(false), 600);
    return () => { clearTimeout(timer); clearTimeout(loadTimer); }
  }, []);

  if (!AppConfig) return null;
  if (windowState.isMinimized) return null;

  const AppComponent = AppConfig.component;
  const IconComponent = AppConfig.icon || Box;

  const handleClose = (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      setIsClosing(true);
      setTimeout(() => closeWindow(windowState.id), 200);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : '';
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    let contextType: 'text' | 'window' = 'window';
    let textElement: HTMLInputElement | HTMLTextAreaElement | undefined;
    if (selectedText.length > 0 || isInput) {
        contextType = 'text';
        if (isInput) textElement = target as HTMLInputElement | HTMLTextAreaElement;
    }
    openContextMenu({
        isOpen: true, x: e.clientX, y: e.clientY,
        targetType: contextType, targetId: windowState.id,
        textSelection: selectedText, textElement: textElement,
        filePath: windowState.data?.path
    });
  };

  const handleDragStop = (e: any, d: any) => {
    setIsInteracting(false);
    if (windowState.isMaximized) return;

    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const threshold = 15;

    // Window Snapping Logic
    if (e.clientX <= threshold) {
      // Snap Left
      updateWindow(windowState.id, { x: 0, y: 0, width: sw / 2, height: sh });
    } else if (e.clientX >= sw - threshold) {
      // Snap Right
      updateWindow(windowState.id, { x: sw / 2, y: 0, width: sw / 2, height: sh });
    } else if (e.clientY <= threshold) {
      // Snap Top / Maximize
      if (!windowState.isMaximized) toggleMaximizeWindow(windowState.id);
    } else {
      updateWindow(windowState.id, { x: d.x, y: d.y });
    }
  };

  return (
    <Rnd
      size={windowState.isMaximized ? { width: '100%', height: '100%' } : { width: windowState.width, height: windowState.height }}
      position={windowState.isMaximized ? { x: 0, y: 0 } : { x: windowState.x, y: windowState.y }}
      onDragStart={() => { focusWindow(windowState.id); setIsInteracting(true); }}
      onDragStop={handleDragStop}
      onResizeStart={() => { focusWindow(windowState.id); setIsInteracting(true); }}
      onResizeStop={(e, dir, ref, delta, pos) => {
        setIsInteracting(false);
        if (!windowState.isMaximized) updateWindow(windowState.id, { width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos });
      }}
      onMouseDown={() => focusWindow(windowState.id)}
      disableDragging={windowState.isMaximized}
      enableResizing={!windowState.isMaximized}
      minWidth={350} minHeight={250} bounds="parent" dragHandleClassName="window-title-bar"
      style={{ zIndex: alwaysOnTop ? 99999 : windowState.zIndex, opacity: isOpening || isClosing ? 0 : opacity }}
      className={`pointer-events-auto flex flex-col transition-opacity duration-200`}
    >
      {isInteracting && <div className="absolute inset-0 z-[99999] bg-transparent" />}

      <div className={`flex flex-col w-full h-full overflow-hidden ${windowState.isMaximized ? 'rounded-none border-none' : 'rounded-xl'} bg-zinc-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl`}
        style={{
             transform: isOpening || isClosing ? 'scale(0.95) translateY(10px)' : 'scale(1) translateY(0)',
             transition: isInteracting ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)'
        }}>
          
          {/* Title Bar */}
          <div onContextMenu={handleContextMenu} onDoubleClick={() => toggleMaximizeWindow(windowState.id)}
            className={`window-title-bar h-10 flex items-center justify-between px-3 cursor-default select-none border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent`}>
            
            <div className="flex items-center gap-3">
              <div className="p-1 bg-white/10 rounded-md">
                <IconComponent size={14} className="text-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-zinc-200 uppercase tracking-widest truncate max-w-[200px]">
                {windowState.title}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
              <button onClick={() => setOpacity(o => o === 1 ? 0.8 : o === 0.8 ? 0.5 : 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-zinc-400 transition" title="Toggle Opacity">
                <Droplet size={12} />
              </button>
              <button onClick={() => setAlwaysOnTop(!alwaysOnTop)} className={`w-6 h-6 flex items-center justify-center rounded transition ${alwaysOnTop ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/10 text-zinc-400'}`} title="Always on Top">
                {alwaysOnTop ? <Pin size={12} /> : <PinOff size={12} />}
              </button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <button onClick={() => minimizeWindow(windowState.id)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-zinc-400 transition">
                <Minus size={14} />
              </button>
              <button onClick={() => toggleMaximizeWindow(windowState.id)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-zinc-400 transition">
                {windowState.isMaximized ? <Minimize2 size={12} /> : <Square size={12} />}
              </button>
              <button onClick={handleClose} className="w-6 h-6 flex items-center justify-center hover:bg-red-500 hover:text-white rounded text-zinc-400 transition group">
                <X size={14} className="group-hover:scale-110 transition-transform"/>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden relative text-zinc-200 bg-[#0A0A0C]" onContextMenu={handleContextMenu}>
            {isAppLoading && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0C]">
                <Loader2 size={32} className="text-emerald-500 animate-spin mb-4" />
                <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Initializing Content</span>
              </div>
            )}
            {AppComponent ? <AppComponent windowId={windowState.id} /> : <div className="h-full w-full flex flex-col items-center justify-center text-zinc-600"><Box size={32} className="opacity-20 mb-2" />App Content Missing</div>}
          </div>
      </div>
    </Rnd>
  );
};
