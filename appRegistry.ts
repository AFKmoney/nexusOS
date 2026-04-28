import { AppManifest } from './types';

// System Apps
import TerminalApp from './apps/Terminal';
import NotepadApp from './apps/Notepad';
import MonitorApp from './apps/SystemMonitor';
import AppStoreApp from './apps/AppStore';
import NexusPrimeApp from './apps/AionAgent';
import NeuralForgeApp from './apps/NeuralForge';
import FileExplorerApp from './apps/FileExplorer';
import NetRunnerApp from './apps/NetRunner';
import WallpaperApp from './apps/WallpaperGen';
import FilePropertiesApp from './apps/FileProperties';
import SilenceApp from './apps/Silence';
import HyperIDEApp from './apps/HyperIDE';
import UbuntuTerminalApp from './apps/UbuntuTerminal';
import SettingsApp from './apps/Settings';
import ModelManagerApp from './apps/ModelManager';
import NFRApp from './apps/NFRCompressor';
import DaemonChatApp from './apps/DaemonChat';
import WebRunnerApp from './apps/WebRunner';
import DashboardApp from './apps/Dashboard';
import DaemonJournalApp from './apps/DaemonJournal';
import WelcomeApp from './apps/WelcomeApp';

// ── NEW APPS (BATCH 1) ────────────────────────────────────────────────────────
import PaintApp from './apps/PaintApp';
import VideoPlayerApp from './apps/VideoPlayer';
import WeatherApp from './apps/WeatherApp';
import SystemInfoApp from './apps/SystemInfo';
import SnippetsApp from './apps/SnippetsApp';
import ContactsApp from './apps/ContactsApp';
import PomodoroApp from './apps/PomodoroApp';
import KanbanApp from './apps/KanbanApp';

// ── NEW APPS (BATCH 2 & EXTRAS) ───────────────────────────────────────────────
import PasswordManagerApp from './apps/PasswordManager';
import VoiceRecorderApp from './apps/VoiceRecorder';
import MarkdownPreviewApp from './apps/MarkdownPreview';
import RSSReaderApp from './apps/RSSReader';
import AccessibilityPanel from './apps/AccessibilityPanel';
import HabitTrackerApp from './apps/HabitTracker';
import ScreenshotToolApp from './apps/ScreenshotTool';
import FractalVisualizerApp from './apps/FractalVisualizer';

import TaskManagerApp from './apps/TaskManager';
import DeviceManagerApp from './apps/DeviceManagerApp';
import NativeZipApp from './apps/NativeZipApp';
import RecycleBinApp from './apps/RecycleBinApp';
import NotificationCenterApp from './apps/NotificationCenter';
import ClipboardManagerApp from './apps/ClipboardManager';
import StickyNotesApp from './apps/StickyNotes';
import CalculatorProApp from './apps/CalculatorPro';
import CalendarApp from './apps/CalendarApp';
import ImageViewerApp from './apps/ImageViewer';
import MusicPlayerApp from './apps/MusicPlayer';
import RichEditorApp from './apps/RichEditor';

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
    name: 'Fractal Memory',
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
    defaultSize: { width: 720, height: 560 },
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
    defaultSize: { width: 400, height: 520 },
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
    defaultSize: { width: 320, height: 520 },
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
    defaultSize: { width: 340, height: 480 },
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