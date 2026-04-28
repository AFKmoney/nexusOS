import { KernelRules, UserProfile } from '../types.ts';

export const STORE_PERSIST_KEY = 'nexus-pro-ultimate-state-v4';

export const DEFAULT_PROFILES: UserProfile[] = [
  { id: 'daemon', name: 'DAEMON Core', themeColor: '#10b981', isAdmin: true }
];

export const DEFAULT_PINNED_APPS = ['welcome', 'explorer', 'hyperide', 'terminal', 'netrunner'];
export const DEFAULT_SINGLETON_APPS = new Set(['welcome', 'explorer', 'hyperide', 'terminal', 'netrunner', 'dashboard', 'settings']);

export const DEFAULT_KERNEL_RULES: KernelRules = {
  verbosity: 0.7,
  creativity: 0.8,
  tone: 'god_mode',
  modelId: 'daemon-fractal',
  autonomyEnabled: false,
  autonomyInterval: 30000,
  secureBoot: true,
  cpuSpeed: 3.4,
  primaryBootDevice: 'VFS'
};