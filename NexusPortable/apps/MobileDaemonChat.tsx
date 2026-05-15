import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send, Cpu, User, Sparkles, RotateCcw, Copy, Terminal, Loader2, Zap } from 'lucide-react';
import type { MobileAppProps } from '../types';
import { useMobile } from '../store/mobileStore';
import { aiService } from '../../services/puterService';
import { localBrain } from '../../services/localBrain';
import { vfs } from '../../kernel/fileSystem';
import { uuid } from '../../utils/uuid';

interface Message {
  id: string;
  role: 'user' | 'daemon' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

const QUICK_PROMPTS = [
  '⚡ System Status',
  '🔍 Audit NexusOS',
  '💻 Build an App',
  '🚀 Roadmap',
];

export default function MobileDaemonChat({ onBack }: MobileAppProps) {
  const { kernelRules, addNotification } = useMobile();
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
        ? '⚡ DAEMON ENGINE CONNECTED\nSTATUS: ONLINE'
        : '⚠️ DAEMON ENGINE INITIALIZING...',
      timestamp: Date.now()
    }
  ]);

  useEffect(() => {
    setMessages(prev => prev.map((m, i) => i === 0 ? {
      ...m,
      content: isAiConnected 
        ? '⚡ DAEMON ENGINE CONNECTED\nSTATUS: ONLINE'
        : '⚠️ DAEMON ENGINE INITIALIZING...',
    } : m));
  }, [isAiConnected]);

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = text || input.trim();
    if (!content || isThinking) return;
    setInput('');

    const userMsg: Message = { id: uuid(), role: 'user', content, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    const daemonMsg: Message = { id: uuid(), role: 'daemon', content: '', timestamp: Date.now(), isStreaming: true };
    setMessages(prev => [...prev, daemonMsg]);

    const systemCtx = `[SYSTEM]: You are DAEMON, the AI engine of NexusOS Mobile. Current time: ${new Date().toLocaleString()}. Be intelligent, technically precise, and helpful.

CRITICAL FEATURE: You can output EXACTLY this format to write files:
<vfs_write path="/system/autocode/example.js">
file content here
</vfs_write>

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
      while ((match = vfsRegex.exec(buf)) !== null) {
        const path = match[1];
        const code = match[2]?.trim();
        if (path && code) {
          try {
            const parts = path.split('/').filter(Boolean);
            let current = '/';
            for (let i = 0; i < parts.length - 1; i++) {
                current += parts[i] + '/';
                if (!vfs.resolveNode(current)) {
                    try { vfs.createDir(current); } catch {}
                }
            }
            vfs.writeFile(path, code);
            addNotification({ title: 'DAEMON Auto-Code', message: `Injected pipeline: ${path}`, type: 'success' });
          } catch (e: any) {
             console.error('Failed to auto-write VFS', e);
          }
        }
      }

    } catch (e: any) {
      setMessages(prev => prev.map(m => m.id === daemonMsg.id ? { ...m, content: `[ERROR] ${e.message}`, isStreaming: false } : m));
    }
    setIsThinking(false);
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
          <div key={i} className="my-2 rounded-xl overflow-hidden border border-emerald-500/20">
            <div className="flex items-center justify-between px-3 py-1.5 bg-black/60">
              <span className="text-[10px] text-emerald-500/70 font-mono uppercase">{lang || 'code'}</span>
              <button onClick={() => copyMsg(code)} className="text-emerald-500/50 hover:text-emerald-300 p-1"><Copy size={12} /></button>
            </div>
            <pre className="p-3 bg-black/40 text-[11px] text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap">{code}</pre>
          </div>
        );
      }
      return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
    });
  };

  return (
    <div className="h-full flex flex-col font-mono" style={{ background: '#050810' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-emerald-500/10 bg-black/40">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
            <ChevronLeft size={22} className="text-white" />
          </button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <Cpu size={18} className="text-emerald-400" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-emerald-400 font-black tracking-widest text-[14px]">DAEMON</p>
            <p className="text-emerald-400/60 text-[10px] uppercase">Neural Core · Online</p>
          </div>
        </div>
        <button
          className="p-1.5 rounded-xl active:bg-white/10"
          onClick={() => setMessages([{ id: '0', role: 'system', content: "DAEMON ENGINE RESTARTED.", timestamp: Date.now() }])}
        >
          <RotateCcw size={16} className="text-zinc-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.role === 'system' && (
              <div className="w-full border rounded-xl p-3 border-emerald-500/20 bg-emerald-500/5 mb-2">
                <div className="text-[11px] font-mono text-emerald-400" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              </div>
            )}
            {msg.role === 'user' && (
              <div className="max-w-[85%]">
                <div className="bg-zinc-800 text-white text-[13px] px-4 py-2.5 rounded-2xl rounded-br-sm leading-relaxed font-sans">
                  {msg.content}
                </div>
              </div>
            )}
            {msg.role === 'daemon' && (
              <div className="max-w-[90%] relative group">
                <div className="text-[13px] px-4 py-3 rounded-2xl rounded-bl-sm leading-relaxed font-sans bg-emerald-500/5 border border-emerald-500/20 text-emerald-100">
                  {formatContent(msg.content)}
                  {msg.isStreaming && <span className="animate-pulse ml-1 text-emerald-500">▊</span>}
                </div>
              </div>
            )}
          </div>
        ))}
        {messages.length === 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(s => (
              <button
                key={s}
                className="px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold text-emerald-500 border border-emerald-500/20 bg-emerald-500/5 active:bg-emerald-500/20"
                onClick={() => sendMessage(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-emerald-500/10 bg-black/40">
        <div className="flex items-end gap-2 bg-black/60 border border-emerald-500/20 rounded-2xl px-3 py-2">
          <Terminal size={14} className="text-emerald-700 shrink-0 mb-1.5" />
          <textarea
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-zinc-500 resize-none max-h-24 min-h-[20px] font-sans"
            placeholder="Command DAEMON..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={1}
          />
          <button
            className="p-1.5 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-30 text-emerald-400 bg-emerald-500/20 active:bg-emerald-500/40"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isThinking}
          >
            {isThinking ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
