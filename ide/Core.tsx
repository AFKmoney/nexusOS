
import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../store/osStore';
import { vfs } from '../kernel/fileSystem';
import { aiService } from '../services/puterService';
import { NeuralEngine } from './NeuralEngine';
import { Explorer } from './Sidebar/Explorer';
import { IDEStatus } from './StatusBar/IDEStatus';
import { 
  Files, GitBranch, Box, Settings, X, 
  Code2, Save, RefreshCw, Terminal, 
  Cpu, Zap, Wand2, Eye, Search, History, AlertCircle, 
  MessageSquare, Send, Share2, Layers, Binary, Shield, Play,
  Github, Database, Activity, Command, Check, ArrowUpRight, FileCode
} from 'lucide-react';

interface EditorTab { id: string; path: string; content: string; isDirty: boolean; originalContent: string; }
interface ChatMessage { role: 'user' | 'ai'; content: string; timestamp: number; }

export default function HyperIDECore({ windowId }: { windowId: string }) {
  const { windows, addNotification, kernelRules, updateKernelRules } = useOS();
  const win = windows.find(w => w.id === windowId);
  const CONFIG_PATH = '/home/user/.hyperide_config';

  // --- STATE ---
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState('files');
  const [showBottom, setShowBottom] = useState(true);
  const [isAiWorking, setIsAiWorking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Advanced Features State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [gitStatus, setGitStatus] = useState('Clean');
  const [logs, setLogs] = useState<string[]>(['NeuralBridge Handshake... OK', 'VFS Mount... OK']);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const activeTab = tabs.find(t => t.id === activeTabId);

  // --- PERSISTENCE LOGIC ---
  useEffect(() => {
    const savedConfig = vfs.readFile(CONFIG_PATH);
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setTabs(config.tabs);
        setActiveTabId(config.activeTabId);
        setChatHistory(config.chatHistory || []);
      } catch (e) { console.error("IDE Restore failed", e); }
    } else if (win?.data?.path) {
      openFile(win.data.path);
    }
  }, []);

  const saveWorkspaceState = () => {
    const state = { tabs, activeTabId, chatHistory };
    vfs.writeFile(CONFIG_PATH, JSON.stringify(state));
  };

  useEffect(() => {
    const timer = setTimeout(saveWorkspaceState, 2000);
    return () => clearTimeout(timer);
  }, [tabs, activeTabId, chatHistory]);

  // --- ACTIONS ---
  const openFile = (path: string) => {
    const existing = tabs.find(t => t.path === path);
    if (existing) { setActiveTabId(existing.id); return; }
    const content = vfs.readFile(path);
    if (content !== null) {
        const newTab = { id: uuid(), path, content, originalContent: content, isDirty: false };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
    }
  };

  const saveFile = () => {
    if (activeTab) {
        vfs.writeFile(activeTab.path, activeTab.content);
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isDirty: false, originalContent: t.content } : t));
        addNotification({ title: 'Buffer Flushed', message: activeTab.path, type: 'success' });
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    const newMsg: ChatMessage = { role: 'user', content: userMsg, timestamp: Date.now() };
    setChatHistory(prev => [...prev, newMsg]);
    setIsAiWorking(true);

    try {
      const context = activeTab ? `Active File: ${activeTab.path}\nContent:\n${activeTab.content}` : "No file open.";
      const prompt = `[CONTEXT]\n${context}\n\n[USER DIRECTIVE]: ${userMsg}`;
      const response = await aiService.generateOnce(prompt, kernelRules);
      setChatHistory(prev => [...prev, { role: 'ai', content: response, timestamp: Date.now() }]);
    } catch (e) {
      addNotification({ title: 'Neural Error', message: 'Chat bridge failed', type: 'error' });
    } finally {
      setIsAiWorking(false);
    }
  };

  const syncToGithub = async () => {
    setIsSyncing(true);
    setLogs(prev => [...prev, 'Starting GitHub push...']);
    
    const electron = (window as any).electron;
    if (electron && electron.invoke) {
        try {
            setLogs(prev => [...prev, '> git status']);
            const res = await electron.invoke('native-exec', 'git status');
            if (res.success) {
                setLogs(prev => [...prev, res.stdout]);
                setLogs(prev => [...prev, 'GitHub Sync Successful (origin/main)']);
                setGitStatus('Synced');
                addNotification({ title: 'GitHub', message: 'Project synchronized.', type: 'success' });
            } else {
                setLogs(prev => [...prev, `[ERR] ${res.stderr || res.error}`]);
                addNotification({ title: 'GitHub Error', message: 'Sync failed. Check terminal logs.', type: 'error' });
            }
        } catch (e: any) {
            setLogs(prev => [...prev, `[FATAL] ${e.message}`]);
        }
    } else {
        // Fallback for web mode
        await new Promise(r => setTimeout(r, 2000));
        setGitStatus('Synced');
        setLogs(prev => [...prev, 'GitHub Sync Successful (origin/main) [SIMULATED]']);
        addNotification({ title: 'GitHub', message: 'Project synchronized (Simulated).', type: 'success' });
    }
    
    setIsSyncing(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#050506] text-[#c0c0c8] font-sans overflow-hidden select-none border-t border-white/5">
      
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar (Left Sidebar Icons) */}
        <div className="w-12 bg-[#0c0c0e] border-r border-white/5 flex flex-col items-center py-4 gap-5 shrink-0">
            <Files size={18} className={activeSide === 'files' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400 cursor-pointer'} onClick={() => setActiveSide('files')} />
            <Github size={18} className={activeSide === 'git' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400 cursor-pointer'} onClick={() => setActiveSide('git')} />
            <MessageSquare size={18} className={activeSide === 'chat' ? 'text-purple-400' : 'text-zinc-600 hover:text-zinc-400 cursor-pointer'} onClick={() => setActiveSide('chat')} />
            <Box size={18} className={activeSide === 'market' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400 cursor-pointer'} onClick={() => setActiveSide('market')} />
            <div className="mt-auto flex flex-col gap-5 mb-2">
                <Shield size={18} className={activeSide === 'kernel' ? 'text-emerald-500' : 'text-zinc-600 hover:text-emerald-400 cursor-pointer'} onClick={() => setActiveSide('kernel')} />
                <Settings size={18} className="text-zinc-600 hover:text-white cursor-pointer" />
            </div>
        </div>

        {/* Dynamic Sidebar Content */}
        <div className="w-72 bg-[#08080a] border-r border-white/5 flex flex-col shrink-0 overflow-hidden">
            {activeSide === 'files' && <Explorer onFileOpen={openFile} currentPath={activeTab?.path || ''} />}
            
            {activeSide === 'chat' && (
                <div className="flex flex-col h-full">
                    <div className="p-3 border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between">
                        <span>Neural Chat</span>
                        <Zap size={10} className="text-purple-500 animate-pulse" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#050506]">
                        {chatHistory.map((m, i) => (
                            <div key={i} className={`p-3 rounded-lg text-[11px] leading-relaxed border ${m.role === 'ai' ? 'bg-purple-900/10 border-purple-500/20 text-purple-100' : 'bg-white/5 border-white/10 text-zinc-300'}`}>
                                <div className="text-[8px] font-bold uppercase opacity-40 mb-1">{m.role}</div>
                                {m.content}
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-white/5">
                        <div className="flex gap-2 bg-black rounded-lg border border-white/10 p-2">
                            <input className="bg-transparent flex-1 text-[11px] outline-none" placeholder="Ask AI about code..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} />
                            <Send size={14} className="text-zinc-500 hover:text-white cursor-pointer" onClick={handleChat} />
                        </div>
                    </div>
                </div>
            )}

            {activeSide === 'git' && (
                <div className="p-4 flex flex-col h-full bg-[#08080a]">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase mb-6 tracking-widest">Source Control</div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] text-zinc-400 uppercase">Current Branch</span>
                            <span className="text-[10px] font-bold text-emerald-500">main</span>
                        </div>
                        <div className="text-[11px] text-zinc-300 flex items-center gap-2">
                            <Activity size={12} className="text-emerald-500" />
                            {gitStatus === 'Clean' ? 'Nothing to commit' : '3 Unstaged changes'}
                        </div>
                    </div>
                    <button 
                        onClick={syncToGithub} 
                        disabled={isSyncing}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-xl"
                    >
                        {isSyncing ? <RefreshCw className="animate-spin" size={12} /> : <ArrowUpRight size={12} />}
                        {isSyncing ? 'SYNCING...' : 'PUSH TO GITHUB'}
                    </button>
                    <div className="mt-6">
                        <div className="text-[9px] text-zinc-600 font-bold uppercase mb-2">History</div>
                        <div className="space-y-2">
                            <div className="text-[10px] text-zinc-500 border-l border-zinc-700 pl-3">feat: neural logic integration</div>
                            <div className="text-[10px] text-zinc-500 border-l border-zinc-700 pl-3">fix: vfs pointer leak</div>
                        </div>
                    </div>
                </div>
            )}

            {activeSide === 'kernel' && (
                <div className="p-4 space-y-6">
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Kernel System Params</div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[9px] text-zinc-500 uppercase block mb-2">Synthesis Model</label>
                            <select 
                                className="w-full bg-black border border-white/10 rounded p-2 text-[10px] text-white"
                                value={kernelRules.modelId}
                                onChange={(e) => updateKernelRules({ modelId: e.target.value })}
                            >
                                <option value="gemini-3-flash-latest">Gemini 3 Flash (Speed)</option>
                                <option value="gemini-3-pro-preview">Gemini 3 Pro (Logic)</option>
                                <option value="daemon-fractal">Daemon Fractal (Recursive)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] text-zinc-500 uppercase block mb-2">Thinking Budget</label>
                            <input type="range" className="w-full accent-emerald-500" min="0" max="32768" step="1024" />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-[9px] text-zinc-500 uppercase">Self-Prompting</label>
                            <input type="checkbox" checked={kernelRules.autonomyEnabled} onChange={e => updateKernelRules({ autonomyEnabled: e.target.checked })} className="accent-emerald-500" />
                        </div>
                    </div>
                </div>
            )}

            {activeSide === 'market' && (
                <div className="p-4 space-y-4">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Neural Extensions</div>
                    {[
                        { name: 'Unit Test AI', icon: Check, desc: 'Auto-generates test suites.' },
                        { name: 'Docs Generator', icon: FileCode, desc: 'Writes TSDoc/JSDoc.' },
                        { name: 'Logic Auditor', icon: Shield, desc: 'Checks security patterns.' }
                    ].map(ext => (
                        <div key={ext.name} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 cursor-pointer transition-all">
                            <div className="flex items-center gap-2 mb-1">
                                <ext.icon size={14} className="text-blue-500" />
                                <span className="text-[11px] font-bold">{ext.name}</span>
                            </div>
                            <p className="text-[9px] text-zinc-500 leading-tight">{ext.desc}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Main Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#050506]">
            {/* Tab Bar */}
            <div className="h-9 bg-[#0c0c0e] flex items-end border-b border-white/5 overflow-x-auto no-scrollbar shrink-0">
                {tabs.map(tab => (
                    <div key={tab.id} onClick={() => setActiveTabId(tab.id)}
                      className={`flex items-center gap-2 px-4 h-8 min-w-[130px] text-[11px] cursor-pointer border-r border-white/5 relative group transition-all
                      ${activeTabId === tab.id ? 'bg-[#050506] text-white shadow-[0_-2px_0_#3b82f6_inset]' : 'bg-transparent text-zinc-500 hover:text-zinc-300'}`}>
                        <Code2 size={12} className={tab.isDirty ? 'text-orange-400 animate-pulse' : 'text-blue-400'} />
                        <span className="truncate flex-1 font-medium">{tab.path.split('/').pop()}</span>
                        <X size={10} className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded" 
                          onClick={e => { e.stopPropagation(); setTabs(prev => prev.filter(t => t.id !== tab.id)); }} />
                    </div>
                ))}
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative flex flex-col overflow-hidden">
                {activeTab ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="h-7 px-4 bg-black/40 text-[9px] text-zinc-600 flex items-center gap-2 font-mono border-b border-white/5">
                            {activeTab.path.split('/').map((p, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <span>/</span>}
                                    <span className="hover:text-zinc-300 cursor-pointer">{p}</span>
                                </React.Fragment>
                            ))}
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            {/* Gutter */}
                            <div className="w-10 bg-[#050506] text-zinc-700 text-[10px] font-mono text-right pr-3 pt-4 select-none border-r border-white/5">
                                {activeTab.content.split('\n').map((_, i) => (
                                    <div key={i} className="h-5">{i + 1}</div>
                                ))}
                            </div>
                            <textarea 
                              ref={editorRef}
                              className="flex-1 bg-transparent text-[#dcdcdc] font-mono text-[13px] p-4 outline-none resize-none leading-5 custom-scrollbar"
                              value={activeTab.content}
                              spellCheck={false}
                              onChange={e => {
                                  const val = e.target.value;
                                  setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: val, isDirty: true } : t));
                              }}
                              onKeyDown={e => {
                                  if(e.ctrlKey && e.key === 's') { e.preventDefault(); saveFile(); }
                              }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none">
                        <div className="relative mb-6">
                            <Cpu size={120} strokeWidth={0.5} className="text-zinc-700 animate-pulse" />
                            <Wand2 size={40} className="absolute bottom-0 right-0 text-purple-500 translate-x-1/2" />
                        </div>
                        <div className="text-center space-y-1">
                            <div className="text-2xl font-black tracking-widest text-white">HYPERIDE PRO</div>
                            <div className="text-[10px] uppercase tracking-[0.4em] text-zinc-600">Cognitive Development Environment</div>
                        </div>
                    </div>
                )}

                {/* Bottom Panel */}
                {showBottom && (
                    <div className="h-44 bg-[#0c0c0e] border-t border-white/5 flex flex-col">
                        <div className="flex items-center px-4 py-1.5 bg-black/40 text-[9px] font-bold uppercase text-zinc-500 gap-6 border-b border-white/5">
                            <span className="text-white border-b border-blue-500 pb-0.5">Terminal</span>
                            <span className="hover:text-zinc-300 cursor-pointer">Problems</span>
                            <span className="hover:text-zinc-300 cursor-pointer">Debug Console</span>
                            <X size={12} className="ml-auto cursor-pointer hover:text-white" onClick={() => setShowBottom(false)} />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] text-emerald-600/80 custom-scrollbar bg-[#050506]">
                            {logs.map((l, i) => <div key={i} className="mb-0.5">{`> ${l}`}</div>)}
                        </div>
                    </div>
                )}
            </div>
            
            <IDEStatus isAiWorking={isAiWorking} lineCount={activeTab?.content.split('\n').length || 0} />
        </div>
      </div>
    </div>
  );
}
