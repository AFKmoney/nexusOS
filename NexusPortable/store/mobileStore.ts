import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MobileNotification, UserProfile, KernelRules, MobileHomePageConfig, OpenApp } from '../types';

const DEFAULT_KERNEL_RULES: KernelRules = {
  verbosity: 5,
  creativity: 7,
  tone: 'adaptive',
  modelId: 'claude-sonnet-4-6',
  autonomyEnabled: false,
  secureBoot: true,
  accentColor: '#10b981',
};

const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'user',
    name: 'User',
    themeColor: '#10b981',
    isAdmin: true,
  },
];

const DEFAULT_HOME: MobileHomePageConfig = {
  pages: [
    ['terminal', 'notepad', 'explorer', 'daemon_chat', 'settings', 'dashboard'],
    ['calculator', 'calendar', 'weather', 'browser', 'music', 'camera'],
    ['kanban', 'voice', 'contacts', 'pomodoro', 'markdown', 'appstore'],
  ],
  dock: ['daemon_chat', 'browser', 'terminal', 'settings'],
};

interface MobileState {
  // Boot / Auth
  booted: boolean;
  isLoggedIn: boolean;
  currentUser: UserProfile | null;
  profiles: UserProfile[];

  // App Stack (navigation)
  appStack: OpenApp[];
  activeAppId: string | null;

  // Home
  homeConfig: MobileHomePageConfig;
  currentHomePage: number;

  // Overlays
  isAppDrawerOpen: boolean;
  isNotificationPanelOpen: boolean;
  isControlCenterOpen: boolean;
  isRecentAppsOpen: boolean;
  isSearchOpen: boolean;

  // Notifications
  notifications: MobileNotification[];
  unreadCount: number;

  // System
  kernelRules: KernelRules;
  accentColor: string;
  wallpaper: string;
  isForging: boolean;

  // AI
  autonomyLog: string[];
  currentObjective: string;

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

  // Actions: System
  updateKernelRules: (updates: Partial<KernelRules>) => void;
  setAccentColor: (color: string) => void;
  setWallpaper: (wallpaper: string) => void;
  addAutonomyLog: (entry: string) => void;
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
      isForging: false,
      autonomyLog: [],
      currentObjective: 'System Ready',

      setBooted: (v) => set({ booted: v }),

      login: (profileId) => {
        const profile = get().profiles.find(p => p.id === profileId) ?? get().profiles[0] ?? null;
        set({ isLoggedIn: true, currentUser: profile });
      },

      logout: () => set({ isLoggedIn: false, currentUser: null, appStack: [], activeAppId: null }),

      openApp: (appId) => {
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
        }));
      },

      closeApp: (appId) => {
        const stack = get().appStack;
        const idx = stack.findIndex(a => a.appId === appId);
        if (idx === -1) return;
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

      setAccentColor: (color) => set({ accentColor: color }),
      setWallpaper: (wallpaper) => set({ wallpaper }),

      addAutonomyLog: (entry) =>
        set(state => ({
          autonomyLog: [...state.autonomyLog.slice(-49), entry],
        })),
    }),
    {
      name: 'nexus-portable-store',
      partialize: (state) => ({
        kernelRules: state.kernelRules,
        accentColor: state.accentColor,
        wallpaper: state.wallpaper,
        homeConfig: state.homeConfig,
        profiles: state.profiles,
      }),
    }
  )
);
