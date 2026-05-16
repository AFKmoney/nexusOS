import React, { useState, useEffect } from 'react';
import { ChevronLeft, Play, Save, FolderOpen, Plus, X, Code, FileIcon } from 'lucide-react';
import type { MobileAppProps } from '../types';
import { vfs } from '../../kernel/fileSystem';
import { getDesktopPath } from '../../appShellConstants';
import { useMobile } from '../store/mobileStore';

const STARTER = `// NexusOS HyperIDE — Mobile Edition
// A powerful in-browser code editor linked to VFS

function greet(name: string): string {
  return \`Hello, \${name}! Welcome to NexusOS.\`;
}

const message = greet('DAEMON');
console.log(message);
`;

const LANG_MAP: Record<string, string> = {
  ts: 'TypeScript', js: 'JavaScript', py: 'Python',
  html: 'HTML', css: 'CSS', json: 'JSON', md: 'Markdown',
};

interface FileTab { id: string; name: string; content: string; lang: string; path?: string; }

export default function MobileHyperIDE({ onBack }: MobileAppProps) {
  const { currentUser } = useMobile();
  const desktopPath = getDesktopPath(currentUser?.id ?? null);
  
  const [tabs, setTabs] = useState<FileTab[]>([
    { id: '1', name: 'main.ts', content: STARTER, lang: 'ts' },
  ]);
  const [activeTab, setActiveTab] = useState('1');
  const [output, setOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [isVfsBrowserOpen, setIsVfsBrowserOpen] = useState(false);

  const active = tabs.find(t => t.id === activeTab)!;

  const updateContent = (content: string) =>
    setTabs(ts => ts.map(t => t.id === activeTab ? { ...t, content } : t));

  const saveFile = () => {
    if (!active) return;
    const path = active.path || `${desktopPath}/${active.name}`;
    vfs.writeFile(path, active.content);
    setTabs(ts => ts.map(t => t.id === activeTab ? { ...t, path } : t));
    alert(`Saved to: ${path}`);
  };

  const openFromVfs = (path: string) => {
    const name = path.split('/').pop() || 'file';
    const content = vfs.readFile(path) || '';
    const lang = name.split('.').pop() || 'ts';
    
    // Check if already open
    const existing = tabs.find(t => t.path === path);
    if (existing) {
      setActiveTab(existing.id);
    } else {
      const id = Date.now().toString();
      setTabs(ts => [...ts, { id, name, content, lang, path }]);
      setActiveTab(id);
    }
    setIsVfsBrowserOpen(false);
  };

  const newTab = () => {
    const id = Date.now().toString();
    const tab: FileTab = { id, name: `untitled.ts`, content: '// New file\n', lang: 'ts' };
    setTabs(ts => [...ts, tab]);
    setActiveTab(id);
  };

  const closeTab = (id: string) => {
    const next = tabs.filter(t => t.id !== id);
    setTabs(next);
    if (activeTab === id) setActiveTab(next[next.length - 1]?.id ?? '');
  };

  const run = () => {
    try {
      const logs: string[] = [];
      const fake = { log: (...a: any[]) => logs.push(a.map(String).join(' ')), error: (...a: any[]) => logs.push('ERROR: ' + a.join(' ')) };
      // Strip types and run as JS
      const js = active.content
        .replace(/:\s*\w+(\[\])?\s*(?=[,)=]|$)/gm, '')
        .replace(/^(interface|type|declare)\s.*/gm, '')
        .replace(/<[A-Z]\w*>/g, '');
      new Function('console', js)(fake);
      setOutput(logs.join('\n') || '(no output)');
    } catch (e: any) {
      setOutput('Runtime error: ' + e.message);
    }
    setShowOutput(true);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#0d0d12' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.95)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={20} className="text-white/70" />
        </button>
        <Code size={16} className="text-emerald-400" />
        <span className="text-white/70 text-[13px] font-medium flex-1">HyperIDE Mobile</span>
        
        <button className="p-1.5 rounded-lg active:bg-white/10" onClick={() => setIsVfsBrowserOpen(true)}>
          <FolderOpen size={16} className="text-white/50" />
        </button>
        <button className="p-1.5 rounded-lg active:bg-white/10" onClick={saveFile}>
          <Save size={16} className="text-white/50" />
        </button>
        <button className="p-1.5 rounded-lg active:bg-white/10" onClick={newTab}>
          <Plus size={16} className="text-white/50" />
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium active:scale-95"
          style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}
          onClick={run}
        >
          <Play size={13} fill="currentColor" /> Run
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            className="flex items-center gap-2 px-4 py-2 flex-none cursor-pointer"
            style={{
              borderBottom: `2px solid ${activeTab === tab.id ? '#10b981' : 'transparent'}`,
              background: activeTab === tab.id ? 'rgba(255,255,255,0.05)' : 'transparent',
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="text-[13px]"
              style={{ color: activeTab === tab.id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>
              {tab.name}
            </span>
            {tabs.length > 1 && (
              <button className="opacity-40 hover:opacity-80"
                onClick={e => { e.stopPropagation(); closeTab(tab.id); }}>
                <X size={12} className="text-white" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          className="w-full h-full p-4 bg-transparent font-mono resize-none outline-none"
          style={{
            fontSize: '13px',
            lineHeight: '1.7',
            color: 'rgba(226,232,240,0.9)',
            caretColor: '#10b981',
            tabSize: 2,
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
          value={active?.content ?? ''}
          onChange={e => updateContent(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />

        {/* Language badge */}
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-medium"
          style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
          {LANG_MAP[active?.lang ?? 'ts'] ?? 'Code'}
        </div>
      </div>

      {/* VFS Browser Overlay */}
      {isVfsBrowserOpen && (
        <div className="absolute inset-0 z-50 bg-[#0d0d12] flex flex-col animate-in slide-in-from-bottom duration-300">
           <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/40">
             <button onClick={() => setIsVfsBrowserOpen(false)}><ChevronLeft size={20} /></button>
             <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-400">VFS Browser</h2>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-2">
             <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Desktop Files</p>
             {(vfs.listDir(desktopPath) || []).map(name => (
               <button 
                 key={name}
                 className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 active:bg-white/10 transition-colors"
                 onClick={() => openFromVfs(`${desktopPath}/${name}`)}
               >
                 <FileIcon size={16} className="text-emerald-400/60" />
                 <span className="text-sm text-white/80">{name}</span>
               </button>
             ))}
             {vfs.listDir(desktopPath)?.length === 0 && (
               <p className="text-xs text-zinc-600 text-center py-10 italic">Desktop is empty.</p>
             )}
           </div>
        </div>
      )}

      {/* Output panel */}
      {showOutput && (
        <div className="flex-shrink-0 border-t border-white/10"
          style={{ background: 'rgba(0,0,0,0.5)', maxHeight: '35%' }}>
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-emerald-400/70 text-[11px] font-mono uppercase tracking-wider">Output</span>
            <button onClick={() => setShowOutput(false)}>
              <X size={14} className="text-white/40" />
            </button>
          </div>
          <pre className="px-4 pb-4 text-[12px] font-mono text-emerald-300/80 overflow-y-auto"
            style={{ maxHeight: 'calc(35% - 36px)' }}>
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
