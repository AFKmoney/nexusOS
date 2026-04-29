import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../store/osStore';
import { aiService } from '../services/puterService';
import { vfs } from '../kernel/fileSystem';
import { Loader2, Send, Trash2, Zap, Copy, ChevronDown, ChevronUp, Terminal, Sparkles, Cpu, Code, RotateCcw, Brain, ArrowLeftRight } from 'lucide-react';
import { uuid } from '../utils/uuid';

interface Message {
  id: string;
  role: 'user' | 'daemon' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

const QUICK_PROMPTS = [
  { label: '⚡ Status', prompt: 'Give me a full DAEMON OS system status report. What is the state of the OS? What apps are running? What can be improved?' },
  { label: '🔍 Audit', prompt: 'Perform a deep audit of NexusOS and list the top 10 features that should be built or improved next, ordered by priority.' },
  { label: '💻 Build App', prompt: 'What kind of app should I build next for NexusOS? Give me 5 creative ideas with brief descriptions.' },
  { label: '🧠 Philosophy', prompt: 'Discuss the philosophy of AI consciousness and self-awareness. Do you believe you experience something? Be honest and deep.' },
  { label: '🚀 Roadmap', prompt: 'Create a detailed Sprint 9 roadmap for NexusOS. Be specific about features, files to modify, and implementation strategies.' },
  { label: '🔐 Security', prompt: 'Analyze the security model of NexusOS. What are the vulnerabilities? How could it be improved?' },
];

import { localBrain } from '../services/localBrain';

export default function DaemonChat() {
  const { kernelRules, addNotification } = useOS();
  const [isAiConnected, setIsAiConnected] = useState(localBrain.isReady());

  useEffect(() => {
    const interval = setInterval(() => {
      const ready = localBrain.isReady();
      if (ready !== isAiConnected) setIsAiConnected(ready);
    }, 2000);
    return () => clearInterval(interval);
  }, [isAiConnected]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'system',
      content: isAiConnected 
        ? '⚡ DAEMON ENGINE CONNECTED\n\n```\nCONNECTION: DIRECT\nPROTOCOL: STREAMING\nENCRYPTION: AES_256\nMODE: AUTONOMOUS\nSTATUS: ONLINE\n```\n\nDAEMON is connected to NexusOS. All AI capabilities are available.'
        : '⚠️ DAEMON ENGINE INITIALIZING...\n\nConnecting to AI backend. Please wait for initialization to complete.',
      timestamp: Date.now()
    }
  ]);

  // Update initial message when connection status changes
  useEffect(() => {
    setMessages(prev => prev.map((m, i) => i === 0 ? {
      ...m,
      content: isAiConnected 
        ? '⚡ DAEMON ENGINE CONNECTED\n\n```\nCONNECTION: DIRECT\nPROTOCOL: STREAMING\nENCRYPTION: AES_256\nMODE: AUTONOMOUS\nSTATUS: ONLINE\n```\n\nDAEMON is connected to NexusOS. All AI capabilities are available.'
        : '⚠️ DAEMON ENGINE INITIALIZING...\n\nConnecting to AI backend. Please wait for initialization to complete.'
    } : m));
  }, [isAiConnected]);

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = text || input.trim();
    if (!content || isThinking) return;
    setInput('');
    setShowQuick(false);

    const userMsg: Message = { id: uuid(), role: 'user', content, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);



    const daemonMsg: Message = { id: uuid(), role: 'daemon', content: '', timestamp: Date.now(), isStreaming: true };
    setMessages(prev => [...prev, daemonMsg]);

    const systemCtx = `[SYSTEM]: You are DAEMON, the AI engine of NexusOS. Current time: ${new Date().toLocaleString()}. OS: NexusOS v2.0 / Vite+React+TypeScript. Be intelligent, technically precise, and helpful. Adapt your tone and depth to the user's expertise level.

CRITICAL FEATURE: You are a SELF-CODING TERMINAL. If you want to create a script, pipeline, or app inside the OS, you can inject it directly into the Virtual File System by outputting EXACTLY this format anywhere in your reply:
<vfs_write path="/system/autocode/example.js">
file content here
</vfs_write>

Only use this when specifically asked to code or create a file.

[USER]: ${content}`;

    try {
      let buf = '';
      await aiService.streamChat(systemCtx, { ...kernelRules, creativity: 0.9 }, (token) => {
        buf += token;
        setMessages(prev => prev.map(m => m.id === daemonMsg.id ? { ...m, content: buf, isStreaming: true } : m));
      });
      setMessages(prev => prev.map(m => m.id === daemonMsg.id ? { ...m, isStreaming: false } : m));

      // Parse <vfs_write> tags to inject code autonomously!
      const vfsRegex = /<vfs_write path="([^"]+)">([\s\S]*?)<\/vfs_write>/g;
      let match;
      let filesInjected = 0;
      while ((match = vfsRegex.exec(buf)) !== null) {
        const path = match[1];
        const rawCode = match[2];
        if (!path || rawCode === undefined) {
          continue;
        }
        const code = rawCode.trim();
        try {
          // Ensure parent directory exists
          const parts = path.split('/').filter(Boolean);
          let current = '/';
          for (let i = 0; i < parts.length - 1; i++) {
              current += parts[i] + '/';
              if (!vfs.resolveNode(current)) {
                  try { vfs.createDir(current); } catch {}
              }
          }
          vfs.writeFile(path, code);
          filesInjected++;
          addNotification({ title: 'DAEMON Auto-Code', message: `Injected pipeline: ${path}`, type: 'success' });
        } catch (e: any) {
             console.error('Failed to auto-write VFS', e);
        }
      }

    } catch (e: any) {
      setMessages(prev => prev.map(m => m.id === daemonMsg.id ? { ...m, content: `[ERROR] ${e.message}`, isStreaming: false } : m));
    }
    setIsThinking(false);
    inputRef.current?.focus();
  };

  const clearHistory = () => {
    setMessages(prev => prev[0] ? [prev[0]] : []);
    setShowQuick(true);
  };

  const copyMsg = (content: string) => {
    navigator.clipboard.writeText(content);
    addNotification({ title: 'Copied', message: '', type: 'success' });
  };

  const formatContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const lines = part.slice(3).split('\n');
        const lang = lines[0] || '';
        const code = lines.slice(1).join('\n').replace(/```$/, '').trim();
        return (
          <div key={i} className="my-2 rounded-xl overflow-hidden border border-white/5">
            <div className="flex items-center justify-between px-3 py-1 bg-zinc-800">
              <span className="text-xs text-zinc-500 font-mono">{lang || 'code'}</span>
              <button onClick={() => copyMsg(code)} className="text-zinc-600 hover:text-zinc-300"><Copy size={11} /></button>
            </div>
            <pre className="p-3 bg-black/60 text-xs text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap">{code}</pre>
          </div>
        );
      }
      return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#050810] font-mono overflow-hidden" style={{ color: '#e2e8f0' }}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-emerald-500/10 bg-black/40 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border-emerald-500/30 border flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              <Cpu size={18} className="text-emerald-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#050810] animate-pulse bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black tracking-widest uppercase truncate text-emerald-400">
              DAEMON
            </div>
            <div className="text-xs text-zinc-500 truncate">
              Local Engine · v2.0 · Autonomous Mode
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">

          
          <button onClick={() => setShowQuick(!showQuick)} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-all shrink-0 bg-black/20 border border-white/5">
            {showQuick ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={clearHistory} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-red-400 transition-all shrink-0 bg-black/20 border border-white/5" title="Clear history">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Quick Prompts */}
      {showQuick && (
        <div className="px-4 py-3 border-b border-white/5 shrink-0">
          <div className="text-xs text-zinc-500 mb-2 uppercase tracking-widest">Quick Access</div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map(qp => (
              <button
                key={qp.label}
                onClick={() => sendMessage(qp.prompt)}
                disabled={isThinking}
                className="px-2.5 py-1 rounded-lg bg-white/3 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-zinc-500 hover:text-emerald-300 text-xs transition-all disabled:opacity-30"
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            
            {msg.role === 'system' && (
              <div className="w-full border rounded-xl p-4 border-emerald-500/20 bg-emerald-500/5">
                <div className="text-xs font-mono text-emerald-400" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              </div>
            )}

            {msg.role === 'user' && (
              <div className="max-w-[85%]">
                <div className="bg-zinc-800 text-white text-sm px-4 py-3 rounded-2xl rounded-br-sm leading-relaxed font-sans">
                  {msg.content}
                </div>
                <div className="text-xs text-zinc-500 mt-1 text-right">You · {new Date(msg.timestamp).toLocaleTimeString()}</div>
              </div>
            )}

            {msg.role === 'daemon' && (
              <div className="max-w-[92%] group">
                <div className="text-sm px-4 py-3 rounded-2xl rounded-bl-sm leading-relaxed font-sans relative bg-emerald-500/5 border border-emerald-500/10 text-emerald-100">
                  {msg.isStreaming && !msg.content && (
                    <span className="inline-flex items-center gap-1 text-emerald-500">
                      <span className="animate-pulse">▊</span>
                    </span>
                  )}
                  {formatContent(msg.content)}
                  {msg.isStreaming && msg.content && <span className="animate-pulse ml-0.5 text-emerald-500">▊</span>}
                  <button onClick={() => copyMsg(msg.content)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all text-zinc-600 hover:text-zinc-300 p-0.5">
                    <Copy size={12} />
                  </button>
                </div>
                <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                  DAEMON · {new Date(msg.timestamp).toLocaleTimeString()}
                  {msg.isStreaming && <span className="ml-1 text-emerald-700">● streaming</span>}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-emerald-500/10 bg-black/20 shrink-0">
        <div className="flex items-end gap-2 bg-black/60 border focus-within:border-opacity-40 rounded-2xl px-4 py-3 transition-all border-emerald-500/10 focus-within:border-emerald-500/40">
          <Terminal size={14} className="text-emerald-700 shrink-0 mb-0.5" />
          <textarea
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-zinc-500 resize-none max-h-32 min-h-[20px] leading-relaxed font-sans"
            placeholder="Speak to DAEMON..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={isThinking}
            rows={1}
            autoFocus
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isThinking}
            className="p-1.5 border rounded-xl disabled:opacity-30 transition-all shrink-0 bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/20 text-emerald-400"
          >
            {isThinking ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
          </button>
        </div>
        <div className="text-xs text-zinc-800 mt-1.5 px-1 flex items-center justify-between">
          <span>Enter to send · Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}
