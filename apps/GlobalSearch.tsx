import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../store/osStore';
import { vfs } from '../kernel/fileSystem';
import { memory } from '../kernel/memory';
import { Search, X, FileText, FolderOpen, Brain, Cpu, ArrowRight, Command } from 'lucide-react';

interface SearchResult {
  type: 'app' | 'file' | 'memory' | 'command';
  icon: any;
  title: string;
  description: string;
  action: () => void;
}

export default function GlobalSearchOverlay({ onClose }: { onClose: () => void }) {
  const { registry, openWindow } = useOS();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const res: SearchResult[] = [];

    // Search apps
    registry.forEach((app: any) => {
      if (app.name.toLowerCase().includes(q) || app.id.toLowerCase().includes(q) || (app.description || '').toLowerCase().includes(q)) {
        res.push({
          type: 'app',
          icon: Cpu,
          title: app.name,
          description: app.description || `Open ${app.name}`,
          action: () => { openWindow(app.id); onClose(); },
        });
      }
    });

    // Search VFS files
    const searchNode = (path: string) => {
      const node = vfs.resolveNode(path);
      if (!node) return;
      if (node.type === 'directory' && node.children) {
        Object.entries(node.children).forEach(([name, child]) => {
          const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;
          if (name.toLowerCase().includes(q)) {
            res.push({
              type: 'file',
              icon: (child as any).type === 'directory' ? FolderOpen : FileText,
              title: name,
              description: fullPath,
              action: () => {
                if ((child as any).type === 'directory') openWindow('explorer', { path: fullPath });
                else openWindow('notepad', { path: fullPath });
                onClose();
              },
            });
          }
          if ((child as any).type === 'directory') searchNode(fullPath);
        });
      }
    };
    searchNode('/home/user');

    // Search memory
    const memResults = memory.recall(query);
    memResults.slice(0, 5).forEach(m => {
      res.push({
        type: 'memory',
        icon: Brain,
        title: m.content.slice(0, 60),
        description: `Memory — ${new Date(m.timestamp).toLocaleDateString()}`,
        action: () => { onClose(); },
      });
    });

    // Commands
    const commands = [
      { name: 'New File', desc: 'Create a new file', act: () => { openWindow('notepad'); onClose(); } },
      { name: 'Open Terminal', desc: 'Launch terminal', act: () => { openWindow('terminal'); onClose(); } },
      { name: 'Open Settings', desc: 'System settings', act: () => { openWindow('settings'); onClose(); } },
      { name: 'Build App', desc: 'AI app generator', act: () => { openWindow('forge'); onClose(); } },
    ];
    commands.forEach(c => {
      if (c.name.toLowerCase().includes(q)) {
        res.push({ type: 'command', icon: Command, title: c.name, description: c.desc, action: c.act });
      }
    });

    setResults(res.slice(0, 15));
    setSelected(0);
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) { results[selected].action(); }
  };

  const typeColors: Record<string, string> = {
    app: 'text-emerald-400 bg-emerald-500/10',
    file: 'text-cyan-400 bg-cyan-500/10',
    memory: 'text-violet-400 bg-violet-500/10',
    command: 'text-amber-400 bg-amber-500/10',
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-[560px] bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <Search size={18} className="text-zinc-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search apps, files, memory, commands..."
            className="flex-1 bg-transparent text-white text-lg outline-none placeholder-zinc-600"
          />
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg"><X size={16} className="text-zinc-400" /></button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto py-2">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={r.action}
                onMouseEnter={() => setSelected(i)}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${i === selected ? 'bg-white/5' : 'hover:bg-white/3'}`}
              >
                <div className={`p-1.5 rounded-lg ${typeColors[r.type] || ''}`}>
                  <r.icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{r.title}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{r.description}</div>
                </div>
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${typeColors[r.type] || 'text-zinc-500'}`}>{r.type}</span>
                {i === selected && <ArrowRight size={12} className="text-zinc-400" />}
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="py-8 text-center text-zinc-600 text-sm">No results for "{query}"</div>
        )}

        {!query && (
          <div className="py-6 text-center text-zinc-600 text-xs">
            <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-500 font-mono">Ctrl+Space</span> to open anytime
          </div>
        )}
      </div>
    </div>
  );
}
