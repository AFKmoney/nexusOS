import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../store/osStore';
import { aiService } from '../services/puterService';
import { localBrain } from '../services/localBrain';
import { 
  Send, Bot, User, Loader2, Sparkles, Zap, ShieldCheck, 
  Terminal, Trash2, Copy, RefreshCw, MessageSquare, Brain
} from 'lucide-react';
import DOMPurify from 'dompurify';

interface Message { role: 'user' | 'ai' | 'system'; content: string; id: string; timestamp: number; }

export default function AionAgent() {
  const { kernelRules, addNotification } = useOS();
  const [input, setAiInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAiConnected, setIsAiConnected] = useState(localBrain.isReady());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const ready = localBrain.isReady();
      if (ready !== isAiConnected) setIsAiConnected(ready);
    }, 2000);
    
    // Initial welcome
    if (messages.length === 0) {
      setMessages([{
        id: 'init',
        role: 'system',
        content: `⚡ **NEXUS.PRIME Interface Linked**\n\nStatus: ${isAiConnected ? 'ONLINE' : 'PENDING'}\nMode: Autonomous\n\nHow can I assist you today?`,
        timestamp: Date.now()
      }]);
    }

    return () => clearInterval(interval);
  }, [isAiConnected]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isAiThinking) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setIsAiThinking(true);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', content: '', timestamp: Date.now() }]);

    try {
      let buf = '';
      await aiService.streamChat(input, kernelRules, (token) => {
        buf += token;
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: buf } : m));
      }, 'coder');
    } catch (e: any) {
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: `[CRITICAL_FAILURE]: ${e.message}` } : m));
    } finally {
      setIsAiThinking(false);
    }
  };

  const clearChat = () => {
    if (confirm("Purge neural memory buffer?")) {
      setMessages([]);
      addNotification({ title: 'Buffer Cleared', message: 'Neural conversation logs purged.', type: 'info' });
    }
  };

  const renderMarkdown = (text: string) => {
    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-400 font-black">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-black/50 text-emerald-300 px-1.5 py-0.5 rounded-md font-mono text-xs border border-white/5">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/60 border border-white/10 p-4 rounded-xl my-4 font-mono text-xs text-emerald-200 overflow-x-auto shadow-inner">$1</pre>')
      .replace(/\n/g, '<br/>');
    return DOMPurify.sanitize(html);
  };

  return (
    <div className="h-full flex flex-col bg-[#050508] text-white font-sans overflow-hidden relative">
      {/* Background Decorative */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header Spatial */}
      <div className="h-16 px-8 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-3xl shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-white/10">
              <Bot size={20} className="text-black" />
            </div>
            {isAiConnected && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#050508] animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />}
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">NEXUS.PRIME</h1>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-mono tracking-widest ${isAiConnected ? 'text-emerald-500' : 'text-zinc-600'}`}>
                {isAiConnected ? 'CORE_LINK: ACTIVE' : 'INITIALIZING_NEURAL_NODES'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearChat} className="p-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all" title="Purge History">
            <Trash2 size={18} />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <div className="px-3 py-1 bg-black/40 border border-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-500">
            Latency: 12ms
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 relative z-0">
        {messages.map((m, i) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
            <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center border border-white/10 shadow-lg ${m.role === 'user' ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {m.role === 'user' ? <User size={18} /> : <Zap size={18} className={isAiThinking && i === messages.length - 1 ? 'animate-pulse' : ''} />}
              </div>
              <div className="space-y-2">
                <div className={`text-[9px] font-black uppercase tracking-widest text-zinc-600 ${m.role === 'user' ? 'text-right mr-1' : 'ml-1'}`}>
                  {m.role === 'user' ? 'Authorized Entity' : 'DAEMON.CORE'} · {new Date(m.timestamp).toLocaleTimeString()}
                </div>
                <div className={`p-5 rounded-3xl text-sm leading-relaxed shadow-2xl backdrop-blur-md border ${
                  m.role === 'user' 
                    ? 'bg-white/[0.03] border-white/10 text-zinc-200 rounded-tr-sm' 
                    : m.role === 'system'
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400/90 font-mono text-xs italic'
                      : 'bg-zinc-900/80 border-white/5 text-zinc-300 rounded-tl-sm'
                }`}>
                  {m.role === 'ai' ? (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                  ) : (
                    m.content
                  )}
                  {isAiThinking && i === messages.length - 1 && !m.content && (
                    <div className="flex items-center gap-2 text-emerald-500/50 font-mono text-xs uppercase tracking-widest">
                      <Loader2 size={12} className="animate-spin" /> Synthesizing...
                    </div>
                  )}
                </div>
                {m.role === 'ai' && m.content && (
                  <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-zinc-600 hover:text-white transition-colors"><Copy size={12}/></button>
                    <button className="p-1.5 text-zinc-600 hover:text-white transition-colors"><RefreshCw size={12}/></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input Area Spatial */}
      <div className="p-8 bg-gradient-to-t from-black to-transparent shrink-0 z-10">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-[32px] blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
          <div className="relative bg-[#0a0a0c]/90 backdrop-blur-3xl border border-white/10 rounded-[28px] p-2 flex items-end shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <textarea
              rows={1}
              className="flex-1 bg-transparent border-none outline-none py-4 px-6 text-sm text-white placeholder:text-zinc-700 resize-none max-h-40 custom-scrollbar font-medium tracking-wide"
              placeholder="Direct neural command..."
              value={input}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isAiThinking}
              className={`mb-2 mr-2 p-4 rounded-2xl transition-all duration-500 shadow-xl active:scale-90 ${input.trim() && !isAiThinking ? 'bg-emerald-500 text-black shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:scale-105' : 'bg-zinc-900 text-zinc-600 opacity-50'}`}
            >
              {isAiThinking ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} fill="currentColor" />}
            </button>
          </div>
          <div className="text-center mt-4 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 select-none">
            Ctrl+Space for Global Search · Shift+Enter for Newline
          </div>
        </div>
      </div>
    </div>
  );
}
