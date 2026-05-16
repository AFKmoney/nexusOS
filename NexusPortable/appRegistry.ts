import type { MobileApp } from './types';

import MobileTerminal from './apps/MobileTerminal';
import MobileDaemonChat from './apps/MobileDaemonChat';
import MobileNotepad from './apps/MobileNotepad';
import MobileFileExplorer from './apps/MobileFileExplorer';
import MobileSettings from './apps/MobileSettings';
import MobileDashboard from './apps/MobileDashboard';
import MobileCalculator from './apps/MobileCalculator';
import MobileCalendar from './apps/MobileCalendar';
import MobileBrowser from './apps/MobileWebRunner';
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
import MobilePasswordManager from './apps/MobileSilenceApp';
import MobileModelManager from './apps/MobileModelManager';
import MobileAionAgent from './apps/MobileAionAgent';
import MobileNeuralForge from './apps/MobileNeuralForge';
import MobileGovernanceDashboardApp from './apps/MobileGovernanceDashboardApp';
import MobileNFRApp from './apps/MobileNFRApp';
import MobileFractalVisualizerApp from './apps/MobileFractalVisualizerApp';
import MobileMonitorApp from './apps/MobileMonitorApp';
import MobileUbuntuTerminalApp from './apps/MobileUbuntuTerminalApp';
import MobileWallpaperApp from './apps/MobileWallpaperApp';
import MobileFilePropertiesApp from './apps/MobileFilePropertiesApp';
import MobileTaskManagerApp from './apps/MobileTaskManagerApp';
import MobileDeviceManagerApp from './apps/MobileDeviceManagerApp';
import MobileNativeZipApp from './apps/MobileNativeZipApp';
import MobileRecycleBinApp from './apps/MobileRecycleBinApp';
import MobileNotificationCenterApp from './apps/MobileNotificationCenterApp';
import MobileImageViewerApp from './apps/MobileImageViewerApp';
import MobileRichEditorApp from './apps/MobileRichEditorApp';
import MobileDaemonJournalApp from './apps/MobileDaemonJournalApp';
import MobilePaintApp from './apps/MobilePaintApp';
import MobileVideoPlayerApp from './apps/MobileVideoPlayerApp';
import MobileSnippetsApp from './apps/MobileSnippetsApp';
import MobileRSSReaderApp from './apps/MobileRSSReaderApp';
import MobileAccessibilityPanel from './apps/MobileAccessibilityPanel';
import MobileScreenshotToolApp from './apps/MobileScreenshotToolApp';

import { 
  Terminal, Cpu, FileText, FolderOpen, Settings, BarChart2,
  Calculator, Calendar, Globe, Cloud, Music, LayoutGrid, Mic,
  Users, Timer, FileCode, ShoppingBag, Shield, Zap,
  Sparkles, Code2, Pencil, Activity, Monitor, Clipboard, Brain, Bot,
  Lock, Layers, Network, Command, Image, Database, MonitorDot, Server, FileArchive, Trash2, Bell, Pen, BookOpen, Palette, Video, Rss, Accessibility, Camera } from 'lucide-react';

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
    description: 'Quick notes editor',
  },
  {
    id: 'explorer',
    name: 'Files',
    icon: FolderOpen,
    iconBg: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
    component: MobileFileExplorer,
    description: 'VFS browser',
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
    description: 'System metrics',
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
    description: 'Events & schedule',
  },
  {
    id: 'browser',
    name: 'Browser',
    icon: Globe,
    iconBg: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
    component: MobileBrowser,
    description: 'Neural web browser',
  },
  {
    id: 'weather',
    name: 'Weather',
    icon: Cloud,
    iconBg: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
    component: MobileWeather,
    description: 'Global forecast',
  },
  {
    id: 'music',
    name: 'Music',
    icon: Music,
    iconBg: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
    component: MobileMusic,
    description: 'Neural audio engine',
  },
  {
    id: 'kanban',
    name: 'Kanban',
    icon: LayoutGrid,
    iconBg: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)',
    component: MobileKanban,
    description: 'Task board',
  },
  {
    id: 'voice',
    name: 'Recorder',
    icon: Mic,
    iconBg: 'linear-gradient(135deg, #be123c 0%, #f43f5e 100%)',
    component: MobileVoiceRecorder,
    description: 'Neural voice capture',
  },
  {
    id: 'contacts',
    name: 'Contacts',
    icon: Users,
    iconBg: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
    component: MobileContacts,
    description: 'Identity network',
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro',
    icon: Timer,
    iconBg: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
    component: MobilePomodoro,
    description: 'Focus matrix',
  },
  {
    id: 'markdown',
    name: 'Markdown',
    icon: FileCode,
    iconBg: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
    component: MobileMarkdown,
    description: 'Pro content editor',
  },
  {
    id: 'appstore',
    name: 'App Store',
    icon: ShoppingBag,
    iconBg: 'linear-gradient(135deg, #0891b2 0%, #10b981 100%)',
    component: MobileAppStore,
    description: 'Neural app node',
  },
  {
    id: 'welcome',
    name: 'Welcome',
    icon: Sparkles,
    iconBg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    component: MobileWelcome,
    description: 'Onboarding',
  },
  {
    id: 'hyperide',
    name: 'HyperIDE',
    icon: Code2,
    iconBg: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
    component: MobileHyperIDE,
    description: 'Mobile code engine',
  },
  {
    id: 'sticky_notes',
    name: 'Sticky Notes',
    icon: Pencil,
    iconBg: 'linear-gradient(135deg, #a16207 0%, #ca8a04 100%)',
    component: MobileStickyNotes,
    description: 'Quick memory notes',
  },
  {
    id: 'habits',
    name: 'Habits',
    icon: Activity,
    iconBg: 'linear-gradient(135deg, #0e7490 0%, #0891b2 100%)',
    component: MobileHabitTracker,
    description: 'Biometric routine',
  },
  {
    id: 'sysinfo',
    name: 'System Info',
    icon: Monitor,
    iconBg: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
    component: MobileSystemInfo,
    description: 'Core telemetry',
  },
  {
    id: 'clipboard',
    name: 'Clipboard',
    icon: Clipboard,
    iconBg: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
    component: MobileClipboardManager,
    description: 'Buffer history',
  },
  {
    id: 'silence',
    name: 'Cipher Vault',
    icon: Shield,
    iconBg: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
    component: MobilePasswordManager,
    description: 'Encrypted storage',
  },
  {
    id: 'model_manager',
    name: 'Models',
    icon: Brain,
    iconBg: 'linear-gradient(135deg, #92400e 0%, #d97706 100%)',
    component: MobileModelManager,
    description: 'LLM orchestrator',
  },
  {
    id: 'aion_agent',
    name: 'NEXUS.PRIME',
    icon: Bot,
    iconBg: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
    component: MobileAionAgent,
    description: 'Autonomous mission',
  },
  {
    id: 'forge',
    name: 'NeuralForge',
    icon: Zap,
    iconBg: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
    component: MobileNeuralForge,
    description: 'AI app builder',
  },
  {
    id: 'governance',
    name: 'Governance',
    icon: Lock,
    iconBg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    component: MobileGovernanceDashboardApp,
    description: 'Sovereign control',
  },
  {
    id: 'nfr',
    name: 'NFR Compressor',
    icon: Layers,
    iconBg: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
    component: MobileNFRApp,
    description: 'Field reduction',
  },
  {
    id: 'fractal',
    name: 'Context Memory',
    icon: Network,
    iconBg: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
    component: MobileFractalVisualizerApp,
    description: 'Recursive memory',
  },
  {
    id: 'monitor',
    name: 'System Monitor',
    icon: Activity,
    iconBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    component: MobileMonitorApp,
    description: 'Real-time stats',
  },
  {
    id: 'ubuntu',
    name: 'Ubuntu',
    icon: Command,
    iconBg: 'linear-gradient(135deg, #e94e1b 0%, #f472b6 100%)',
    component: MobileUbuntuTerminalApp,
    description: 'Linux subsystem',
  },
  {
    id: 'wallpaper',
    name: 'Wallpaper Gen',
    icon: Image,
    iconBg: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    component: MobileWallpaperApp,
    description: 'AI 배경 builder',
  },
  {
    id: 'fileprops',
    name: 'Properties',
    icon: Database,
    iconBg: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
    component: MobileFilePropertiesApp,
    description: 'File metadata',
  },
  {
    id: 'task_manager',
    name: 'Task Manager',
    icon: MonitorDot,
    iconBg: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
    component: MobileTaskManagerApp,
    description: 'Active processes',
  },
  {
    id: 'device_manager',
    name: 'Devices',
    icon: Server,
    iconBg: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
    component: MobileDeviceManagerApp,
    description: 'Hardware nodes',
  },
  {
    id: 'native_zip',
    name: 'Archiver',
    icon: FileArchive,
    iconBg: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
    component: MobileNativeZipApp,
    description: 'VFS compression',
  },
  {
    id: 'recycle_bin',
    name: 'Recycle Bin',
    icon: Trash2,
    iconBg: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
    component: MobileRecycleBinApp,
    description: 'Buffer purge',
  },
  {
    id: 'notifications',
    name: 'Notification',
    icon: Bell,
    iconBg: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    component: MobileNotificationCenterApp,
    description: 'Event hub',
  },
  {
    id: 'image_viewer',
    name: 'Gallery',
    icon: Image,
    iconBg: 'linear-gradient(135deg, #ec4899 0%, #be123c 100%)',
    component: MobileImageViewerApp,
    description: 'Visual media',
  },
  {
    id: 'rich_editor',
    name: 'Pro Editor',
    icon: Pen,
    iconBg: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)',
    component: MobileRichEditorApp,
    description: 'Rich text node',
  },
  {
    id: 'daemon_journal',
    name: 'Journal',
    icon: BookOpen,
    iconBg: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    component: MobileDaemonJournalApp,
    description: 'Neural logs',
  },
  {
    id: 'paint',
    name: 'Paint',
    icon: Palette,
    iconBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    component: MobilePaintApp,
    description: 'Creative canvas',
  },
  {
    id: 'video_player',
    name: 'Video',
    icon: Video,
    iconBg: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
    component: MobileVideoPlayerApp,
    description: 'Media playback',
  },
  {
    id: 'snippets',
    name: 'Snippets',
    icon: FileCode,
    iconBg: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
    component: MobileSnippetsApp,
    description: 'Code snippets',
  },
  {
    id: 'rss',
    name: 'RSS Feed',
    icon: Rss,
    iconBg: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
    component: MobileRSSReaderApp,
    description: 'Global streams',
  },
  {
    id: 'accessibility',
    name: 'Access',
    icon: Accessibility,
    iconBg: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
    component: MobileAccessibilityPanel,
    description: 'Inclusion settings',
  },
  {
    id: 'screenshot',
    name: 'Capture',
    icon: Camera,
    iconBg: 'linear-gradient(135deg, #374151 0%, #111827 100%)',
    component: MobileScreenshotToolApp,
    description: 'Visual snapshot',
  },
];

export function getApp(id: string): MobileApp | undefined {
  return MOBILE_APPS.find(a => a.id === id);
}
