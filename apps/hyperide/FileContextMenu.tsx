import React from 'react';
import {
  FilePlus, FolderOpen, File, AlignLeft, Copy, X,
} from 'lucide-react';
import type { ContextMenuState } from './types';

interface FileContextMenuProps {
  state: ContextMenuState;
  onNewFileHere: (path: string) => void;
  onOpenFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onRename: (path: string) => void;
  onDuplicate: (path: string) => void;
  onCopyPath: (path: string) => void;
  onDelete: (path: string) => void;
}

// Right-click menu shown on file-tree items. The parent decides whether
// the clicked target is a directory (`isDir`) and passes the context
// state in. Actions are routed back to the parent via callbacks.
export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  state,
  onNewFileHere,
  onOpenFolder,
  onOpenFile,
  onRename,
  onDuplicate,
  onCopyPath,
  onDelete,
}) => {
  return (
    <div
      className="fixed z-50 bg-[#121214]/95 border border-white/10 rounded-xl shadow-[0_10px_50px_rgba(0,0,0,0.9)] py-2 text-xs backdrop-blur-3xl"
      style={{
        left: Math.min(state.x, window.innerWidth - 220),
        top: Math.min(state.y, window.innerHeight - 200),
        minWidth: '220px',
      }}
    >
      {state.isDir ? (
        <>
          <button
            onClick={() => { onNewFileHere(state.path); }}
            className="w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors flex items-center gap-3 font-medium"
          >
            <FilePlus size={16} /> New File Here
          </button>
          <button
            onClick={() => { onOpenFolder(state.path); }}
            className="w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-blue-500/20 hover:text-blue-400 transition-colors flex items-center gap-3 font-medium"
          >
            <FolderOpen size={16} /> Open Folder
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => { onOpenFile(state.path); }}
            className="w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-blue-500/20 hover:text-blue-400 transition-colors flex items-center gap-3 font-medium"
          >
            <File size={16} /> Open File
          </button>
          <button
            onClick={() => onRename(state.path)}
            className="w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 font-medium"
          >
            <AlignLeft size={16} /> Rename
          </button>
          <button
            onClick={() => onDuplicate(state.path)}
            className="w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 font-medium"
          >
            <Copy size={16} /> Duplicate
          </button>
          <button
            onClick={() => onCopyPath(state.path)}
            className="w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 font-medium"
          >
            <Copy size={16} /> Copy Path
          </button>
          <div className="border-t border-white/10 my-1 mx-3" />
          <button
            onClick={() => onDelete(state.path)}
            className="w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-3 font-medium"
          >
            <X size={16} /> Delete File
          </button>
        </>
      )}
    </div>
  );
};
