import fs from 'fs';
import path from 'path';

const missingApps = [
  { id: 'governance', name: 'Governance', component: 'GovernanceDashboardApp', file: 'GovernanceDashboard', icon: 'Lock' },
  { id: 'nfr', name: 'NFR Compressor', component: 'NFRApp', file: 'NFRCompressor', icon: 'Layers' },
  { id: 'fractal', name: 'Context Memory', component: 'FractalVisualizerApp', file: 'FractalVisualizer', icon: 'Network' },
  { id: 'monitor', name: 'System Monitor', component: 'MonitorApp', file: 'SystemMonitor', icon: 'Activity' },
  { id: 'ubuntu', name: 'Ubuntu Subsystem', component: 'UbuntuTerminalApp', file: 'UbuntuTerminal', icon: 'Command' },
  { id: 'wallpaper', name: 'Wallpaper Gen', component: 'WallpaperApp', file: 'WallpaperGen', icon: 'Image' },
  { id: 'fileprops', name: 'Properties', component: 'FilePropertiesApp', file: 'FileProperties', icon: 'Database' },
  { id: 'task_manager', name: 'Task Manager', component: 'TaskManagerApp', file: 'TaskManager', icon: 'MonitorDot' },
  { id: 'device_manager', name: 'Device Manager', component: 'DeviceManagerApp', file: 'DeviceManagerApp', icon: 'Server' },
  { id: 'native_zip', name: 'Archiver', component: 'NativeZipApp', file: 'NativeZipApp', icon: 'FileArchive' },
  { id: 'recycle_bin', name: 'Recycle Bin', component: 'RecycleBinApp', file: 'RecycleBinApp', icon: 'Trash2' },
  { id: 'notifications', name: 'Notifications', component: 'NotificationCenterApp', file: 'NotificationCenter', icon: 'Bell' },
  { id: 'image_viewer', name: 'Gallery', component: 'ImageViewerApp', file: 'ImageViewer', icon: 'Image' },
  { id: 'rich_editor', name: 'Rich Editor', component: 'RichEditorApp', file: 'RichEditor', icon: 'Pen' },
  { id: 'daemon_journal', name: 'DAEMON Journal', component: 'DaemonJournalApp', file: 'DaemonJournal', icon: 'BookOpen' },
  { id: 'paint', name: 'Paint', component: 'PaintApp', file: 'PaintApp', icon: 'Palette' },
  { id: 'video_player', name: 'Video Player', component: 'VideoPlayerApp', file: 'VideoPlayer', icon: 'Video' },
  { id: 'snippets', name: 'Snippets', component: 'SnippetsApp', file: 'SnippetsApp', icon: 'FileCode' },
  { id: 'rss', name: 'RSS Feed', component: 'RSSReaderApp', file: 'RSSReader', icon: 'Rss' },
  { id: 'accessibility', name: 'Accessibility', component: 'AccessibilityPanel', file: 'AccessibilityPanel', icon: 'Accessibility' },
  { id: 'screenshot', name: 'Screenshot', component: 'ScreenshotToolApp', file: 'ScreenshotTool', icon: 'Camera' }
];

const regPath = path.join(process.cwd(), 'NexusPortable', 'appRegistry.ts');
let content = fs.readFileSync(regPath, 'utf-8');

const imports = missingApps.map(app => `import Mobile${app.component} from './apps/Mobile${app.component}';`).join('\n');

const iconsToImport = new Set(missingApps.map(a => a.icon));
const lucideMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+'lucide-react';/);
if (lucideMatch) {
    const existingIcons = lucideMatch[1].split(',').map(s => s.trim());
    existingIcons.forEach(i => iconsToImport.delete(i));
    
    if (iconsToImport.size > 0) {
        const newLucide = `import { ${lucideMatch[1]}, ${Array.from(iconsToImport).join(', ')} } from 'lucide-react';`;
        content = content.replace(lucideMatch[0], newLucide);
    }
}

content = content.replace("import MobileNeuralForge from './apps/MobileNeuralForge';", `import MobileNeuralForge from './apps/MobileNeuralForge';\n${imports}`);

const appEntries = missingApps.map(app => `  {
    id: '${app.id}',
    name: '${app.name}',
    icon: ${app.icon},
    iconBg: 'linear-gradient(135deg, #1f2937 0%, #4b5563 100%)',
    component: Mobile${app.component},
    description: '${app.name} mobile port',
  },`).join('\n');

content = content.replace("];", `${appEntries}\n];`);

fs.writeFileSync(regPath, content);
console.log("Registry updated.");
