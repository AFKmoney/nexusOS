import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { KernelRules } from '../types.ts';
import { localBrain } from '../services/localBrain';
import { DEFAULT_KERNEL_RULES, DEFAULT_PINNED_APPS, DEFAULT_PROFILES, STORE_PERSIST_KEY } from './osStoreConstants';
import {
  createNotificationAndAutonomyActions,
  createRegistryActions,
  createSessionActions,
  createUIActions,
  createWindowActions,
  OSStateShape
} from './osStoreSlices';

interface OSState extends OSStateShape {
  booted: boolean;
  hasSeenIntro: boolean;
  isLoggedIn: boolean;
  setHasSeenIntro: (val: boolean) => void;
  switchWorkspace: (id: number) => void;
  setBooted: (val: boolean) => void;
  login: (profileId: string) => void;
  logout: () => void;
  updateKernelRules: (updates: Partial<KernelRules>) => void;
  systemReset: (wipe: boolean) => void;
  setForging: (v: boolean) => void;
}

export function makeStoreId(seed = 'default') {
  return `os-store-${seed}`;
}

export function createDefaultStoreState() {
  return {
    id: makeStoreId(),
    apps: [] as string[],
    recentFiles: [] as string[],
    favorites: [] as string[],
  };
}

const partializeOSState = (state: OSState) => ({
  hasSeenIntro: state.hasSeenIntro,
  kernelRules: state.kernelRules,
  pinnedApps: state.pinnedApps,
  wallpaper: state.wallpaper,
  accentColor: state.accentColor,
  installedApps: state.installedApps,
  globalZIndex: state.globalZIndex,
  activeWorkspace: state.activeWorkspace,
  uiScale: state.uiScale,
});

export const useOS = create<OSState>()(
  persist(
    (set, get) => ({
      booted: false,
      hasSeenIntro: false,
      isLoggedIn: false,
      currentUser: { id: 'system', name: 'System', themeColor: '#10b981', isAdmin: true } as any,
      profiles: DEFAULT_PROFILES,
      windows: [],
      activeWindowId: null,
      activeWorkspace: 1,
      globalZIndex: 100,
      registry: [],
      installedApps: [],
      pinnedApps: DEFAULT_PINNED_APPS,
      kernelRules: DEFAULT_KERNEL_RULES,
      isForging: false,
      uiScale: 1.0,
      daemonLocked: false,
      daemonLockLog: [],
      contextMenu: { isOpen: false, x: 0, y: 0, targetType: 'desktop' },
      notifications: [],
      autonomyState: 'IDLE',
      autonomyLog: [],
      currentObjective: 'System Monitoring',
      currentSelfPrompt: undefined,
      governance: {
        overrideMode: 'active' as const,
        healthStatus: 'healthy' as const,
        confidenceScore: 1,
        pendingApprovals: 0,
        totalProposals: 0,
        totalRollbacks: 0,
        stagedArtifactCount: 0,
        lastDeployStatus: 'none' as const,
        activeTrustTierOverride: null,
      },
      clipboard: null,
      wallpaper: 'NEURAL_GLOBE',
      accentColor: '#10b981',
      wallpaperEffect: 'nebula',
      wallpaperMotionStrength: 0.6,
      customWallpapers: [],
      themePreset: 'neo-emerald',
      generatedThemes: [],
      aiManagedStoreEnabled: true,
      isStartMenuOpen: false,
      isSearchOpen: false,
      setHasSeenIntro: (val) => set({ hasSeenIntro: val }),
      switchWorkspace: (id) => set({ activeWorkspace: id }),
      setBooted: (val) => set({ booted: val }),
      login: (profileId) => {
        const profile = get().profiles.find(p => p.id === profileId) ?? get().profiles[0] ?? null;
        set({ isLoggedIn: true, currentUser: profile });
        setTimeout(() => {
          void localBrain.initialize().catch(e => console.warn('[WARM-START] Brain init deferred:', e));
        }, 500);
      },
      logout: () => set({ isLoggedIn: false, currentUser: null, windows: [], isStartMenuOpen: false }),
      ...createWindowActions(set, get),
      updateKernelRules: (updates) => set(state => ({ kernelRules: { ...state.kernelRules, ...updates } })),
      ...createNotificationAndAutonomyActions(set),
      ...createUIActions(set),
      systemReset: (wipe) => {
        if (wipe) {
          try {
            localStorage.clear();
          } catch {}
          window.location.reload();
        } else {
          set({ windows: [], activeWindowId: null, isStartMenuOpen: false });
        }
      },
      ...createRegistryActions(set),
      ...createSessionActions(set),
      setForging: (v) => set({ isForging: v })
    }),
    {
      name: STORE_PERSIST_KEY,
      partialize: partializeOSState
    }
  )
);

export async function hydrateOSRegistry(): Promise<void> {
  try {
    const { SYSTEM_APPS } = await import('../appRegistry');
    const { installedApps = [] } = useOS.getState() as Partial<OSState>;
    
    // Registry is NOT persisted, so we must ALWAYS reload it from the manifest
    useOS.setState({
      registry: SYSTEM_APPS,
      // Only set installedApps on first boot (when empty)
      ...(installedApps.length === 0 ? { installedApps: SYSTEM_APPS.map((app) => app.id) } : {})
    });
  } catch (error) {
    console.warn('[OS_STORE] Failed to hydrate app registry:', error);
  }
}
