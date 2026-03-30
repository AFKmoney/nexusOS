import React, { useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import { X, Minus, Square, Minimize2, Box, Pin, PinOff, Droplet, Loader2, Maximize2 } from 'lucide-react';
import { useOS } from '../store/osStore';
import { vfs } from '../kernel/fileSystem';
import { getSmartIcon } from '../utils/smartIcons';
import { sounds } from '../kernel/sounds';

export const WindowFrame: React.FC<{ windowState: any }> = ({ windowState }) => {
  const { 
    closeWindow, focusWindow, minimizeWindow, toggleMaximizeWindow, 
    updateWindow, activeWindowId, openContextMenu, uiScale
  } = useOS();
  
  const [isOpening, setIsOpening] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const isActive = activeWindowId === windowState.id;
  
  useEffect(() => {
    const t = setTimeout(() => setIsOpening(false), 300);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    sounds.windowClose();
    setTimeout(() => closeWindow(windowState.id), 200);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'window', targetId: windowState.id });
  };

  const IconComponent = getSmartIcon(`app://${windowState.appId}`, 16, true);

  if (windowState.isMinimized) return null;

  return (
    <Rnd
      size={{ width: windowState.isMaximized ? '100%' : windowState.width, height: windowState.isMaximized ? '100%' : windowState.height }}
      position={{ x: windowState.isMaximized ? 0 : windowState.x, y: windowState.isMaximized ? 0 : windowState.y }}
      onDragStop={(e, d) => { setIsInteracting(false); updateWindow(windowState.id, { x: d.x, y: d.y }); }}
      onResizeStop={(e, direction, ref, delta, position) => {
        setIsInteracting(false);
        updateWindow(windowState.id, { width: ref.offsetWidth, height: ref.offsetHeight, ...position });
      }}
      onDragStart={() => { setIsInteracting(true); focusWindow(windowState.id); }}
      onResizeStart={() => { setIsInteracting(true); focusWindow(windowState.id); }}
      disableDragging={windowState.isMaximized}
      enableResizing={!windowState.isMaximized}
      minWidth={320} minHeight={200}
      bounds="parent"
      dragHandleClassName="window-title-bar"
      style={{ zIndex: alwaysOnTop ? 9999 : windowState.zIndex, display: 'flex', pointerEvents: 'auto' }}
      className={`window-frame transition-opacity duration-300 ${isClosing ? 'opacity-0 scale-95' : 'opacity-100'}`}
    >
      <div 
        className={`flex flex-col w-full h-full overflow-hidden transition-all duration-500 relative
          ${windowState.isMaximized ? 'rounded-none border-none' : 'rounded-[28px]'} 
          ${isActive ? 'shadow-[0_30px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.15)] ring-1 ring-emerald-500/20' : 'shadow-[0_10px_40px_rgba(0,0,0,0.6)] grayscale-[0.2]'} 
          bg-[#0a0a0c]/85 backdrop-blur-[40px] border border-white/10
        `}
        style={{ 
          opacity,
          transform: isOpening ? 'scale(0.9) translateY(20px)' : 'scale(1) translateY(0)',
        }}
      >
          {/* Spatial Title Bar */}
          <div 
            onContextMenu={handleContextMenu} 
            onDoubleClick={() => toggleMaximizeWindow(windowState.id)}
            className={`window-title-bar h-14 flex items-center justify-between px-6 cursor-default select-none border-b border-white/5 bg-gradient-to-b from-white/[0.05] to-transparent relative z-10`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl border border-white/10 shadow-inner transition-colors ${isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-black/20 text-zinc-600'}`}>
                <IconComponent size={16} className={isActive ? "drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" : ""} />
              </div>
              <span className={`text-[11px] font-black uppercase tracking-[0.25em] transition-colors duration-500 ${isActive ? 'text-zinc-100' : 'text-zinc-500'} truncate max-w-[300px]`}>
                {windowState.title}
              </span>
            </div>

            {/* Spatial Window Controls */}
            <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 mr-2">
                <button onClick={() => setOpacity(o => o === 1 ? 0.7 : o === 0.7 ? 0.4 : 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-all" title="Visual Density">
                  <Droplet size={14} />
                </button>
                <button onClick={() => setAlwaysOnTop(!alwaysOnTop)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${alwaysOnTop ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'hover:bg-white/10 text-zinc-500 hover:text-white'}`} title="Neural Priority">
                  {alwaysOnTop ? <Pin size={14} /> : <PinOff size={14} />}
                </button>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button onClick={() => minimizeWindow(windowState.id)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl text-zinc-500 hover:text-white transition-all">
                  <Minus size={18} />
                </button>
                <button onClick={() => toggleMaximizeWindow(windowState.id)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl text-zinc-500 hover:text-white transition-all">
                  {windowState.isMaximized ? <Minimize2 size={16} /> : <Square size={14} />}
                </button>
                <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-black rounded-xl transition-all group shadow-lg">
                  <X size={18} className="group-hover:rotate-90 transition-transform duration-300 font-bold"/>
                </button>
              </div>
            </div>
          </div>

          {/* Window Content Spatial */}
          <div className="flex-1 overflow-hidden relative bg-[#050508]/40">
            {windowState.Component ? <windowState.Component windowId={windowState.id} /> : <div className="h-full w-full flex flex-col items-center justify-center text-zinc-800"><Box size={48} className="opacity-10 mb-4 animate-pulse" /><span className="text-[10px] font-black uppercase tracking-[0.4em]">Node Link Broken</span></div>}
            
            {/* Focus Overlay */}
            {!isActive && <div className="absolute inset-0 bg-black/10 pointer-events-none transition-opacity duration-500" />}
          </div>

          {/* Resize Handles Subtle Hint */}
          {!windowState.isMaximized && (
            <div className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-20 transition-opacity">
              <div className="absolute bottom-0 right-0 w-full h-[1px] bg-white rotate-45" />
              <div className="absolute bottom-1 right-0 w-3/4 h-[1px] bg-white rotate-45" />
            </div>
          )}
      </div>
    </Rnd>
  );
};

