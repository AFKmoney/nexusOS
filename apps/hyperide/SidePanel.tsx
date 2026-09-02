import React from 'react';
import {
  FilePlus, FolderPlus, Layout, Search, GitBranch, Sparkles, File, ShieldAlert, AlignLeft
} from 'lucide-react';
import { FileTreeNode } from './FileTreeNode';
import type { EditorTab, SearchHit, SidePanelKind } from './types';

export interface SidePanelProps {
  sidePanel: SidePanelKind;
  project: import("./types").ProjectState | null;
  showNewFile: boolean;
  isNewFolder?: boolean;
  newFileName: string;
  renameTarget: string | null;
  renameValue: string;
  searchQuery: string;
  searchResults: SearchHit[];
  activeTabPath?: string;
  modifiedTabs: EditorTab[];
  onNewFileClick: () => void;
  onNewFolderClick?: () => void;
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
  onCreateProject?: () => void;
}

export const SidePanel: React.FC<SidePanelProps> = (props) => {
  const {
    sidePanel, project, showNewFile, isNewFolder, newFileName, renameTarget, renameValue,
    searchQuery, searchResults, activeTabPath, modifiedTabs,
    onNewFileClick, onNewFolderClick, onSetNewFileName, onCreateFile, onCancelNewFile,
    onSetRenameValue, onDoRename, onCancelRename,
    onSetSearchQuery, onSearch, onOpenFile, onContextMenu,
    onClose, onNeuralReview, onCreateProject
  } = props;

  return (
    <div className="w-full h-full bg-[#252526] border-r border-[#333333] flex flex-col shrink-0 z-10 relative">
      <div className="px-4 py-2 flex items-center justify-between shrink-0 h-9">
        <span className="text-[11px] font-medium text-[#CCCCCC] uppercase tracking-wide">{sidePanel}</span>
        <div className="flex items-center gap-1.5">
          {sidePanel === 'files' && (
            <>
              <button
                onClick={onNewFileClick}
                className="text-[#CCCCCC] hover:text-white p-1 rounded hover:bg-white/10 transition-all"
                title="New File"
              >
                <FilePlus size={14} />
              </button>
              {onNewFolderClick && (
                <button
                  onClick={onNewFolderClick}
                  className="text-[#CCCCCC] hover:text-white p-1 rounded hover:bg-white/10 transition-all"
                  title="New Folder"
                >
                  <FolderPlus size={14} />
                </button>
              )}
            </>
          )}
          <button onClick={onClose} className="text-[#CCCCCC] hover:text-white p-1 rounded hover:bg-white/10 transition-all">
            <Layout size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
        {sidePanel === 'files' && (
          <div className="space-y-0.5 mt-2">
            {showNewFile && (
              <form
                onSubmit={(e) => { e.preventDefault(); onCreateFile(); }}
                className="flex items-center gap-2 px-2 py-1 bg-[#3C3C3C] border border-[#007ACC] rounded mb-1"
              >
                {isNewFolder ? <FolderPlus size={14} className="text-[#007ACC] shrink-0" /> : <FilePlus size={14} className="text-[#007ACC] shrink-0" />}
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-[13px] outline-none text-[#CCCCCC] font-sans placeholder:text-[#858585]"
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
                className="flex items-center gap-2 px-2 py-1 bg-[#3C3C3C] border border-[#007ACC] rounded mb-1"
              >
                <AlignLeft size={14} className="text-[#007ACC] shrink-0" />
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-[13px] outline-none text-[#CCCCCC] font-sans"
                  value={renameValue}
                  onChange={(e) => onSetRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && onCancelRename()}
                />
              </form>
            )}
            {project ? (
              <FileTreeNode path={project.rootPath} name={project.name} depth={0} onSelect={onOpenFile} onContextMenu={onContextMenu} selectedPath={activeTabPath || ""} />
            ) : (
              <>
                <FileTreeNode path="/home/user" name="home" depth={0} onSelect={onOpenFile} onContextMenu={onContextMenu} selectedPath={activeTabPath || ""} />
                <FileTreeNode path="/system/apps" name="apps" depth={0} onSelect={onOpenFile} onContextMenu={onContextMenu} selectedPath={activeTabPath || ""} />
              </>
            )}
          </div>
        )}

        {sidePanel === 'search' && (
          <div className="space-y-3 px-2 mt-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-[#858585]" />
              <input
                className="w-full bg-[#3C3C3C] border border-[#3C3C3C] rounded pl-8 pr-3 py-1.5 text-[13px] outline-none focus:border-[#007ACC] text-[#CCCCCC] font-sans transition-colors"
                placeholder="Search..."
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
                  className="w-full text-left p-2 rounded hover:bg-[#2A2D2E] transition-all group"
                >
                  <div className="text-[12px] text-[#569CD6] font-medium truncate flex items-center gap-1.5">
                    <File size={10} />
                    {r.path.split('/').pop()}
                    <span className="text-[#858585] text-[10px]">:{r.line}</span>
                  </div>
                  <div className="text-[11px] text-[#CCCCCC] truncate font-mono mt-1 opacity-80 group-hover:opacity-100">{r.text}</div>
                </button>
              ))}
              {searchResults.length === 0 && searchQuery && (
                <div className="text-xs text-[#858585] text-center py-8 flex flex-col items-center gap-2">
                  <ShieldAlert size={24} className="opacity-20" /> No matches found
                </div>
              )}
            </div>
          </div>
        )}

        {sidePanel === 'git' && (
          <div className="p-2 space-y-3 mt-2">
            <div className="p-3 bg-[#1E1E1E] rounded border border-[#333333] text-xs text-[#CCCCCC] space-y-2">
              <div className="flex items-center gap-2 text-[#569CD6] font-bold uppercase tracking-widest">
                <GitBranch size={14} /> main
              </div>
              <div className="flex justify-between">
                <span className="text-[#858585]">Tracked Nodes:</span>
                <span className="text-white">
                  {Object.keys(localStorage).filter((k) => k.startsWith('vfs_')).length}
                </span>
              </div>
              <div className="text-[10px] text-[#858585] mt-2">VFS Local Persistence</div>
            </div>
            {modifiedTabs.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-[#858585] mb-2 uppercase tracking-wide px-1">Modified Manifests</div>
                {modifiedTabs.map((t) => (
                  <div
                    key={t.path}
                    className="flex items-center gap-2 text-[12px] text-[#E5C07B] py-1 px-2 hover:bg-[#2A2D2E] rounded mb-1"
                  >
                    <span className="font-bold">M</span> {t.name}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={onNeuralReview}
              className="w-full p-2 bg-[#007ACC]/10 hover:bg-[#007ACC]/20 border border-[#007ACC]/30 rounded text-[11px] font-bold text-[#007ACC] transition-all flex items-center justify-center gap-2 mt-4"
            >
              <Sparkles size={14} /> Neural Review
            </button>
          </div>
        )}

        {sidePanel === 'project' && (
          <div className="p-2 space-y-3 mt-2">
            <div className="p-3 bg-[#1E1E1E] rounded border border-[#333333] text-xs text-[#CCCCCC] space-y-2">
              <div className="flex items-center gap-2 text-[#569CD6] font-bold uppercase tracking-widest">
                <Layout size={14} /> Project Overview
              </div>
              <div className="text-[11px] text-[#858585] mt-2 leading-relaxed">
                Open a generated app or a folder to see project details here.
              </div>
              {onCreateProject && (
                <button
                  onClick={onCreateProject}
                  className="w-full p-2 mt-3 bg-[#007ACC] hover:bg-[#005A9E] rounded text-white text-[11px] font-bold transition-all flex items-center justify-center gap-2"
                >
                  <FilePlus size={14} /> Create New Project
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
