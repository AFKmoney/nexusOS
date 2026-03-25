
import { AppManifest } from './types.ts';

/ / System Apps
import TerminalApp from './apps /Terminal';
import NotepadApp from './apps/No tepad';
import MonitorApp from './apps/System Monitor';
import AppStoreApp from './apps/App Store';
import NexusPrimeApp from './apps/Aio nAgent';
import NeuralForgeApp from './apps/N euralForge';
import FileExplorerApp from './a pps/FileExplorer';
import NetRunnerApp from ' ./apps/NetRunner';
import WallpaperApp from ' ./apps/WallpaperGen';
import FilePropertiesAp p from './apps/FileProperties';
import Silenc eApp from './apps/Silence';
import HyperIDEAp p from './apps/HyperIDE';
import UbuntuTermin alApp from './apps/UbuntuTerminal';
import Se ttingsApp from './apps/Settings';
import Mode lManagerApp from './apps/ModelManager';
impor t NFRApp from './apps/NFRCompressor';
import  DaemonChatApp from './apps/DaemonChat';
impor t WebRunnerApp from './apps/WebRunner';
impor t DashboardApp from './apps/Dashboard';
impor t DaemonJournalApp from './apps/DaemonJournal ';
import WelcomeApp from './apps/WelcomeApp' ;

// ── NEW APPS (BATCH 1) ────� ��──────────────� ��──────────────� ��──────────────� ��────
import PaintApp from './apps/P aintApp';
import VideoPlayerApp from './apps/ VideoPlayer';
import WeatherApp from './apps/ WeatherApp';
import SystemInfoApp from './app s/SystemInfo';
import SnippetsApp from './app s/SnippetsApp';
import ContactsApp from './ap ps/ContactsApp';
import PomodoroApp from './a pps/PomodoroApp';
import KanbanApp from './ap ps/KanbanApp';

// ── NEW APPS (BATCH 2 &  EXTRAS) ──────────── ─────────────── ─────────────── ─
import PasswordManagerApp from './apps/Pa sswordManager';
import VoiceRecorderApp from  './apps/VoiceRecorder';
import MarkdownPrevie wApp from './apps/MarkdownPreview';
import RS SReaderApp from './apps/RSSReader';
import Ac cessibilityPanel from './apps/AccessibilityPa nel';
import HabitTrackerApp from './apps/Hab itTracker';
import ScreenshotToolApp from './ apps/ScreenshotTool';
import FractalVisualize rApp from './apps/FractalVisualizer';

import  TaskManagerApp from './apps/TaskManager';
im port DeviceManagerApp from './apps/DeviceMana gerApp';
import NativeZipApp from './apps/Nat iveZipApp';
import RecycleBinApp from './apps /RecycleBinApp';
import NotificationCenterApp  from './apps/NotificationCenter';
import Cli pboardManagerApp from './apps/ClipboardManage r';
import StickyNotesApp from './apps/Sticky Notes';
import CalculatorProApp from './apps/ CalculatorPro';
import CalendarApp from './ap ps/CalendarApp';
import ImageViewerApp from ' ./apps/ImageViewer';
import MusicPlayerApp fr om './apps/MusicPlayer';
import RichEditorApp  from './apps/RichEditor';

import {
  Termin al, FileText, Activity, Grid, Image, Cpu, Fol derOpen, Globe,
  Settings, Lock, ShieldCheck , Code, Command, Database, Layers,
  Brain, S liders, Zap, BarChart2, BookOpen, Network,
   Clipboard, Bell, StickyNote, Calculator, Cale ndar, Music, Pen,
  Search, MonitorDot, Trash 2, Server, FileArchive,
  Palette, Video, Clo ud, Info, FileCode, Users, Timer, LayoutGrid, 
  Key, Mic, Rss, Accessibility, Target, Came ra
} from 'lucide-react';

export const SYSTE M_APPS: AppManifest[] = [
  // ── Dashboa rd ────────────── ─────────────── ─────────────── ──
  {
    id: 'welcome',
    name: 'DAEM ON Intro',
    icon: Zap,
    component: Welc omeApp,
    permissions: [],
    defaultSize:  { width: 750, height: 550 },
    description : 'Interactive introduction to the DAEMON OS  environment.'
  },
  {
    id: 'dashboard',
     name: 'Dashboard',
    icon: BarChart2,
     component: DashboardApp,
    permissions: [ ],
    defaultSize: { width: 700, height: 580  },
    description: 'OS overview — model s tatus, DAEMON metrics, tools, and autonomy fe ed.'
  },
  // ── Core Tools ──── ─────────────── ─────────────── ────────────
  {
     id: 'hyperide',
    name: 'HyperIDE',
    ico n: Code,
    component: HyperIDEApp,
    perm issions: ['vfs.read', 'vfs.write', 'network',  'kernel.modify'],
    defaultSize: { width:  1100, height: 720 },
    description: 'VS Cod e-style IDE with AI assistant, syntax highlig hting, file tree, and live preview.'
  },
  { 
    id: 'terminal',
    name: 'Terminal',
     icon: Terminal,
    component: TerminalApp, 
    permissions: ['vfs.read', 'vfs.write', ' kernel.modify'],
    defaultSize: { width: 70 0, height: 480 },
    description: 'Neural sh ell with AI fallback, command history, autoco mplete, and OS control.'
  },
  {
    id: 'ex plorer',
    name: 'File Explorer',
    icon:  FolderOpen,
    component: FileExplorerApp,
     permissions: ['vfs.read', 'vfs.write'],
     defaultSize: { width: 800, height: 560 },
     description: 'Smart file browser with NLP  search and AI auto-organization.'
  },
  {
     id: 'forge',
    name: 'Neural Forge',
     icon: Cpu,
    component: NeuralForgeApp,
     permissions: ['vfs.write', 'network'],
     defaultSize: { width: 900, height: 680 },
     description: 'AI app generator. Describe an  app and DAEMON builds it instantly.'
  },

   // ── AI & Intelligence ─────� �──────────────� �──────────────� �────
  {
    id: 'daemon_chat',
     name: 'DAEMON Core',
    icon: Zap,
    compo nent: DaemonChatApp,
    permissions: ['netwo rk', 'kernel.modify'],
    defaultSize: { wid th: 760, height: 620 },
    description: 'Dir ect neural link to DAEMON AI. Chat, code, str ategize — completely offline.'
  },
  {
     id: 'aion_agent',
    name: 'NEXUS.PRIME',
     icon: ShieldCheck,
    component: NexusPri meApp,
    permissions: ['vfs.read', 'vfs.wri te', 'kernel.modify', 'network'],
    default Size: { width: 680, height: 560 },
    descri ption: 'The primary AI chat interface. Talk d irectly to DAEMON.'
  },
  {
    id: 'model_m anager',
    name: 'Model Manager',
    icon:  Brain,
    component: ModelManagerApp,
    p ermissions: ['network', 'kernel.modify'],
     defaultSize: { width: 760, height: 620 },
     description: 'Browse, download, and switch  GGUF models from HuggingFace.'
  },
  {
    i d: 'nfr',
    name: 'NFR Compressor',
    ico n: Layers,
    component: NFRApp,
    permiss ions: ['vfs.read', 'vfs.write'],
    defaultS ize: { width: 800, height: 600 },
    descrip tion: 'Neural Fractal Reconstruction compress ion engine. Chat with your archives.'
  },
   {
    id: 'fractal',
    name: 'Fractal Memor y',
    icon: Network,
    component: Fractal VisualizerApp,
    permissions: [],
    defau ltSize: { width: 800, height: 600 },
    desc ription: 'Real-time interactive graph of the  DAEMON Neural Cortex.'
  },

  // ── Syst em & Network ──────────� �──────────────� �──────────────� �
  {
    id: 'netrunner',
    name: 'NetRunn er',
    icon: Globe,
    component: NetRunne rApp,
    permissions: ['vfs.read', 'network' ],
    defaultSize: { width: 1000, height: 70 0 },
    description: 'AI-augmented browser w ith autonomous web agent and semantic snapsho t.'
  },
  {
    id: 'monitor',
    name: 'Sy stem Monitor',
    icon: Activity,
    compon ent: MonitorApp,
    permissions: ['kernel.mo dify'],
    defaultSize: { width: 760, height : 560 },
    description: 'Real-time CPU, mem ory, and neural process monitoring.'
  },
  { 
    id: 'ubuntu',
    name: 'Ubuntu Terminal ',
    icon: Command,
    component: UbuntuTe rminalApp,
    permissions: ['network'],
     defaultSize: { width: 800, height: 600 },
     description: 'Ubuntu subsystem terminal emul ator.'
  },

  // ── Utilities & Security  ──────────────� �──────────────� �───────
  {
    id: 'silence', 
    name: 'Cipher Vault',
    icon: Lock,
     component: SilenceApp,
    permissions: ['v fs.read', 'vfs.write'],
    defaultSize: { wi dth: 720, height: 580 },
    description: 'En d-to-end encrypted password manager with AES- GCM.'
  },
  {
    id: 'appstore',
    name:  'App Store',
    icon: Grid,
    component: A ppStoreApp,
    permissions: ['network'],
     defaultSize: { width: 860, height: 640 },
     description: 'Discover and install curated  NexusOS applications.'
  },
  {
    id: 'note pad',
    name: 'Notepad',
    icon: FileText ,
    component: NotepadApp,
    permissions:  ['vfs.read', 'vfs.write'],
    defaultSize:  { width: 600, height: 480 },
    description:  'Simple text editor for quick notes and file  viewing.'
  },
  {
    id: 'wallpaper',
     name: 'Wallpapers',
    icon: Image,
    comp onent: WallpaperApp,
    permissions: ['kerne l.modify'],
    defaultSize: { width: 720, he ight: 560 },
    description: 'AI wallpaper g enerator and preset manager.'
  },
  {
    id : 'settings',
    name: 'Settings',
    icon:  Settings,
    component: SettingsApp,
    pe rmissions: ['kernel.modify'],
    defaultSize : { width: 760, height: 580 },
    descriptio n: 'Configure AI model, autonomy engine, appe arance, and system.'
  },
  {
    id: 'filepr ops',
    name: 'File Properties',
    icon:  Database,
    component: FilePropertiesApp,
     permissions: ['vfs.read'],
    defaultSize : { width: 400, height: 500 },
  },
  {
    i d: 'ubuntu_terminal',
    name: 'Linux Termin al',
    icon: Terminal,
    component: Ubunt uTerminalApp,
    permissions: ['network'],
     defaultSize: { width: 800, height: 520 },
     description: 'Full Linux-like terminal en vironment with package simulation.'
  },
  {
     id: 'web_runner',
    name: 'Web Runner', 
    icon: Globe,
    component: WebRunnerApp ,
    permissions: ['network'],
    defaultSi ze: { width: 900, height: 600 },
    descript ion: 'Sandboxed browser iframe for running we b apps and sites.'
  },

  // ── NEW APPS  ──────────────� �──────────────� �──────────────� �──────────────� �
  {
    id: 'task_manager',
    name: 'Task  Manager',
    icon: MonitorDot,
    componen t: TaskManagerApp,
    permissions: ['kernel. modify'],
    defaultSize: { width: 780, heig ht: 480 },
    description: 'View and kill ru nning processes. Monitor memory usage per app .'
  },
  {
    id: 'device_manager',
    nam e: 'Device Manager',
    icon: Server,
    co mponent: DeviceManagerApp,
    permissions: [ ],
    defaultSize: { width: 700, height: 500  },
    description: 'Hardware monitor commun icating with the physical host via IPC.'
  }, 
  {
    id: 'native_zip',
    name: 'Archive  Extractor',
    icon: FileArchive,
    compo nent: NativeZipApp,
    permissions: ['vfs.re ad', 'vfs.write'],
    defaultSize: { width:  600, height: 450 },
    description: 'Native  host ZIP extractor powered by PowerShell / No de IPC.'
  },
  {
    id: 'recycle_bin',
     name: 'Recycle Bin',
    icon: Trash2,
    co mponent: RecycleBinApp,
    permissions: ['vf s.read', 'vfs.write'],
    defaultSize: { wid th: 700, height: 500 },
    description: 'Res tore deleted files or empty the trash to free  space.'
  },
  {
    id: 'notifications',
     name: 'Notification Center',
    icon: Bell ,
    component: NotificationCenterApp,
    p ermissions: [],
    defaultSize: { width: 420 , height: 560 },
    description: 'Notificati on history with type filters and timestamps.' 
  },
  {
    id: 'clipboard',
    name: 'Cli pboard',
    icon: Clipboard,
    component:  ClipboardManagerApp,
    permissions: [],
     defaultSize: { width: 400, height: 520 },
     description: 'Clipboard history with search , pin favorites, and one-click re-copy.'
  }, 
  {
    id: 'sticky_notes',
    name: 'Stick y Notes',
    icon: StickyNote,
    component : StickyNotesApp,
    permissions: [],
    de faultSize: { width: 600, height: 500 },
    d escription: 'Draggable sticky notes with colo rs and persistence.'
  },
  {
    id: 'calcul ator',
    name: 'Calculator',
    icon: Calc ulator,
    component: CalculatorProApp,
     permissions: [],
    defaultSize: { width: 32 0, height: 520 },
    description: 'Scientifi c calculator with history, percent, and sign  toggle.'
  },
  {
    id: 'calendar',
    nam e: 'Calendar',
    icon: Calendar,
    compon ent: CalendarApp,
    permissions: [],
    de faultSize: { width: 640, height: 480 },
    d escription: 'Monthly calendar with events, co lor coding, and time display.'
  },
  {
    i d: 'image_viewer',
    name: 'Image Viewer',
     icon: Image,
    component: ImageViewerAp p,
    permissions: ['vfs.read'],
    default Size: { width: 720, height: 560 },
    descri ption: 'Image gallery with zoom, rotation, an d thumbnail navigation.'
  },
  {
    id: 'mu sic',
    name: 'Music Player',
    icon: Mus ic,
    component: MusicPlayerApp,
    permis sions: [],
    defaultSize: { width: 700, hei ght: 520 },
    description: 'Audio player wi th visualizer, playlist, shuffle, repeat, and  volume.'
  },
  {
    id: 'rich_editor',
     name: 'Rich Editor',
    icon: Pen,
    comp onent: RichEditorApp,
    permissions: ['vfs. read', 'vfs.write'],
    defaultSize: { width : 800, height: 600 },
    description: 'WYSIW YG rich text editor with formatting toolbar a nd HTML export.'
  },
  {
    id: 'daemon_jou rnal',
    name: 'DAEMON Journal',
    icon:  BookOpen,
    component: DaemonJournalApp,
     permissions: ['vfs.read'],
    defaultSize:  { width: 600, height: 480 },
    description : 'DAEMON memory journal — browse and searc h AI memory entries.'
  },
  
  // ── NEW : BATCH 1 & 2 ──────────� ��──────────────� ��──────────────� ��─────────
  {
    id: 'pa int',
    name: 'Paint',
    icon: Palette,
     component: PaintApp,
    permissions: [],
     defaultSize: { width: 800, height: 600 }, 
    description: 'Canvas drawing program wit h brush, fill, and color picker.'
  },
  {
     id: 'video_player',
    name: 'Video Player ',
    icon: Video,
    component: VideoPlaye rApp,
    permissions: ['vfs.read'],
    defa ultSize: { width: 720, height: 480 },
    des cription: 'Media player for local video files .'
  },
  {
    id: 'weather',
    name: 'Wea ther',
    icon: Cloud,
    component: Weathe rApp,
    permissions: ['network'],
    defau ltSize: { width: 400, height: 500 },
    desc ription: 'Current weather conditions and 7-da y forecast.'
  },
  {
    id: 'sysinfo',
     name: 'System Info',
    icon: Info,
    comp onent: SystemInfoApp,
    permissions: [],
     defaultSize: { width: 500, height: 400 },
     description: 'Hardware, OS, and network di agnostic information.'
  },
  {
    id: 'snip pets',
    name: 'Snippets',
    icon: FileCo de,
    component: SnippetsApp,
    permissio ns: [],
    defaultSize: { width: 640, height : 500 },
    description: 'Code snippets mana ger with syntax tagging.'
  },
  {
    id: 'c ontacts',
    name: 'Contacts',
    icon: Use rs,
    component: ContactsApp,
    permissio ns: [],
    defaultSize: { width: 700, height : 500 },
    description: 'Address book and c ontact manager.'
  },
  {
    id: 'pomodoro', 
    name: 'Pomodoro',
    icon: Timer,
    c omponent: PomodoroApp,
    permissions: [],
     defaultSize: { width: 340, height: 480 },
     description: 'Focus timer for productivit y with custom intervals.'
  },
  {
    id: 'k anban',
    name: 'Kanban Board',
    icon: L ayoutGrid,
    component: KanbanApp,
    perm issions: [],
    defaultSize: { width: 900, h eight: 600 },
    description: 'Drag-and-drop  project management board.'
  },
  {
    id:  'vault',
    name: 'Vault',
    icon: Key,
     component: PasswordManagerApp,
    permissi ons: [],
    defaultSize: { width: 700, heigh t: 500 },
    description: 'Password manager  and secure credentials vault.'
  },
  {
    i d: 'voice_recorder',
    name: 'Voice Recorde r',
    icon: Mic,
    component: VoiceRecord erApp,
    permissions: ['network'], // gener ic permission for mic access via browser
     defaultSize: { width: 400, height: 500 },
     description: 'Record, save, and export audio  memos.'
  },
  {
    id: 'markdown',
    nam e: 'MD Preview',
    icon: FileText,
    comp onent: MarkdownPreviewApp,
    permissions: [ ],
    defaultSize: { width: 800, height: 600  },
    description: 'Real-time markdown edit or and HTML exporter.'
  },
  {
    id: 'rss' ,
    name: 'RSS Feed',
    icon: Rss,
    co mponent: RSSReaderApp,
    permissions: ['net work'],
    defaultSize: { width: 800, height : 600 },
    description: 'News feed aggregat or for your favorite tech sites.'
  },
  {
     id: 'accessibility',
    name: 'Accessibili ty',
    icon: Accessibility,
    component:  AccessibilityPanel,
    permissions: ['kernel .modify'],
    defaultSize: { width: 400, hei ght: 500 },
    description: 'Configure UI sc ale, font size, and high contrast modes.'
  } ,
  {
    id: 'habits',
    name: 'Habit Trac ker',
    icon: Target,
    component: HabitT rackerApp,
    permissions: [],
    defaultSi ze: { width: 640, height: 500 },
    descript ion: 'Track daily habits and maintain streaks .'
  },
  {
    id: 'screenshot',
    name: ' Screenshot',
    icon: Camera,
    component:  ScreenshotToolApp,
    permissions: [],
     defaultSize: { width: 600, height: 400 },
     description: 'Capture, copy, and save screen shots of the OS.'
  }
];
 