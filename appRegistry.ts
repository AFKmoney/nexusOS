
import { AppManifest } from './types.ts';

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

// ── NEW APPS (BATCH 1) ──────────────────────────────────────────────────────
import PaintApp from './apps/PaintApp';
import VideoPlayerApp from './apps/VideoPlayer';
import WeatherApp from './apps/WeatherApp';
import SystemInfoApp from './apps/SystemInfo';
import SnippetsApp from './apps/SnippetsApp';
import ContactsApp from './apps/ContactsApp';
import PomodoroApp from './apps/PomodoroApp';
import KanbanApp from './apps/KanbanApp';

// ── NEW APPS (BATCH 2 & EXTRAS) ───────────────────────────────────────────
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

export const SYSTEM_APPS: AppManifest[] = [
  // ── Dashboard ──────────────────────────────────────────────
  {
    id: 'welcome',
    name: 'DAEMON Intro',
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
  // ── Core Tools ──────────────────────────────────────────────
  {
    id: 'hyperide',
    name: 'HyperIDE',
    icon: Code,
    component: HyperIDEApp,
    permissions: ['vfs.read', 'vfs.write', 'network', 'kernel.modify'],
    defaultSize: { width: 1100, height: 720 },
    description: 'VS Code-style IDE with AI assistant, syntax highlighting, file tree, and live preview.'
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: Terminal,
    component: TerminalApp,
    permissions: ['vfs.read', 'vfs.write', 'kernel.modify'],
    defaultSize: { width: 700, height: 480 },
    description: 'Neural shell with AI fallback, command history, autocomplete, and OS control.'
  },
  {
    id: 'explorer',
    name: 'File Explorer',
    icon: FolderOpen,
    component: FileExplorerApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 800, height: 560 },
    description: 'Smart file browser with NLP search and AI auto-organization.'
  },
  {
    id: 'forge',
    name: 'Neural Forge',
    icon: Cpu,
    component: NeuralForgeApp,
    permissions: ['vfs.write', 'network'],
    defaultSize: { width: 900, height: 680 },
    description: 'AI app generator. Describe an app and DAEMON builds it instantly.'
  },

  // ── AI & Intelligence ────────────────────────────────────────
  {
    id: 'daemon_chat',
    name: 'DAEMON Core',
    icon: Zap,
    component: DaemonChatApp,
    permissions: ['network', 'kernel.modify'],
    defaultSize: { width: 760, height: 620 },
    description: 'Direct neural link to DAEMON AI. Chat, code, strategize — completely offline.'
  },
  {
    id: 'aion_agent',
    name: 'NEXUS.PRIME',
    icon: ShieldCheck,
    component: NexusPrimeApp,
    permissions: ['vfs.read', 'vfs.write', 'kernel.modify', 'network'],
    defaultSize: { width: 680, height: 560 },
    description: 'The primary AI chat interface. Talk directly to DAEMON.'
  },
  {
    id: 'model_manager',
    name: 'Model Manager',
    icon: Brain,
    component: ModelManagerApp,
    permissions: ['network', 'kernel.modify'],
    defaultSize: { width: 760, height: 620 },
    description: 'Browse, download, and switch GGUF models from HuggingFace.'
  },
  {
    id: 'nfr',
    name: 'NFR Compressor',
    icon: Layers,
    component: NFRApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 800, height: 600 },
    description: 'Neural Fractal Reconstruction compression engine. Chat with your archives.'
  },
  {
    id: 'fractal',
    name: 'Fractal Memory',
    icon: Network,
    component: FractalVisualizerApp,
    permissions: [],
    defaultSize: { width: 800, height: 600 },
    description: 'Real-time interactive graph of the DAEMON Neural Cortex.'
  },

  // ── System & Network ─────────────────────────────────────────
  {
    id: 'netrunner',
    name: 'NetRunner',
    icon: Globe,
    component: NetRunnerApp,
    permissions: ['vfs.read', 'network'],
    defaultSize: { width: 1000, height: 700 },
    description: 'AI-augmented browser with autonomous web agent and semantic snapshot.'
  },
  {
    id: 'monitor',
    name: 'System Monitor',
    icon: Activity,
    component: MonitorApp,
    permissions: ['kernel.modify'],
    defaultSize: { width: 760, height: 560 },
    description: 'Real-time CPU, memory, and neural process monitoring.'
  },
  {
    id: 'ubuntu',
    name: 'Ubuntu Terminal',
    icon: Command,
    component: UbuntuTerminalApp,
    permissions: ['network'],
    defaultSize: { width: 800, height: 600 },
    description: 'Ubuntu subsystem terminal emulator.'
  },

  // ── Utilities & Security ─────────────────────────────────────
  {
    id: 'silence',
    name: 'Cipher Vault',
    icon: Lock,
    component: SilenceApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 720, height: 580 },
    description: 'End-to-end encrypted password manager with AES-GCM.'
  },
  {
    id: 'appstore',
    name: 'App Store',
    icon: Grid,
    component: AppStoreApp,
    permissions: ['network'],
    defaultSize: { width: 860, height: 640 },
    description: 'Discover and install curated NexusOS applications.'
  },
  {
    id: 'notepad',
    name: 'Notepad',
    icon: FileText,
    component: NotepadApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 600, height: 480 },
    description: 'Simple text editor for quick notes and file viewing.'
  },
  {
    id: 'wallpaper',
    name: 'Wallpapers',
    icon: Image,
    component: WallpaperApp,
    permissions: ['kernel.modify'],
    defaultSize: { width: 720, height: 560 },
    description: 'AI wallpaper generator and preset manager.'
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    component: SettingsApp,
    permissions: ['kernel.modify'],
    defaultSize: { width: 760, height: 580 },
    description: 'Configure AI model, autonomy engine, appearance, and system.'
  },
  {
    id: 'fileprops',
    name: 'File Properties',
    icon: Database,
    component: FilePropertiesApp,
    permissions: ['vfs.read'],
    defaultSize: { width: 400, height: 500 },
  },
  {
    id: 'ubuntu_terminal',
    name: 'Linux Terminal',
    icon: Terminal,
    component: UbuntuTerminalApp,
    permissions: ['network'],
    defaultSize: { width: 800, height: 520 },
    description: 'Full Linux-like terminal environment with package simulation.'
  },
  {
    id: 'web_runner',
    name: 'Web Runner',
    icon: Globe,
    component: WebRunnerApp,
    permissions: ['network'],
    defaultSize: { width: 900, height: 600 },
    description: 'Sandboxed browser iframe for running web apps and sites.'
  },

  // ── NEW APPS ────────────────────────────────────────────────────────────
  {
    id: 'task_manager',
    name: 'Task Manager',
    icon: MonitorDot,
    component: TaskManagerApp,
    permissions: ['kernel.modify'],
    defaultSize: { width: 780, height: 480 },
    description: 'View and kill running processes. Monitor memory usage per app.'
  },
  {
    id: 'device_manager',
    name: 'Device Manager',
    icon: Server,
    component: DeviceManagerApp,
    permissions: [],
    defaultSize: { width: 700, height: 500 },
    description: 'Hardware monitor communicating with the physical host via IPC.'
  },
  {
    id: 'native_zip',
    name: 'Archive Extractor',
    icon: FileArchive,
    component: NativeZipApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 600, height: 450 },
    description: 'Native host ZIP extractor powered by PowerShell / Node IPC.'
  },
  {
    id: 'recycle_bin',
    name: 'Recycle Bin',
    icon: Trash2,
    component: RecycleBinApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 700, height: 500 },
    description: 'Restore deleted files or empty the trash to free space.'
  },
  {
    id: 'notifications',
    name: 'Notification Center',
    icon: Bell,
    component: NotificationCenterApp,
    permissions: [],
    defaultSize: { width: 420, height: 560 },
    description: 'Notification history with type filters and timestamps.'
  },
  {
    id: 'clipboard',
    name: 'Clipboard',
    icon: Clipboard,
    component: ClipboardManagerApp,
    permissions: [],
    defaultSize: { width: 400, height: 520 },
    description: 'Clipboard history with search, pin favorites, and one-click re-copy.'
  },
  {
    id: 'sticky_notes',
    name: 'Sticky Notes',
    icon: StickyNote,
    component: StickyNotesApp,
    permissions: [],
    defaultSize: { width: 600, height: 500 },
    description: 'Draggable sticky notes with colors and persistence.'
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: Calculator,
    component: CalculatorProApp,
    permissions: [],
    defaultSize: { width: 320, height: 520 },
    description: 'Scientific calculator with history, percent, and sign toggle.'
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: Calendar,
    component: CalendarApp,
    permissions: [],
    defaultSize: { width: 640, height: 480 },
    description: 'Monthly calendar with events, color coding, and time display.'
  },
  {
    id: 'image_viewer',
    name: 'Image Viewer',
    icon: Image,
    component: ImageViewerApp,
    permissions: ['vfs.read'],
    defaultSize: { width: 720, height: 560 },
    description: 'Image gallery with zoom, rotation, and thumbnail navigation.'
  },
  {
    id: 'music',
    name: 'Music Player',
    icon: Music,
    component: MusicPlayerApp,
    permissions: [],
    defaultSize: { width: 700, height: 520 },
    description: 'Audio player with visualizer, playlist, shuffle, repeat, and volume.'
  },
  {
    id: 'rich_editor',
    name: 'Rich Editor',
    icon: Pen,
    component: RichEditorApp,
    permissions: ['vfs.read', 'vfs.write'],
    defaultSize: { width: 800, height: 600 },
    description: 'WYSIWYG rich text editor with formatting toolbar and HTML export.'
  },
  {
    id: 'daemon_journal',
    name: 'DAEMON Journal',
    icon: BookOpen,
    component: DaemonJournalApp,
    permissions: ['vfs.read'],
    defaultSize: { width: 600, height: 480 },
    description: 'DAEMON memory journal — browse and search AI memory entries.'
  },
  
  // ── NEW: BATCH 1 & 2 ──────────────────────────────────────────────────
  {
    id: 'paint',
    name: 'Paint',
    icon: Palette,
    component: PaintApp,
    permissions: [],
    defaultSize: { width: 800, height: 600 },
    description: 'Canvas drawing program with brush, fill, and color picker.'
  },
  {
    id: 'video_player',
    name: 'Video Player',
    icon: Video,
    component: VideoPlayerApp,
    permissions: ['vfs.read'],
    defaultSize: { width: 720, height: 480 },
    description: 'Media player for local video files.'
  },
  {
    id: 'weather',
    name: 'Weather',
    icon: Cloud,
    component: WeatherApp,
    permissions: ['network'],
    defaultSize: { width: 400, height: 500 },
    description: 'Current weather conditions and 7-day forecast.'
  },
  {
    id: 'sysinfo',
    name: 'System Info',
    icon: Info,
    component: SystemInfoApp,
    permissions: [],
    defaultSize: { width: 500, height: 400 },
    description: 'Hardware, OS, and network diagnostic information.'
  },
  {
    id: 'snippets',
    name: 'Snippets',
    icon: FileCode,
    component: SnippetsApp,
    permissions: [],
    defaultSize: { width: 640, height: 500 },
    description: 'Code snippets manager with syntax tagging.'
  },
  {
    id: 'contacts',
    name: 'Contacts',
    icon: Users,
    component: ContactsApp,
    permissions: [],
    defaultSize: { width: 700, height: 500 },
    description: 'Address book and contact manager.'
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro',
    icon: Timer,
    component: PomodoroApp,
    permissions: [],
    defaultSize: { width: 340, height: 480 },
    description: 'Focus timer for productivity with custom intervals.'
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    icon: LayoutGrid,
    component: KanbanApp,
    permissions: [],
    defaultSize: { width: 900, height: 600 },
    description: 'Drag-and-drop project management board.'
  },
  {
    id: 'vault',
    name: 'Vault',
    icon: Key,
    component: PasswordManagerApp,
    permissions: [],
    defaultSize: { width: 700, height: 500 },
    description: 'Password manager and secure credentials vault.'
  },
  {
    id: 'voice_recorder',
    name: 'Voice Recorder',
    icon: Mic,
    component: VoiceRecorderApp,
    permissions: ['network'], // generic permission for mic access via browser
    defaultSize: { width: 400, height: 500 },
    description: 'Record, save, and export audio memos.'
  },
  {
    id: 'markdown',
    name: 'MD Preview',
    icon: FileText,
    component: MarkdownPreviewApp,
    permissions: [],
    defaultSize: { width: 800, height: 600 },
    description: 'Real-time markdown editor and HTML exporter.'
  },
  {
    id: 'rss',
    name: 'RSS Feed',
    icon: Rss,
    component: RSSReaderApp,
    permissions: ['network'],
    defaultSize: { width: 800, height: 600 },
    description: 'News feed aggregator for your favorite tech sites.'
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    icon: Accessibility,
    component: AccessibilityPanel,
    permissions: ['kernel.modify'],
    defaultSize: { width: 400, height: 500 },
    description: 'Configure UI scale, font size, and high contrast modes.'
  },
  {
    id: 'habits',
    name: 'Habit Tracker',
    icon: Target,
    component: HabitTrackerApp,
    permissions: [],
    defaultSize: { width: 640, height: 500 },
    description: 'Track daily habits and maintain streaks.'
  },
  {
    id: 'screenshot',
    name: 'Screenshot',
    icon: Camera,
    component: ScreenshotToolApp,
    permissions: [],
    defaultSize: { width: 600, height: 400 },
    description: 'Capture, copy, and save screenshots of the OS.'
  }
];
