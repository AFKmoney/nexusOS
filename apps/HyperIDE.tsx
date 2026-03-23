
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOS } from '../store/osStore';
import { aiService } from '../services/puterService';
import { vfs } from '../kernel/fileSystem';
import { memory } from '../kernel/memory';
import {
  File, Folder, FolderOpen, Save, Code, X, Plus,
  ChevronRight, ChevronDown, Loader2, Zap, CheckCheck,
  FilePlus, Eye, Sparkles, Search, Layout,
  GitBranch, Copy, Settings2, Braces, Replace,
  WrapText, AlignLeft, MoreHorizontal, ChevronUp
} from 'lucide-react';

// ─── Syntax highlighting ─────────────────────────────────────────
function escapeHtml(text: string): string {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function highlight(code: string, ext: string): string {
  if (!['html','js','ts','tsx','jsx','css','json','py','sh','md'].includes(ext)) return escapeHtml(code);
  let h = escapeHtml(code);
  if (ext === 'json') {
    h = h
      .replace(/(\"(?:[^\"\\]|\\.)*\")\s*:/g,'<span class="text-sky-400">$1</span>:')
      .replace(/:\s*(\"(?:[^\"\\]|\\.)*\")/g,': <span class="text-emerald-300">$1</span>')
      .replace(/:\s*(true|false|null)/g,': <span class="text-purple-400">$1</span>')
      .replace(/:\s*(\d+\.?\d*)/g,': <span class="text-orange-400">$1</span>');
    return h;
  }
  if (ext === 'md') {
    h = h.replace(/^(#{1,6}\s.+)$/gm,'<span class="text-yellow-300 font-bold">$1</span>');
    h = h.replace(/\*\*(.+?)\*\*/g,'<span class="text-white font-bold">$1</span>');
    h = h.replace(/`([^`]+)`/g,'<span class="text-emerald-300 bg-emerald-900/30 px-1 rounded">$1</span>');
    return h;
  }
  const kw = ['const','let','var','function','return','if','else','for','while','class','import','export','default','from','async','await','new','try','catch','throw','interface','type','extends','implements','true','false','null','undefined','void','def','print','self','elif','in','not','and','or','is','typeof','instanceof','static','private','public','protected','readonly','enum','switch','case','break','continue','delete','yield'];
  kw.forEach(k => { h = h.replace(new RegExp(`\\b(${k})\\b`,'g'),'<span class="text-violet-400">$1</span>'); });
  h = h.replace(/(\".*?\"|'.*?'|`[\s\S]*?`)/g,'<span class="text-emerald-300">$1</span>');
  h = h.replace(/(\/\/[^\n]*)/g,'<span class="text-zinc-500 italic">$1</span>');
  h = h.replace(/(\/\*[\s\S]*?\*\/)/g,'<span class="text-zinc-500 italic">$1</span>');
  h = h.replace(/(#[^\n]*)/g,'<span class="text-zinc-500 italic">$1</span>');
  if (['html','tsx','jsx'].includes(ext)) {
    h = h.replace(/(&lt;\/?)([\w-]+)/g,'$1<span class="text-emerald-400">$2</span>');
    h = h.replace(/([\w-]+)=(&quot;|&#x27;)/g,'<span class="text-sky-400">$1</span>=$2');
  }
  h = h.replace(/\b(\d+\.?\d*)\b/g,'<span class="text-orange-400">$1</span>');
  h = h.replace(/\b([A-Z][a-zA-Z0-9]+)\b/g,'<span class="text-yellow-400">$1</span>');
  return h;
}

function fileIcon(name: string) {
  const ext = name.split('.').pop() || '';
  const colors: Record<string,string> = {
    tsx:'text-cyan-400', ts:'text-blue-400', jsx:'text-cyan-400', js:'text-yellow-400',
    html:'text-orange-400', css:'text-blue-300', json:'text-yellow-300', py:'text-green-400',
    md:'text-zinc-400', sh:'text-emerald-400', txt:'text-zinc-500', gitignore:'text-zinc-600'
  };
  return <File size={13} className={colors[ext] || 'text-zinc-500'} />;
}

function FileTreeNode({ path, name, depth, onSelect, onContextMenu, selectedPath }: {
  path: string; name: string; depth: number;
  onSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isDir: boolean) => void;
  selectedPath: string;
}) {
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
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          onContextMenu={e => onContextMenu(e, path, true)}
          className={`w-full flex items-center gap-1 py-0.5 pr-2 text-xs hover:bg-white/5 transition-all rounded ${isSelected ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          style={{ paddingLeft: `${6 + depth * 12}px` }}
        >
          {expanded ? <ChevronDown size={11} className="shrink-0 text-zinc-600" /> : <ChevronRight size={11} className="shrink-0 text-zinc-600" />}
          {expanded ? <FolderOpen size={13} className="text-yellow-500 shrink-0" /> : <Folder size={13} className="text-yellow-600 shrink-0" />}
          <span className="truncate">{name}</span>
        </button>
        {expanded && children.map(child => (
          <div key={child}>
            <FileTreeNode
              path={`${path}/${child}`} name={child} depth={depth + 1}
              onSelect={onSelect} onContextMenu={onContextMenu} selectedPath={selectedPath}
            />
          </div>
        ))}
      </div>
    );
  }
  return (
    <button
      onClick={() => onSelect(path)}
      onContextMenu={e => onContextMenu(e, path, false)}
      className={`w-full flex items-center gap-1.5 py-0.5 pr-2 text-xs hover:bg-white/5 transition-all rounded ${isSelected ? 'bg-blue-500/20 text-blue-300' : 'text-zinc-500 hover:text-zinc-300'}`}
      style={{ paddingLeft: `${18 + depth * 12}px` }}
    >
      {fileIcon(name)}
      <span className="truncate">{name}</span>
    </button>
  );
}

interface EditorTab { path: string; name: string; content: string; modified: boolean; }
interface AiMsg { role: 'user'|'ai'; content: string; }

export default function HyperIDE({ windowId, initPath }: { windowId: string; initPath?: string }) {
  const { kernelRules, addNotification } = useOS();
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [currentDir, setCurrentDir] = useState('/home/user');
  const [sidePanel, setSidePanel] = useState<'files'|'search'|'git'|'ai'>('files');
  const [showSide, setShowSide] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileDir, setNewFileDir] = useState('');
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([
    { role: 'ai', content: '⚡ **HyperIDE Neural Core** online.\n\nI have full context of your open file. Ask me to:\n- **Explain** or **Debug** your code\n- **Refactor** for performance\n- **Write tests** or **Add docs**\n- **Write new features** from scratch\n\nOr just type any question.' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{path:string; line:number; text:string}[]>([]);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [contextMenu, setContextMenu] = useState<{x:number;y:number;path:string;isDir:boolean}|null>(null);
  const [renameTarget, setRenameTarget] = useState<string|null>(null);
  const [renameValue, setRenameValue] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs[activeIdx] || null;
  const ext = activeTab?.name.split('.').pop() || 'txt';
  const highlighted = activeTab ? highlight(activeTab.content, ext) : '';
  const lineCount = activeTab ? activeTab.content.split('\n').length : 0;

  useEffect(() => { if (initPath) openFile(initPath); }, [initPath]);
  useEffect(() => { aiScrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);

  const openFile = (path: string) => {
    const existing = tabs.findIndex(t => t.path === path);
    if (existing >= 0) { setActiveIdx(existing); return; }
    const stat = vfs.stat(path);
    if (stat?.type === 'directory') return;
    const content = vfs.readFile(path) ?? '';
    const name = path.split('/').pop() || path;
    const newTabs = [...tabs, { path, name, content, modified: false }];
    setTabs(newTabs);
    setActiveIdx(newTabs.length - 1);
    const parts = path.split('/'); parts.pop();
    setCurrentDir(parts.join('/') || '/home/user');
  };

  const updateContent = (content: string) => {
    setTabs(prev => prev.map((t, i) => i === activeIdx ? { ...t, content, modified: true } : t));
    if (showPreview && previewRef.current?.contentDocument) {
      const doc = previewRef.current.contentDocument;
      doc.open(); doc.write(content); doc.close();
    }
  };

  const saveFile = useCallback(() => {
    if (!activeTab) return;
    vfs.writeFile(activeTab.path, activeTab.content);
    setTabs(prev => prev.map((t, i) => i === activeIdx ? { ...t, modified: false } : t));
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
    memory.remember(`Edited file: ${activeTab.name}`, ['ide', 'file']);
  }, [activeTab, activeIdx]);

  const closeTab = (idx: number) => {
    const next = tabs.filter((_, i) => i !== idx);
    setTabs(next);
    setActiveIdx(Math.min(activeIdx, Math.max(0, next.length - 1)));
  };

  const createFile = (dir?: string) => {
    const targetDir = dir || newFileDir || currentDir;
    if (!newFileName.trim()) return;
    const p = `${targetDir}/${newFileName}`;
    vfs.writeFile(p, '');
    openFile(p);
    setNewFileName('');
    setShowNewFile(false);
    setNewFileDir('');
  };

  const deleteFile = (path: string) => {
    vfs.delete(path);
    setTabs(prev => prev.filter(t => t.path !== path));
    setContextMenu(null);
  };

  const duplicateFile = (path: string) => {
    const content = vfs.readFile(path) || '';
    const parts = path.split('/');
    const name = parts.pop() || 'file';
    const ext = name.includes('.') ? name.split('.').pop() : '';
    const base = ext ? name.slice(0, -(ext.length + 1)) : name;
    const newName = ext ? `${base}_copy.${ext}` : `${base}_copy`;
    const newPath = [...parts, newName].join('/');
    vfs.writeFile(newPath, content);
    openFile(newPath);
    setContextMenu(null);
  };

  const startRename = (path: string) => {
    setRenameTarget(path);
    setRenameValue(path.split('/').pop() || '');
    setContextMenu(null);
  };

  const doRename = () => {
    if (!renameTarget || !renameValue.trim()) { setRenameTarget(null); return; }
    const parts = renameTarget.split('/'); parts.pop();
    const newPath = [...parts, renameValue.trim()].join('/');
    const content = vfs.readFile(renameTarget) || '';
    vfs.writeFile(newPath, content);
    vfs.delete(renameTarget);
    setTabs(prev => prev.map(t => t.path === renameTarget ? { ...t, path: newPath, name: renameValue.trim(), modified: true } : t));
    setRenameTarget(null);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const results: {path:string;line:number;text:string}[] = [];
    const searchDir = (dir: string) => {
      const items = vfs.listDir(dir) || [];
      items.forEach(item => {
        const fp = `${dir}/${item}`;
        const stat = vfs.stat(fp);
        if (stat?.type === 'directory') { searchDir(fp); return; }
        const content = vfs.readFile(fp) || '';
        content.split('\n').forEach((line, i) => {
          if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({ path: fp, line: i+1, text: line.trim().slice(0, 100) });
          }
        });
      });
    };
    searchDir('/home/user');
    searchDir('/system/apps');
    setSearchResults(results.slice(0, 100));
  };

  const findAndReplace = () => {
    if (!activeTab || !searchQuery) return;
    const newContent = activeTab.content.split(searchQuery).join(replaceQuery);
    updateContent(newContent);
    addNotification({ title: 'Replace Done', message: `Replaced all occurrences of "${searchQuery}"`, type: 'success' });
  };

  const copyCode = (content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
  };

  const handleContextMenu = (e: React.MouseEvent, path: string, isDir: boolean) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, path, isDir });
  };

  const askAI = async (question?: string) => {
    const q = question || aiInput.trim();
    if (!q || isAiThinking) return;
    setAiInput('');
    setIsAiThinking(true);
    const fileContext = activeTab
      ? `[FILE: ${activeTab.name} (${lineCount} lines)]\n\`\`\`${ext}\n${activeTab.content.slice(0, 3000)}\n\`\`\``
      : '[No file open — answering from general knowledge]';
    const prompt = `${fileContext}\n\n[USER]: ${q}`;
    setAiMessages(prev => [...prev, { role: 'user', content: q }, { role: 'ai', content: '' }]);
    try {
      let buf = '';
      await aiService.streamChat(prompt, kernelRules, (token) => {
        buf += token;
        setAiMessages(prev => { const u = [...prev]; u[u.length-1] = { role: 'ai', content: buf }; return u; });
      }, 'coder');
    } catch (e: any) {
      setAiMessages(prev => { const u=[...prev]; u[u.length-1]={role:'ai',content:`[Error: ${e.message}]`}; return u; });
    } finally { setIsAiThinking(false); }
  };

  const aiAction = (action: string) => {
    const prompts: Record<string, string> = {
      explain: 'Explain exactly what this code does — step by step, in plain language. Be thorough.',
      fix: 'Find ALL bugs in this code. Return the COMPLETE fixed file with a // [FIX APPLIED] comment at the top listing each bug fixed.',
      refactor: 'Refactor this code for maximum performance, readability, and best practices. Return the COMPLETE refactored file with no explanation outside the code.',
      document: 'Add comprehensive JSDoc/docstring comments to every function, class, and complex block. Return the COMPLETE documented file.',
      tests: 'Write comprehensive unit tests for every function and edge case. Return a complete test file ready to run.',
      complete: 'Complete, extend, or improve this code in the most powerful way possible. Return the COMPLETE file.',
      optimize: 'Analyze and optimize this code for performance and bundle size. Return the COMPLETE optimized file.',
    };
    askAI(prompts[action]);
  };

  const applyAICode = () => {
    const lastAI = aiMessages.slice().reverse().find(m => m.role === 'ai');
    if (!lastAI || !activeTab) return;
    const codeMatch = lastAI.content.match(/```(?:\w+)?\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1] : lastAI.content;
    updateContent(code.trim());
    addNotification({ title: '⚡ Code Applied', message: `AI code applied to ${activeTab.name}`, type: 'success' });
  };

  const updateCursorPos = () => {
    const ta = editorRef.current;
    if (!ta || !activeTab) return;
    const before = activeTab.content.slice(0, ta.selectionStart);
    const lines = before.split('\n');
    setCursorPos({ line: lines.length, col: lines[lines.length - 1].length + 1 });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey||e.metaKey) && e.key === 's') { e.preventDefault(); saveFile(); }
      if ((e.ctrlKey||e.metaKey) && e.key === 'h') { e.preventDefault(); setShowFindReplace(r => !r); }
      if ((e.ctrlKey||e.metaKey) && e.key === 'f') { e.preventDefault(); setSidePanel('search'); setShowSide(true); }
      if (e.key === 'Escape') { setContextMenu(null); setShowFindReplace(false); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [saveFile]);

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-black/40 text-emerald-300 px-1 rounded text-xs font-mono">$1</code>')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-black/60 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto text-emerald-200 text-xs font-mono">$2</pre>')
      .replace(/^#{1,3}\s(.+)$/gm, '<div class="text-yellow-300 font-bold mt-2 mb-1">$1</div>')
      .replace(/\n/g, '<br/>');
  };

  const SIDE_PANELS = [
    { id: 'files', icon: Folder, title: 'Explorer' },
    { id: 'search', icon: Search, title: 'Search' },
    { id: 'git', icon: GitBranch, title: 'Source Control' },
  ];

  return (
    <div className="h-full flex bg-[#0d1117] text-slate-200 font-mono text-sm overflow-hidden" onClick={() => setContextMenu(null)}>

      {/* Activity Bar */}
      <div className="w-12 bg-[#010409] border-r border-white/5 flex flex-col items-center py-2 gap-1 shrink-0">
        {SIDE_PANELS.map(({ id, icon: Icon, title }) => (
          <button
            key={id}
            title={title}
            onClick={() => { setSidePanel(id as any); setShowSide(sidePanel === id ? !showSide : true); }}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all relative ${sidePanel === id && showSide ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}
          >
            {sidePanel === id && showSide && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-400 -ml-0.5" />}
            <Icon size={20} />
          </button>
        ))}
        <div className="flex-1" />
        <button title="Wrap Text" onClick={() => setWordWrap(w => !w)} className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${wordWrap ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}>
          <WrapText size={18} />
        </button>
        <button title="Toggle AI Panel" onClick={() => setShowAI(!showAI)} className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${showAI ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}>
          <Sparkles size={20} />
        </button>
      </div>

      {/* Side Panel */}
      {showSide && (
        <div className="w-60 bg-[#010409] border-r border-white/5 flex flex-col shrink-0 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{SIDE_PANELS.find(p => p.id === sidePanel)?.title}</span>
            <div className="flex items-center gap-1">
              {sidePanel === 'files' && (
                <button onClick={() => { setNewFileDir(''); setShowNewFile(true); }} className="text-zinc-600 hover:text-zinc-300 p-1 rounded hover:bg-white/5 transition-all" title="New File">
                  <FilePlus size={13} />
                </button>
              )}
              <button onClick={() => setShowSide(false)} className="text-zinc-700 hover:text-zinc-300 p-1 rounded hover:bg-white/5 transition-all">
                <X size={13} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {sidePanel === 'files' && (
              <div className="py-1">
                {showNewFile && (
                  <form onSubmit={e => { e.preventDefault(); createFile(); }} className="flex items-center gap-1 px-2 py-1">
                    <FilePlus size={12} className="text-zinc-600 shrink-0" />
                    <input autoFocus className="flex-1 bg-zinc-900 border border-blue-500/50 rounded px-2 py-0.5 text-xs outline-none text-white" placeholder="filename.tsx" value={newFileName} onChange={e => setNewFileName(e.target.value)} onKeyDown={e => e.key === 'Escape' && setShowNewFile(false)} />
                    <button type="button" onClick={() => setShowNewFile(false)} className="text-zinc-600 hover:text-red-400"><X size={10} /></button>
                  </form>
                )}
                {renameTarget && (
                  <form onSubmit={e => { e.preventDefault(); doRename(); }} className="flex items-center gap-1 px-2 py-1">
                    <input autoFocus className="flex-1 bg-zinc-900 border border-yellow-500/50 rounded px-2 py-0.5 text-xs outline-none text-white" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Escape' && setRenameTarget(null)} />
                    <button type="submit" className="text-emerald-400 text-xs px-1">OK</button>
                  </form>
                )}
                <FileTreeNode path="/home/user" name="home" depth={0} onSelect={openFile} onContextMenu={handleContextMenu} selectedPath={activeTab?.path || ''} />
                <FileTreeNode path="/system/apps" name="apps (system)" depth={0} onSelect={openFile} onContextMenu={handleContextMenu} selectedPath={activeTab?.path || ''} />
              </div>
            )}

            {sidePanel === 'search' && (
              <div className="p-2 space-y-2">
                <input className="w-full bg-zinc-900 border border-white/5 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500/50 text-white" placeholder="Search in files..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                <button onClick={handleSearch} className="w-full py-1 bg-blue-600/80 hover:bg-blue-600 rounded text-xs text-white transition-all">Search</button>
                <div className="space-y-0.5">
                  {searchResults.map((r, i) => (
                    <button key={i} onClick={() => openFile(r.path)} className="w-full text-left p-1.5 rounded hover:bg-white/5 transition-all block">
                      <div className="text-xs text-blue-400 truncate">{r.path.split('/').pop()}<span className="text-zinc-600">:{r.line}</span></div>
                      <div className="text-xs text-zinc-500 truncate font-mono">{r.text}</div>
                    </button>
                  ))}
                  {searchResults.length === 0 && searchQuery && <div className="text-xs text-zinc-600 px-1 text-center py-4">No results found</div>}
                </div>
              </div>
            )}

            {sidePanel === 'git' && (
              <div className="p-3 space-y-3">
                <div className="p-3 bg-zinc-900/60 rounded-lg border border-white/5 text-xs text-zinc-400 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400"><GitBranch size={12} /> main</div>
                  <div>Tracked: {Object.keys(localStorage).filter(k => k.startsWith('vfs_')).length} files</div>
                  <div className="text-zinc-600">VFS (local persistence)</div>
                </div>
                {tabs.filter(t => t.modified).length > 0 && (
                  <div>
                    <div className="text-xs text-zinc-500 mb-1 uppercase tracking-widest">Modified</div>
                    {tabs.filter(t => t.modified).map(t => (
                      <div key={t.path} className="flex items-center gap-1 text-xs text-yellow-400 py-0.5">
                        <span className="text-yellow-600">M</span> {t.name}
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => askAI('Review all recently modified files and suggest what I should review before committing, noting any bugs, style issues, or missing tests.')} className="w-full p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-2">
                  <Sparkles size={11} /> AI Code Review
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Editor + AI */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <div className="h-9 bg-[#010409] border-b border-white/5 flex items-center gap-1 px-2 shrink-0">
          {!showSide && <button onClick={() => setShowSide(true)} className="p-1.5 rounded hover:bg-white/5 text-zinc-600 hover:text-zinc-300 transition-all mr-1"><Layout size={15} /></button>}
          <button onClick={saveFile} disabled={!activeTab} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 text-zinc-400 hover:text-white transition-all text-xs disabled:opacity-30">
            {savedIndicator ? <CheckCheck size={13} className="text-emerald-400" /> : <Code size={13} />}
            <span>{savedIndicator ? 'Saved ✓' : 'Save'}</span>
          </button>
          <button onClick={() => setShowFindReplace(v => !v)} className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 transition-all text-xs ${showFindReplace ? 'text-yellow-400' : 'text-zinc-400 hover:text-white'}`}>
            <Replace size={13} /> Find
          </button>
          {ext === 'html' && <button onClick={() => setShowPreview(!showPreview)} className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 transition-all text-xs ${showPreview ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'}`}><Eye size={13} /> Preview</button>}
          <div className="flex-1" />
          <button onClick={() => { setShowSide(true); setSidePanel('files'); setShowNewFile(true); setNewFileDir(''); }} title="New File" className="p-1.5 rounded hover:bg-white/5 text-zinc-600 hover:text-zinc-300 transition-all"><FilePlus size={15} /></button>
        </div>

        {/* Find/Replace Bar */}
        {showFindReplace && (
          <div className="bg-[#010409] border-b border-white/5 px-3 py-2 flex items-center gap-2 shrink-0">
            <input className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-yellow-500/50 text-white" placeholder="Find..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <input className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-blue-500/50 text-white" placeholder="Replace with..." value={replaceQuery} onChange={e => setReplaceQuery(e.target.value)} />
            <button onClick={findAndReplace} disabled={!activeTab || !searchQuery} className="px-3 py-1 bg-blue-600/80 hover:bg-blue-600 rounded text-xs text-white transition-all disabled:opacity-30">Replace All</button>
            <button onClick={() => setShowFindReplace(false)} className="text-zinc-600 hover:text-zinc-300"><X size={12} /></button>
          </div>
        )}

        {/* Tabs */}
        {tabs.length > 0 && (
          <div className="flex items-center bg-[#010409] border-b border-white/5 overflow-x-auto shrink-0" style={{height:'33px'}}>
            {tabs.map((tab, i) => (
              <div key={tab.path} className={`flex items-center gap-2 px-3 h-full border-r border-white/5 cursor-pointer select-none whitespace-nowrap text-xs transition-all shrink-0 ${i === activeIdx ? 'bg-[#0d1117] text-white border-t-2 border-t-blue-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`} onClick={() => setActiveIdx(i)}>
                {fileIcon(tab.name)}
                <span>{tab.name}{tab.modified ? ' ●' : ''}</span>
                <button onClick={e => { e.stopPropagation(); closeTab(i); }} className="ml-1 opacity-40 hover:opacity-100 hover:text-red-400 transition-all"><X size={10} /></button>
              </div>
            ))}
            <button onClick={() => { setShowSide(true); setSidePanel('files'); setShowNewFile(true); }} className="px-3 h-full text-zinc-700 hover:text-zinc-400 hover:bg-white/5 transition-all shrink-0"><Plus size={13} /></button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {!activeTab && (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-800">
              <Braces size={56} className="mb-5 opacity-20" />
              <div className="text-lg font-bold uppercase tracking-[0.25em] mb-2 text-zinc-600">HyperIDE</div>
              <div className="text-sm text-zinc-700 text-center max-w-xs leading-relaxed mb-4">Open a file from the Explorer, or create a new one to start coding.</div>
              <div className="flex gap-2">
                <button onClick={() => { setShowSide(true); setSidePanel('files'); }} className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-xs text-blue-400 hover:text-blue-300 transition-all">Open Explorer</button>
                <button onClick={() => { setShowSide(true); setSidePanel('files'); setShowNewFile(true); }} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-zinc-400 hover:text-white transition-all">New File</button>
              </div>
            </div>
          )}

          {activeTab && (
            <div className={`${showPreview ? 'w-1/2 border-r border-white/5' : 'flex-1'} flex flex-col overflow-hidden`}>
              <div className="flex-1 flex overflow-hidden">
                {/* Line Numbers */}
                <div className="w-11 shrink-0 bg-[#010409] border-r border-white/5 overflow-hidden select-none text-right">
                  <pre className="text-xs text-zinc-700 pr-2 pt-3 leading-5 font-mono">
                    {Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')}
                  </pre>
                </div>
                {/* Code Area */}
                <div className="flex-1 relative overflow-auto">
                  <pre
                    className={`absolute inset-0 p-3 text-sm leading-5 font-mono pointer-events-none ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'} overflow-hidden`}
                    dangerouslySetInnerHTML={{ __html: highlighted }}
                    aria-hidden
                  />
                  <textarea
                    ref={editorRef}
                    className={`absolute inset-0 w-full h-full p-3 text-sm leading-5 font-mono bg-transparent text-transparent caret-white outline-none resize-none selection:bg-blue-500/30 z-10 ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'}`}
                    value={activeTab.content}
                    onChange={e => updateContent(e.target.value)}
                    onClick={updateCursorPos}
                    onKeyUp={updateCursorPos}
                    spellCheck={false}
                    onKeyDown={e => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const s = e.currentTarget.selectionStart;
                        const end = e.currentTarget.selectionEnd;
                        const v = activeTab.content.substring(0, s) + '  ' + activeTab.content.substring(end);
                        updateContent(v);
                        setTimeout(() => { if (editorRef.current) { editorRef.current.selectionStart = editorRef.current.selectionEnd = s + 2; } }, 0);
                      }
                    }}
                  />
                </div>
              </div>
              {/* Status Bar */}
              <div className="h-6 bg-blue-900/20 border-t border-white/5 flex items-center px-3 gap-4 shrink-0 text-xs text-zinc-600 select-none">
                <span className="truncate text-zinc-700">{activeTab.path}</span>
                <span className="shrink-0">Ln {cursorPos.line}, Col {cursorPos.col}</span>
                <span className="uppercase shrink-0 font-bold text-zinc-600">{ext}</span>
                <span className="shrink-0">{lineCount} lines</span>
                {activeTab.modified && <span className="text-yellow-600 shrink-0 animate-pulse">● Modified</span>}
                {savedIndicator && <span className="text-emerald-500 shrink-0">✓ Saved</span>}
                <div className="flex-1 flex justify-end items-center gap-3 shrink-0">
                  <span>UTF-8</span>
                  <span>LF</span>
                  <span>{wordWrap ? 'Wrap ON' : 'Wrap OFF'}</span>
                </div>
              </div>
            </div>
          )}

          {showPreview && activeTab && (
            <div className="flex-1 border-l border-white/5 flex flex-col">
              <div className="h-7 bg-[#010409] border-b border-white/5 flex items-center px-3 gap-2 shrink-0">
                <Eye size={11} className="text-zinc-600" />
                <span className="text-xs text-zinc-600">Live Preview — {activeTab.name}</span>
              </div>
              <iframe ref={previewRef} className="flex-1 border-none bg-white" sandbox="allow-scripts allow-modals allow-forms allow-same-origin" srcDoc={activeTab.content} title="Preview" />
            </div>
          )}
        </div>
      </div>

      {/* AI Panel */}
      {showAI && (
        <div className="w-80 border-l border-white/5 bg-[#010409] flex flex-col shrink-0">
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Neural Dev</span>
              {isAiThinking && <Loader2 size={11} className="text-emerald-400 animate-spin" />}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={applyAICode} disabled={!activeTab} title="Apply last AI code to editor" className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all disabled:opacity-30">Apply</button>
              <button onClick={() => setAiMessages([aiMessages[0]])} title="Clear chat" className="text-zinc-700 hover:text-zinc-400 p-0.5 transition-all"><X size={11} /></button>
              <button onClick={() => setShowAI(false)} className="text-zinc-600 hover:text-zinc-300 p-0.5 transition-all"><ChevronUp size={13} /></button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-2 border-b border-white/5">
            <div className="grid grid-cols-4 gap-1">
              {[
                ['explain','📖 Explain'],
                ['fix','🔧 Fix'],
                ['refactor','⚡ Refactor'],
                ['document','📝 Doc'],
                ['tests','🧪 Tests'],
                ['complete','✨ Extend'],
                ['optimize','🚀 Optimize'],
              ].map(([action, label]) => (
                <button key={action} onClick={() => aiAction(action)} disabled={!activeTab || isAiThinking} className={`py-1 px-1 rounded-lg bg-white/3 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-zinc-500 hover:text-emerald-300 transition-all text-xs disabled:opacity-30 text-center leading-tight ${action === 'optimize' ? 'col-span-4 py-1.5' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-full p-3 rounded-xl text-xs leading-relaxed font-sans ${msg.role === 'user' ? 'bg-zinc-800/80 text-white rounded-br-none border border-white/5' : 'bg-emerald-500/5 border border-emerald-500/10 text-emerald-100 rounded-bl-none'}`}>
                  {msg.role === 'ai' ? (
                    msg.content
                      ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                      : (isAiThinking && i === aiMessages.length-1 ? <span className="text-emerald-500 animate-pulse">Thinking...</span> : '')
                  ) : msg.content}
                </div>
                {msg.role === 'ai' && msg.content && (
                  <button onClick={() => copyCode(msg.content)} className="mt-1 text-zinc-700 hover:text-zinc-400 flex items-center gap-1 text-xs transition-all">
                    <Copy size={9} /> Copy
                  </button>
                )}
              </div>
            ))}
            <div ref={aiScrollRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-white/5">
            <div className="flex items-end gap-2 bg-black/60 border border-white/10 rounded-xl px-3 py-2 focus-within:border-emerald-500/30 transition-all">
              <textarea
                className="flex-1 bg-transparent outline-none text-xs text-white placeholder:text-zinc-700 resize-none font-sans leading-relaxed max-h-24 min-h-[20px]"
                placeholder={activeTab ? `Ask about ${activeTab.name}...` : 'Ask me anything...'}
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAI(); } }}
                disabled={isAiThinking}
                rows={1}
              />
              <button onClick={() => askAI()} disabled={!aiInput.trim() || isAiThinking} className="text-emerald-500 hover:text-emerald-400 disabled:opacity-30 transition-all shrink-0">
                {isAiThinking ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl py-1 text-xs backdrop-blur-xl"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 200), minWidth: '180px' }}
        >
          {contextMenu.isDir ? (
            <>
              <button onClick={() => { setNewFileDir(contextMenu.path); setShowNewFile(true); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"><FilePlus size={12} /> New File Here</button>
              <button onClick={() => { openFile(contextMenu.path); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"><FolderOpen size={12} /> Open Folder</button>
            </>
          ) : (
            <>
              <button onClick={() => { openFile(contextMenu.path); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"><File size={12} /> Open</button>
              <button onClick={() => startRename(contextMenu.path)} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"><AlignLeft size={12} /> Rename</button>
              <button onClick={() => duplicateFile(contextMenu.path)} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"><Copy size={12} /> Duplicate</button>
              <button onClick={() => { const c = contextMenu.path; navigator.clipboard.writeText(c); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"><Copy size={12} /> Copy Path</button>
              <div className="border-t border-white/5 my-1" />
              <button onClick={() => deleteFile(contextMenu.path)} className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-400/10 transition-all flex items-center gap-2"><X size={12} /> Delete</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
