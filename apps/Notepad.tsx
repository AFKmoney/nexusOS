import React, { useState, useEffect, useRef } from 'react';
import { vfs } from '../kernel/fileSystem';
import { Save, File, Plus, X, Search, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { useOS } from '../store/osStore';
import { uuid } from '../utils/uuid';

interface Tab {
  id: string;
  path: string;
  content: string;
  savedContent: string;
}

export default function NotepadApp({ windowId }: { windowId: string }) {
  const { windows, updateWindow } = useOS();
  const win = windows.find(w => w.id === windowId);
  
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);

  // Initialize from win.data on first load or when a new file is passed
  useEffect(() => {
    if (win?.data?.path) {
      const p = win.data.path;
      // Check if already open
      const existing = tabs.find(t => t.path === p);
      if (existing) {
        setActiveTabId(existing.id);
      } else {
        const fileContent = vfs.readFile(p) || '';
        const newTab = { id: uuid(), path: p, content: fileContent, savedContent: fileContent };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
      // Clear win.data so we don't reopen on every render
      updateWindow(windowId, { data: { ...win.data, path: undefined, content: undefined } });
    } else if (tabs.length === 0) {
      // Create empty tab
      const newTab = { id: uuid(), path: '', content: '', savedContent: '' };
      setTabs([newTab]);
      setActiveTabId(newTab.id);
    }
  }, [win?.data?.path]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const updateActiveTab = (updates: Partial<Tab>) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
  };

  const handleScroll = () => {
    if (textAreaRef.current && linesRef.current) {
      linesRef.current.scrollTop = textAreaRef.current.scrollTop;
    }
  };

  // Auto-save logic
  useEffect(() => {
    if (!activeTab || !activeTab.path) return;
    if (activeTab.content !== activeTab.savedContent) {
      const timer = setTimeout(() => {
        handleSave(activeTab.id);
      }, 2000); // Auto-save after 2s of inactivity
      return () => clearTimeout(timer);
    }
  }, [activeTab?.content]);

  const handleSave = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !tab.path) return;
    const fullPath = tab.path.startsWith('/') ? tab.path : `/home/user/${tab.path}`;
    vfs.writeFile(fullPath, tab.content);
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, savedContent: t.content } : t));
  };

  const closeTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.content !== tab.savedContent) {
      if (!confirm(`Save changes to ${tab.path || 'Untitled'}?`)) return;
      handleSave(tab.id);
    }
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
    }
    if (newTabs.length === 0) {
      const nt = { id: uuid(), path: '', content: '', savedContent: '' };
      setTabs([nt]);
      setActiveTabId(nt.id);
    }
  };

  const newTab = () => {
    const nt = { id: uuid(), path: '', content: '', savedContent: '' };
    setTabs(prev => [...prev, nt]);
    setActiveTabId(nt.id);
  };

  const handleReplace = () => {
    if (!activeTab || !findQuery) return;
    const newContent = activeTab.content.replace(findQuery, replaceQuery);
    updateActiveTab({ content: newContent });
  };
  
  const handleReplaceAll = () => {
    if (!activeTab || !findQuery) return;
    const newContent = activeTab.content.split(findQuery).join(replaceQuery);
    updateActiveTab({ content: newContent });
  };

  if (!activeTab) return null;

  const linesCount = activeTab.content.split('\n').length || 1;
  const wordCount = activeTab.content.split(/\s+/).filter(Boolean).length;
  const charCount = activeTab.content.length;
  const isDirty = activeTab.content !== activeTab.savedContent;

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-200 font-sans">
      {/* Tabs */}
      <div className="flex items-center bg-black/40 overflow-x-auto border-b border-white/5 no-scrollbar">
        {tabs.map(tab => (
          <div key={tab.id} onClick={() => setActiveTabId(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 border-r border-white/5 cursor-pointer max-w-[200px] group transition ${activeTabId === tab.id ? 'bg-zinc-900 border-t-2 border-t-emerald-500 text-white' : 'hover:bg-white/5 text-zinc-400'}`}>
            <File size={12} className={activeTabId === tab.id ? 'text-emerald-400' : 'text-zinc-600'} />
            <span className="text-xs truncate flex-1">{tab.path.split('/').pop() || 'Untitled'}</span>
            {tab.content !== tab.savedContent && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            <button onClick={(e) => closeTab(e, tab.id)} className={`p-0.5 rounded-md hover:bg-white/10 ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <X size={10} />
            </button>
          </div>
        ))}
        <button onClick={newTab} className="p-2 text-zinc-500 hover:text-white transition"><Plus size={14} /></button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-900 border-b border-white/5">
        <div className="flex items-center gap-1">
          <input 
            value={activeTab.path} 
            onChange={e => updateActiveTab({ path: e.target.value })}
            placeholder="Filename (e.g. docs/notes.txt)"
            className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs w-64 outline-none focus:border-emerald-500/50 transition-colors"
          />
          <button onClick={() => handleSave(activeTab.id)} className="p-1 text-zinc-400 hover:text-emerald-400 hover:bg-white/5 rounded transition" title="Save (Auto-saves every 2s)">
            <Save size={14} />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={() => setShowFind(!showFind)} className={`p-1 rounded transition ${showFind ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`} title="Find/Replace">
            <Search size={14} />
          </button>
        </div>
      </div>

      {/* Find/Replace Overlay */}
      {showFind && (
        <div className="bg-zinc-800 border-b border-white/5 px-3 py-2 flex flex-col gap-2 shadow-inner z-10 animate-in slide-in-from-top-2 fade-in">
          <div className="flex items-center gap-2">
            <Search size={12} className="text-zinc-400" />
            <input value={findQuery} onChange={e => setFindQuery(e.target.value)} placeholder="Find" className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-emerald-500/50 flex-1" />
            <input value={replaceQuery} onChange={e => setReplaceQuery(e.target.value)} placeholder="Replace" className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-emerald-500/50 flex-1" />
            <button onClick={handleReplace} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs transition">Replace</button>
            <button onClick={handleReplaceAll} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs transition">All</button>
            <button onClick={() => setShowFind(false)} className="p-1 text-zinc-500 hover:text-white transition"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden bg-[#0A0A0C]">
        {/* Line Numbers Gutter */}
        <div ref={linesRef} className="w-10 bg-zinc-900/50 border-r border-white/5 text-right pr-2 py-4 text-xs font-mono text-zinc-600 overflow-hidden select-none shrink-0" style={{ lineHeight: '1.5' }}>
          {Array.from({ length: linesCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        
        {/* Text Area */}
        <textarea 
          ref={textAreaRef}
          className="flex-1 bg-transparent p-4 outline-none font-mono resize-none text-xs text-zinc-300 leading-relaxed whitespace-pre"
          style={{ lineHeight: '1.5' }}
          value={activeTab.content}
          onChange={e => updateActiveTab({ content: e.target.value })}
          onScroll={handleScroll}
          spellCheck={false}
          placeholder="Start typing..."
        />
      </div>

      {/* Footer Status Bar */}
      <div className="bg-black/40 border-t border-white/5 py-1 px-3 flex justify-between items-center text-[10px] text-zinc-500 select-none">
        <div className="flex gap-4">
          <span className={isDirty ? 'text-amber-500' : 'text-emerald-500'}>{isDirty ? 'Unsaved' : 'Saved'}</span>
          <span>{linesCount} lines</span>
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
        </div>
        <div>UTF-8</div>
      </div>
    </div>
  );
}