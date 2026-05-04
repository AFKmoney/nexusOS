import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, Cpu, User, Sparkles, RotateCcw } from 'lucide-react';
import type { MobileAppProps } from '../types';
import { useMobile } from '../store/mobileStore';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

const SUGGESTIONS = [
  'What can you do?',
  'Check system status',
  'Open terminal',
  'Help me write code',
  'Explain NexusOS',
];

export default function MobileDaemonChat({ onBack }: MobileAppProps) {
  const { kernelRules, addNotification } = useMobile();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hello! I'm DAEMON, your Neural AI. How can I assist you today?",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const send = async () => {
    const text = input.trim();
    if (!text || isThinking) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, ts: Date.now() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const apiKey = localStorage.getItem('nx_anthropic_key') ?? '';
      if (!apiKey) {
        await new Promise(r => setTimeout(r, 800));
        const reply: ChatMessage = {
          id: Date.now().toString() + 'r',
          role: 'assistant',
          content: `I received your message: "${text}"\n\nTo enable full AI capabilities, add your API key in Settings → DAEMON → AI Keys.`,
          ts: Date.now(),
        };
        setMessages(m => [...m, reply]);
        return;
      }

      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text });

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: kernelRules.modelId || 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: 'You are DAEMON, the AI backbone of NexusOS Mobile. Be concise and helpful.',
          messages: history,
        }),
      });

      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const data = await resp.json();

      const reply: ChatMessage = {
        id: Date.now().toString() + 'r',
        role: 'assistant',
        content: data.content?.[0]?.text ?? 'No response.',
        ts: Date.now(),
      };
      setMessages(m => [...m, reply]);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: Date.now().toString() + 'e',
        role: 'assistant',
        content: `Error: ${err?.message ?? 'Failed to get response'}`,
        ts: Date.now(),
      };
      setMessages(m => [...m, errMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}
      >
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          <Cpu size={18} className="text-emerald-400" strokeWidth={1.8} />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-[15px]">DAEMON</p>
          <p className="text-emerald-400/60 text-[11px]">Neural AI · Online</p>
        </div>
        <button
          className="p-1.5 rounded-xl active:bg-white/10"
          onClick={() => setMessages([{ id: '0', role: 'assistant', content: "Hello! I'm DAEMON. How can I help?", ts: Date.now() }])}
        >
          <RotateCcw size={17} className="text-white/50" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                background: msg.role === 'assistant'
                  ? 'rgba(16,185,129,0.15)'
                  : 'rgba(99,102,241,0.15)',
                border: `1px solid ${msg.role === 'assistant' ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
              }}
            >
              {msg.role === 'assistant'
                ? <Cpu size={15} className="text-emerald-400" />
                : <User size={15} className="text-indigo-400" />
              }
            </div>

            {/* Bubble */}
            <div
              className="max-w-[78%] px-4 py-3 rounded-2xl"
              style={{
                background: msg.role === 'assistant'
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(16,185,129,0.12)',
                border: `1px solid ${msg.role === 'assistant' ? 'rgba(255,255,255,0.07)' : 'rgba(16,185,129,0.25)'}`,
                borderRadius: msg.role === 'user'
                  ? '20px 6px 20px 20px'
                  : '6px 20px 20px 20px',
              }}
            >
              <p className="text-white/90 text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <p className="text-white/25 text-[10px] mt-1 text-right">
                {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <Cpu size={15} className="text-emerald-400 animate-pulse" />
            </div>
            <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px 20px 20px 20px' }}>
              <div className="flex gap-1 items-center h-5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-emerald-400/60 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="space-y-2 mt-2">
            <p className="text-white/30 text-[11px] flex items-center gap-1.5">
              <Sparkles size={11} /> Suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  className="px-3 py-1.5 rounded-xl text-[13px] text-white/70 active:bg-white/15 transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-end gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.95)' }}
      >
        <textarea
          ref={inputRef}
          className="flex-1 bg-transparent text-white outline-none resize-none"
          style={{
            fontSize: '15px',
            lineHeight: '1.5',
            maxHeight: '100px',
            minHeight: '24px',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px',
            padding: '10px 14px',
          }}
          placeholder="Message DAEMON..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
          style={{
            background: input.trim() ? 'var(--nx-accent)' : 'rgba(255,255,255,0.08)',
          }}
          onClick={send}
          disabled={!input.trim() || isThinking}
        >
          <Send size={16} className={input.trim() ? 'text-black' : 'text-white/30'} />
        </button>
      </div>
    </div>
  );
}
