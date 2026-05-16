import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Box } from 'lucide-react';
import type { MobileNotification, UserProfile, KernelRules, MobileHomePageConfig, OpenApp, AppManifest } from '../types';

// Aligned with desktop osStoreConstants.ts
export const STORE_PERSIST_KEY = 'nexus-portable-state-v3'; // Bumped version

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

const DEFAULT_PROFILES: UserProfile[] = [
  { id: 'daemon', name: 'DAEMON Core', themeColor: '#10b981', isAdmin: true },
  { id: 'user',   name: 'User',        themeColor: '#6366f1', isAdmin: false },
];

const DEFAULT_HOME: MobileHomePageConfig = {
  pages: [
    ['welcome', 'explorer', 'hyperide', 'terminal', 'netrunner', 'dashboard',
     'daemon_chat', 'aion_agent', 'forge', 'settings', 'appstore', 'model_manager'],
    ['notepad', 'rich_editor', 'sticky_notes', 'kanban', 'habits', 'pomodoro',
     'calendar', 'contacts', 'clipboard', 'silence', 'daemon_journal', 'rss'],
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
  booted: boolean;
  isLoggedIn: boolean;
  currentUser: UserProfile | null;
  profiles: UserProfile[];

  registry: AppManifest[];
  customManifests: AppManifest[];
  appStack: OpenApp[];
  activeAppId: string | null;

  homeConfig: MobileHomePageConfig;
  currentHomePage: number;
  pinnedApps: string[];

  isAppDrawerOpen: boolean;
  isNotificationPanelOpen: boolean;
  isControlCenterOpen: boolean;
  isRecentAppsOpen: boolean;
  isSearchOpen: boolean;

  notifications: MobileNotification[];
  unreadCount: number;

  kernelRules: KernelRules;
  accentColor: string;
  wallpaper: WallpaperPreset;
  wallpaperMotionStrength: number;
  isForging: boolean;

  clipboard: { text: string; ts: number } | null;
  clipboardHistory: Array<{ text: string; ts: number }>;

  autonomyLog: string[];
  currentObjective: string;
  autonomyState: 'IDLE' | 'ANALYZING' | 'PROMPTING' | 'EXECUTING';

  governance: {
    overrideMode: 'active' | 'paused' | 'safe-mode' | 'disabled';
    healthStatus: 'healthy' | 'degraded' | 'critical' | 'disabled';
    confidenceScore: number;
    pendingApprovals: number;
    totalProposals: number;
    totalRollbacks: number;
    stagedArtifactCount: number;
    lastDeployStatus: 'none' | 'success' | 'failed' | 'reverted';
    activeTrustTierOverride: string | null;
  };

  installedApps: string[];

  setBooted: (v: boolean) => void;
  login: (profileId: string) => void;
  logout: () => void;

  openApp: (appId: string) => void;
  closeApp: (appId: string) => void;
  closeAllApps: () => void;
  goBack: () => void;

  installApp: (appId: string) => void;
  uninstallApp: (appId: string) => void;

  setAppDrawerOpen: (v: boolean) => void;
  // ... rest of methods
  setNotificationPanelOpen: (v: boolean) => void;
  setControlCenterOpen: (v: boolean) => void;
  setRecentAppsOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;

  addNotification: (n: Omit<MobileNotification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  markAllRead: () => void;

  setCurrentHomePage: (page: number) => void;
  updateHomeConfig: (config: Partial<MobileHomePageConfig>) => void;

  registerCustomApp: (manifest: AppManifest) => void;
  updateKernelRules: (updates: Partial<KernelRules>) => void;
  setAccentColor: (color: string) => void;
  setWallpaper: (wallpaper: WallpaperPreset) => void;
  setWallpaperMotionStrength: (v: number) => void;
  setForging: (v: boolean) => void;
  systemReset: (wipe: boolean) => void;

  setClipboard: (text: string) => void;
  clearClipboard: () => void;

  addAutonomyLog: (entry: string) => void;
  setCurrentObjective: (obj: string) => void;
  setAutonomyState: (s: 'IDLE' | 'ANALYZING' | 'PROMPTING' | 'EXECUTING') => void;
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
      registry: [],
      customManifests: [],
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

      governance: {
        overrideMode: 'active',
        healthStatus: 'healthy',
        confidenceScore: 1.0,
        pendingApprovals: 0,
        totalProposals: 0,
        totalRollbacks: 0,
        stagedArtifactCount: 0,
        lastDeployStatus: 'none',
        activeTrustTierOverride: null,
      },

      installedApps: DEFAULT_HOME.pages.flat(),

      setBooted: (v) => set({ booted: v }),
      
      // ... (after logout)
      installApp: (appId) => {
        if (!get().installedApps.includes(appId)) {
          set(state => {
            const nextPages = [...state.homeConfig.pages];
            // Find first page with space (max 12 per page)
            let pageIdx = nextPages.findIndex(p => p.length < 12);
            if (pageIdx === -1) {
              nextPages.push([appId]);
            } else {
              nextPages[pageIdx] = [...nextPages[pageIdx], appId];
            }
            return {
              installedApps: [...state.installedApps, appId],
              homeConfig: { ...state.homeConfig, pages: nextPages }
            };
          });
        }
      },

      uninstallApp: (appId) => {
        set(state => ({
          installedApps: state.installedApps.filter(id => id !== appId),
          homeConfig: {
            ...state.homeConfig,
            pages: state.homeConfig.pages.map(p => p.filter(id => id !== appId)).filter(p => p.length > 0)
          }
        }));
      },

      login: (profileId) => {
        const profile = get().profiles.find(p => p.id === profileId) ?? get().profiles[0] ?? null;
        set({ isLoggedIn: true, currentUser: profile });
        if (profile) {
          document.documentElement.style.setProperty('--nx-accent', profile.themeColor);
          set({ accentColor: profile.themeColor });
        }
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

      registerCustomApp: (manifest) => {
        const cleanManifest = { ...manifest, icon: manifest.icon || Box };
        set(state => ({
          registry: [...state.registry, cleanManifest],
          customManifests: [...state.customManifests.filter(m => m.id !== manifest.id), cleanManifest]
        }));
      },

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
        customManifests: state.customManifests,
      }),
    }
  )
);

(window as any).__MOBILE_STORE__ = useMobile;

export function getMobileApp(id: string): AppManifest | undefined {
  return useMobile.getState().registry.find(a => a.id === id);
}

export async function hydrateMobileRegistry(): Promise<void> {
  try {
    const { MOBILE_APPS } = await import('../appRegistry');
    const { customManifests = [] } = useMobile.getState();
    
    const fullRegistry = [...MOBILE_APPS];
    customManifests.forEach(custom => {
       if (!fullRegistry.find(a => a.id === custom.id)) {
          fullRegistry.push({ ...custom, icon: Box, iconBg: 'linear-gradient(135deg, #374151 0%, #111827 100%)' } as any);
       }
    });

    useMobile.setState({ registry: fullRegistry });
  } catch (error) {
    console.warn('[MOBILE_STORE] Failed to hydrate registry:', error);
  }
}
