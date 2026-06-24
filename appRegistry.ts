import { lazy } from 'react';
import { AppManifest } from './types';

// System Apps
const TerminalApp = lazy(() => import('./apps/Terminal'));
const NotepadApp = lazy(() => import('./apps/Notepad'));
const MonitorApp = lazy(() => import('./apps/SystemMonitor'));
const AppStoreApp = lazy(() => import('./apps/AppStore'));
const NexusPrimeApp = lazy(() => import('./apps/AionAgent'));
const NeuralForgeApp = lazy(() => import('./apps/NeuralForge'));
const FileExplorerApp = lazy(() => import('./apps/FileExplorer'));
const NetRunnerApp = lazy(() => import('./apps/NetRunner'));
const WallpaperApp = lazy(() => import('./apps/WallpaperGen'));
const FilePropertiesApp = lazy(() => import('./apps/FileProperties'));
const SilenceApp = lazy(() => import('./apps/Silence'));
const HyperIDEApp = lazy(() => import('./apps/HyperIDE'));
const UbuntuTerminalApp = lazy(() => import('./apps/UbuntuTerminal'));
const SettingsApp = lazy(() => import('./apps/Settings'));
const ModelManagerApp = lazy(() => import('./apps/ModelManager'));
const NFRApp = lazy(() => import('./apps/NFRCompressor'));
const DaemonChatApp = lazy(() => import('./apps/DaemonChat'));
const WebRunnerApp = lazy(() => import('./apps/WebRunner'));
const DashboardApp = lazy(() => import('./apps/Dashboard'));
const DaemonJournalApp = lazy(() => import('./apps/DaemonJournal'));
const WelcomeApp = lazy(() => import('./apps/WelcomeApp'));

// ── NEW APPS (BATCH 1) ────────────────────────────────────────────────────────
const PaintApp = lazy(() => import('./apps/PaintApp'));
const VideoPlayerApp = lazy(() => import('./apps/VideoPlayer'));
const WeatherApp = lazy(() => import('./apps/WeatherApp'));
const SystemInfoApp = lazy(() => import('./apps/SystemInfo'));
const SnippetsApp = lazy(() => import('./apps/SnippetsApp'));
const ContactsApp = lazy(() => import('./apps/ContactsApp'));
const PomodoroApp = lazy(() => import('./apps/PomodoroApp'));
const KanbanApp = lazy(() => import('./apps/KanbanApp'));

// ── NEW APPS (BATCH 2 & EXTRAS) ───────────────────────────────────────────────
const PasswordManagerApp = lazy(() => import('./apps/PasswordManager'));
const VoiceRecorderApp = lazy(() => import('./apps/VoiceRecorder'));
const MarkdownPreviewApp = lazy(() => import('./apps/MarkdownPreview'));
const RSSReaderApp = lazy(() => import('./apps/RSSReader'));
const AccessibilityPanel = lazy(() => import('./apps/AccessibilityPanel'));
const HabitTrackerApp = lazy(() => import('./apps/HabitTracker'));
const ScreenshotToolApp = lazy(() => import('./apps/ScreenshotTool'));
const FractalVisualizerApp = lazy(() => import('./apps/FractalVisualizer'));

const TaskManagerApp = lazy(() => import('./apps/TaskManager'));
const DeviceManagerApp = lazy(() => import('./apps/DeviceManagerApp'));
const NativeZipApp = lazy(() => import('./apps/NativeZipApp'));
const RecycleBinApp = lazy(() => import('./apps/RecycleBinApp'));
const NotificationCenterApp = lazy(() => import('./apps/NotificationCenter'));
const ClipboardManagerApp = lazy(() => import('./apps/ClipboardManager'));
const StickyNotesApp = lazy(() => import('./apps/StickyNotes'));
const CalculatorProApp = lazy(() => import('./apps/CalculatorPro'));
const CalendarApp = lazy(() => import('./apps/CalendarApp'));
const ImageViewerApp = lazy(() => import('./apps/ImageViewer'));
const MusicPlayerApp = lazy(() => import('./apps/MusicPlayer'));
const RichEditorApp = lazy(() => import('./apps/RichEditor'));
const GovernanceDashboardApp = lazy(() => import('./apps/GovernanceDashboard'));

import {
  Terminal, FileText, Activity, Grid, Image, Cpu, FolderOpen, Globe,
  Settings, Lock, ShieldCheck, Code, Command, Database, Layers,
  Brain, Sliders, Zap, BarChart2, BookOpen, Network,
  Clipboard, Bell, StickyNote, Calculator, Calendar, Music, Pen,
  Search, MonitorDot, Trash2, Server, FileArchive,
  Palette, Video, Cloud, Info, FileCode, Users, Timer, LayoutGrid, 
  Key, Mic, Rss, Accessibility, Target, Camera
} from 'lucide-react';

export const CORE_APP_IDS = ['welcome', 'dashboard', 'explorer', 'terminal', 'notepad', 'settings', 'netrunner'] as const;

export const SYSTEM_APPS: AppManifest[] = [
  // ── Dashboard ──────────────────────────────────────────────────────────────
  {
    id: 'welcome',
    name: 'Welcome',
    icon: Zap,
    component: WelcomeApp,
    permissions: [],
    defaultSize: { width: 750, height: 550 },
    description: 'Interactive introduction to the DAEMON OS environment.'
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: BarChart2,
    component: DashboardApp,
    permissions: [],
    defaultSize: { width: 700, height: 580 },
    description: 'OS overview — model status, DAEMON metrics, tools, and autonomy feed.'
  },
  // ── Core Tools ──────────────────────────────────────────────────────────────
  {
    id: 'hyperide',
    name: 'HyperIDE',
    icon: Code,
    component: HyperIDEApp,
    permissions: ['vfs.read', 'vfs.write', 'network', 'kernel.modify'],
    defaultSize: { width: 1100, height: 720 },
    description: 'Advanced IDE with AI assistance, syntax highlighting, and live preview.'
  },
  { 
    id: 'terminal',
    name: 'Terminal',
    icon: Terminal,
    component: TerminalApp, 
    permissions: ['vfs.read', 'vfs.write', 'kernel.modify'],
    defaultSize: { width: 700, height: 480 },
    description: 'Neural shell with AI fallback and full system control.'
  },
  {
    id: 'explorer',
    name: 'File Explorer',
    icon: FolderOpen,
    component: FileExplorerApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 800, height: 560 },
    description: 'Smart file browser with semantic search and AI organization.'
  },
  {
    id: 'forge',
    name: 'Neural Forge',
    icon: Cpu,
    component: NeuralForgeApp,
    permissions: ['vfs.write', 'network'],
    defaultSize: { width: 900, height: 680 },
    description: 'AI application generator. Build apps instantly via natural language.'
  },

  // ── AI & Intelligence ─────────────────────────────────────────────────────
  {
    id: 'daemon_chat',
    name: 'DAEMON Core',
    icon: Zap,
    component: DaemonChatApp,
    permissions: ['network', 'kernel.modify'],
    defaultSize: { width: 760, height: 620 },
    description: 'Direct neural link to DAEMON AI. Strategic analysis and coding.'
  },
  {
    id: 'governance',
    name: 'Governance',
    icon: Lock,
    component: GovernanceDashboardApp,
    permissions: ['kernel.modify'],
    defaultSize: { width: 780, height: 640 },
    description: 'Inspect pending proposals, audit logs, health metrics, staged artifacts, and trust tiers. Activate the kill switch.'
  },
  {
    id: 'aion_agent',
    name: 'NEXUS.PRIME',
    icon: ShieldCheck,
    component: NexusPrimeApp,
    permissions: ['vfs.read', 'vfs.write', 'kernel.modify', 'network'],
    defaultSize: { width: 680, height: 560 },
    description: 'Primary AI interface for general tasks and system assistance.'
  },
  {
    id: 'model_manager',
    name: 'Model Manager',
    icon: Brain,
    component: ModelManagerApp,
    permissions: ['network', 'kernel.modify'],
    defaultSize: { width: 760, height: 620 },
    description: 'Manage GGUF models and HuggingFace integration.'
  },
  {
    id: 'nfr',
    name: 'NFR Compressor',
    icon: Layers,
    component: NFRApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 800, height: 600 },
    description: 'Neural Fractal Reconstruction engine for extreme data compression.'
  },
  {
    id: 'fractal',
    name: 'Context Memory',
    icon: Network,
    component: FractalVisualizerApp,
    permissions: [],
    defaultSize: { width: 800, height: 600 },
    description: 'Interactive visualization of the DAEMON knowledge graph.'
  },

  // ── System & Network ─────────────────────────────────────────────────────
  {
    id: 'netrunner',
    name: 'NetRunner',
    icon: Globe,
    component: NetRunnerApp,
    permissions: ['vfs.read', 'network'],
    defaultSize: { width: 1000, height: 700 },
    description: 'AI-augmented browser with autonomous research agents.'
  },
  {
    id: 'monitor',
    name: 'System Monitor',
    icon: Activity,
    component: MonitorApp,
    permissions: ['kernel.modify'],
    defaultSize: { width: 760, height: 560 },
    description: 'Real-time monitoring of CPU, memory, and neural loads.'
  },
  { 
    id: 'ubuntu',
    name: 'Ubuntu Subsystem',
    icon: Command,
    component: UbuntuTerminalApp,
    permissions: ['network'],
    defaultSize: { width: 800, height: 600 },
    description: 'Virtualized Ubuntu environment for Linux workflows.'
  },

  // ── Utilities & Security ──────────────────────────────────────────────────
  {
    id: 'silence', 
    name: 'Cipher Vault',
    icon: Lock,
    component: SilenceApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 720, height: 580 },
    description: 'End-to-end encrypted storage for sensitive data.'
  },
  {
    id: 'appstore',
    name: 'App Store',
    icon: Grid,
    component: AppStoreApp,
    permissions: ['network'],
    defaultSize: { width: 860, height: 640 },
    description: 'Discover and install curated OS extensions.'
  },
  {
    id: 'notepad',
    name: 'Notepad',
    icon: FileText,
    component: NotepadApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 600, height: 480 },
    description: 'Lightweight text editor for rapid documentation.'
  },
  {
    id: 'wallpaper',
    name: 'Wallpaper Gen',
    icon: Image,
    component: WallpaperApp,
    permissions: ['kernel.modify'],
    defaultSize: { width: 900, height: 640 },
    description: 'Generative AI engine for system backgrounds.'
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    component: SettingsApp,
    permissions: ['kernel.modify'],
    defaultSize: { width: 760, height: 580 },
    description: 'Configure AI models, UI theme, and system security.'
  },
  {
    id: 'fileprops',
    name: 'Properties',
    icon: Database,
    component: FilePropertiesApp,
    permissions: ['vfs.read'],
    defaultSize: { width: 400, height: 500 },
    description: 'Detailed file metadata and neural tags.'
  },
  {
    id: 'web_runner',
    name: 'Web Runner', 
    icon: Globe,
    component: WebRunnerApp,
    permissions: ['network'],
    defaultSize: { width: 900, height: 600 },
    description: 'Sandboxed environment for web application execution.'
  },

  // ── Productivity ─────────────────────────────────────────────────────────
  {
    id: 'task_manager',
    name: 'Task Manager',
    icon: MonitorDot,
    component: TaskManagerApp,
    permissions: ['kernel.modify'],
    defaultSize: { width: 780, height: 480 },
    description: 'Process management and resource allocation control.'
  },
  {
    id: 'device_manager',
    name: 'Device Manager',
    icon: Server,
    component: DeviceManagerApp,
    permissions: [],
    defaultSize: { width: 700, height: 500 },
    description: 'Hardware interface and IPC monitoring.'
  }, 
  {
    id: 'native_zip',
    name: 'Archiver',
    icon: FileArchive,
    component: NativeZipApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 600, height: 450 },
    description: 'High-speed archive compression and extraction.'
  },
  {
    id: 'recycle_bin',
    name: 'Recycle Bin',
    icon: Trash2,
    component: RecycleBinApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 700, height: 500 },
    description: 'Recovery system for deleted neural segments.'
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: Bell,
    component: NotificationCenterApp,
    permissions: [],
    defaultSize: { width: 420, height: 560 },
    description: 'System-wide event log and AI alerts.' 
  },
  {
    id: 'clipboard',
    name: 'Clipboard',
    icon: Clipboard,
    component: ClipboardManagerApp,
    permissions: [],
    defaultSize: { width: 500, height: 520 },
    description: 'Persistent clipboard history with semantic indexing.'
  }, 
  {
    id: 'sticky_notes',
    name: 'Sticky Notes',
    icon: StickyNote,
    component: StickyNotesApp,
    permissions: [],
    defaultSize: { width: 600, height: 500 },
    description: 'Draggable persistent notes for quick reference.'
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: Calculator,
    component: CalculatorProApp,
    permissions: [],
    defaultSize: { width: 560, height: 560 },
    description: 'Scientific computation engine with history.'
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: Calendar,
    component: CalendarApp,
    permissions: [],
    defaultSize: { width: 640, height: 480 },
    description: 'Neural event scheduling and time management.'
  },
  {
    id: 'image_viewer',
    name: 'Gallery',
    icon: Image,
    component: ImageViewerApp,
    permissions: ['vfs.read'],
    defaultSize: { width: 720, height: 560 },
    description: 'High-performance visual artifact browser.'
  },
  {
    id: 'music',
    name: 'Music Player',
    icon: Music,
    component: MusicPlayerApp,
    permissions: [],
    defaultSize: { width: 700, height: 520 },
    description: 'Audio playback engine with neural visualizer.'
  },
  {
    id: 'rich_editor',
    name: 'Rich Editor',
    icon: Pen,
    component: RichEditorApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 800, height: 600 },
    description: 'WYSIWYG document architect with HTML export.'
  },
  {
    id: 'daemon_journal',
    name: 'DAEMON Journal',
    icon: BookOpen,
    component: DaemonJournalApp,
    permissions: ['vfs.read'],
    defaultSize: { width: 600, height: 480 },
    description: 'Access the persistent memory logs of the DAEMON entity.'
  },
  
  // ── Multimedia & Apps ──────────────────────────────────────────────────────
  {
    id: 'paint',
    name: 'Paint',
    icon: Palette,
    component: PaintApp,
    permissions: [],
    defaultSize: { width: 800, height: 600 }, 
    description: 'Creative canvas for visual construction.'
  },
  {
    id: 'video_player',
    name: 'Video Player',
    icon: Video,
    component: VideoPlayerApp,
    permissions: ['vfs.read'],
    defaultSize: { width: 720, height: 480 },
    description: 'Media playback for localized video streams.'
  },
  {
    id: 'weather',
    name: 'Weather',
    icon: Cloud,
    component: WeatherApp,
    permissions: ['network'],
    defaultSize: { width: 400, height: 500 },
    description: 'Meteorological data for global node coordinates.'
  },
  {
    id: 'sysinfo',
    name: 'System Info',
    icon: Info,
    component: SystemInfoApp,
    permissions: [],
    defaultSize: { width: 500, height: 400 },
    description: 'Diagnostic hardware and kernel reporting.'
  },
  {
    id: 'snippets',
    name: 'Snippets',
    icon: FileCode,
    component: SnippetsApp,
    permissions: [],
    defaultSize: { width: 640, height: 500 },
    description: 'Code repository for recurring neural patterns.'
  },
  {
    id: 'contacts',
    name: 'Contacts',
    icon: Users,
    component: ContactsApp,
    permissions: [],
    defaultSize: { width: 700, height: 500 },
    description: 'Address book for network node participants.'
  },
  {
    id: 'pomodoro', 
    name: 'Pomodoro',
    icon: Timer,
    component: PomodoroApp,
    permissions: [],
    defaultSize: { width: 420, height: 520 },
    description: 'Focus management timer for peak productivity.'
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    icon: LayoutGrid,
    component: KanbanApp,
    permissions: [],
    defaultSize: { width: 900, height: 600 },
    description: 'Project management via semantic card stacks.'
  },
  {
    id: 'vault',
    name: 'Vault',
    icon: Key,
    component: PasswordManagerApp,
    permissions: [],
    defaultSize: { width: 700, height: 500 },
    description: 'Secure credential manager and identity vault.'
  },
  {
    id: 'voice_recorder',
    name: 'Voice Recorder',
    icon: Mic,
    component: VoiceRecorderApp,
    permissions: ['network'],
    defaultSize: { width: 400, height: 500 },
    description: 'Audio capture and neural voice logging.'
  },
  {
    id: 'markdown',
    name: 'MD Preview',
    icon: FileText,
    component: MarkdownPreviewApp,
    permissions: [],
    defaultSize: { width: 800, height: 600 },
    description: 'Real-time Markdown rendering engine.'
  },
  {
    id: 'rss',
    name: 'RSS Feed',
    icon: Rss,
    component: RSSReaderApp,
    permissions: ['network'],
    defaultSize: { width: 800, height: 600 },
    description: 'Decentralized news stream aggregator.'
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    icon: Accessibility,
    component: AccessibilityPanel,
    permissions: ['kernel.modify'],
    defaultSize: { width: 400, height: 500 },
    description: 'Interface scaling and visual adjustment protocols.'
  },
  {
    id: 'habits',
    name: 'Habit Tracker',
    icon: Target,
    component: HabitTrackerApp,
    permissions: [],
    defaultSize: { width: 640, height: 500 },
    description: 'Daily protocol monitoring and streak tracking.'
  },
  {
    id: 'screenshot',
    name: 'Screenshot',
    icon: Camera,
    component: ScreenshotToolApp,
    permissions: [],
    defaultSize: { width: 600, height: 400 },
    description: 'Capture visual states of the NexusOS environment.'
  }
];