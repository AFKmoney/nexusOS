import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../store/osStore';
import { vfs, SYSTEM_VFS_APP_ID } from '../kernel/fileSystem';
import { Search, File, Folder, AppWindow, MessageSquare } from 'lucide-react';
import { episodicMemory } from '../kernel/episodicMemory';

interface SearchResult {
  type: 'file' | 'app' | 'conversation';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function Spotlight({ onClose }: { onClose: () => void }) {
  const { registry, openWindow } = useOS();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const found: SearchResult[] = [];

    // Search apps
    registry.forEach(app => {
      if (app.name.toLowerCase().includes(q) || app.id.toLowerCase().includes(q)) {
        found.push({
          type: 'app',
          title: app.name,
          subtitle: `App · ${app.id}`,
          icon: <AppWindow size={18} className="text-emerald-400" />,
          action: () => { openWindow(app.id); onClose(); },
        });
      }
    });

    // Search files (recursive from /home/user and /system/apps)
    const searchDir = (dir: string, depth: number = 0) => {
      if (depth > 3) return;
      const items = vfs.listDir(dir, SYSTEM_VFS_APP_ID);
      if (!items) return;
      for (const item of items) {
        const fullPath = `${dir}/${item}`;
        if (item.toLowerCase().includes(q)) {
          const stat = vfs.stat(fullPath);
          const isDir = stat?.type === 'directory';
          found.push({
            type: 'file',
            title: item,
            subtitle: `File · ${fullPath}`,
            icon: isDir ? <Folder size={18} className="text-amber-400" /> : <File size={18} className="text-zinc-400" />,
            action: () => {
              if (isDir) {
                openWindow('files', { path: fullPath });
              } else if (item.endsWith('.html')) {
                openWindow('forge', { path: fullPath });
              } else {
                openWindow('hyperide', { path: fullPath });
              }
              onClose();
            },
          });
        }
        const stat = vfs.stat(fullPath);
        if (stat?.type === 'directory' && !item.startsWith('.')) {
          searchDir(fullPath, depth + 1);
        }
      }
    };
    try {
      searchDir('/home/user');
      searchDir('/system/apps');
    } catch {}

    // Search conversations (episodic memory)
    try {
      const episodes = episodicMemory.getRecent(50);
      episodes.forEach(ep => {
        if (ep.userMessage.toLowerCase().includes(q) || ep.aiResponse.toLowerCase().includes(q)) {
          const preview = ep.userMessage.slice(0, 80) + (ep.userMessage.length > 80 ? '...' : '');
          found.push({
            type: 'conversation',
            title: preview,
            subtitle: `Conversation · ${new Date(ep.timestamp).toLocaleString()}`,
            icon: <MessageSquare size={18} className="text-blue-400" />,
            action: () => { openWindow('daemon_chat'); onClose(); },
          });
        }
      });
    } catch {}

    setResults(found.slice(0, 12));
    setSelectedIdx(0);
  }, [query, registry, openWindow, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      results[selectedIdx]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-4 bg-[#0a0a0f] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <Search size={20} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files, apps, conversations..."
            className="flex-1 bg-transparent text-white text-lg placeholder-zinc-600 outline-none"
          />
          <kbd className="text-[10px] text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {results.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={r.action}
                onMouseEnter={() => setSelectedIdx(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  i === selectedIdx ? 'bg-emerald-500/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="shrink-0">{r.icon}</div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium text-white truncate">{r.title}</div>
                  <div className="text-[10px] text-zinc-500 font-mono truncate">{r.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="px-5 py-8 text-center text-zinc-600 text-sm">
            No results for "{query}"
          </div>
        )}

        {!query.trim() && (
          <div className="px-5 py-8 text-center text-zinc-600 text-sm">
            Start typing to search files, apps, and conversations
          </div>
        )}
      </div>
    </div>
  );
}
