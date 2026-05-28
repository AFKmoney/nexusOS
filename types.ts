import type { LucideIcon } from 'lucide-react';
import type { ComponentType, LazyExoticComponent } from 'react';

export type AppComponentProps =
  | { id: string }
  | { windowId: string }
  | { windowId: string; initPath?: string };

// A component may be eagerly imported (a function/class component) or
// code-split via React.lazy (a LazyExoticComponent). Both are accepted so the
// app registry can defer loading heavy app bundles until a window is opened.
export type AppComponent =
  | ComponentType<any>
  | LazyExoticComponent<ComponentType<any>>;

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  workspaceId?: number;
  data?: any;
}

export interface AppManifest {
  id: string;
  name: string;
  description?: string;
  icon: LucideIcon;
  component?: AppComponent;
  permissions: ('vfs.read' | 'vfs.write' | 'network' | 'kernel.modify')[];
  hidden?: boolean;
  isCustom?: boolean;
  sourcePath?: string;
  defaultSize?: { width: number; height: number };
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory' | 'symlink';
  targetPath?: string;
  content?: string;
  children?: { [key: string]: FileNode };
  permissions: string;
  created: number;
  modified: number;
  deleted?: number;
  summary?: string;
  smartLabel?: string;
  aiTags?: string[];
  customIcon?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  password?: string;
  themeColor: string;
  isAdmin: boolean;
}

export interface KernelRules {
  verbosity: number;
  creativity: number;
  tone: 'neutral' | 'friendly' | 'professional' | 'cyberpunk' | 'adaptive' | 'precise' | 'creative' | 'minimal';
  modelId: string;
  autonomyEnabled: boolean;
  autonomyInterval?: number;
  accentColor?: string;
  activeLocalModel?: string;
  secureBoot: boolean;
  cpuSpeed: number;
  primaryBootDevice: 'VFS' | 'CLOUD' | 'GGUF';
  daemonInjected?: boolean;
}

export interface ScreensaverConfig {
  enabled: boolean;
  minutes: number;
  type: 'default' | 'ai';
  code?: string;
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetId?: string;
  targetType: 'desktop' | 'text' | 'window' | 'icon' | 'taskbar' | 'taskbar-icon' | 'background' | 'app-icon';
  filePath?: string;
  appId?: string;
  textSelection?: string;
  textElement?: HTMLTextAreaElement | HTMLInputElement;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'system' | 'warning';
  timestamp: number;
}

export type MemoryCategory = 'episodic' | 'semantic' | 'system';

export interface MemoryEntry {
  id: string;
  timestamp: number;
  content: string;
  tags: string[];
  embeddingVector: number[];
  category?: MemoryCategory;
  importance?: number;
  score?: number;
}

export interface DaemonNode {
  id: string;
  label: string;
  type: 'concept' | 'action' | 'modifier' | 'object';
  connections: string[];
  weight: number;
}

export interface DaemonGraph {
  nodes: Record<string, DaemonNode>;
}

export interface PipelineStep {
  id: 'analysis' | 'architecting' | 'coding' | 'manifesting' | 'verifying' | 'deploying';
  label: string;
  status: 'pending' | 'active' | 'complete' | 'failed';
}

// --- HYPER IDE EXTENSION SYSTEM ---
export interface HyperCommand {
  id: string;
  title: string;
  action: () => void;
}

export interface HyperExtension {
  id: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
  logic: string;
  commands: HyperCommand[];
}

declare global {
  interface Window {
    electron?: {
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
      invoke: (channel: string, data?: any) => Promise<any>;
    };
    puter: {
      ai: {
        chat: (prompt: string, options?: any) => Promise<any>;
        txt2img: (prompt: string) => Promise<any>;
      };
    };
  }
}

declare global {
  function uuid(): string;
}
