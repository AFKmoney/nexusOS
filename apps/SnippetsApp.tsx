import React, { useState, useEffect } from 'react';
import { FileCode2, Plus, Trash2, Search, Copy, Check, TerminalSquare, Zap, Braces, Layers } from 'lucide-react';
import { useOS } from '../store/osStore';
import { uuid } from '../utils/uuid';

interface Snippet { id: string; title: string; code: string; language: string; tags: string[]; created: number; }
const LS_KEY = 'nexus_snippets_v2';

export default function SnippetsApp() {
  const { addNotification } = useOS();
  const [snippets, setSnippets] = useState<Snippet[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load snippets from localStorage:', e);
    }
    return [
      { id: '1', title: 'Neural Initialization', code: 'const core = new NeuralCore();\ncore.boot();', language: 'typescript', tags: ['KERNEL'], created: Date.now() },
      { id: '2', title: 'VFS Mount Protocol', code: 'vfs.mount("/home/user", device);', language: 'javascript', tags: ['FILESYSTEM'], created: Date.now() },
    ];
  });

  const [search, setSearch] = useState('');
  const [activeSnippet, setActiveSnippet] = useState<Snippet | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(snippets));
  }, [snippets]);

  const addSnippet = () => {
    const s: Snippet = { 
      id: uuid(), 
      title: 'New Neural Pattern', 
      code: '// Enter system logic...', 
      language: 'typescript', 
      tags: ['NEW'], 
      created: Date.now() 
    };
    setSnippets([s, ...snippets]);
    setActiveSnippet(s);
  };

  const updateSnippet = (id: string, updates: Partial<Snippet>) => {
    setSnippets(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    if (activeSnippet?.id === id) setActiveSnippet({ ...activeSnippet, ...updates });
  };

  const deleteSnippet = (id: string) => {
    setSnippets(prev => prev.filter(s => s.id !== id));
    if (activeSnippet?.id === id) setActiveSnippet(null);
  };

  const copyCode = (s: Snippet) => {
    navigator.clipboard.writeText(s.code);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
    addNotification({ title: 'Pattern Copied', message: 'Logic extracted to clipboard buffer.', type: 'info' });
  };

  const filtered = snippets.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
            <FileCode2 size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Pattern Repository</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Neural Logic Storage</p>
          </div>
        </div>
        <button onClick={addSnippet} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95">
          <Plus size={14} /> New Pattern
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 border-r border-white/5 flex flex-col shrink-0 bg-black/20">
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-zinc-600" size={14} />
              <input 
                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-700"
                placeholder="Search repository..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filtered.map(s => (
              <button 
                key={s.id}
                onClick={() => setActiveSnippet(s)}
                className={`w-full flex flex-col gap-1 p-3 rounded-xl transition-all text-left group ${activeSnippet?.id === s.id ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-white/5 border border-transparent'}`}
              >
                <div className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">{s.title}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">{s.language}</span>
                  <span className="text-[8px] font-black text-zinc-700 uppercase bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{s.tags[0]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-[#0a0a0c] relative">
          {activeSnippet ? (
            <div className="h-full flex flex-col animate-in fade-in duration-300">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <input 
                  className="bg-transparent text-lg font-black text-white outline-none w-1/2 focus:text-emerald-400 transition-colors"
                  value={activeSnippet.title}
                  onChange={e => updateSnippet(activeSnippet.id, { title: e.target.value })}
                />
                <div className="flex items-center gap-3">
                  <button onClick={() => copyCode(activeSnippet)} className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-xs font-bold uppercase tracking-widest transition-all">
                    {copiedId === activeSnippet.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />} 
                    {copiedId === activeSnippet.id ? 'Extracted' : 'Copy'}
                  </button>
                  <button onClick={() => deleteSnippet(activeSnippet.id)} className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 relative group">
                <textarea 
                  className="w-full h-full bg-transparent p-8 text-sm font-mono text-emerald-100/80 outline-none resize-none selection:bg-emerald-500/20 leading-relaxed custom-scrollbar"
                  spellCheck={false}
                  value={activeSnippet.code}
                  onChange={e => updateSnippet(activeSnippet.id, { code: e.target.value })}
                />
                <div className="absolute bottom-6 right-8 flex items-center gap-4 opacity-30 group-hover:opacity-100 transition-opacity">
                  <select 
                    className="bg-zinc-900 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-lg px-3 py-1 outline-none focus:border-emerald-500/50"
                    value={activeSnippet.language}
                    onChange={e => updateSnippet(activeSnippet.id, { language: e.target.value })}
                  >
                    {['typescript', 'javascript', 'python', 'html', 'css', 'rust', 'go', 'markdown'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
              <Braces size={64} className="mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">Select a pattern node to decrypt</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
