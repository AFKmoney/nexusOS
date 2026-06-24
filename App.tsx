import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useOS, hydrateOSRegistry } from './store/osStore';
import { WindowFrame } from './components/WindowFrame';
import TaskSwitcher from './components/TaskSwitcher';
import ContextMenu from './components/ContextMenu';
import StartMenu from './components/StartMenu';
import Taskbar from './components/Taskbar';
import { vfs, SYSTEM_VFS_APP_ID } from './kernel/fileSystem';
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
import ToastContainer from './components/ToastContainer';
import { getDesktopPath } from './appShellConstants';
import { kernelLog } from './kernel/log';

// DAEMON Bridge — Auto-initializes on import. If installed, boots silently.
import './kernel/daemonBridge';

function NeuralThoughtStream() {
  const { autonomyLog, currentObjective, autonomyState, kernelRules } = useOS();
  if (!kernelRules.autonomyEnabled) return null;

  return (
    <div className="fixed top-20 right-6 w-64 bg-black/50 backdrop-blur-xl border border-white/8 rounded-2xl p-3.5 z-0 pointer-events-none select-none">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`p-1.5 rounded-lg ${autonomyState !== 'IDLE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800/80 text-zinc-500'}`}>
          <Cpu size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Neural Engine</div>
          <div className="text-[11px] text-white font-medium truncate">{currentObjective || 'Idle'}</div>
        </div>
        {autonomyState !== 'IDLE' && (
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        )}
      </div>
      <div className="space-y-1.5 h-32 overflow-hidden relative">
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/50 to-transparent z-10" />
        {autonomyLog.slice(-4).map((log, i) => (
          <div key={i} className="text-[10px] font-mono text-zinc-400 border-l border-emerald-500/20 pl-2 leading-relaxed">
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
    } else if (path.endsWith('.lnk')) {
      // App shortcut — read the file content to get the appId
      const content = vfs.readFile(path, SYSTEM_VFS_APP_ID);
      if (content && content.startsWith('NEXUSOS_APP_SHORTCUT:')) {
        const appId = content.slice('NEXUSOS_APP_SHORTCUT:'.length);
        openWindow(appId);
      } else {
        openWindow('notepad', { path });
      }
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
      className="absolute inset-0 bottom-16 p-5 overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDesktopDrop}
    >
      <div className="grid grid-cols-[repeat(auto-fill,96px)] grid-rows-[repeat(auto-fill,96px)] gap-3 h-full content-start">
        {(vfs.listDir(desktopPath, SYSTEM_VFS_APP_ID) || []).map(name => {
          const itemPath = `${desktopPath}/${name}`;
          return (
            <div
              key={name}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', itemPath); }}
              className="flex flex-col items-center p-2 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors"
              onDoubleClick={() => handleFileOpen(itemPath)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'icon', filePath: itemPath });
              }}
            >
              <div className="w-12 h-12 bg-zinc-900/50 rounded-xl flex items-center justify-center border border-white/5 group-hover:border-emerald-500/30 transition-all shadow-md group-hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                {getSmartIcon(itemPath, 24)}
              </div>
              <span className="text-[11px] text-zinc-300 mt-1.5 text-center truncate w-full drop-shadow-md group-hover:text-white transition-colors">{name}</span>
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
    <div className="absolute top-6 right-6 flex flex-col gap-0.5 pointer-events-none select-none z-0 text-white/80 items-end">
      <div className="text-5xl font-light tracking-tight drop-shadow-lg tabular-nums">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <div className="text-sm font-medium drop-shadow-md text-emerald-400/80">{time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
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
  const { lockShell, unlockShell, isShellLocked: locked } = useOS();
  const [bootTimedOut, setBootTimedOut] = useState(false);

  useEffect(() => {
    kernelLog.info('[SYSTEM] App component mounted, checking boot state...');
    const timeout = setTimeout(() => {
      if (!useOS.getState().booted) {
        kernelLog.warn('[SYSTEM] Boot sequence timed out (3s). Forcing UI mount.');
        setBootTimedOut(true);
        setBooted(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [setBooted]);

  useEffect(() => {
    if (isLoggedIn && !hasSeenIntro) {
      useOS.getState().setHasSeenIntro(true);
    }
    // Safety net: ensure registry is loaded on login
    if (isLoggedIn) {
      kernelLog.info('[SYSTEM] User logged in:', currentUser?.name);
      hydrateOSRegistry().catch(() => {});
    }
  }, [isLoggedIn, hasSeenIntro, currentUser]);

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
      if (e.ctrlKey && e.key === 'l') { e.preventDefault(); lockShell(); return; }
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

      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      <DesktopWidgets />
      <NeuralThoughtStream />

      <div
        className="absolute inset-0 z-10 overflow-hidden"
        style={uiScale !== 1.0 ? {
          transform: `scale(${uiScale})`,
          transformOrigin: 'top left',
          width: `${100 / uiScale}%`,
          height: `${100 / uiScale}%`,
        } : undefined}
      >
        <DesktopIconGrid
          currentUserId={currentUser?.id ?? null}
          openContextMenu={openContextMenu}
          openWindow={openWindow}
        />

        <div className="absolute inset-0 bottom-20 overflow-hidden pointer-events-none">
          {(windows || []).filter(w => w.workspaceId === activeWorkspace || !w.workspaceId).map(win => (
            <WindowFrame key={win.id} windowState={win} />
          ))}
        </div>

        <StartMenu />
        <TaskSwitcher />
        <ContextMenu />
        <Taskbar />
      </div>

      {locked && <LockScreen onUnlock={() => unlockShell()} />}

      {isSearchOpen && (
        <Suspense fallback={null}>
          <GlobalSearchOverlay />
        </Suspense>
      )}

      <DaemonLockScreen />
      <NeuralHoloUI />
      <ToastContainer />
    </div>
  );
}
