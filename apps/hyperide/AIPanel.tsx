import React from 'react';
import {
  FileText, Zap, ShieldAlert, ChevronRight, Copy, Save, Loader2, Sparkles
} from 'lucide-react';
import DOMPurify from 'dompurify';
import type { EditorTab, AiMsg } from './types';

interface AIPanelProps {
  aiMessages: AiMsg[];
  aiInput: string;
  isAiThinking: boolean;
  activeTab: EditorTab | null;
  aiScrollRef: React.RefObject<HTMLDivElement | null>;
  onSetAiInput: (val: string) => void;
  onAsk: () => void;
  onAiAction: (action: string) => void;
  onCopyCode: (code: string) => void;
  onApplyAICode: (code: string) => void;
  onClose: () => void;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#007ACC]">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-[#1E1E1E] text-[#D4D4D4] px-1.5 py-0.5 rounded text-xs font-mono border border-[#3C3C3C]">$1</code>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-[#1E1E1E] border border-[#3C3C3C] rounded p-3 my-2 overflow-x-auto max-w-full text-[#D4D4D4] text-[11px] font-mono whitespace-pre-wrap break-words">$2</pre>')
    .replace(/^#{1,3}\s(.+)$/gm, '<div class="text-white font-bold text-sm mt-4 mb-2">$1</div>')
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
    <div className="w-full h-full bg-[#252526] border-l border-[#333333] flex flex-col shrink-0 z-30 relative overflow-hidden shadow-2xl">
      <div className="px-4 py-3 border-b border-[#333333] flex items-center justify-between shrink-0 bg-[#2D2D2D]">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#007ACC]" />
          <span className="text-xs font-medium text-white tracking-wide">COMPOSER</span>
        </div>
        <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition-all">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="p-2 border-b border-[#333333] bg-[#252526] shrink-0">
        <div className="flex gap-2">
          {actions.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onAiAction(id)}
              disabled={!activeTab || isAiThinking}
              className="flex items-center gap-1.5 px-2 py-1.5 flex-1 justify-center rounded bg-[#333333] hover:bg-[#3C3C3C] transition-all text-[11px] font-medium text-[#CCCCCC] disabled:opacity-50"
            >
              <Icon size={12} className={!isAiThinking && activeTab ? 'text-[#007ACC]' : ''} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 custom-scrollbar">
        {aiMessages.map((msg, i) => (
          <div key={i} className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`w-full min-w-0 overflow-hidden py-2 text-[13px] leading-relaxed font-sans ${
                msg.role === 'user'
                  ? 'text-white'
                  : 'text-[#CCCCCC]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {msg.role === 'user' ? (
                  <span className="text-[11px] font-bold text-white">You</span>
                ) : (
                  <span className="text-[11px] font-bold text-[#007ACC] flex items-center gap-1.5">
                    <Sparkles size={12} /> COMPOSER
                  </span>
                )}
              </div>
              
              {msg.role === 'ai' ? (
                msg.content ? (
                  <div
                    className="min-w-0 overflow-hidden [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all [&_*]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(msg.content)) }}
                  />
                ) : isAiThinking && i === aiMessages.length - 1 ? (
                  <div className="flex items-center gap-2 text-[#007ACC] text-xs">
                    <Loader2 size={12} className="animate-spin" /> Thinking...
                  </div>
                ) : null
              ) : (
                <span className="break-words bg-[#333333] px-3 py-2 rounded-xl inline-block">{msg.content}</span>
              )}
            </div>
            
            {msg.role === 'ai' && msg.content && (
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => onCopyCode(msg.content)}
                  className="px-2 py-1 bg-[#333333] hover:bg-[#3C3C3C] rounded text-[#CCCCCC] hover:text-white flex items-center gap-1.5 text-[10px] transition-all"
                >
                  <Copy size={12} /> Copy
                </button>
                {msg.content.includes('```') && activeTab && (
                  <button
                    onClick={() => onApplyAICode(msg.content)}
                    className="px-2 py-1 bg-[#007ACC]/10 hover:bg-[#007ACC]/20 text-[#007ACC] rounded flex items-center gap-1.5 text-[10px] transition-all border border-[#007ACC]/30"
                  >
                    <Save size={12} /> Apply to {activeTab.name}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={aiScrollRef} />
      </div>

      <div className="p-3 border-t border-[#333333] bg-[#252526] shrink-0">
        <div className="relative group">
          <textarea
            className="w-full bg-[#3C3C3C] border border-[#3C3C3C] rounded pl-3 pr-10 py-2.5 text-[13px] outline-none text-white placeholder:text-[#858585] resize-none font-sans leading-relaxed focus:border-[#007ACC] transition-all custom-scrollbar"
            style={{ minHeight: '60px', maxHeight: '140px' }}
            placeholder={activeTab ? `Ask Composer about ${activeTab.name}...` : 'Ask Composer...'}
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
            className="absolute right-2 bottom-2 p-1.5 bg-[#007ACC] text-white rounded hover:bg-[#005A9E] disabled:opacity-50 transition-all"
          >
            {isAiThinking ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="fill-current" />}
          </button>
        </div>
      </div>
    </div>
  );
};
