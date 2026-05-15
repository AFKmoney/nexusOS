import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../../store/osStore';
import { vfs } from '../../kernel/fileSystem';
import { getSmartIcon } from '../../utils/smartIcons';
import { ChevronLeft, HardDrive, Folder, File, Image as ImageIcon, Trash2, Settings, Info, Share2, ShieldCheck, Edit3 } from 'lucide-react';
import type { MobileAppProps } from '../types';

const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function MobileFilePropertiesApp({ onBack, appId }: MobileAppProps) {
  const { windows, closeWindow, updateWindow, addNotification } = useOS();
  
  // Try to find path from OS windows (desktop compatibility)
  const win = windows.find(w => w.id === appId);
  const path = win?.data?.path || '/'; // Fallback to root if not found

  const [stats, setStats] = useState<any>(null);
  const [node, setNode] = useState<any>(null);
  const [newName, setNewName] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!path) return;
    try {
        const n = vfs.stat(path);
        const s = vfs.getStats(path);
        if (n) {
            setNode(n);
            setNewName(n.name);
        }
        if (s) setStats(s);
    } catch (e) {
        console.error("VFS Stat error", e);
    }
  }, [path]);

  const handleApply = () => {
    if (newName && node && newName !== node.name) {
        const parentPath = path.substring(0, path.lastIndexOf('/'));
        const newPath = `${parentPath === '/' ? '' : parentPath}/${newName}`;
        const success = vfs.move(path, newPath);
        if (success) {
            updateWindow(appId, { title: `Properties of ${newName}`, data: { path: newPath } });
            addNotification({ title: 'Renamed', message: `File renamed to ${newName}`, type: 'success' });
        } else {
            addNotification({ title: 'Rename Failed', message: 'Name might already be taken.', type: 'error' });
        }
    }
    onBack();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && path) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const base64 = event.target?.result as string;
              vfs.updateMetadata(path, { customIcon: base64 });
              setNode({ ...node, customIcon: base64 });
              addNotification({ title: 'Icon Updated', message: 'Custom icon applied.', type: 'success' });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleResetIcon = () => {
      if (path) {
          vfs.updateMetadata(path, {});
          setNode((prev: any) => prev ? { ...prev, customIcon: undefined } : prev);
          addNotification({ title: 'Icon Reset', message: 'Custom icon removed.', type: 'info' });
      }
  };

  if (!node || !stats) {
      return (
          <div className="h-full flex flex-col bg-[#0f0f0f]">
              <div className="flex items-center gap-3 px-4 py-3 shrink-0 bg-[#1a1a1a] border-b border-white/5">
                <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
                  <ChevronLeft size={22} className="text-white" />
                </button>
                <h1 className="text-white font-semibold text-[16px]">File Properties</h1>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
                  <File size={48} className="opacity-20" />
                  <p>File not found or no path provided.</p>
                  <button onClick={onBack} className="px-6 py-2 bg-blue-600 text-white rounded-xl">Go Back</button>
              </div>
          </div>
      );
  }

  const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
  const isFolder = node.type === 'directory';

  const tabs = [
      { id: 'general', label: 'General', icon: Info },
      { id: 'security', label: 'Security', icon: ShieldCheck },
      { id: 'sharing', label: 'Sharing', icon: Share2 },
      { id: 'customize', label: 'Custom', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0f0f0f] text-[#e0e0e0] font-sans select-none overflow-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={onFileSelected}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-white/5 shrink-0 z-50">
        <div className="flex items-center gap-3">
            <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
              <ChevronLeft size={22} className="text-white" />
            </button>
            <h1 className="text-white font-semibold text-[16px] truncate max-w-[200px]">{node.name}</h1>
        </div>
        <button onClick={handleApply} className="text-blue-400 font-semibold active:opacity-50">Done</button>
      </div>

      {/* Tab Bar */}
      <div className="flex overflow-x-auto no-scrollbar bg-[#1a1a1a] px-2 border-b border-white/5 shrink-0">
          {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-all relative
                ${activeTab === tab.id ? 'text-blue-400' : 'text-zinc-500'}`}
              >
                  <tab.icon size={16} />
                  <span className="text-sm font-medium">{tab.label}</span>
                  {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
                  )}
              </button>
          ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
          {activeTab === 'general' && (
            <div className="p-5 space-y-8 animate-fade-in">
                {/* Hero Section */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative group">
                        <div className="w-24 h-24 flex items-center justify-center bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                            {getSmartIcon(path, 64)}
                        </div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 p-2 bg-blue-600 rounded-full text-white shadow-xl active:scale-90 transition-transform"
                        >
                            <Edit3 size={18} />
                        </button>
                    </div>
                    <div className="w-full max-w-xs">
                        <input 
                            className="w-full bg-transparent border-none text-xl font-bold text-white text-center outline-none focus:ring-0"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />
                        <p className="text-xs text-zinc-500 mt-1">{isFolder ? 'File Folder' : 'Generic File'}</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-500">Size</span>
                            <span className="text-white font-medium">{formatSize(stats.size)}</span>
                        </div>
                        {isFolder && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-500">Contents</span>
                                <span className="text-white font-medium">{stats.files} Files, {stats.folders} Folders</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-500">Location</span>
                            <span className="text-white font-medium truncate ml-4">{parentPath}</span>
                        </div>
                    </div>

                    <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-500">Created</span>
                            <span className="text-white font-medium">{formatDate(node.created)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-500">Modified</span>
                            <span className="text-white font-medium">{formatDate(node.modified)}</span>
                        </div>
                    </div>
                </div>

                {/* Attributes */}
                <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5">
                    <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Attributes</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 opacity-50 cursor-not-allowed">
                            <div className="w-5 h-5 rounded border border-white/10 flex items-center justify-center text-blue-500">
                                <div className="w-2 h-2 bg-blue-500 rounded-sm" />
                            </div>
                            <span className="text-sm">Read-only</span>
                        </div>
                        <div className="flex items-center gap-3 opacity-50 cursor-not-allowed">
                            <div className="w-5 h-5 rounded border border-white/10" />
                            <span className="text-sm">Hidden</span>
                        </div>
                    </div>
                </div>

                {/* Danger Zone / Actions */}
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => {
                            if (confirm(`Delete ${node.name} forever?`)) {
                                vfs.delete(path);
                                addNotification({ title: 'Deleted', message: 'File has been removed.', type: 'info' });
                                onBack();
                            }
                        }}
                        className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 font-semibold flex items-center justify-center gap-2 active:bg-red-500/20 transition-colors"
                    >
                        <Trash2 size={18} />
                        Delete File
                    </button>
                    {node.customIcon && (
                        <button 
                            onClick={handleResetIcon}
                            className="w-full py-3 text-zinc-500 text-sm font-medium underline underline-offset-4 active:text-white"
                        >
                            Reset to Default Icon
                        </button>
                    )}
                </div>
            </div>
          )}

          {activeTab !== 'general' && (
              <div className="h-64 flex flex-col items-center justify-center text-zinc-600 gap-4 opacity-50 italic">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                    <Settings className="w-8 h-8" />
                  </div>
                  <span>Module restricted in mobile preview</span>
              </div>
          )}
      </div>

      {/* Quick Actions Footer */}
      <div className="fixed bottom-[var(--nav-bar-height)] left-0 right-0 p-4 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f] to-transparent pointer-events-none">
          <div className="max-w-md mx-auto flex gap-3 pointer-events-auto">
              <button 
                onClick={onBack}
                className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-bold shadow-xl active:bg-zinc-700 transition-colors border border-white/5"
              >
                  Cancel
              </button>
              <button 
                onClick={handleApply}
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl active:bg-blue-500 transition-colors shadow-blue-900/20"
              >
                  Save Changes
              </button>
          </div>
      </div>
    </div>
  );
}
