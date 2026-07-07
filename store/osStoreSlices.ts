import { Box } from 'lucide-react';
import { uuid } from '../utils/uuid';
import type { AppManifest, ContextMenuState, KernelRules, Notification as NotifType, UserProfile, WindowState, SnapZone } from '../types.ts';
import { DEFAULT_SINGLETON_APPS } from './osStoreConstants';
import type { OverrideMode } from '../kernel/humanOverride';
import type { HealthStatus } from '../kernel/autonomyHealthMonitor';
import {
  focus as wmFocus, closeWindow as wmClose, minimizeWindow as wmMin,
  restoreWindow as wmRestore, snapWindow as wmSnap, unsnapWindow as wmUnsnap,
  focusNextInWorkspace as wmNext,
} from '../kernel/windowManager/index.ts';
import { beginDragRestore } from '../kernel/windowManager/snapEngine.ts';
import { autoArrange, snapIconToGrid, sortIconPositions } from '../kernel/windowManager/layoutEngine.ts';
import type { ManagerState } from '../kernel/windowManager/types.ts';
import { TASKBAR_RESERVED } from '../kernel/windowManager/constants.ts';

export interface GovernanceState {
  overrideMode: OverrideMode;
  overrideReason?: string;
  healthStatus: HealthStatus;
  confidenceScore: number;
  pendingApprovals: number;
  totalProposals: number;
  totalRollbacks: number;
  // Phase 5 — staging
  stagedArtifactCount: number;
  lastDeployStatus: 'none' | 'pending' | 'partial' | 'complete' | 'failed' | 'reverted';
  // Phase 8 — trust tiers
  activeTrustTierOverride: string | null;
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
  notifications: NotifType[];
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
  isShellLocked: boolean;
  daemonLocked: boolean;
  daemonLockLog: string[];
  currentUser: UserProfile | null;
  profiles: UserProfile[];
  customManifests: AppManifest[];
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
  lockShell: () => void;
  unlockShell: () => void;
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
  // Snap-aware window operations
  snapWindow: (id: string, zone: SnapZone) => void;
  unsnapWindow: (id: string) => void;
  beginDragRestore: (id: string, cursorX: number, cursorY: number) => void;
  togglePinned: (id: string) => void;
  setWindowOpacity: (id: string, opacity: number) => void;
  setWindowProgress: (id: string, progress: number | undefined) => void;
  toggleShowDesktop: () => void;
  focusNextInWorkspace: () => void;
  autoArrangeWindowsMode: (mode: 'cascade' | 'side-by-side' | 'stacked' | 'grid') => void;
  // Desktop icons (migrated from raw localStorage into the store)
  desktopIconPositions: Record<string, { x: number; y: number }>;
  desktopIconSelection: string[];
  desktopGridSnap: boolean;
  snapAssistEnabled: boolean;
  showDesktopState: 'none' | 'showing-desktop';
  showDesktopSnapshot: string[];
  setIconPosition: (name: string, x: number, y: number) => void;
  setIconPositions: (positions: Record<string, { x: number; y: number }>) => void;
  toggleIconSelection: (name: string) => void;
  selectIcons: (names: string[]) => void;
  clearIconSelection: () => void;
  setDesktopGridSnap: (v: boolean) => void;
  setSnapAssistEnabled: (v: boolean) => void;
  sortDesktopIcons: (names: string[]) => void;
  installApp: (appId: string) => void;
  uninstallApp: (appId: string) => void;
  registerCustomApp: (manifest: AppManifest) => void;
  pinApp: (appId: string) => void;
  unpinApp: (appId: string) => void;
  addNotification: (n: Omit<NotifType, 'id' | 'timestamp'>) => void;
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
  lockShell: () => set({ isShellLocked: true }),
  unlockShell: () => set({ isShellLocked: false }),
});

export const createNotificationAndAutonomyActions = (
  set: (partial: Partial<OSStateShape> | ((state: OSStateShape) => Partial<OSStateShape>)) => void
) => ({
  addNotification: (n: Omit<NotifType, 'id' | 'timestamp'>) => {
    // Also fire a native browser notification so the user sees it
    // even when the tab is in the background. Silent-fail if not
    // supported or permission denied.
    try {
      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
          new Notification(n.title, { body: n.message || '', icon: '/nexus_logo.png' });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
              new Notification(n.title, { body: n.message || '', icon: '/nexus_logo.png' });
            }
          });
        }
      }
    } catch {}
    set(state => ({ notifications: [...state.notifications, { ...n, id: uuid(), timestamp: Date.now() }] }));
  },
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
      pinnedApps: state.pinnedApps.filter(id => id !== appId),
      customManifests: state.customManifests.filter(m => m.id !== appId)
    })),
  registerCustomApp: (manifest: AppManifest) =>
    set(state => {
      const iconComponent = typeof manifest.icon === 'function' ? manifest.icon : Box;
      const cleanManifest = { ...manifest, icon: iconComponent };
      return {
        registry: [...state.registry, cleanManifest],
        installedApps: Array.from(new Set([...state.installedApps, manifest.id])),
        customManifests: [...state.customManifests.filter(m => m.id !== manifest.id), cleanManifest]
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
) => {
  // Build the ManagerState the engine expects, from the Zustand store.
  // __focusStack is untyped plumbing (most-recent-first window ids).
  const mgr = (): ManagerState => {
    const s = get() as any;
    const focusStack: string[] = Array.isArray(s.__focusStack) ? s.__focusStack : [];
    // Defensive: prune ids whose windows no longer exist (windows may be removed
    // by code paths that don't go through the engine's closeWindow).
    const liveIds = new Set(s.windows.map((w: any) => w.id));
    const cleanStack = focusStack.filter(id => liveIds.has(id));
    return {
      windows: s.windows,
      activeWindowId: s.activeWindowId,
      globalZIndex: s.globalZIndex,
      activeWorkspace: s.activeWorkspace,
      focusStack: cleanStack,
    };
  };
  const apply = (next: ManagerState, extra: Partial<OSStateShape> = {}) =>
    set({
      windows: next.windows as any,
      activeWindowId: next.activeWindowId,
      globalZIndex: next.globalZIndex,
      __focusStack: next.focusStack,
      ...extra,
    } as any);

  const viewport = () => ({ width: window.innerWidth, height: window.innerHeight - TASKBAR_RESERVED });

  return {
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
        id, appId,
        title: data?.title || app.name,
        x: 50 + (get().windows.length * 20),
        y: 50 + (get().windows.length * 20),
        width: app.defaultSize?.width || 800,
        height: app.defaultSize?.height || 600,
        zIndex: nextZ,
        isMinimized: false,
        isMaximized: false,
        data,
        workspaceId: get().activeWorkspace,
        opacity: 1,
        pinned: false,
      };
      set((state: any) => ({
        windows: [...state.windows, newWin],
        activeWindowId: id,
        globalZIndex: nextZ,
        // New windows go to the HEAD of the focus stack (most-recent-first).
        __focusStack: [id, ...(Array.isArray(state.__focusStack) ? state.__focusStack : [])],
      }));
    },

    closeWindow: (id: string) => apply(wmClose(mgr(), id)),

    focusWindow: (id: string) => apply(wmFocus(mgr(), id, get().globalZIndex + 1)),

    minimizeWindow: (id: string) => apply(wmMin(mgr(), id)),

    restoreWindow: (id: string) => apply(wmRestore(mgr(), id, get().globalZIndex + 1)),

    toggleMaximizeWindow: (id: string) => {
      const w = get().windows.find(x => x.id === id);
      if (!w) return;
      if (w.isMaximized) {
        apply(wmUnsnap(mgr(), id));
      } else {
        // Snap to maximize, then focus so it becomes the active topmost window.
        let next = wmSnap(mgr(), id, 'maximize', viewport());
        next = wmFocus(next, id, get().globalZIndex + 1);
        apply(next);
      }
    },

    snapWindow: (id: string, zone: SnapZone) => {
      // Compose focus ∘ snap: snapped window becomes active (real-OS behavior).
      let next = wmSnap(mgr(), id, zone, viewport());
      next = wmFocus(next, id, get().globalZIndex + 1);
      apply(next);
    },

    unsnapWindow: (id: string) => apply(wmUnsnap(mgr(), id)),

    beginDragRestore: (id: string, cursorX: number, cursorY: number) =>
      apply(beginDragRestore(mgr(), id, cursorX, cursorY)),

    togglePinned: (id: string) =>
      set((state: any) => ({ windows: state.windows.map((w: WindowState) => w.id === id ? { ...w, pinned: !w.pinned } : w) })),

    setWindowOpacity: (id: string, opacity: number) =>
      set((state: any) => ({ windows: state.windows.map((w: WindowState) => w.id === id ? { ...w, opacity } : w) })),

    setWindowProgress: (id: string, progress: number | undefined) =>
      set((state: any) => ({
        windows: state.windows.map((w: WindowState) =>
          w.id === id
            ? (progress === undefined ? { ...w, progress: undefined } : { ...w, progress })
            : w
        )
      })),

    updateWindow: (id: string, updates: Partial<WindowState>) =>
      set((state: any) => ({ windows: state.windows.map((w: WindowState) => w.id === id ? { ...w, ...updates } : w) })),

    focusNextInWorkspace: () => apply(wmNext(mgr(), get().globalZIndex + 1)),

    autoArrangeWindows: () => apply(autoArrange(mgr(), 'cascade', viewport())),

    autoArrangeWindowsMode: (mode: 'cascade' | 'side-by-side' | 'stacked' | 'grid') => {
      let next = autoArrange(mgr(), mode, viewport());
      // Clamp sizes so cascade can't go negative on huge N.
      next = {
        ...next,
        windows: next.windows.map(w => ({ ...w, width: Math.max(200, w.width), height: Math.max(200, w.height) })),
      };
      apply(next);
    },

    toggleShowDesktop: () =>
      set((state: any) => {
        if (state.showDesktopState === 'showing-desktop') {
          const ids = new Set(state.showDesktopSnapshot);
          return {
            windows: state.windows.map((w: WindowState) => ids.has(w.id) ? { ...w, isMinimized: false } : w),
            showDesktopState: 'none',
            showDesktopSnapshot: [],
          };
        }
        const visibleIds = state.windows.filter((w: WindowState) => !w.isMinimized).map((w: WindowState) => w.id);
        return {
          windows: state.windows.map((w: WindowState) => visibleIds.includes(w.id) ? { ...w, isMinimized: true } : w),
          showDesktopState: 'showing-desktop',
          showDesktopSnapshot: visibleIds,
          activeWindowId: null,
        };
      }),

    // --- Desktop icon actions ---
    setIconPosition: (name: string, x: number, y: number) =>
      set((state: OSStateShape) => {
        const grid = state.desktopGridSnap ? snapIconToGrid(x, y) : { x, y };
        return { desktopIconPositions: { ...state.desktopIconPositions, [name]: grid } };
      }),
    setIconPositions: (positions: Record<string, { x: number; y: number }>) =>
      set((state: OSStateShape) => ({ desktopIconPositions: { ...state.desktopIconPositions, ...positions } })),
    toggleIconSelection: (name: string) =>
      set((state: OSStateShape) => ({
        desktopIconSelection: state.desktopIconSelection.includes(name)
          ? state.desktopIconSelection.filter(n => n !== name)
          : [...state.desktopIconSelection, name],
      })),
    selectIcons: (names: string[]) => set({ desktopIconSelection: names }),
    clearIconSelection: () => set({ desktopIconSelection: [] }),
    setDesktopGridSnap: (v: boolean) => set({ desktopGridSnap: v }),
    setSnapAssistEnabled: (v: boolean) => set({ snapAssistEnabled: v }),
    sortDesktopIcons: (names: string[]) =>
      set({ desktopIconPositions: sortIconPositions(names, viewport()) }),
  };
};

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
