import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MobileNotification, UserProfile, KernelRules, MobileHomePageConfig, OpenApp } from '../types';

// Aligned with desktop osStoreConstants.ts
export const STORE_PERSIST_KEY = 'nexus-portable-state-v1';

// Mirrors desktop DEFAULT_KERNEL_RULES (same field names, mobile-adapted values)
const DEFAULT_KERNEL_RULES: KernelRules = {
  verbosity: 0.7,
  creativity: 0.8,
  tone: 'adaptive',
  modelId: 'claude-sonnet-4-6',
  autonomyEnabled: false,
  autonomyInterval: 30000,
  secureBoot: true,
  cpuSpeed: 3.4,
  primaryBootDevice: 'VFS',
};

// Mirrors desktop DEFAULT_PROFILES (same DAEMON Core profile)
const DEFAULT_PROFILES: UserProfile[] = [
  { id: 'daemon', name: 'DAEMON Core', themeColor: '#10b981', isAdmin: true },
  { id: 'user',   name: 'User',        themeColor: '#6366f1', isAdmin: false },
];

// Mirrors desktop DEFAULT_PINNED_APPS order on home page 1
const DEFAULT_HOME: MobileHomePageConfig = {
  pages: [
    // Page 1: Core apps matching desktop DEFAULT_PINNED_APPS + essentials
    ['welcome', 'explorer', 'hyperide', 'terminal', 'netrunner', 'dashboard',
     'daemon_chat', 'aion_agent', 'forge', 'settings', 'appstore', 'model_manager'],
    // Page 2: Productivity
    ['notepad', 'rich_editor', 'sticky_notes', 'kanban', 'habits', 'pomodoro',
     'calendar', 'contacts', 'clipboard', 'silence', 'daemon_journal', 'rss'],
    // Page 3: Media & Utilities
    ['calculator', 'weather', 'music', 'image_viewer', 'voice_recorder', 'markdown',
     'sysinfo', 'fractal', 'nfr', 'accessibility', 'native_zip', 'recycle_bin'],
  ],
  dock: ['daemon_chat', 'netrunner', 'terminal', 'settings'],
};

export const WALLPAPER_PRESETS = [
  { id: 'NEURAL',   label: 'Neural',   description: 'Animated particle network' },
  { id: 'NEBULA',   label: 'Nebula',   description: 'Deep space nebula gradient' },
  { id: 'AURORA',   label: 'Aurora',   description: 'Aurora borealis waves' },
  { id: 'GRID',     label: 'Grid',     description: 'Cyberpunk grid lines' },
  { id: 'MINIMAL',  label: 'Minimal',  description: 'Clean dark gradient' },
] as const;

export type WallpaperPreset = typeof WALLPAPER_PRESETS[number]['id'];

interface MobileState {
  // Boot / Auth
  booted: boolean;
  isLoggedIn: boolean;
  currentUser: UserProfile | null;
  profiles: UserProfile[];

  // App Stack (navigation — mobile full-screen model)
  appStack: OpenApp[];
  activeAppId: string | null;

  // Home
  homeConfig: MobileHomePageConfig;
  currentHomePage: number;
  pinnedApps: string[]; // mirrors desktop DEFAULT_PINNED_APPS

  // Overlays
  isAppDrawerOpen: boolean;
  isNotificationPanelOpen: boolean;
  isControlCenterOpen: boolean;
  isRecentAppsOpen: boolean;
  isSearchOpen: boolean;

  // Notifications
  notifications: MobileNotification[];
  unreadCount: number;

  // System / Kernel
  kernelRules: KernelRules;
  accentColor: string;
  wallpaper: WallpaperPreset;
  wallpaperMotionStrength: number;
  isForging: boolean;

  // Clipboard (mirrors desktop)
  clipboard: { text: string; ts: number } | null;
  clipboardHistory: Array<{ text: string; ts: number }>;

  // AI / Autonomy
  autonomyLog: string[];
  currentObjective: string;
  autonomyState: 'IDLE' | 'RUNNING' | 'PAUSED';

  // Actions: Boot/Auth
  setBooted: (v: boolean) => void;
  login: (profileId: string) => void;
  logout: () => void;

  // Actions: App Navigation
  openApp: (appId: string) => void;
  closeApp: (appId: string) => void;
  closeAllApps: () => void;
  goBack: () => void;

  // Actions: Overlays
  setAppDrawerOpen: (v: boolean) => void;
  setNotificationPanelOpen: (v: boolean) => void;
  setControlCenterOpen: (v: boolean) => void;
  setRecentAppsOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;

  // Actions: Notifications
  addNotification: (n: Omit<MobileNotification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  markAllRead: () => void;

  // Actions: Home
  setCurrentHomePage: (page: number) => void;
  updateHomeConfig: (config: Partial<MobileHomePageConfig>) => void;

  // Actions: System (mirrors desktop updateKernelRules)
  updateKernelRules: (updates: Partial<KernelRules>) => void;
  setAccentColor: (color: string) => void;
  setWallpaper: (wallpaper: WallpaperPreset) => void;
  setWallpaperMotionStrength: (v: number) => void;
  setForging: (v: boolean) => void;
  systemReset: (wipe: boolean) => void;

  // Actions: Clipboard
  setClipboard: (text: string) => void;
  clearClipboard: () => void;

  // Actions: Autonomy
  addAutonomyLog: (entry: string) => void;
  setCurrentObjective: (obj: string) => void;
  setAutonomyState: (s: 'IDLE' | 'RUNNING' | 'PAUSED') => void;
}

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useMobile = create<MobileState>()(
  persist(
    (set, get) => ({
      booted: false,
      isLoggedIn: false,
      currentUser: null,
      profiles: DEFAULT_PROFILES,
      appStack: [],
      activeAppId: null,
      homeConfig: DEFAULT_HOME,
      currentHomePage: 0,
      pinnedApps: ['welcome', 'explorer', 'hyperide', 'terminal', 'netrunner'],
      isAppDrawerOpen: false,
      isNotificationPanelOpen: false,
      isControlCenterOpen: false,
      isRecentAppsOpen: false,
      isSearchOpen: false,
      notifications: [],
      unreadCount: 0,
      kernelRules: DEFAULT_KERNEL_RULES,
      accentColor: '#10b981',
      wallpaper: 'NEURAL',
      wallpaperMotionStrength: 0.6,
      isForging: false,
      clipboard: null,
      clipboardHistory: [],
      autonomyLog: [],
      currentObjective: 'System Monitoring',
      autonomyState: 'IDLE',

      setBooted: (v) => set({ booted: v }),

      login: (profileId) => {
        const profile = get().profiles.find(p => p.id === profileId) ?? get().profiles[0] ?? null;
        set({ isLoggedIn: true, currentUser: profile });
        // Apply theme color from profile
        if (profile) {
          document.documentElement.style.setProperty('--nx-accent', profile.themeColor);
          set({ accentColor: profile.themeColor });
        }
      },

      logout: () => set({ isLoggedIn: false, currentUser: null, appStack: [], activeAppId: null }),

      openApp: (appId) => {
        // Singleton: if already open, bring to front (same as desktop DEFAULT_SINGLETON_APPS)
        const existing = get().appStack.find(a => a.appId === appId);
        if (existing) {
          set({ activeAppId: existing.id });
          return;
        }
        const entry: OpenApp = { id: uuid(), appId, title: appId, timestamp: Date.now() };
        set(state => ({
          appStack: [...state.appStack, entry],
          activeAppId: entry.id,
          isAppDrawerOpen: false,
          isRecentAppsOpen: false,
          isSearchOpen: false,
        }));
      },

      closeApp: (appId) => {
        const stack = get().appStack;
        const next = stack.filter(a => a.appId !== appId);
        const lastApp = next[next.length - 1];
        set({ appStack: next, activeAppId: lastApp?.id ?? null });
      },

      closeAllApps: () => set({ appStack: [], activeAppId: null }),

      goBack: () => {
        const stack = get().appStack;
        if (stack.length === 0) return;
        const next = stack.slice(0, -1);
        const lastApp = next[next.length - 1];
        set({ appStack: next, activeAppId: lastApp?.id ?? null });
      },

      setAppDrawerOpen: (v) => set({ isAppDrawerOpen: v, isNotificationPanelOpen: false, isControlCenterOpen: false, isRecentAppsOpen: false }),
      setNotificationPanelOpen: (v) => set({ isNotificationPanelOpen: v, isAppDrawerOpen: false, isControlCenterOpen: false }),
      setControlCenterOpen: (v) => set({ isControlCenterOpen: v, isAppDrawerOpen: false, isNotificationPanelOpen: false }),
      setRecentAppsOpen: (v) => set({ isRecentAppsOpen: v, isAppDrawerOpen: false }),
      setSearchOpen: (v) => set({ isSearchOpen: v }),

      addNotification: (n) => {
        const notif: MobileNotification = { ...n, id: uuid(), timestamp: Date.now(), read: false };
        set(state => ({
          notifications: [notif, ...state.notifications].slice(0, 50),
          unreadCount: state.unreadCount + 1,
        }));
      },

      dismissNotification: (id) =>
        set(state => ({ notifications: state.notifications.filter(n => n.id !== id) })),

      clearAllNotifications: () => set({ notifications: [], unreadCount: 0 }),

      markAllRead: () => set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      })),

      setCurrentHomePage: (page) => set({ currentHomePage: page }),
      updateHomeConfig: (config) =>
        set(state => ({ homeConfig: { ...state.homeConfig, ...config } })),

      updateKernelRules: (updates) =>
        set(state => ({ kernelRules: { ...state.kernelRules, ...updates } })),

      setAccentColor: (color) => {
        document.documentElement.style.setProperty('--nx-accent', color);
        set({ accentColor: color });
      },

      setWallpaper: (wallpaper) => set({ wallpaper }),
      setWallpaperMotionStrength: (v) => set({ wallpaperMotionStrength: v }),
      setForging: (v) => set({ isForging: v }),

      systemReset: (wipe) => {
        set({
          appStack: [],
          activeAppId: null,
          notifications: [],
          unreadCount: 0,
          autonomyLog: [],
          autonomyState: 'IDLE',
          currentObjective: 'System Monitoring',
        });
        if (wipe) {
          localStorage.removeItem(STORE_PERSIST_KEY);
          window.location.reload();
        }
      },

      setClipboard: (text) => set(state => ({
        clipboard: { text, ts: Date.now() },
        clipboardHistory: [{ text, ts: Date.now() }, ...state.clipboardHistory].slice(0, 20),
      })),

      clearClipboard: () => set({ clipboard: null }),

      addAutonomyLog: (entry) =>
        set(state => ({ autonomyLog: [...state.autonomyLog.slice(-49), entry] })),

      setCurrentObjective: (obj) => set({ currentObjective: obj }),
      setAutonomyState: (s) => set({ autonomyState: s }),
    }),
    {
      name: STORE_PERSIST_KEY,
      partialize: (state) => ({
        kernelRules: state.kernelRules,
        accentColor: state.accentColor,
        wallpaper: state.wallpaper,
        wallpaperMotionStrength: state.wallpaperMotionStrength,
        homeConfig: state.homeConfig,
        pinnedApps: state.pinnedApps,
        profiles: state.profiles,
        clipboardHistory: state.clipboardHistory,
      }),
    }
  )
);
