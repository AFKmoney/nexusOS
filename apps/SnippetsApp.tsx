import React, { useState, useEffect } from 'react';
import { Code, Copy, Search, Plus, Trash2, Tag, Check } from 'lucide-react';

interface Snippet { id: string; title: string; language: string; code: string; tags: string[]; created: number; }

const LS_KEY = 'nexus_snippets';

export default function SnippetsApp() {
  const [snippets, setSnippets] = useState<Snippet[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(snippets)); }, [snippets]);

  const addSnippet = () => {
    const s: Snippet = { id: uuid(), title: 'Untitled', language: 'typescript', code: '// Your code here\n', tags: [], created: Date.now() };
    setSnippets(prev => [s, ...prev]);
    setSelected(s.id);
  };

  const updateSnippet = (id: string, patch: Partial<Snippet>) => {
    setSnippets(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const deleteSnippet = (id: string) => {
    setSnippets(prev => prev.filter(s => s.id !== id));
    if (selected === id) setSelected(null);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const current = snippets.find(s => s.id === selected);
  const filtered = snippets.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) || 
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const languages = ['typescript', 'javascript', 'python', 'html', 'css', 'json', 'bash', 'rust', 'go', 'sql'];

  return (
    <div className="h-full flex bg-[#050508] text-zinc-100">
      {/* Sidebar */}
      <div className="w-56 border-r border-white/5 flex flex-col shrink-0">
        <div className="p-3 border-b border-white/5 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={12} className="absolute left-2 top-2 text-zinc-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-zinc-900 rounded-lg pl-7 pr-2 py-1.5 text-xs outline-none border border-white/5 focus:border-emerald-500/50" />
          </div>
          <button onClick={addSnippet} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition"><Plus size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(s => (
            <button key={s.id} onClick={() => setSelected(s.id)} className={`w-full text-left px-3 py-2 border-b border-white/5 transition ${selected === s.id ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}>
              <div className="text-xs font-semibold text-white truncate">{s.title}</div>
              <div className="text-[10px] text-zinc-600 flex items-center gap-1 mt-0.5">
                <Code size={10} /> {s.language}
                {s.tags.length > 0 && <span className="ml-1">• {s.tags.join(', ')}</span>}
              </div>
            </button>
          ))}
          {filtered.length === 0 && <div className="p-4 text-xs text-zinc-600 text-center">No snippets</div>}
        </div>
        <div className="p-2 border-t border-white/5 text-[10px] text-zinc-600 text-center">{snippets.length} snippets</div>
      </div>

      {/* Editor */}
      {current ? (
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 bg-black/20">
            <input value={current.title} onChange={e => updateSnippet(current.id, { title: e.target.value })} className="flex-1 bg-transparent text-sm font-semibold text-white outline-none" />
            <select value={current.language} onChange={e => updateSnippet(current.id, { language: e.target.value })} className="bg-zinc-900 text-xs text-zinc-400 px-2 py-1 rounded border border-white/10 outline-none">
              {languages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <button onClick={() => copyCode(current.code)} className={`p-1.5 rounded-lg transition ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button onClick={() => deleteSnippet(current.id)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"><Trash2 size={14} /></button>
          </div>
          <textarea
            value={current.code}
            onChange={e => updateSnippet(current.id, { code: e.target.value })}
            className="flex-1 bg-transparent p-4 font-mono text-sm text-emerald-300 outline-none resize-none"
            spellCheck={false}
          />
          <div className="px-4 py-2 border-t border-white/5 flex items-center gap-2">
            <Tag size={12} className="text-zinc-600" />
            <input
              value={current.tags.join(', ')}
              onChange={e => updateSnippet(current.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              className="flex-1 bg-transparent text-xs text-zinc-400 outline-none"
              placeholder="Tags (comma separated)"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-600">
          <div className="text-center">
            <Code size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Select or create a snippet</p>
          </div>
        </div>
      )}
    </div>
  );
}
