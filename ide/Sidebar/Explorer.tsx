
import React from 'react';
import { vfs } from '../../kernel/fileSystem';
import { Folder, FileCode, ChevronRight, ChevronDown, Plus, FilePlus, Trash2 } from 'lucide-react';

interface Props {
  onFileOpen: (path: string) => void;
  currentPath: string;
}

export const Explorer: React.FC<Props> = ({ onFileOpen, currentPath }) => {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(['/home/user']));
  const [refreshKey, setRefreshKey] = React.useState(0);

  const toggle = (path: string) => {
    const next = new Set(expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
  };

  const createNewFile = () => {
    const name = prompt("File name:");
    if (name) {
      vfs.writeFile(`/home/user/${name}`, "// New script created by HyperIDE");
      setRefreshKey(k => k + 1);
    }
  };

  const deleteFile = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (confirm(`Delete ${path}?`)) {
      vfs.delete(path);
      setRefreshKey(k => k + 1);
    }
  };

  const renderTree = (path: string, depth = 0) => {
    const items = vfs.listDir(path);
    return items.map(name => {
      const fullPath = `${path === '/' ? '' : path}/${name}`;
      const stat = vfs.stat(fullPath);
      const isDir = stat?.type === 'directory';

      return (
        <div key={fullPath}>
          <div 
            className={`flex items-center gap-1 py-1 px-2 hover:bg-white/5 cursor-pointer group text-[11px] ${currentPath === fullPath ? 'bg-blue-500/10 text-blue-400' : ''}`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => isDir ? toggle(fullPath) : onFileOpen(fullPath)}
          >
            {isDir ? (
              expanded.has(fullPath) ? <ChevronDown size={12} className="text-zinc-600" /> : <ChevronRight size={12} className="text-zinc-600" />
            ) : <div className="w-3" />}
            
            {isDir ? <Folder size={14} className="text-blue-500/60" /> : <FileCode size={14} className="text-zinc-500 group-hover:text-blue-400" />}
            <span className={`truncate flex-1 ${isDir ? 'font-bold text-zinc-400' : 'text-zinc-500 group-hover:text-zinc-200'}`}>{name}</span>
            
            {!isDir && (
                <Trash2 size={10} className="opacity-0 group-hover:opacity-40 hover:text-red-500 hover:opacity-100 transition-all" onClick={(e) => deleteFile(e, fullPath)} />
            )}
          </div>
          {isDir && expanded.has(fullPath) && renderTree(fullPath, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#08080a]">
      <div className="p-3 flex items-center justify-between text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] border-b border-white/5">
        <span>Explorer</span>
        <div className="flex gap-2">
          <FilePlus size={14} className="hover:text-white cursor-pointer opacity-60" onClick={createNewFile} />
          <Plus size={14} className="hover:text-white cursor-pointer opacity-60" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar" key={refreshKey}>
        {renderTree('/home/user')}
      </div>
    </div>
  );
};
