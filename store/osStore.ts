
import { create } from 'zustand';
import { uuid } from '../utils/uuid';
import { persist } from 'zustand/middleware';
import { WindowState, KernelRules, AppManifest, ContextMenuState, Notification, UserProfile, ScreensaverConfig } from '../types.ts';
import { Box } from 'lucide-react';
import { vfs } from '../kernel/fileSystem';
import { SYSTEM_APPS } from '../appRegistry';
import { localBrain } from '../services/localBrain';
import { processManager } from '../kernel/processManager';

interface OSState {
  booted: boolean;
  hasSeenIntro: boolean;
  isLoggedIn: boolean;
  currentUser: UserProfile | null;
  profiles: UserProfile[];
  windows: WindowState[];
  activeWindowId: string | null;
  activeWorkspace: number;
  globalZIndex: number;
  registry: AppManifest[];
  installedApps: string[];
  pinnedApps: string[];
  kernelRules: KernelRules;
  contextMenu: ContextMenuState;
  notifications: Notification[];
  autonomyState: 'IDLE' | 'ANALYZING' | 'PROMPTING' | 'EXECUTING';
  autonomyLog: string[];
  currentObjective: string;
  currentSelfPrompt?: string;
  clipboard: { path: string; operation: 'copy' | 'cut' } | null;
  wallpaper: string;
  isStartMenuOpen: boolean;
  isSearchOpen: boolean;
  // Forge mutex — prevents parallel app generation
  isForging: boolean;
  uiScale: number;
  setHasSeenIntro: (val: boolean) => void;
  switchWorkspace: (id: number) => void;
  setBooted: (val: boolean) => void;
  login: (profileId: string) => void;
  logout: () => void;
  openWindow: (appId: string, data?: any) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  updateWindow: (id: string, updates: Partial<WindowState>) => void;
  updateKernelRules: (updates: Partial<KernelRules>) => void;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  setAutonomyState: (s: any) => void;
  addAutonomyLog: (log: string) => void;
  setCurrentObjective: (obj: string) => void;
  setWallpaper: (url: string) => void;
  toggleStartMenu: () => void;
  toggleSearch: () => void;
  openContextMenu: (state: ContextMenuState) => void;
  closeContextMenu: () => void;
  systemReset: (wipe: boolean) => void;
  installApp: (appId: string) => void;
  registerCustomApp: (manifest: AppManifest) => void;
  pinApp: (appId: string) => void;
  unpinApp: (appId: string) => void;
  setClipboard: (val: { path: string, operation: 'copy' | 'cut' } | null) => void;
  autoArrangeWindows: () => void;
  setForging: (v: boolean) => void;
  setUiScale: (scale: number) => void;
}

export const useOS = create<OSState>()(
  persist(
    (set, get) => ({
      booted: false,
      hasSeenIntro: false,
      isLoggedIn: false,
      currentUser: null,
      profiles: [
        { id: 'daemon', name: 'DAEMON Core', themeColor: '#ef4444', isAdmin: true }
      ],
      windows: [],
      activeWindowId: null,
      activeWorkspace: 1,
      globalZIndex: 100,
      registry: SYSTEM_APPS,
      installedApps: SYSTEM_APPS.map(a => a.id),
      pinnedApps: ['welcome', 'explorer', 'hyperide', 'terminal', 'netrunner'],
      kernelRules: { verbosity: 0.7, creativity: 0.8, tone: 'god_mode', modelId: 'daemon-fractal', autonomyEnabled: false, autonomyInterval: 30000, secureBoot: true, cpuSpeed: 3.4, primaryBootDevice: 'VFS' },
      isForging: false,
      uiScale: 1.0,
      contextMenu: { isOpen: false, x: 0, y: 0, targetType: 'desktop' },
      notifications: [],
      autonomyState: 'IDLE',
      autonomyLog: [],
      currentObjective: 'System Monitoring',
      currentSelfPrompt: undefined,
      clipboard: null,
      wallpaper: 'https://images.unsplash.com/photo-1605218427306-6354db696f36?q=80&w=2070&auto=format&fit=crop', // Neon District
      isStartMenuOpen: false,
      isSearchOpen: false,
      setHasSeenIntro: (val) => set({ hasSeenIntro: val }),
      setBooted: (val) => set({ booted: val }),
      login: (profileId) => {
        const profile = get().profiles.find(p => p.id === profileId) || get().profiles[0];
        set({ isLoggedIn: true, currentUser: profile });
        // Warm-start the local brain in background
        setTimeout(() => localBrain.initialize().catch(e => console.warn('[WARM-START] Brain init deferred:', e)), 500);
      },
      logout: () => set({ isLoggedIn: false, currentUser: null, windows: [], isStartMenuOpen: false }),
      openWindow: (appId, data) => {
        const app = get().registry.find(a => a.id === appId);
        if (!app) return;
        const id = uuid();
        const nextZ = get().globalZIndex + 1;

        const newWin: WindowState = {
          id, appId, title: data?.title || app.name, x: 50 + (get().windows.length * 20), y: 50 + (get().windows.length * 20),
          width: app.defaultSize?.width || 800, height: app.defaultSize?.height || 600, zIndex: nextZ,
          isMinimized: false, isMaximized: false, data, workspaceId: get().activeWorkspace
        };
        processManager.spawn(id, appId, newWin.title);
        set(state => ({
          windows: [...state.windows, newWin],
          activeWindowId: id,
          globalZIndex: nextZ
        }));
      },
      closeWindow: (id) => {
        processManager.kill(id);
        set(state => ({ windows: state.windows.filter(w => w.id !== id) }));
      },
      focusWindow: (id) => set(state => {
        const nextZ = state.globalZIndex + 1;
        return {
          activeWindowId: id,
          globalZIndex: nextZ,
          windows: state.windows.map(w => w.id === id ? { ...w, zIndex: nextZ, isMinimized: false } : w)
        };
      }),
      minimizeWindow: (id) => {
        processManager.minimize(id);
        set(state => ({ windows: state.windows.map(w => w.id === id ? { ...w, isMinimized: true } : w) }));
      },
      restoreWindow: (id) => {
        processManager.resume(id);
        get().focusWindow(id);
      },
      toggleMaximizeWindow: (id) => set(state => ({ windows: state.windows.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w) })),
      updateWindow: (id, updates) => set(state => ({ windows: state.windows.map(w => w.id === id ? { ...w, ...updates } : w) })),
      updateKernelRules: (updates) => set(state => ({ kernelRules: { ...state.kernelRules, ...updates } })),
      addNotification: (n) => set(state => ({ notifications: [...state.notifications, { ...n, id: uuid(), timestamp: Date.now() }] })),
      removeNotification: (id) => set(state => ({ notifications: state.notifications.filter(not => not.id !== id) })),
      setAutonomyState: (autonomyState) => set({ autonomyState }),
      addAutonomyLog: (log) => set(state => ({ autonomyLog: [...state.autonomyLog.slice(-50), log] })),
      setCurrentObjective: (currentObjective) => set({ currentObjective }),
      setWallpaper: (wallpaper) => set({ wallpaper }),
      toggleStartMenu: () => set(state => ({ isStartMenuOpen: !state.isStartMenuOpen })),
      toggleSearch: () => set(state => ({ isSearchOpen: !state.isSearchOpen })),
      openContextMenu: (contextMenu) => set({ contextMenu }),
      closeContextMenu: () => set(state => ({ contextMenu: { ...state.contextMenu, isOpen: false } })),
      systemReset: (wipe) => {
        if (wipe) { localStorage.clear(); window.location.reload(); }
        else set({ windows: [], activeWindowId: null, isStartMenuOpen: false });
      },
      switchWorkspace: (id) => set({ activeWorkspace: id }),
      installApp: (appId) => set(state => ({ installedApps: Array.from(new Set([...state.installedApps, appId])) })),
      registerCustomApp: (manifest) => set(state => {
        const iconComponent = typeof manifest.icon === 'function' ? manifest.icon : Box;
        return {
          registry: [...state.registry, { ...manifest, icon: iconComponent }],
          installedApps: [...state.installedApps, manifest.id]
        };
      }),
      pinApp: (appId) => set(state => ({ pinnedApps: Array.from(new Set([...state.pinnedApps, appId])) })),
      unpinApp: (appId) => set(state => ({ pinnedApps: state.pinnedApps.filter(id => id !== appId) })),
      setClipboard: (clipboard) => set({ clipboard }),
      setForging: (v) => set({ isForging: v }),
      setUiScale: (uiScale) => set({ uiScale }),
      autoArrangeWindows: () => {
        const { windows, globalZIndex } = get();
        const grid = 50;
        set({
          windows: windows.map((w, i) => ({
            ...w,
            x: grid + (i % 3) * 200,
            y: grid + Math.floor(i / 3) * 200,
            isMaximized: false,
            isMinimized: false,
            zIndex: globalZIndex + i + 1
          })),
          globalZIndex: globalZIndex + windows.length + 1
        });
      }
    }),
    {
      name: 'nexus-pro-ultimate-state-v3', // Bumped to force reset
      partialize: (state) => ({
        hasSeenIntro: state.hasSeenIntro,
        kernelRules: state.kernelRules,
        pinnedApps: state.pinnedApps,
        wallpaper: state.wallpaper,
        installedApps: state.installedApps,
        globalZIndex: state.globalZIndex,
        activeWorkspace: state.activeWorkspace,
        uiScale: state.uiScale,
        windows: state.windows,
      })
    }
  )
);
