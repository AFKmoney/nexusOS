import type { MobileApp } from './types';

import MobileTerminal from './apps/MobileTerminal';
import MobileDaemonChat from './apps/MobileDaemonChat';
import MobileNotepad from './apps/MobileNotepad';
import MobileFileExplorer from './apps/MobileFileExplorer';
import MobileSettings from './apps/MobileSettings';
import MobileDashboard from './apps/MobileDashboard';
import MobileCalculator from './apps/MobileCalculator';
import MobileCalendar from './apps/MobileCalendar';
import MobileBrowser from './apps/MobileBrowser';
import MobileWeather from './apps/MobileWeather';
import MobileMusic from './apps/MobileMusic';
import MobileKanban from './apps/MobileKanban';
import MobileVoiceRecorder from './apps/MobileVoiceRecorder';
import MobileContacts from './apps/MobileContacts';
import MobilePomodoro from './apps/MobilePomodoro';
import MobileMarkdown from './apps/MobileMarkdown';
import MobileAppStore from './apps/MobileAppStore';
import MobileWelcome from './apps/MobileWelcome';
import MobileHyperIDE from './apps/MobileHyperIDE';
import MobileStickyNotes from './apps/MobileStickyNotes';
import MobileHabitTracker from './apps/MobileHabitTracker';
import MobileSystemInfo from './apps/MobileSystemInfo';
import MobileClipboardManager from './apps/MobileClipboardManager';
import MobilePasswordManager from './apps/MobilePasswordManager';
import MobileModelManager from './apps/MobileModelManager';
import MobileAionAgent from './apps/MobileAionAgent';
import MobileNeuralForge from './apps/MobileNeuralForge';

import {
  Terminal, Cpu, FileText, FolderOpen, Settings, BarChart2,
  Calculator, Calendar, Globe, Cloud, Music, LayoutGrid, Mic,
  Users, Timer, FileCode, ShoppingBag, Shield, Zap,
  Sparkles, Code2, Pencil, Activity, Monitor, Clipboard, Brain, Bot,
} from 'lucide-react';

export const MOBILE_APPS: MobileApp[] = [
  {
    id: 'terminal',
    name: 'Terminal',
    icon: Terminal,
    iconBg: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
    component: MobileTerminal,
    description: 'Unix shell emulator',
  },
  {
    id: 'daemon_chat',
    name: 'DAEMON',
    icon: Cpu,
    iconBg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    component: MobileDaemonChat,
    description: 'Neural AI assistant',
  },
  {
    id: 'notepad',
    name: 'Notes',
    icon: FileText,
    iconBg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    component: MobileNotepad,
    description: 'Quick notes and text editor',
  },
  {
    id: 'explorer',
    name: 'Files',
    icon: FolderOpen,
    iconBg: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
    component: MobileFileExplorer,
    description: 'Virtual file system browser',
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    iconBg: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
    component: MobileSettings,
    description: 'System configuration',
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: BarChart2,
    iconBg: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    component: MobileDashboard,
    description: 'System metrics and DAEMON status',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: Calculator,
    iconBg: 'linear-gradient(135deg, #374151 0%, #6b7280 100%)',
    component: MobileCalculator,
    description: 'Scientific calculator',
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: Calendar,
    iconBg: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    component: MobileCalendar,
    description: 'Events and scheduling',
  },
  {
    id: 'browser',
    name: 'Browser',
    icon: Globe,
    iconBg: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
    component: MobileBrowser,
    description: 'Web browser',
  },
  {
    id: 'weather',
    name: 'Weather',
    icon: Cloud,
    iconBg: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
    component: MobileWeather,
    description: 'Weather forecast',
  },
  {
    id: 'music',
    name: 'Music',
    icon: Music,
    iconBg: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
    component: MobileMusic,
    description: 'Music player',
  },
  {
    id: 'kanban',
    name: 'Kanban',
    icon: LayoutGrid,
    iconBg: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)',
    component: MobileKanban,
    description: 'Task management board',
  },
  {
    id: 'voice',
    name: 'Recorder',
    icon: Mic,
    iconBg: 'linear-gradient(135deg, #be123c 0%, #f43f5e 100%)',
    component: MobileVoiceRecorder,
    description: 'Voice recorder',
  },
  {
    id: 'contacts',
    name: 'Contacts',
    icon: Users,
    iconBg: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
    component: MobileContacts,
    description: 'Address book',
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro',
    icon: Timer,
    iconBg: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
    component: MobilePomodoro,
    description: 'Focus timer',
  },
  {
    id: 'markdown',
    name: 'Markdown',
    icon: FileCode,
    iconBg: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
    component: MobileMarkdown,
    description: 'Markdown editor and viewer',
  },
  {
    id: 'appstore',
    name: 'App Store',
    icon: ShoppingBag,
    iconBg: 'linear-gradient(135deg, #0891b2 0%, #10b981 100%)',
    component: MobileAppStore,
    description: 'Discover and install apps',
  },
  {
    id: 'welcome',
    name: 'Welcome',
    icon: Sparkles,
    iconBg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    component: MobileWelcome,
    description: 'NexusOS onboarding and introduction',
  },
  {
    id: 'hyperide',
    name: 'HyperIDE',
    icon: Code2,
    iconBg: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
    component: MobileHyperIDE,
    description: 'Mobile code editor and runner',
  },
  {
    id: 'sticky_notes',
    name: 'Sticky Notes',
    icon: Pencil,
    iconBg: 'linear-gradient(135deg, #a16207 0%, #ca8a04 100%)',
    component: MobileStickyNotes,
    description: 'Quick sticky notes',
  },
  {
    id: 'habits',
    name: 'Habits',
    icon: Activity,
    iconBg: 'linear-gradient(135deg, #0e7490 0%, #0891b2 100%)',
    component: MobileHabitTracker,
    description: 'Habit tracker with streaks',
  },
  {
    id: 'sysinfo',
    name: 'System Info',
    icon: Monitor,
    iconBg: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
    component: MobileSystemInfo,
    description: 'Device and browser system info',
  },
  {
    id: 'clipboard',
    name: 'Clipboard',
    icon: Clipboard,
    iconBg: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
    component: MobileClipboardManager,
    description: 'Clipboard history manager',
  },
  {
    id: 'silence',
    name: 'Cipher Vault',
    icon: Shield,
    iconBg: 'linear-gradient(135deg, #3730a3 0%, #6366f1 100%)',
    component: MobilePasswordManager,
    description: 'Encrypted password manager',
  },
  {
    id: 'model_manager',
    name: 'Models',
    icon: Brain,
    iconBg: 'linear-gradient(135deg, #92400e 0%, #d97706 100%)',
    component: MobileModelManager,
    description: 'AI model selection and management',
  },
  {
    id: 'aion_agent',
    name: 'NEXUS.PRIME',
    icon: Bot,
    iconBg: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
    component: MobileAionAgent,
    description: 'Autonomous AI agent executor',
  },
  {
    id: 'forge',
    name: 'NeuralForge',
    icon: Zap,
    iconBg: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
    component: MobileNeuralForge,
    description: 'AI-powered app builder',
  },
];

export function getApp(id: string): MobileApp | undefined {
  return MOBILE_APPS.find(a => a.id === id);
}
