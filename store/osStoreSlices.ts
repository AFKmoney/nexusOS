import { Box } from 'lucide-react';
import { uuid } from '../utils/uuid';
import { AppManifest, ContextMenuState, KernelRules, Notification, UserProfile, WindowState } from '../types.ts';
import { DEFAULT_SINGLETON_APPS } from './osStoreConstants';
import type { OverrideMode } from '../kernel/humanOverride';
import type { HealthStatus } from '../kernel/autonomyHealthMonitor';

export interface GovernanceState {
  overrideMode: OverrideMode;
  overrideReason?: string;
  healthStatus: HealthStatus;
  confidenceScore: number;
  pendingApprovals: number;
  totalProposals: number;
  totalRollbacks: number;
}

export interface OSStateShape {
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
  currentSelfPrompt: string | undefined;
  governance: GovernanceState;
  clipboard: { path: string; operation: 'copy' | 'cut' } | null;
  wallpaper: string;
  accentColor: string;
  wallpaperEffect: 'nebula' | 'aurora' | 'particles' | 'glass';
  wallpaperMotionStrength: number;
  customWallpapers: string[];
  themePreset: string;
  generatedThemes: string[];
  aiManagedStoreEnabled: boolean;
  isStartMenuOpen: boolean;
  isSearchOpen: boolean;
  isForging: boolean;
  uiScale: number;
  daemonLocked: boolean;
  daemonLockLog: string[];
  currentUser: UserProfile | null;
  profiles: UserProfile[];
  setWallpaper: (url: string) => void;
  setAccentColor: (color: string) => void;
  setWallpaperEffect: (effect: OSStateShape['wallpaperEffect']) => void;
  setWallpaperMotionStrength: (strength: number) => void;
  addCustomWallpaper: (wallpaper: string) => void;
  setThemePreset: (preset: string) => void;
  addGeneratedTheme: (theme: string) => void;
  setAiManagedStoreEnabled: (enabled: boolean) => void;
  toggleStartMenu: () => void;
  toggleSearch: () => void;
  openContextMenu: (state: ContextMenuState) => void;
  closeContextMenu: () => void;
  setUiScale: (scale: number) => void;
  setClipboard: (val: { path: string; operation: 'copy' | 'cut' } | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setDaemonLocked: (locked: boolean, initialLog?: string) => void;
  appendDaemonLockLog: (log: string) => void;
  clearDaemonLockLog: () => void;
  openWindow: (appId: string, data?: { title?: string; [key: string]: unknown }) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  updateWindow: (id: string, updates: Partial<WindowState>) => void;
  autoArrangeWindows: () => void;
  installApp: (appId: string) => void;
  uninstallApp: (appId: string) => void;
  registerCustomApp: (manifest: AppManifest) => void;
  pinApp: (appId: string) => void;
  unpinApp: (appId: string) => void;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  setAutonomyState: (s: 'IDLE' | 'ANALYZING' | 'PROMPTING' | 'EXECUTING') => void;
  addAutonomyLog: (log: string) => void;
  setCurrentObjective: (obj: string) => void;
  updateGovernance: (patch: Partial<GovernanceState>) => void;
}

export const createUIActions = (
  set: (partial: Partial<OSStateShape> | ((state: OSStateShape) => Partial<OSStateShape>)) => void
) => ({
  setWallpaper: (wallpaper: string) => set({ wallpaper }),
  setAccentColor: (accentColor: string) => set({ accentColor }),
  setWallpaperEffect: (wallpaperEffect: OSStateShape['wallpaperEffect']) => set({ wallpaperEffect }),
  setWallpaperMotionStrength: (wallpaperMotionStrength: number) => set({ wallpaperMotionStrength }),
  addCustomWallpaper: (wallpaper: string) =>
    set(state => ({ customWallpapers: Array.from(new Set([...state.customWallpapers, wallpaper])) })),
  setThemePreset: (themePreset: string) => set({ themePreset }),
  addGeneratedTheme: (generatedTheme: string) =>
    set(state => ({ generatedThemes: Array.from(new Set([...state.generatedThemes, generatedTheme])) })),
  setAiManagedStoreEnabled: (aiManagedStoreEnabled: boolean) => set({ aiManagedStoreEnabled }),
  toggleStartMenu: () => set(state => ({ isStartMenuOpen: !state.isStartMenuOpen })),
  toggleSearch: () => set(state => ({ isSearchOpen: !state.isSearchOpen })),
  openContextMenu: (contextMenu: ContextMenuState) => set({ contextMenu }),
  closeContextMenu: () => set(state => ({ contextMenu: { ...state.contextMenu, isOpen: false } })),
  setUiScale: (uiScale: number) => set({ uiScale }),
});

export const createNotificationAndAutonomyActions = (
  set: (partial: Partial<OSStateShape> | ((state: OSStateShape) => Partial<OSStateShape>)) => void
) => ({
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) =>
    set(state => ({ notifications: [...state.notifications, { ...n, id: uuid(), timestamp: Date.now() }] })),
  removeNotification: (id: string) =>
    set(state => ({ notifications: state.notifications.filter(not => not.id !== id) })),
  setAutonomyState: (autonomyState: OSStateShape['autonomyState']) => set({ autonomyState }),
  addAutonomyLog: (log: string) =>
    set(state => ({ autonomyLog: [...state.autonomyLog.slice(-50), log] })),
  setCurrentObjective: (currentObjective: string) => set({ currentObjective }),
  updateGovernance: (patch: Partial<GovernanceState>) =>
    set(state => ({ governance: { ...state.governance, ...patch } })),
});

export const createRegistryActions = (
  set: (partial: Partial<OSStateShape> | ((state: OSStateShape) => Partial<OSStateShape>)) => void
) => ({
  installApp: (appId: string) =>
    set(state => ({ installedApps: Array.from(new Set([...state.installedApps, appId])) })),
  uninstallApp: (appId: string) =>
    set(state => ({
      installedApps: state.installedApps.filter(id => id !== appId),
      pinnedApps: state.pinnedApps.filter(id => id !== appId)
    })),
  registerCustomApp: (manifest: AppManifest) =>
    set(state => {
      const iconComponent = typeof manifest.icon === 'function' ? manifest.icon : Box;
      return {
        registry: [...state.registry, { ...manifest, icon: iconComponent }],
        installedApps: [...state.installedApps, manifest.id]
      };
    }),
  pinApp: (appId: string) =>
    set(state => ({ pinnedApps: Array.from(new Set([...state.pinnedApps, appId])) })),
  unpinApp: (appId: string) =>
    set(state => ({ pinnedApps: state.pinnedApps.filter(id => id !== appId) })),
});

export const createWindowActions = (
  set: (partial: Partial<OSStateShape> | ((state: OSStateShape) => Partial<OSStateShape>)) => void,
  get: () => OSStateShape
) => ({
  openWindow: (appId: string, data?: { title?: string; [key: string]: unknown }) => {
    const shouldReuseExistingWindow = DEFAULT_SINGLETON_APPS.has(appId);
    const existingWin = shouldReuseExistingWindow ? get().windows.find(w => w.appId === appId) : undefined;
    if (existingWin) {
      get().focusWindow(existingWin.id);
      if (existingWin.isMinimized) get().restoreWindow(existingWin.id);
      return;
    }

    const app = get().registry.find(a => a.id === appId);
    if (!app) return;
    const id = uuid();
    const nextZ = get().globalZIndex + 1;

    const newWin: WindowState = {
      id,
      appId,
      title: data?.title || app.name,
      x: 50 + (get().windows.length * 20),
      y: 50 + (get().windows.length * 20),
      width: app.defaultSize?.width || 800,
      height: app.defaultSize?.height || 600,
      zIndex: nextZ,
      isMinimized: false,
      isMaximized: false,
      data,
      workspaceId: get().activeWorkspace
    };

    set(state => ({
      windows: [...state.windows, newWin],
      activeWindowId: id,
      globalZIndex: nextZ
    }));
  },
  closeWindow: (id: string) => set(state => ({ windows: state.windows.filter(w => w.id !== id) })),
  focusWindow: (id: string) =>
    set(state => {
      const nextZ = state.globalZIndex + 1;
      return {
        activeWindowId: id,
        globalZIndex: nextZ,
        windows: state.windows.map(w => w.id === id ? { ...w, zIndex: nextZ, isMinimized: false } : w)
      };
    }),
  minimizeWindow: (id: string) =>
    set(state => ({ windows: state.windows.map(w => w.id === id ? { ...w, isMinimized: true } : w) })),
  restoreWindow: (id: string) => get().focusWindow(id),
  toggleMaximizeWindow: (id: string) =>
    set(state => ({ windows: state.windows.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w) })),
  updateWindow: (id: string, updates: Partial<WindowState>) =>
    set(state => ({ windows: state.windows.map(w => w.id === id ? { ...w, ...updates } : w) })),
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
});

export const createSessionActions = (
  set: (partial: Partial<OSStateShape> | ((state: OSStateShape) => Partial<OSStateShape>)) => void
) => ({
  setClipboard: (clipboard: { path: string; operation: 'copy' | 'cut' } | null) => set({ clipboard }),
  updateProfile: (updates: Partial<UserProfile>) =>
    set(state => {
      if (!state.currentUser) return {};
      const updatedUser: UserProfile = { ...state.currentUser, ...updates };
      return {
        currentUser: updatedUser,
        profiles: state.profiles.map(p => p.id === updatedUser.id ? updatedUser : p)
      };
    }),
  setDaemonLocked: (locked: boolean, initialLog?: string) =>
    set(state => ({
      daemonLocked: locked,
      daemonLockLog: initialLog ? [initialLog] : state.daemonLockLog
    })),
  appendDaemonLockLog: (log: string) =>
    set(state => ({
      daemonLockLog: [...state.daemonLockLog.slice(-49), log]
    })),
  clearDaemonLockLog: () => set({ daemonLockLog: [] }),
});
