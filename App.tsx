import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useOS } from './store/osStore';
import { WindowFrame } from './components/WindowFrame';
import TaskSwitcher from './components/TaskSwitcher';
import ContextMenu from './components/ContextMenu';
import StartMenu from './components/StartMenu';
import Taskbar from './components/Taskbar';
import { vfs } from './kernel/fileSystem';
import { getSmartIcon } from './utils/smartIcons';
import { Bell, X, Info, Trash2, ArrowRight, Lock, Sparkles, Cpu, Activity, Zap, Users } from 'lucide-react';
import { bindOsStore } from './services/puterService';
import { toolForge } from './kernel/toolForge';
import { sounds } from './kernel/sounds';
import { processManager } from './kernel/processManager';
import { themeEngine } from './kernel/themeEngine';
import { eventBus, OS_EVENTS } from './kernel/eventBus';
import BootScreen from './components/BootScreen';
import LoginScreen from './components/LoginScreen';
import DesktopWallpaper from './components/DesktopWallpaper';
import { DaemonLockScreen } from './components/DaemonLockScreen';
import LockScreen from './components/LockScreen';
import { NeuralHoloUI } from './components/NeuralHoloUI';
import { getDesktopPath } from './appShellConstants';

// DAEMON Bridge — Auto-initializes on import. If installed, boots silently.
import './kernel/daemonBridge';

function NeuralThoughtStream() {
  const { autonomyLog, currentObjective, autonomyState, kernelRules } = useOS();
  if (!kernelRules.autonomyEnabled) return null;

  return (
    <div className="fixed top-20 right-6 w-72 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 z-0 pointer-events-none select-none animate-in fade-in slide-in-from-right-10 duration-700">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-1.5 rounded-lg ${autonomyState !== 'IDLE' ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-zinc-800 text-zinc-500'}`}>
          <Cpu size={14} />
        </div>
        <div className="flex-1">
          <div className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Neural Engine</div>
          <div className="text-[11px] text-white font-medium truncate">{currentObjective}</div>
        </div>
      </div>
      <div className="space-y-2 h-40 overflow-hidden relative">
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/40 to-transparent z-10" />
        {autonomyLog.slice(-5).map((log, i) => (
          <div key={i} className="text-[9px] font-mono text-zinc-500 border-l border-white/10 pl-2">
            <span className="text-emerald-500/50 mr-2">{">>>"}</span>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}

type DesktopIconGridProps = {
  currentUserId?: string | null;
  openContextMenu: (state: {
    isOpen: boolean;
    x: number;
    y: number;
    targetType: 'desktop' | 'icon' | 'taskbar';
    filePath?: string;
  }) => void;
  openWindow: (appId: string, data?: { title?: string; path?: string; [key: string]: unknown }) => void;
};

function DesktopIconGrid({
  currentUserId,
  openContextMenu,
  openWindow
}: DesktopIconGridProps) {
  const desktopPath = getDesktopPath(currentUserId);

  const handleFileOpen = useCallback((path: string) => {
    const node = vfs.stat(path);
    if (!node) return;
    if (node.type === 'directory') {
      openWindow('explorer', { path });
    } else if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif')) {
      openWindow('image_viewer', { path });
    } else if (path.endsWith('.mp4') || path.endsWith('.webm')) {
      openWindow('video_player', { path });
    } else if (path.endsWith('.pdf')) {
      openWindow('fileprops', { path });
    } else if (path.endsWith('.md')) {
      openWindow('markdown', { path });
    } else if (path.endsWith('.html')) {
      openWindow('web_runner', { path });
    } else {
      openWindow('notepad', { path });
    }
  }, [openWindow]);

  const handleDesktopDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const sourcePath = e.dataTransfer.getData('text/plain');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(fileLike => {
        const file = fileLike as File;
        const reader = new FileReader();
        reader.onload = (ev) => {
          vfs.writeFile(`${desktopPath}/${file.name}`, ev.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
      return;
    }

    if (sourcePath && !sourcePath.startsWith(`${desktopPath}/`)) {
      vfs.move(sourcePath, `${desktopPath}/${sourcePath.split('/').pop()}`);
    }
  }, [desktopPath]);

  return (
    <div
      className="absolute inset-0 bottom-12 p-6 overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDesktopDrop}
    >
      <div className="grid grid-cols-[repeat(auto-fill,100px)] grid-rows-[repeat(auto-fill,100px)] gap-4 h-full">
        {(vfs.listDir(desktopPath) || []).map(name => {
          const itemPath = `${desktopPath}/${name}`;
          return (
            <div
              key={name}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', itemPath); }}
              className="flex flex-col items-center p-2 rounded-xl hover:bg-white/5 cursor-pointer group"
              onDoubleClick={() => handleFileOpen(itemPath)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'icon', filePath: itemPath });
              }}
            >
              <div className="w-12 h-12 bg-zinc-900/50 rounded-xl flex items-center justify-center border border-white/5 group-hover:border-emerald-500/30 transition-all shadow-md group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                {getSmartIcon(itemPath, 24)}
              </div>
              <span className="text-[11px] text-zinc-300 mt-2 text-center truncate w-full drop-shadow-md font-medium group-hover:text-white transition-colors">{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DesktopWidgets() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute top-8 right-8 flex flex-col gap-1 pointer-events-none select-none z-0 text-white/90 items-end animate-in fade-in duration-1000">
      <div className="text-7xl font-extralight tracking-tighter drop-shadow-lg">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <div className="text-xl font-medium drop-shadow-md text-emerald-400/90">{time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
    </div>
  );
}

const GlobalSearchOverlay = React.lazy(() => import('./components/GlobalSearch'));


export default function App() {
  const {
    booted,
    isLoggedIn,
    hasSeenIntro,
    uiScale,
    windows,
    activeWorkspace,
    wallpaper,
    openContextMenu,
    openWindow,
    closeWindow,
    isSearchOpen,
    toggleSearch,
    currentUser,
    isStartMenuOpen,
    toggleStartMenu,
    profiles,
    login,
    setBooted
  } = useOS();
  const [locked, setLocked] = useState(false);
  const [bootTimedOut, setBootTimedOut] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!useOS.getState().booted) {
        setBootTimedOut(true);
        setBooted(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [setBooted]);

  useEffect(() => {
    if (isLoggedIn && !hasSeenIntro) {
      useOS.getState().setHasSeenIntro(true);
    }
  }, [isLoggedIn, hasSeenIntro]);

  useEffect(() => {
    const homeDir = getDesktopPath(currentUser?.id ?? null);
    if (!vfs.resolveNode(homeDir)) vfs.createDir(homeDir, '__system__');
    
    // Dynamically sync store accent to CSS engine
    const currentAccent = useOS.getState().accentColor;
    themeEngine.setCustomAccent(currentAccent);
    themeEngine.apply();

    bindOsStore(() => ({ ...useOS.getState(), windows: useOS.getState().windows }));

    toolForge.bindOsActions(async (action) => {
      const store = useOS.getState();
      switch (action.type) {
        case 'OPEN_APP': {
          const [appId, filePath] = action.args;
          if (!appId) {
            return '[OS::OPEN_APP] -> skipped (missing app id)';
          }
          store.openWindow(appId, filePath ? { path: filePath } : undefined);
          return `[OS::OPEN_APP] -> ✅ "${appId}" opened`;
        }
        case 'NOTIFY': {
          const [title, msg] = action.args;
          store.addNotification({ title: title || 'DAEMON', message: msg || '', type: 'info' });
          return `[OS::NOTIFY] -> ✅ Notification sent`;
        }
        case 'BUILD_APP': {
          const [desc] = action.args;
          store.openWindow('forge', { prompt: desc });
          return `[OS::BUILD_APP] -> ✅ NeuralForge launched for: "${desc}"`;
        }
        case 'OPEN_URL': {
          const [url] = action.args;
          store.openWindow('netrunner', { path: url });
          return `[OS::OPEN_URL] -> ✅ NetRunner opening: ${url}`;
        }
        default:
          return `[OS::${action.type}] -> handled internally`;
      }
    });
  }, [currentUser?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); toggleSearch(); return; }
      if (e.ctrlKey && e.key === 't') { e.preventDefault(); openWindow('terminal'); sounds.windowOpen(); return; }
      if (e.ctrlKey && e.key === 'e') { e.preventDefault(); openWindow('explorer'); sounds.windowOpen(); return; }
      if (e.ctrlKey && e.key === 'l') { e.preventDefault(); setLocked(true); return; }
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        const ws = useOS.getState().windows;
        const focusedWindow = ws.at(-1);
        const focused = focusedWindow?.id ?? null;
        if (focused) { closeWindow(focused); sounds.windowClose(); }
        return;
      }
      if (e.ctrlKey && e.key === 'd') { e.preventDefault(); openWindow('dashboard'); sounds.windowOpen(); return; }
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); openWindow('notepad'); sounds.windowOpen(); return; }
      if (e.key === 'F11') {
        e.preventDefault();
        (window as any).electron?.send('toggle-fullscreen');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openWindow, closeWindow, toggleSearch]);

  const handleGlobalClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.start-menu') && isStartMenuOpen) toggleStartMenu();
    if (useOS.getState().contextMenu.isOpen) useOS.getState().closeContextMenu();
  };

  const handleGlobalContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.taskbar') ||
      target.closest('.start-menu') ||
      target.closest('.window-frame') ||
      target.closest('.context-menu')
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'desktop' });
  };

  if (!booted && !bootTimedOut) {
    return <BootScreen />;
  }

  if (!isLoggedIn) {
    return <LoginScreen profiles={profiles} login={login} />;
  }

  return (
    <div
      className="h-screen w-screen overflow-hidden relative"
      onClick={handleGlobalClick}
      onContextMenu={handleGlobalContextMenu}
    >
      <DesktopWallpaper wallpaper={wallpaper} />

      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] pointer-events-none" />

      <DesktopWidgets />
      <NeuralThoughtStream />

      <div
        className="absolute inset-0 z-10 overflow-hidden"
        style={{
          transform: `scale(${uiScale})`,
          transformOrigin: 'top left',
          width: `${100 / uiScale}%`,
          height: `${100 / uiScale}%`,
        }}
      >
        <DesktopIconGrid
          currentUserId={currentUser?.id ?? null}
          openContextMenu={openContextMenu}
          openWindow={openWindow}
        />

        <div className="absolute inset-0 bottom-12 p-6 overflow-hidden pointer-events-none">
          {(windows || []).filter(w => w.workspaceId === activeWorkspace || !w.workspaceId).map(win => (
            <WindowFrame key={win.id} windowState={win} />
          ))}
        </div>

        <StartMenu />
        <TaskSwitcher />
        <ContextMenu />
        <Taskbar />
      </div>

      {locked && <LockScreen onUnlock={() => setLocked(false)} />}

      {isSearchOpen && (
        <Suspense fallback={null}>
          <GlobalSearchOverlay />
        </Suspense>
      )}

      <DaemonLockScreen />
      <NeuralHoloUI />
    </div>
  );
}
