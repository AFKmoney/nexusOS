import React, { useState, useEffect } from 'react';
import { FileCode2, Plus, Trash2, Search, Copy, Check, Braces, ChevronLeft, MoreVertical, Edit3 } from 'lucide-react';
import { useMobile } from '../store/mobileStore';
import { uuid } from '../../utils/uuid';
import type { MobileAppProps } from '../types';

interface Snippet { id: string; title: string; code: string; language: string; tags: string[]; created: number; }
const LS_KEY = 'nexus_snippets_v2';

export default function MobileSnippetsApp({ onBack }: MobileAppProps) {
  const { addNotification, setClipboard } = useMobile();
  const [snippets, setSnippets] = useState<Snippet[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', title: 'Neural Initialization', code: 'const core = new NeuralCore();\ncore.boot();', language: 'typescript', tags: ['KERNEL'], created: Date.now() },
      { id: '2', title: 'VFS Mount Protocol', code: 'vfs.mount("/home/user", device);', language: 'javascript', tags: ['FILESYSTEM'], created: Date.now() },
    ];
  });

  const [search, setSearch] = useState('');
  const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(snippets));
  }, [snippets]);

  const activeSnippet = snippets.find(s => s.id === activeSnippetId) || null;

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
    setActiveSnippetId(s.id);
    setIsEditing(true);
  };

  const updateSnippet = (id: string, updates: Partial<Snippet>) => {
    setSnippets(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSnippet = (id: string) => {
    setSnippets(prev => prev.filter(s => s.id !== id));
    if (activeSnippetId === id) setActiveSnippetId(null);
  };

  const copyCode = (s: Snippet) => {
    setClipboard(s.code);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
    addNotification({ title: 'Pattern Copied', message: 'Logic extracted to clipboard buffer.', type: 'info' });
  };

  const filtered = snippets.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) || 
    s.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
    s.language.toLowerCase().includes(search.toLowerCase())
  );

  const languages = ['typescript', 'javascript', 'python', 'html', 'css', 'rust', 'go', 'markdown'];

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button
          className="p-1.5 rounded-xl active:bg-white/10 transition-colors"
          onClick={activeSnippetId ? () => setActiveSnippetId(null) : onBack}
        >
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold text-[16px]">
            {activeSnippetId ? 'Pattern Node' : 'Repository'}
          </h1>
        </div>
        {!activeSnippetId && (
          <button 
            onClick={addSnippet}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 active:scale-95 transition-all"
            style={{ border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <Plus size={20} />
          </button>
        )}
        {activeSnippetId && activeSnippet && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => copyCode(activeSnippet)}
              className="p-2 text-zinc-400 active:text-emerald-400 transition-colors"
            >
              {copiedId === activeSnippet.id ? <Check size={20} className="text-emerald-400" /> : <Copy size={20} />}
            </button>
            <button 
              onClick={() => deleteSnippet(activeSnippet.id)}
              className="p-2 text-zinc-400 active:text-red-400 transition-colors"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {/* List View */}
        {!activeSnippetId && (
          <div className="h-full flex flex-col">
            <div className="p-4 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-white/30" size={16} />
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-[14px] text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/20"
                  placeholder="Search repository..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
              {filtered.map(s => (
                <button 
                  key={s.id}
                  onClick={() => setActiveSnippetId(s.id)}
                  className="w-full p-4 rounded-2xl text-left bg-white/[0.03] border border-white/5 active:bg-white/[0.06] active:scale-[0.98] transition-all flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <FileCode2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium text-white truncate">{s.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{s.language}</span>
                      {s.tags.length > 0 && (
                        <span className="text-[10px] text-emerald-400/60 uppercase font-bold tracking-tighter">
                          #{s.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center opacity-20 text-center px-8">
                  <Braces size={48} className="mb-4" />
                  <p className="text-[14px] font-bold uppercase tracking-widest">No matching patterns found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detail View / Editor */}
        {activeSnippetId && activeSnippet && (
          <div className="h-full flex flex-col bg-black/20 animate-in slide-in-from-right duration-300">
            <div className="px-4 py-4 space-y-4 flex-1 overflow-y-auto pb-20">
              <div>
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5 block px-1">Pattern Designation</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-[16px] font-bold outline-none focus:border-emerald-500/40 transition-all"
                  value={activeSnippet.title}
                  onChange={e => updateSnippet(activeSnippet.id, { title: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Logic Stream</label>
                  <select 
                    className="bg-transparent text-[10px] font-black text-emerald-400 uppercase tracking-widest outline-none border-none"
                    value={activeSnippet.language}
                    onChange={e => updateSnippet(activeSnippet.id, { language: e.target.value })}
                  >
                    {languages.map(l => (
                      <option key={l} value={l} className="bg-zinc-900 text-white">{l}</option>
                    ))}
                  </select>
                </div>
                <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/5">
                  <textarea 
                    className="w-full h-[400px] p-5 text-[14px] font-mono text-emerald-200/80 outline-none resize-none bg-transparent leading-relaxed"
                    spellCheck={false}
                    value={activeSnippet.code}
                    onChange={e => updateSnippet(activeSnippet.id, { code: e.target.value })}
                    placeholder="// Initialize system logic..."
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5 block px-1">Neural Tags</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-[14px] font-mono outline-none focus:border-emerald-500/40 transition-all"
                  value={activeSnippet.tags.join(', ')}
                  placeholder="KERNEL, FILESYSTEM, LOGIC..."
                  onChange={e => updateSnippet(activeSnippet.id, { tags: e.target.value.split(',').map(t => t.trim().toUpperCase()).filter(t => t) })}
                />
              </div>
            </div>
            
            <div className="absolute bottom-6 right-6">
              <button 
                onClick={() => setActiveSnippetId(null)}
                className="w-14 h-14 rounded-full bg-emerald-500 shadow-[0_4px_15px_rgba(16,185,129,0.4)] flex items-center justify-center text-white active:scale-90 transition-all"
              >
                <Check size={28} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
