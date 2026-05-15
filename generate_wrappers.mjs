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

const mobileAppsDir = path.join(process.cwd(), 'NexusPortable', 'apps');

if (!fs.existsSync(mobileAppsDir)) fs.mkdirSync(mobileAppsDir, { recursive: true });

missingApps.forEach(app => {
  const wrapperContent = `import React from 'react';
import { ChevronLeft } from 'lucide-react';
import type { MobileAppProps } from '../types';
import DesktopComponent from '../../apps/${app.file}';

export default function Mobile${app.component}({ onBack }: MobileAppProps) {
  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 bg-[#080808] border-b border-white/5 z-50 relative">
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px]">${app.name}</h1>
      </div>
      <div className="flex-1 overflow-auto relative z-0">
        <DesktopComponent />
      </div>
    </div>
  );
}
`;
  const filePath = path.join(mobileAppsDir, `Mobile${app.component}.tsx`);
  fs.writeFileSync(filePath, wrapperContent);
  console.log(`Created ${filePath}`);
});

console.log("Wrapper generation complete.");
