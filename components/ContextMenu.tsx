import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useOS } from '../store/osStore';
import { 
  Sparkles, Copy, ClipboardPaste, Scissors, Maximize2,
  X, Minimize, ExternalLink, 
  Trash2, FileText, FolderOpen, Zap,
  Monitor, Settings, Shield, Power, LayoutGrid, Info
} from 'lucide-react';

export default function ContextMenu() {
  const { contextMenu, closeContextMenu, openWindow, closeWindow, windows, systemReset, setWallpaper } = useOS();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (contextMenu.isOpen && menuRef.current) {
      const menuWidth = 220;
      const menuHeight = menuRef.current.offsetHeight || 300;
      let x = contextMenu.x;
      let y = contextMenu.y;

      if (x + menuWidth > window.innerWidth) x -= menuWidth;
      if (y + menuHeight > window.innerHeight) y -= menuHeight;

      setPos({ x, y });
    }
  }, [contextMenu.isOpen, contextMenu.x, contextMenu.y]);

  if (!contextMenu.isOpen) return null;

  const MenuItem = ({ icon: Icon, label, onClick, danger }: any) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${danger ? 'text-red-400 hover:bg-red-500/20' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`}
    >
      <Icon size={14} className={danger ? 'text-red-500' : 'text-emerald-500'} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );

  const Divider = () => <div className="h-px bg-white/5 my-1 mx-2" />;

  return (
    <div
      ref={menuRef}
      className="fixed z-[10000] w-[220px] bg-[#0a0a0c]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] py-2 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/5"
      style={{ left: pos.x, top: pos.y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
        {contextMenu.targetType === 'desktop' && (
            <>
              <div className="px-4 py-2 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Desktop Nexus</div>
              <MenuItem icon={Sparkles} label="Neural Forge" onClick={() => openWindow('forge')} />
              <MenuItem icon={LayoutGrid} label="Auto Arrange" onClick={() => useOS.getState().autoArrangeWindows()} />
              <Divider />
              <MenuItem icon={Monitor} label="Wallpaper Gen" onClick={() => openWindow('wallpaper')} />
              <MenuItem icon={Settings} label="System Config" onClick={() => openWindow('settings')} />
              <Divider />
              <MenuItem icon={Power} label="Kill Core" onClick={() => systemReset(false)} danger />
            </>
        )}

        {contextMenu.targetType === 'icon' && (
            <>
              <div className="px-4 py-2 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Artifact Node</div>
              <MenuItem icon={ExternalLink} label="Execute" onClick={() => openWindow('terminal')} />
              <MenuItem icon={Info} label="Properties" onClick={() => openWindow('fileprops', { path: contextMenu.filePath })} />
              <Divider />
              <MenuItem icon={Copy} label="Copy Hash" onClick={() => {}} />
              <MenuItem icon={Trash2} label="Purge Node" onClick={() => {}} danger />
            </>
        )}

        {contextMenu.targetType === 'taskbar' && (
            <>
               <MenuItem icon={Zap} label="Task Manager" onClick={() => openWindow('task_manager')} />
               <MenuItem icon={Shield} label="Security Audit" onClick={() => openWindow('monitor')} />
               <Divider />
               <MenuItem icon={Trash2} label="Close All Windows" onClick={() => { if(confirm("Terminate all active nodes?")) windows.forEach(w => closeWindow(w.id)); closeContextMenu(); }} danger />
            </>
        )}

        {contextMenu.targetType === 'app-icon' && (
            <>
               <MenuItem icon={ExternalLink} label="Launch New" onClick={() => openWindow(contextMenu.appId!)} />
               <MenuItem icon={Zap} label="Neural Analysis" onClick={() => openWindow('forge', { autoPrompt: `Explain the manifest of ${contextMenu.appId}` })} />
               <Divider />
               <MenuItem icon={Trash2} label="Uninstall Node" onClick={() => {}} danger />
            </>
        )}
    </div>
  );
}

