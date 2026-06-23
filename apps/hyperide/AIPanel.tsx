import React, { RefObject } from 'react';
import DOMPurify from 'dompurify';
import {
  ChevronRight, Loader2, Zap, Sparkles, Copy, Save,
  FileText, ShieldAlert,
} from 'lucide-react';
import type { AiMsg, EditorTab } from './types';

interface AIPanelProps {
  aiMessages: AiMsg[];
  aiInput: string;
  isAiThinking: boolean;
  activeTab: EditorTab | null;
  aiScrollRef: RefObject<HTMLDivElement | null>;
  onSetAiInput: (v: string) => void;
  onAsk: (question?: string) => void;
  onAiAction: (action: string) => void;
  onCopyCode: (content: string) => void;
  onApplyAICode: (content?: string) => void;
  onClose: () => void;
}

// Lightweight markdown renderer for the AI chat surface. Only handles
// bold, inline code, fenced code blocks, headings, and newlines — same
// behavior as the original inline implementation, extracted here so the
// orchestrator doesn't have to know about HTML.
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-300">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-black/50 text-emerald-300 px-1.5 py-0.5 rounded-md text-xs font-mono border border-emerald-500/20">$1</code>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-black/80 border border-white/10 rounded-xl p-3 my-2 overflow-x-auto max-w-full text-emerald-200 text-[11px] font-mono shadow-inner whitespace-pre-wrap break-words">$2</pre>')
    .replace(/^#{1,3}\s(.+)$/gm, '<div class="text-white font-black text-sm mt-4 mb-2 tracking-wide uppercase">$1</div>')
    .replace(/\n/g, '<br/>');
}

export const AIPanel: React.FC<AIPanelProps> = (props) => {
  const {
    aiMessages, aiInput, isAiThinking, activeTab, aiScrollRef,
    onSetAiInput, onAsk, onAiAction, onCopyCode, onApplyAICode, onClose,
  } = props;

  const actions: { id: string; label: string; icon: typeof FileText }[] = [
    { id: 'explain', label: 'Explain', icon: FileText },
    { id: 'fix', label: 'Fix Bugs', icon: ShieldAlert },
    { id: 'refactor', label: 'Refactor', icon: Zap },
  ];

  return (
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
        <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-white/10 transition-all">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="p-3 border-b border-white/5 bg-black/40 shrink-0 relative z-10">
        <div className="grid grid-cols-3 gap-2">
          {actions.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onAiAction(id)}
              disabled={!activeTab || isAiThinking}
              className="flex flex-col items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300 transition-all text-xs font-bold text-zinc-400 disabled:opacity-30 disabled:hover:border-white/5 shadow-sm"
            >
              <Icon size={16} className={!isAiThinking && activeTab ? 'text-emerald-500/70' : ''} />
              <span className="text-[9px] uppercase tracking-wider">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 custom-scrollbar relative z-10">
        {aiMessages.map((msg, i) => (
          <div key={i} className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.role === 'user' && (
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 mr-1">You</span>
            )}
            {msg.role === 'ai' && (
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1.5 ml-1 flex items-center gap-1">
                <Zap size={8} /> DAEMON
              </span>
            )}

            <div
              className={`w-[92%] min-w-0 overflow-hidden p-3.5 rounded-2xl text-[12px] leading-relaxed font-sans shadow-xl ${
                msg.role === 'user'
                  ? 'bg-zinc-800 text-white rounded-tr-sm border border-white/10 self-end'
                  : 'bg-emerald-950/40 border border-emerald-500/20 text-zinc-200 rounded-tl-sm backdrop-blur-md'
              }`}
            >
              {msg.role === 'ai' ? (
                msg.content ? (
                  <div
                    className="min-w-0 overflow-hidden [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all [&_*]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(msg.content)) }}
                  />
                ) : isAiThinking && i === aiMessages.length - 1 ? (
                  <div className="flex items-center gap-2 text-emerald-500 font-mono text-xs uppercase tracking-widest">
                    <Loader2 size={12} className="animate-spin" /> Synthesizing...
                  </div>
                ) : null
              ) : (
                <span className="break-words">{msg.content}</span>
              )}
            </div>

            {msg.role === 'ai' && msg.content && (
              <div className="flex items-center gap-2 mt-2 ml-1 flex-wrap">
                <button
                  onClick={() => onCopyCode(msg.content)}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border border-transparent hover:border-white/10"
                >
                  <Copy size={11} /> Copy
                </button>
                {msg.content.includes('```') && activeTab && (
                  <button
                    onClick={() => onApplyAICode(msg.content)}
                    className="px-2.5 py-1.5 bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 rounded-lg text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)] hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    <Save size={11} /> Apply to Editor
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
            onChange={(e) => onSetAiInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onAsk();
              }
            }}
            disabled={isAiThinking}
            rows={1}
          />
          <button
            onClick={() => onAsk()}
            disabled={!aiInput.trim() || isAiThinking}
            className="absolute right-2 top-2 p-2.5 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95"
          >
            {isAiThinking ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="fill-current" />}
          </button>
        </div>
        <div className="text-center mt-3 text-[9px] text-zinc-600 font-mono uppercase tracking-widest">
          Shift+Enter for newline
        </div>
      </div>
    </div>
  );
};
