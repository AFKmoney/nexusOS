import React, { useState } from 'react';
import { vfs } from '../../kernel/fileSystem';
import { ChevronRight, ChevronDown, FolderOpen, Folder } from 'lucide-react';
import { fileIcon } from './syntax';

interface FileTreeNodeProps {
  path: string;
  name: string;
  depth: number;
  onSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isDir: boolean) => void;
  selectedPath: string;
}

// Recursively renders a VFS directory tree. Each directory is collapsible;
// the root node (depth 0) starts expanded. The tree is sorted with
// directories first, then files alphabetically — matches the original
// HyperIDE behavior.
export const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  path,
  name,
  depth,
  onSelect,
  onContextMenu,
  selectedPath,
}) => {
  const [expanded, setExpanded] = useState(depth === 0);

  const stat = vfs.stat(path);
  const isDir = stat?.type === 'directory';
  const isSelected = path === selectedPath;

  if (isDir) {
    const children = (vfs.listDir(path) || []).sort((a, b) => {
      const aIsDir = vfs.stat(`${path}/${a}`)?.type === 'directory';
      const bIsDir = vfs.stat(`${path}/${b}`)?.type === 'directory';
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

    return (
      <div className="relative">
        <button
          onClick={() => setExpanded(!expanded)}
          onContextMenu={(e) => onContextMenu(e, path, true)}
          className={`w-full flex items-center gap-1.5 py-0.5 pr-2 text-[13px] font-sans hover:bg-[#2A2D2E] transition-all group ${
            isSelected ? 'bg-[#37373D] text-white' : 'text-[#CCCCCC]'
          }`}
          style={{ paddingLeft: `${4 + depth * 12}px` }}
        >
          {expanded ? (
            <ChevronDown size={14} className="shrink-0 text-[#858585] group-hover:text-[#CCCCCC]" />
          ) : (
            <ChevronRight size={14} className="shrink-0 text-[#858585] group-hover:text-[#CCCCCC]" />
          )}
          {expanded ? (
            <FolderOpen size={14} className="text-[#D4D4D4] shrink-0" />
          ) : (
            <Folder size={14} className="text-[#D4D4D4] shrink-0" />
          )}
          <span className="truncate">{name}</span>
        </button>
        {expanded && (
          <div className="relative">
            <div
              className="absolute left-0 top-0 bottom-0 border-l border-[#404040]"
              style={{ marginLeft: `${10 + depth * 12}px` }}
            />
            {children.map((child) => (
              <FileTreeNode
                key={child}
                path={`${path}/${child}`}
                name={child}
                depth={depth + 1}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
                selectedPath={selectedPath}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(path)}
      onContextMenu={(e) => onContextMenu(e, path, false)}
      className={`w-full flex items-center gap-1.5 py-0.5 pr-2 text-[13px] font-sans hover:bg-[#2A2D2E] transition-all group ${
        isSelected ? 'bg-[#37373D] text-white' : 'text-[#CCCCCC]'
      }`}
      style={{ paddingLeft: `${22 + depth * 12}px` }}
    >
      <div className="opacity-90">
        {fileIcon(name, 14)}
      </div>
      <span className="truncate">{name}</span>
    </button>
  );
};
