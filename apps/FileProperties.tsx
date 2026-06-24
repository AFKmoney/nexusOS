import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../store/osStore';
import { vfs } from '../kernel/fileSystem';
import { getSmartIcon } from '../utils/smartIcons';
import { format } from 'date-fns';
import { X, HardDrive, Folder, File, Image as ImageIcon, Trash2, Settings } from 'lucide-react';

const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i] + ` (${bytes.toLocaleString()} bytes)`;
};

export default function FilePropertiesApp({ windowId }: { windowId: string }) {
  const { windows, closeWindow, updateWindow, addNotification } = useOS();
  const win = windows.find(w => w.id === windowId);
  const path = win?.data?.path || '';

  const [stats, setStats] = useState<any>(null);
  const [node, setNode] = useState<any>(null);
  const [newName, setNewName] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!path) return;
    const n = vfs.stat(path);
    const s = vfs.getStats(path);
    if (n) {
        setNode(n);
        setNewName(n.name);
    }
    if (s) setStats(s);
  }, [path]);

  const handleApply = () => {
    if (newName && newName !== node.name) {
        const parentPath = path.substring(0, path.lastIndexOf('/'));
        const newPath = `${parentPath === '/' ? '' : parentPath}/${newName}`;
        const success = vfs.move(path, newPath);
        if (success) {
            updateWindow(windowId, { title: `Properties of ${newName}`, data: { path: newPath } });
        } else {
            alert("Rename failed. Name might already be taken.");
        }
    }
    closeWindow(windowId);
  };

  const handleIconChange = () => {
      fileInputRef.current?.click();
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

  if (!node || !stats) return <div className="p-4 text-white">File not found.</div>;

  const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
  const isFolder = node.type === 'directory';

  return (
    <div className="h-full flex flex-col bg-[#1c1c1c] text-[#e0e0e0] font-sans text-sm select-none">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={onFileSelected}
      />

      {/* Tabs */}
      <div className="flex px-2 pt-2 gap-1 bg-[#1c1c1c]">
          {['General'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`px-3 py-1.5 rounded-t-md border-t border-x border-transparent
                ${activeTab === tab.toLowerCase() ? 'bg-[#2a2a2a] border-[#3a3a3a] text-white relative top-[1px] z-10' : 'text-[#888]'}`}
              >
                  {tab}
              </button>
          ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-[#2a2a2a] border-t border-[#3a3a3a] p-4 flex flex-col gap-4 overflow-y-auto">
          
          {/* Header Section */}
          <div className="flex items-center gap-4 pb-4 border-b border-[#3a3a3a]">
             <div className="relative group">
                <div className="w-16 h-16 flex items-center justify-center bg-[#1a1a1a] rounded-lg border border-[#3a3a3a] overflow-hidden">
                    {getSmartIcon(path, 48)}
                </div>
                <button 
                    onClick={handleIconChange}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 rounded-full text-white shadow-lg hover:bg-blue-500 transition-colors"
                    title="Change Icon"
                >
                    <ImageIcon size={16} />
                </button>
             </div>
             <div className="flex-1 space-y-2">
                <input 
                    className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-1.5 text-base font-bold text-white outline-none focus:border-[#555]"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                />
                <div className="flex gap-2">
                    <button 
                        onClick={handleIconChange}
                        className="text-xs text-zinc-400 hover:text-white underline underline-offset-2"
                    >
                        Change Icon...
                    </button>
                    {node.customIcon && (
                        <button 
                            onClick={handleResetIcon}
                            className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2"
                        >
                            Reset Icon
                        </button>
                    )}
                </div>
             </div>
          </div>

          {activeTab === 'general' && (
            <div className="grid grid-cols-[80px_1fr] gap-y-3 gap-x-2">
                <div className="text-[#888]">Type:</div>
                <div>{isFolder ? 'File Folder' : 'File'}</div>

                <div className="text-[#888]">Location:</div>
                <div className="truncate text-[#aaa] select-text">{parentPath}</div>

                <div className="text-[#888]">Size:</div>
                <div>{formatSize(stats.size)}</div>

                {isFolder && (
                    <>
                        <div className="text-[#888]">Contains:</div>
                        <div>{stats.files} Files, {stats.folders} Folders</div>
                    </>
                )}

                <div className="col-span-2 h-px bg-[#3a3a3a] my-1" />

                <div className="text-[#888]">Created:</div>
                <div>{formatDate(node.created)}</div>

                <div className="text-[#888]">Modified:</div>
                <div>{formatDate(node.modified)}</div>

                <div className="col-span-2 h-px bg-[#3a3a3a] my-1" />

                <div className="text-[#888]">Attributes:</div>
                <div className="flex gap-4 text-[#aaa]">
                    <span>{node?.permissions?.includes('w') ? 'Read/Write' : 'Read-only'}</span>
                </div>
            </div>
          )}
      </div>

      {/* Footer Buttons */}
      <div className="bg-[#1c1c1c] p-3 flex justify-end gap-2 border-t border-[#3a3a3a]">
          <button onClick={handleApply} className="min-w-[70px] px-4 py-1.5 bg-[#0064b0] hover:bg-[#0074cc] text-white rounded border border-[#0074cc] shadow-sm transition-colors">OK</button>
          <button onClick={() => closeWindow(windowId)} className="min-w-[70px] px-4 py-1.5 bg-[#333] hover:bg-[#3a3a3a] text-white rounded border border-[#444] transition-colors">Cancel</button>
          <button onClick={handleApply} className="min-w-[70px] px-4 py-1.5 bg-[#333] hover:bg-[#3a3a3a] text-white rounded border border-[#444] transition-colors">Apply</button>
      </div>
    </div>
  );
}
