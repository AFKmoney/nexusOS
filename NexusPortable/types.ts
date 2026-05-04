import type { LucideIcon } from 'lucide-react';

export interface MobileApp {
  id: string;
  name: string;
  icon: LucideIcon;
  iconBg: string;
  component: React.ComponentType<MobileAppProps>;
  permissions?: string[];
  hidden?: boolean;
  description?: string;
}

export interface MobileAppProps {
  onBack: () => void;
  appId: string;
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

export interface UserProfile {
  id: string;
  name: string;
  pin?: string;
  avatar?: string;
  themeColor: string;
  isAdmin: boolean;
}

export interface KernelRules {
  verbosity: number;
  creativity: number;
  tone: 'neutral' | 'friendly' | 'professional' | 'cyberpunk' | 'adaptive' | 'precise' | 'creative' | 'minimal';
  modelId: string;
  autonomyEnabled: boolean;
  accentColor?: string;
  secureBoot: boolean;
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
