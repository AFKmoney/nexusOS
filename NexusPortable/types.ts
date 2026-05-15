import type { LucideIcon } from 'lucide-react';

export interface AppManifest {
  id: string;
  name: string;
  icon: LucideIcon;
  component?: any;
  permissions?: string[];
  defaultSize?: { width: number; height: number };
  description?: string;
  isCustom?: boolean;
  sourcePath?: string;
}

export interface MobileApp {
  id: string;
  name: string;
  icon: LucideIcon;
  iconBg?: string;
  component: React.ComponentType<MobileAppProps> | any;
  // Mirrors desktop AppManifest.permissions
  permissions?: ('vfs.read' | 'vfs.write' | 'network' | 'kernel.modify')[];
  hidden?: boolean;
  description?: string;
  isCustom?: boolean;
  sourcePath?: string;
}

export interface MobileAppProps {
  onBack: () => void;
  appId: string;
  windowId?: string;
}

export interface OpenApp {
  id: string;
  appId: string;
  title: string;
  timestamp: number;
}

export interface MobileNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'system';
  timestamp: number;
  appId?: string;
  read?: boolean;
}

// Mirrors desktop UserProfile (types.ts)
export interface UserProfile {
  id: string;
  name: string;
  pin?: string;
  avatar?: string;
  themeColor: string;
  isAdmin: boolean;
}

// Mirrors desktop KernelRules (types.ts) — all fields preserved
export interface KernelRules {
  verbosity: number;           // 0-1 float (matches desktop)
  creativity: number;          // 0-1 float (matches desktop)
  tone: 'neutral' | 'friendly' | 'professional' | 'cyberpunk' | 'adaptive' | 'precise' | 'creative' | 'minimal';
  modelId: string;
  autonomyEnabled: boolean;
  autonomyInterval?: number;   // ms
  accentColor?: string;
  activeLocalModel?: string;
  secureBoot: boolean;
  cpuSpeed: number;            // GHz (cosmetic on mobile)
  primaryBootDevice: 'VFS' | 'CLOUD' | 'GGUF';
  daemonInjected?: boolean;
}

export interface MobileHomePageConfig {
  pages: string[][];
  dock: string[];
}

declare global {
  interface Window {
    electron?: {
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
      invoke: (channel: string, data?: any) => Promise<any>;
    };
  }
}
