import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Folder, FileText, Image, Music, Video, Code, Archive, Plus, MoreVertical } from 'lucide-react';
import type { MobileAppProps } from '../types';

interface FSNode {
  name: string;
  type: 'dir' | 'file';
  size?: string;
  modified?: string;
  ext?: string;
}

const FS: Record<string, FSNode[]> = {
  '/': [
    { name: 'Documents', type: 'dir', modified: 'Today' },
    { name: 'Downloads', type: 'dir', modified: 'Yesterday' },
    { name: 'Pictures', type: 'dir', modified: 'Jun 12' },
    { name: 'Music', type: 'dir', modified: 'Jun 10' },
    { name: 'Videos', type: 'dir', modified: 'Jun 8' },
    { name: 'Projects', type: 'dir', modified: 'May 30' },
    { name: 'README.md', type: 'file', size: '2.1 KB', ext: 'md', modified: 'Today' },
  ],
  '/Documents': [
    { name: 'report.pdf', type: 'file', size: '1.2 MB', ext: 'pdf', modified: 'Today' },
    { name: 'notes.txt', type: 'file', size: '12 KB', ext: 'txt', modified: 'Yesterday' },
    { name: 'budget.csv', type: 'file', size: '88 KB', ext: 'csv', modified: 'Jun 10' },
  ],
  '/Pictures': [
    { name: 'photo1.jpg', type: 'file', size: '3.4 MB', ext: 'jpg', modified: 'Today' },
    { name: 'screenshot.png', type: 'file', size: '540 KB', ext: 'png', modified: 'Yesterday' },
  ],
  '/Projects': [
    { name: 'nexusos', type: 'dir', modified: 'Today' },
    { name: 'portfolio', type: 'dir', modified: 'Jun 1' },
  ],
};

function getIcon(node: FSNode) {
  if (node.type === 'dir') return { Icon: Folder, color: '#f59e0b' };
  const ext = node.ext ?? '';
  if (['jpg','png','gif','webp'].includes(ext)) return { Icon: Image, color: '#ec4899' };
  if (['mp3','ogg','wav','flac'].includes(ext)) return { Icon: Music, color: '#8b5cf6' };
  if (['mp4','webm','mov'].includes(ext)) return { Icon: Video, color: '#ef4444' };
  if (['ts','tsx','js','jsx','py','rs','go'].includes(ext)) return { Icon: Code, color: '#06b6d4' };
  if (['zip','tar','gz'].includes(ext)) return { Icon: Archive, color: '#6366f1' };
  return { Icon: FileText, color: '#94a3b8' };
}

export default function MobileFileExplorer({ onBack }: MobileAppProps) {
  const [path, setPath] = useState('/');
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['/']);
  const [selectedNode, setSelectedNode] = useState<FSNode | null>(null);

  const nodes = FS[path] ?? [];

  const navigate = (node: FSNode) => {
    if (node.type !== 'dir') {
      setSelectedNode(node);
      return;
    }
    const newPath = path === '/' ? `/${node.name}` : `${path}/${node.name}`;
    setPath(newPath);
    setBreadcrumbs(b => [...b, newPath]);
  };

  const goBack = () => {
    if (breadcrumbs.length <= 1) { onBack(); return; }
    const prev = breadcrumbs[breadcrumbs.length - 2];
    setPath(prev);
    setBreadcrumbs(b => b.slice(0, -1));
  };

  const pathLabel = path === '/' ? 'Storage' : path.split('/').pop() ?? path;

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={goBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold text-[15px]">{pathLabel}</h1>
          <div className="flex items-center gap-1 mt-0.5">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={b}>
                {i > 0 && <ChevronRight size={10} className="text-white/30" />}
                <span
                  className="text-white/40 text-[11px] cursor-pointer hover:text-white/70"
                  onClick={() => {
                    setPath(b);
                    setBreadcrumbs(breadcrumbs.slice(0, i + 1));
                  }}
                >
                  {b === '/' ? 'Home' : b.split('/').pop()}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
        <button className="p-1.5 rounded-xl active:bg-white/10">
          <Plus size={18} className="text-white/60" />
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-white/20 gap-2">
            <Folder size={36} strokeWidth={1.5} />
            <p className="text-[14px]">Empty folder</p>
          </div>
        ) : (
          <div className="px-4 pt-3 pb-6 space-y-1.5">
            {nodes.map((node) => {
              const { Icon, color } = getIcon(node);
              return (
                <div
                  key={node.name}
                  className="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer active:bg-white/8 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}
                  onClick={() => navigate(node)}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: color + '20' }}>
                    <Icon size={20} style={{ color }} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[15px] font-medium truncate">{node.name}</p>
                    <p className="text-white/40 text-[12px] mt-0.5">
                      {node.type === 'dir' ? 'Folder' : node.size} · {node.modified}
                    </p>
                  </div>
                  {node.type === 'dir' && <ChevronRight size={16} className="text-white/30 flex-shrink-0" />}
                  {node.type === 'file' && <MoreVertical size={16} className="text-white/20 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* File info bottom sheet */}
      {selectedNode && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedNode(null)}
        >
          <div
            className="w-full rounded-t-3xl p-6"
            style={{ background: 'var(--nx-surface-3)', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="bottom-sheet-handle mx-auto -mt-2 mb-4" />
            <div className="flex items-center gap-4 mb-4">
              {(() => {
                const { Icon, color } = getIcon(selectedNode);
                return (
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: color + '20' }}>
                    <Icon size={28} style={{ color }} strokeWidth={1.5} />
                  </div>
                );
              })()}
              <div>
                <p className="text-white font-semibold text-[17px]">{selectedNode.name}</p>
                <p className="text-white/40 text-[13px]">{selectedNode.size} · {selectedNode.modified}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['Open', 'Share', 'Delete'].map(action => (
                <button
                  key={action}
                  className="py-3 rounded-xl text-[14px] font-medium active:opacity-70"
                  style={{
                    background: action === 'Delete' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)',
                    color: action === 'Delete' ? '#f87171' : '#fff',
                    border: `1px solid ${action === 'Delete' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                  onClick={() => setSelectedNode(null)}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
