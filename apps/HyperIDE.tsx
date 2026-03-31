import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOS } from '../store/osStore';
import { aiService } from '../services/puterService';
import DOMPurify from 'dompurify';
import { vfs } from '../kernel/fileSystem';
import { memory } from '../kernel/memory';
import {
  File, Folder, FolderOpen, Save, Code, X, Plus,
  ChevronRight, ChevronDown, Loader2, Zap, CheckCheck,
  FilePlus, Eye, Sparkles, Search, Layout,
  GitBranch, Copy, Settings2, Braces, Replace,
  WrapText, AlignLeft, MoreHorizontal, ChevronUp,
  TerminalSquare, FileJson, FileType2, FileCode2,
  Box, Puzzle, ShieldAlert, FileText, Play
} from 'lucide-react';

// ─── Refined Syntax Highlighting (Daemon Dark Theme) ─────────────
function escapeHtml(text: string): string {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function highlight(code: string, ext: string): string {
  if (!['html','js','ts','tsx','jsx','css','json','py','sh','md'].includes(ext)) return escapeHtml(code);
  let h = escapeHtml(code);
  
  if (ext === 'json') {
    return h
      .replace(/(\"(?:[^\"\\]|\\.)*\")\s*:/g,'<span class="text-sky-300 font-medium">$1</span>:')
      .replace(/:\s*(\"(?:[^\"\\]|\\.)*\")/g,': <span class="text-emerald-300">$1</span>')
      .replace(/:\s*(true|false|null)/g,': <span class="text-purple-400 font-bold">$1</span>')
      .replace(/:\s*(\d+\.?\d*)/g,': <span class="text-orange-300">$1</span>');
  }
  if (ext === 'md') {
    h = h.replace(/^(#{1,6}\s.+)$/gm,'<span class="text-yellow-400 font-black tracking-wide">$1</span>');
    h = h.replace(/\*\*(.+?)\*\*/g,'<span class="text-white font-bold">$1</span>');
    h = h.replace(/`([^`]+)`/g,'<span class="text-emerald-300 bg-emerald-500/10 px-1 rounded-md border border-emerald-500/20">$1</span>');
    return h;
  }

  // Keywords
  const kw = ['const','let','var','function','return','if','else','for','while','class','import','export','default','from','async','await','new','try','catch','throw','interface','type','extends','implements','true','false','null','undefined','void','def','print','self','elif','in','not','and','or','is','typeof','instanceof','static','private','public','protected','readonly','enum','switch','case','break','continue','delete','yield'];
  kw.forEach(k => { h = h.replace(new RegExp(`\\b(${k})\\b`,'g'),`<span class="text-purple-400 font-semibold">$1</span>`); });
  
  // Strings & Comments
  h = h.replace(/(\".*?\"|'.*?'|`[\s\S]*?`)/g,'<span class="text-emerald-300">$1</span>');
  h = h.replace(/(\/\/[^\n]*)/g,'<span class="text-zinc-500 italic">$1</span>');
  h = h.replace(/(\/\*[\s\S]*?\*\/)/g,'<span class="text-zinc-500 italic">$1</span>');
  h = h.replace(/(#[^\n]*)/g,'<span class="text-zinc-500 italic">$1</span>');
  
  // Tags (React/HTML)
  if (['html','tsx','jsx'].includes(ext)) {
    h = h.replace(/(&lt;\/?)([\w.-]+)/g,'$1<span class="text-rose-400 font-medium">$2</span>');
    h = h.replace(/([\w-]+)=(&quot;|&#x27;)/g,'<span class="text-sky-300">$1</span>=$2');
  }
  
  // Numbers & Types/Classes
  h = h.replace(/\b(\d+\.?\d*)\b/g,'<span class="text-orange-300">$1</span>');
  h = h.replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g,'<span class="text-yellow-200 font-medium">$1</span>');
  
  // Functions
  h = h.replace(/\b([a-zA-Z0-9_]+)(?=\()/g,'<span class="text-blue-300 font-medium">$1</span>');

  return h;
}

// ─── Dynamic File Icons ─────────────────────────────────────────
function fileIcon(name: string, size = 14) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'tsx' || ext === 'jsx') return <FileCode2 size={size} className="text-cyan-400" />;
  if (ext === 'ts') return <FileType2 size={size} className="text-blue-400" />;
  if (ext === 'js') return <FileCode2 size={size} className="text-yellow-400" />;
  if (ext === 'json') return <FileJson size={size} className="text-yellow-200" />;
  if (ext === 'md') return <FileText size={size} className="text-zinc-300" />;
  if (ext === 'sh' || ext === 'bat') return <TerminalSquare size={size} className="text-emerald-400" />;
  if (ext === 'css') return <FileCode2 size={size} className="text-sky-400" />;
  if (ext === 'py') return <FileCode2 size={size} className="text-green-500" />;
  if (ext === 'html') return <FileCode2 size={size} className="text-orange-500" />;
  if (name.includes('config') || name.startsWith('.')) return <Settings2 size={size} className="text-zinc-500" />;
  return <File size={size} className="text-zinc-500" />;
}

// ─── Pro File Tree Node ─────────────────────────────────────────
interface FileTreeNodeProps {
  path: string; name: string; depth: number;
  onSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isDir: boolean) => void;
  selectedPath: string;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ path, name, depth, onSelect, onContextMenu, selectedPath }) => {
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
          onContextMenu={e => onContextMenu(e, path, true)}
          className={`w-full flex items-center gap-1.5 py-1 pr-2 text-[11px] font-medium hover:bg-white/10 transition-all rounded-md group ${isSelected ? 'bg-white/5 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          style={{ paddingLeft: `${4 + depth * 14}px` }}
        >
          {expanded ? <ChevronDown size={12} className="shrink-0 text-zinc-500 group-hover:text-zinc-300" /> : <ChevronRight size={12} className="shrink-0 text-zinc-500 group-hover:text-zinc-300" />}
          {expanded ? <FolderOpen size={14} className="text-blue-400 shrink-0 drop-shadow-md" /> : <Folder size={14} className="text-blue-500 shrink-0 drop-shadow-md" />}
          <span className="truncate">{name}</span>
        </button>
        {expanded && (
          <div className="relative">
            {/* Tree Guide Line */}
            <div className="absolute left-0 top-0 bottom-0 border-l border-white/5" style={{ marginLeft: `${10 + depth * 14}px` }} />
            {children.map(child => (
              <FileTreeNode
                key={child}
                path={`${path}/${child}`} name={child} depth={depth + 1}
                onSelect={onSelect} onContextMenu={onContextMenu} selectedPath={selectedPath}
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
      onContextMenu={e => onContextMenu(e, path, false)}
      className={`w-full flex items-center gap-2 py-1 pr-2 text-[11px] font-medium hover:bg-white/10 transition-all rounded-md group ${isSelected ? 'bg-blue-500/20 text-white shadow-inner' : 'text-zinc-400 hover:text-zinc-200'}`}
      style={{ paddingLeft: `${20 + depth * 14}px` }}
    >
      <div className="opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-md">
        {fileIcon(name, 14)}
      </div>
      <span className="truncate">{name}</span>
    </button>
  );
};

import { localBrain } from '../services/localBrain';

interface EditorTab { path: string; name: string; content: string; modified: boolean; }
interface AiMsg { role: 'user'|'ai'; content: string; }

export default function HyperIDE({ windowId, initPath }: { windowId: string; initPath?: string }) {
  const { kernelRules, addNotification } = useOS();
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [currentDir, setCurrentDir] = useState('/home/user');
  const [sidePanel, setSidePanel] = useState<'files'|'search'|'git'>('files');
  const [showSide, setShowSide] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileDir, setNewFileDir] = useState('');
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAiConnected, setIsAiConnected] = useState(localBrain.isReady());

  useEffect(() => {
    const interval = setInterval(() => {
      const ready = localBrain.isReady();
      if (ready !== isAiConnected) setIsAiConnected(ready);
    }, 2000);
    return () => clearInterval(interval);
  }, [isAiConnected]);

  const [aiMessages, setAiMessages] = useState<AiMsg[]>([
    { role: 'ai', content: `⚡ **NEXUS Neural Forge** ${isAiConnected ? 'Online' : 'Initializing'}...\n\nI am connected to the kernel. I can:\n- **Refactor** & optimize logic\n- **Debug** complex errors\n- **Generate** complete files\n- **Explain** architecture\n\nWhat are we building today, Creator?` }
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
  const ext = activeTab?.name.split('.').pop()?.toLowerCase() || 'txt';
  const highlighted = activeTab ? highlight(activeTab.content, ext) : '';
  const lineCount = activeTab ? activeTab.content.split('\n').length : 1;

  useEffect(() => { if (initPath) openFile(initPath); }, [initPath]);
  useEffect(() => { aiScrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);

  // ─── File Operations ─────────────────────────────────────────
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

  const duplicateFile = (filePath: string) => {
    const content = vfs.readFile(filePath) || '';
    const parts = filePath.split('/');
    const fileName = parts.pop() || 'file';
    const dir = parts.join('/');
    const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
    const baseName = ext ? fileName.slice(0, -ext.length) : fileName;
    const newPath = `${dir}/${baseName}_copy${ext}`;
    vfs.writeFile(newPath, content);
    setContextMenu(null);
    addNotification({ title: 'File Duplicated', message: `Created ${baseName}_copy${ext}`, type: 'success' });
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

  const handleContextMenu = (e: React.MouseEvent, path: string, isDir: boolean) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, path, isDir });
  };

  // ─── AI Integration ─────────────────────────────────────────
  const askAI = async (question?: string) => {
    const q = question || aiInput.trim();
    if (!q || isAiThinking) return;
    setAiInput('');
    setIsAiThinking(true);
    const fileContext = activeTab
      ? `[CURRENT FILE: ${activeTab.name}]\n\`\`\`${ext}\n${activeTab.content.slice(0, 4000)}\n\`\`\``
      : '[No file open. Provide general architectural guidance.]';
    const prompt = `${fileContext}\n\n[USER REQUEST]: ${q}\nAlways provide high-quality, production-ready code. Use modern patterns.`;
    
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

  const applyAICode = () => {
    const lastAI = aiMessages.slice().reverse().find(m => m.role === 'ai');
    if (!lastAI || !activeTab) return;
    const codeMatch = lastAI.content.match(/```(?:\w+)?\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1] : lastAI.content;
    updateContent(code.trim());
    addNotification({ title: 'Code Injected', message: `Neural synthesis applied to ${activeTab.name}`, type: 'success' });
  };

  const copyCode = (content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
  };

  const aiAction = (action: string) => {
    const prompts: Record<string, string> = {
      explain: 'Explain exactly what this code does — step by step, in plain language.',
      fix: 'Find ALL bugs in this code. Return the COMPLETE fixed file with comments.',
      refactor: 'Refactor this code for maximum performance and readability. Return the complete refactored file.',
      document: 'Add comprehensive JSDoc/docstring comments. Return the complete documented file.',
      tests: 'Write comprehensive unit tests for this code.',
      complete: 'Complete or extend this code.',
      optimize: 'Optimize this code for performance.',
    };
    askAI(prompts[action]);
  };

  // ─── Editor Utils ─────────────────────────────────────────
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
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-300">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-black/50 text-emerald-300 px-1.5 py-0.5 rounded-md text-xs font-mono border border-emerald-500/20">$1</code>')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-black/80 border border-white/10 rounded-xl p-4 my-3 overflow-x-auto text-emerald-200 text-[11px] font-mono shadow-inner">$2</pre>')
      .replace(/^#{1,3}\s(.+)$/gm, '<div class="text-white font-black text-sm mt-4 mb-2 tracking-wide uppercase">$1</div>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="h-full flex bg-[#09090B] text-slate-200 font-sans text-sm overflow-hidden" onClick={() => setContextMenu(null)}>

      {/* ─── Activity Bar ─── */}
      <div className="w-14 bg-black/60 backdrop-blur-xl border-r border-white/5 flex flex-col items-center py-4 gap-3 shrink-0 shadow-xl z-20 relative">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          <Code size={18} className="text-white" />
        </div>
        
        {[
          { id: 'files', icon: Copy, title: 'Explorer' },
          { id: 'search', icon: Search, title: 'Search' },
          { id: 'git', icon: GitBranch, title: 'Source Control' },
        ].map(({ id, icon: Icon, title }) => (
          <button
            key={id} title={title}
            onClick={() => { setSidePanel(id as any); setShowSide(sidePanel === id ? !showSide : true); }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group ${sidePanel === id && showSide ? 'bg-white/10 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}`}
          >
            {sidePanel === id && showSide && <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />}
            <Icon size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        ))}
        
        <div className="flex-1" />
        
        <button title="Toggle Word Wrap" onClick={() => setWordWrap(w => !w)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${wordWrap ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}`}>
          <WrapText size={18} />
        </button>
        <button title="Toggle Neural Engine" onClick={() => setShowAI(!showAI)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showAI ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-zinc-500 hover:text-emerald-400 hover:bg-white/5'}`}>
          <Sparkles size={20} />
        </button>
        <button title="Settings" className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all mt-2">
          <Settings2 size={20} />
        </button>
      </div>

      {/* ─── Side Panel (Explorer) ─── */}
      {showSide && (
        <div className="w-64 bg-[#0A0A0C]/95 backdrop-blur-xl border-r border-white/5 flex flex-col shrink-0 z-10 relative">
          <div className="px-4 py-3 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{sidePanel}</span>
            <div className="flex items-center gap-1.5">
              {sidePanel === 'files' && (
                <button onClick={() => { setNewFileDir(''); setShowNewFile(true); }} className="text-zinc-500 hover:text-emerald-400 p-1 rounded-md hover:bg-emerald-500/10 transition-all" title="New File">
                  <FilePlus size={14} />
                </button>
              )}
              <button onClick={() => setShowSide(false)} className="text-zinc-500 hover:text-zinc-200 p-1 rounded-md hover:bg-white/10 transition-all">
                <Layout size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
            {sidePanel === 'files' && (
              <div className="space-y-0.5">
                {showNewFile && (
                  <form onSubmit={e => { e.preventDefault(); createFile(); }} className="flex items-center gap-2 px-2 py-1.5 bg-black/40 border border-emerald-500/30 rounded-lg mb-2 shadow-inner">
                    <FilePlus size={14} className="text-emerald-500 shrink-0" />
                    <input autoFocus className="flex-1 bg-transparent text-xs outline-none text-white font-mono placeholder:text-zinc-600" placeholder="filename.tsx" value={newFileName} onChange={e => setNewFileName(e.target.value)} onKeyDown={e => e.key === 'Escape' && setShowNewFile(false)} />
                  </form>
                )}
                {renameTarget && (
                  <form onSubmit={e => { e.preventDefault(); doRename(); }} className="flex items-center gap-2 px-2 py-1.5 bg-black/40 border border-yellow-500/30 rounded-lg mb-2 shadow-inner">
                    <AlignLeft size={14} className="text-yellow-500 shrink-0" />
                    <input autoFocus className="flex-1 bg-transparent text-xs outline-none text-white font-mono" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Escape' && setRenameTarget(null)} />
                  </form>
                )}
                <FileTreeNode path="/home/user" name="home" depth={0} onSelect={openFile} onContextMenu={handleContextMenu} selectedPath={activeTab?.path || ''} />
                <FileTreeNode path="/system/apps" name="apps (system)" depth={0} onSelect={openFile} onContextMenu={handleContextMenu} selectedPath={activeTab?.path || ''} />
              </div>
            )}

            {sidePanel === 'search' && (
              <div className="space-y-3 px-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2 text-zinc-500" />
                  <input className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500/50 text-white font-mono shadow-inner transition-colors" placeholder="Search codebase..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                </div>
                <div className="space-y-1">
                  {searchResults.map((r, i) => (
                    <button key={i} onClick={() => openFile(r.path)} className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all group">
                      <div className="text-[11px] text-blue-400 font-medium truncate flex items-center gap-1.5"><File size={10}/> {r.path.split('/').pop()}<span className="text-zinc-600 bg-black/40 px-1 rounded">:{r.line}</span></div>
                      <div className="text-[10px] text-zinc-400 truncate font-mono mt-1 opacity-80 group-hover:opacity-100">{r.text}</div>
                    </button>
                  ))}
                  {searchResults.length === 0 && searchQuery && <div className="text-xs text-zinc-600 text-center py-8 flex flex-col items-center gap-2"><ShieldAlert size={24} className="opacity-20"/> No matches found</div>}
                </div>
              </div>
            )}
            
            {sidePanel === 'git' && (
              <div className="p-2 space-y-3">
                <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/5 text-xs text-zinc-400 space-y-2 shadow-inner">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-widest"><GitBranch size={14} /> main</div>
                  <div className="flex justify-between"><span>Tracked Nodes:</span> <span className="text-white">{Object.keys(localStorage).filter(k => k.startsWith('vfs_')).length}</span></div>
                  <div className="text-[10px] text-zinc-600 mt-2">VFS Local Persistence</div>
                </div>
                {tabs.filter(t => t.modified).length > 0 && (
                  <div>
                    <div className="text-[10px] font-black text-zinc-500 mb-2 uppercase tracking-widest px-1">Modified Manifests</div>
                    {tabs.filter(t => t.modified).map(t => (
                      <div key={t.path} className="flex items-center gap-2 text-xs text-yellow-400 py-1.5 px-2 bg-yellow-500/10 rounded-lg mb-1 border border-yellow-500/20">
                        <span className="text-yellow-500 font-black">M</span> {t.name}
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => askAI('Review all recently modified files and suggest what I should review before committing, noting any bugs, style issues, or missing tests.')} className="w-full p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 hover:from-emerald-500/20 hover:to-teal-500/20 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <Sparkles size={14} /> Neural Review
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Main Editor Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0E0E11] relative">

        {/* Top Header / Tabs */}
        <div className="flex flex-col shrink-0 bg-[#09090B]">
          {/* Action Bar */}
          <div className="h-11 flex items-center justify-between px-4 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent">
             <div className="flex items-center gap-2">
               <button onClick={saveFile} disabled={!activeTab || !activeTab.modified} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all shadow-sm ${activeTab?.modified ? 'bg-blue-500 text-white hover:bg-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-white/5 text-zinc-500'}`}>
                 {savedIndicator ? <CheckCheck size={14} /> : <Save size={14} />} {savedIndicator ? 'Saved' : 'Save'}
               </button>
               {ext === 'html' && (
                 <button onClick={() => setShowPreview(!showPreview)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${showPreview ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>
                   <Play size={14} className={showPreview ? "animate-pulse" : ""} /> Preview
                 </button>
               )}
             </div>
             <div className="flex items-center gap-2 bg-black/40 rounded-xl p-1 border border-white/5">
               <button onClick={() => setShowFindReplace(v => !v)} className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title="Find / Replace"><Replace size={14} /></button>
               <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="More Options"><MoreHorizontal size={14} /></button>
             </div>
          </div>

          {/* Find & Replace Overlay */}
          {showFindReplace && (
            <div className="px-4 py-2.5 bg-zinc-900 border-b border-white/5 flex items-center gap-3 shrink-0 animate-in slide-in-from-top-2 shadow-lg">
              <Replace size={16} className="text-blue-400" />
              <input className="flex-1 max-w-xs bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500/50 text-white font-mono shadow-inner transition-colors" placeholder="Find..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <ChevronRight size={14} className="text-zinc-600" />
              <input className="flex-1 max-w-xs bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-yellow-500/50 text-white font-mono shadow-inner transition-colors" placeholder="Replace with..." value={replaceQuery} onChange={e => setReplaceQuery(e.target.value)} />
              <button onClick={findAndReplace} disabled={!activeTab || !searchQuery} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-30 shadow-md">Replace All</button>
              <button onClick={() => setShowFindReplace(false)} className="p-1 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors ml-auto"><X size={14} /></button>
            </div>
          )}

          {/* Tabs Row */}
          {tabs.length > 0 && (
            <div className="flex items-end bg-[#0A0A0C] border-b border-white/5 overflow-x-auto custom-scrollbar h-10 px-2 gap-1 pt-2">
              {tabs.map((tab, i) => (
                <div 
                  key={tab.path} 
                  onClick={() => setActiveIdx(i)}
                  className={`group flex items-center gap-2 px-4 py-2 min-w-[140px] max-w-[220px] cursor-pointer select-none rounded-t-xl transition-all relative ${
                    i === activeIdx 
                      ? 'bg-[#0E0E11] text-white shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-10 before:absolute before:top-0 before:left-2 before:right-2 before:h-0.5 before:bg-blue-500 before:rounded-b-full' 
                      : 'bg-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                  }`}
                >
                  <div className={`transition-transform drop-shadow-md ${i === activeIdx ? 'scale-110' : ''}`}>{fileIcon(tab.name, 14)}</div>
                  <span className="truncate text-xs font-medium flex-1">{tab.name}</span>
                  {tab.modified ? (
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  ) : (
                    <button onClick={e => { e.stopPropagation(); closeTab(i); }} className="opacity-0 group-hover:opacity-100 hover:bg-red-500/20 p-1 rounded-md text-zinc-400 hover:text-red-400 transition-all shrink-0"><X size={12} /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editor Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {!activeTab ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0E0E11]">
              <div className="w-32 h-32 mb-8 relative flex items-center justify-center">
                 <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
                 <Code size={80} className="text-zinc-800 relative z-10 drop-shadow-2xl" />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-[0.3em] text-white mb-3">HyperIDE <span className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">Core</span></h2>
              <p className="text-zinc-500 font-mono text-sm max-w-md text-center mb-10 leading-relaxed">The sovereign development environment. Open a manifest from the explorer or instantiate a new node.</p>
              <div className="flex gap-4">
                <button onClick={() => { setShowSide(true); setSidePanel('files'); }} className="px-8 py-3.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-sm font-black text-blue-400 uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">Browse Files</button>
                <button onClick={() => { setShowSide(true); setSidePanel('files'); setShowNewFile(true); }} className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-black text-white uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-lg">New Manifest</button>
              </div>
            </div>
          ) : (
            <div className={`flex-1 flex flex-col overflow-hidden ${showPreview ? 'w-1/2 border-r border-white/10' : ''}`}>
              <div className="flex-1 flex overflow-hidden bg-[#0E0E11]">
                {/* Line Numbers Gutter */}
                <div className="w-14 shrink-0 bg-[#0A0A0C] border-r border-white/5 flex flex-col items-end py-4 pr-3 select-none overflow-hidden">
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i} className={`text-[13px] leading-6 font-mono transition-colors ${i + 1 === cursorPos.line ? 'text-blue-400 font-bold drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]' : 'text-zinc-700'}`}>
                      {i + 1}
                    </div>
                  ))}
                </div>
                
                {/* Text Area / Highlight Overlay */}
                <div className="flex-1 relative overflow-auto custom-scrollbar" onClick={updateCursorPos} onKeyUp={updateCursorPos}>
                  {/* Highlighted code rendering layer */}
                  <pre
                    className={`absolute inset-0 p-4 text-[13px] leading-6 font-mono pointer-events-none ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'} overflow-hidden text-transparent`}
                    dangerouslySetInnerHTML={{ __html: highlighted }}
                    aria-hidden
                  />
                  {/* Actual editable textarea */}
                  <textarea
                    ref={editorRef}
                    className={`absolute inset-0 w-full h-full p-4 text-[13px] leading-6 font-mono bg-transparent text-transparent caret-blue-400 outline-none resize-none selection:bg-blue-500/30 z-10 ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'}`}
                    value={activeTab.content}
                    onChange={e => updateContent(e.target.value)}
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
              <div className="h-8 bg-[#050508] border-t border-white/5 flex items-center px-4 justify-between text-[10px] font-mono uppercase tracking-widest select-none shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-20">
                <div className="flex items-center gap-5 text-zinc-500">
                  <span className="text-blue-400 font-bold flex items-center gap-1.5"><Box size={12}/> {activeTab.name}</span>
                  <span className="bg-black/50 px-2 py-0.5 rounded border border-white/5">Ln {cursorPos.line}, Col {cursorPos.col}</span>
                  <span className="bg-white/5 px-2 py-0.5 rounded text-zinc-400">{ext}</span>
                </div>
                <div className="flex items-center gap-5 text-zinc-600">
                  <span>UTF-8</span>
                  <span>{wordWrap ? 'Wrap ON' : 'Wrap OFF'}</span>
                  <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20"><ShieldAlert size={10} /> Secure</span>
                </div>
              </div>
            </div>
          )}

          {/* HTML Preview Split */}
          {showPreview && activeTab && (
            <div className="w-1/2 flex flex-col bg-white">
              <div className="h-10 bg-zinc-100 border-b border-zinc-300 flex items-center px-4 gap-3 shrink-0 shadow-sm z-10">
                <div className="p-1.5 bg-emerald-500/20 rounded-md"><Play size={12} className="text-emerald-600" /></div>
                <span className="text-xs font-bold text-zinc-800 tracking-wide uppercase">Live Render Engine</span>
                <span className="text-[10px] font-mono text-zinc-400 ml-auto border border-zinc-200 px-2 py-0.5 rounded bg-white">about:blank</span>
              </div>
              <iframe ref={previewRef} className="flex-1 w-full h-full border-none bg-white" sandbox="allow-scripts allow-modals allow-forms allow-same-origin" srcDoc={activeTab.content} title="Preview" />
            </div>
          )}
        </div>
      </div>

      {/* ─── Neural AI Panel ─── */}
      {showAI && (
        <div className="w-80 bg-[#050508]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col shrink-0 shadow-[-15px_0_40px_rgba(0,0,0,0.8)] z-30 relative overflow-hidden">
          {/* AI Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] pointer-events-none rounded-full" />

          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0 relative z-10 bg-gradient-to-b from-emerald-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Sparkles size={20} className="text-emerald-400 relative z-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                {isAiThinking && <div className="absolute inset-0 bg-emerald-400 blur-md animate-pulse" />}
              </div>
              <div>
                <span className="text-xs font-black text-white uppercase tracking-[0.25em] block leading-none mb-1.5">DAEMON</span>
                <span className="text-[9px] font-mono text-emerald-500/80 tracking-widest uppercase">Neural Copilot</span>
              </div>
            </div>
            <button onClick={() => setShowAI(false)} className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-white/10 transition-all">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="p-3 border-b border-white/5 bg-black/40 shrink-0 relative z-10">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'explain', label: 'Explain', icon: FileText },
                { id: 'fix', label: 'Fix Bugs', icon: ShieldAlert },
                { id: 'refactor', label: 'Refactor', icon: Zap },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => aiAction(id)} disabled={!activeTab || isAiThinking} className="flex flex-col items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300 transition-all text-xs font-bold text-zinc-400 disabled:opacity-30 disabled:hover:border-white/5 shadow-sm">
                  <Icon size={16} className={!isAiThinking && activeTab ? "text-emerald-500/70" : ""} />
                  <span className="text-[9px] uppercase tracking-wider">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar relative z-10">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'user' && <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">You</span>}
                {msg.role === 'ai' && <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1.5 ml-1 flex items-center gap-1"><Zap size={8} /> DAEMON</span>}
                
                <div className={`max-w-[92%] p-4 rounded-2xl text-[13px] leading-relaxed font-sans shadow-xl ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-tr-sm border border-white/10' : 'bg-emerald-950/40 border border-emerald-500/20 text-zinc-200 rounded-tl-sm backdrop-blur-md'}`}>
                  {msg.role === 'ai' ? (
                    msg.content
                      ? <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(msg.content)) }} />
                      : (isAiThinking && i === aiMessages.length-1 ? <div className="flex items-center gap-2 text-emerald-500 font-mono text-xs uppercase tracking-widest"><Loader2 size={12} className="animate-spin" /> Synthesizing...</div> : '')
                  ) : msg.content}
                </div>
                
                {msg.role === 'ai' && msg.content && (
                  <div className="flex items-center gap-2 mt-2 ml-1">
                    <button onClick={() => copyCode(msg.content)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border border-transparent hover:border-white/10">
                      <Copy size={12} /> Copy
                    </button>
                    {msg.content.includes('```') && activeTab && (
                      <button onClick={applyAICode} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-lg text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                        <Save size={12} /> Apply to Manifest
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={aiScrollRef} />
          </div>

          <div className="p-4 border-t border-white/5 bg-[#010409] shrink-0 relative z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
            <div className="relative group">
              <textarea
                className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-xs outline-none text-white placeholder:text-zinc-600 resize-none font-sans leading-relaxed focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-inner custom-scrollbar"
                style={{ minHeight: '52px', maxHeight: '140px' }}
                placeholder={activeTab ? `Ask DAEMON about ${activeTab.name}...` : 'Initialize neural prompt...'}
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAI(); } }}
                disabled={isAiThinking}
                rows={1}
              />
              <button 
                onClick={() => askAI()} 
                disabled={!aiInput.trim() || isAiThinking} 
                className="absolute right-2 top-2 p-2.5 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95"
              >
                {isAiThinking ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="fill-current" />}
              </button>
            </div>
            <div className="text-center mt-3 text-[9px] text-zinc-600 font-mono uppercase tracking-widest">Shift+Enter for newline</div>
          </div>
        </div>
      )}

      {/* ─── Context Menu ─── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#121214]/95 border border-white/10 rounded-xl shadow-[0_10px_50px_rgba(0,0,0,0.9)] py-2 text-xs backdrop-blur-3xl"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 220), top: Math.min(contextMenu.y, window.innerHeight - 200), minWidth: '220px' }}
        >
          {contextMenu.isDir ? (
            <>
              <button onClick={() => { setNewFileDir(contextMenu.path); setShowNewFile(true); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors flex items-center gap-3 font-medium"><FilePlus size={16} /> New File Here</button>
              <button onClick={() => { openFile(contextMenu.path); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-blue-500/20 hover:text-blue-400 transition-colors flex items-center gap-3 font-medium"><FolderOpen size={16} /> Open Folder</button>
            </>
          ) : (
            <>
              <button onClick={() => { openFile(contextMenu.path); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-blue-500/20 hover:text-blue-400 transition-colors flex items-center gap-3 font-medium"><File size={16} /> Open File</button>
              <button onClick={() => startRename(contextMenu.path)} className="w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 font-medium"><AlignLeft size={16} /> Rename</button>
              <button onClick={() => duplicateFile(contextMenu.path)} className="w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 font-medium"><Copy size={16} /> Duplicate</button>
              <button onClick={() => { const c = contextMenu.path; navigator.clipboard.writeText(c); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 font-medium"><Copy size={16} /> Copy Path</button>
              <div className="border-t border-white/10 my-1 mx-3" />
              <button onClick={() => deleteFile(contextMenu.path)} className="w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-3 font-medium"><X size={16} /> Delete File</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
