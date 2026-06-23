import React from 'react';
import {
  Layout, FilePlus, AlignLeft, File, Search,
  GitBranch, ShieldAlert, Sparkles,
} from 'lucide-react';
import { FileTreeNode } from './FileTreeNode';
import type { EditorTab, SearchHit, SidePanelKind } from './types';

interface SidePanelProps {
  sidePanel: SidePanelKind;
  showNewFile: boolean;
  newFileName: string;
  newFileDir: string;
  renameTarget: string | null;
  renameValue: string;
  searchQuery: string;
  searchResults: SearchHit[];
  activeTabPath: string;
  modifiedTabs: EditorTab[];
  onNewFileClick: () => void;
  onSetNewFileName: (v: string) => void;
  onCreateFile: () => void;
  onCancelNewFile: () => void;
  onSetRenameValue: (v: string) => void;
  onDoRename: () => void;
  onCancelRename: () => void;
  onSetSearchQuery: (v: string) => void;
  onSearch: () => void;
  onOpenFile: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isDir: boolean) => void;
  onClose: () => void;
  onNeuralReview: () => void;
}

// The collapsible left panel — hosts the file explorer, the code search
// surface, or the (mocked) source-control view depending on the active
// tab. All state lives in the parent; this component is purely
// presentational.
export const SidePanel: React.FC<SidePanelProps> = (props) => {
  const {
    sidePanel, showNewFile, newFileName, renameTarget, renameValue,
    searchQuery, searchResults, activeTabPath, modifiedTabs,
    onNewFileClick, onSetNewFileName, onCreateFile, onCancelNewFile,
    onSetRenameValue, onDoRename, onCancelRename,
    onSetSearchQuery, onSearch, onOpenFile, onContextMenu,
    onClose, onNeuralReview,
  } = props;

  return (
    <div className="w-64 bg-[#0A0A0C]/95 backdrop-blur-xl border-r border-white/5 flex flex-col shrink-0 z-10 relative">
      <div className="px-4 py-3 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{sidePanel}</span>
        <div className="flex items-center gap-1.5">
          {sidePanel === 'files' && (
            <button
              onClick={onNewFileClick}
              className="text-zinc-500 hover:text-emerald-400 p-1 rounded-md hover:bg-emerald-500/10 transition-all"
              title="New File"
            >
              <FilePlus size={14} />
            </button>
          )}
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 p-1 rounded-md hover:bg-white/10 transition-all">
            <Layout size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
        {sidePanel === 'files' && (
          <div className="space-y-0.5">
            {showNewFile && (
              <form
                onSubmit={(e) => { e.preventDefault(); onCreateFile(); }}
                className="flex items-center gap-2 px-2 py-1.5 bg-black/40 border border-emerald-500/30 rounded-lg mb-2 shadow-inner"
              >
                <FilePlus size={14} className="text-emerald-500 shrink-0" />
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-xs outline-none text-white font-mono placeholder:text-zinc-600"
                  placeholder="filename.tsx"
                  value={newFileName}
                  onChange={(e) => onSetNewFileName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && onCancelNewFile()}
                />
              </form>
            )}
            {renameTarget && (
              <form
                onSubmit={(e) => { e.preventDefault(); onDoRename(); }}
                className="flex items-center gap-2 px-2 py-1.5 bg-black/40 border border-yellow-500/30 rounded-lg mb-2 shadow-inner"
              >
                <AlignLeft size={14} className="text-yellow-500 shrink-0" />
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-xs outline-none text-white font-mono"
                  value={renameValue}
                  onChange={(e) => onSetRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && onCancelRename()}
                />
              </form>
            )}
            <FileTreeNode path="/home/user" name="home" depth={0} onSelect={onOpenFile} onContextMenu={onContextMenu} selectedPath={activeTabPath} />
            <FileTreeNode path="/system/apps" name="apps (system)" depth={0} onSelect={onOpenFile} onContextMenu={onContextMenu} selectedPath={activeTabPath} />
          </div>
        )}

        {sidePanel === 'search' && (
          <div className="space-y-3 px-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-zinc-500" />
              <input
                className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500/50 text-white font-mono shadow-inner transition-colors"
                placeholder="Search codebase..."
                value={searchQuery}
                onChange={(e) => onSetSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              />
            </div>
            <div className="space-y-1">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => onOpenFile(r.path)}
                  className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all group"
                >
                  <div className="text-[11px] text-blue-400 font-medium truncate flex items-center gap-1.5">
                    <File size={10} />
                    {r.path.split('/').pop()}
                    <span className="text-zinc-600 bg-black/40 px-1 rounded">:{r.line}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate font-mono mt-1 opacity-80 group-hover:opacity-100">{r.text}</div>
                </button>
              ))}
              {searchResults.length === 0 && searchQuery && (
                <div className="text-xs text-zinc-600 text-center py-8 flex flex-col items-center gap-2">
                  <ShieldAlert size={24} className="opacity-20" /> No matches found
                </div>
              )}
            </div>
          </div>
        )}

        {sidePanel === 'git' && (
          <div className="p-2 space-y-3">
            <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/5 text-xs text-zinc-400 space-y-2 shadow-inner">
              <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-widest">
                <GitBranch size={14} /> main
              </div>
              <div className="flex justify-between">
                <span>Tracked Nodes:</span>
                <span className="text-white">
                  {Object.keys(localStorage).filter((k) => k.startsWith('vfs_')).length}
                </span>
              </div>
              <div className="text-[10px] text-zinc-600 mt-2">VFS Local Persistence</div>
            </div>
            {modifiedTabs.length > 0 && (
              <div>
                <div className="text-[10px] font-black text-zinc-500 mb-2 uppercase tracking-widest px-1">Modified Manifests</div>
                {modifiedTabs.map((t) => (
                  <div
                    key={t.path}
                    className="flex items-center gap-2 text-xs text-yellow-400 py-1.5 px-2 bg-yellow-500/10 rounded-lg mb-1 border border-yellow-500/20"
                  >
                    <span className="text-yellow-500 font-black">M</span> {t.name}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={onNeuralReview}
              className="w-full p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 hover:from-emerald-500/20 hover:to-teal-500/20 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
            >
              <Sparkles size={14} /> Neural Review
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
