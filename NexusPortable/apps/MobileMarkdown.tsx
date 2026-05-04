import React, { useState } from 'react';
import { ChevronLeft, Eye, Edit3 } from 'lucide-react';
import type { MobileAppProps } from '../types';

const SAMPLE = `# NexusOS Mobile

**The Sovereign Neural OS** — now on your phone.

## Features
- 🤖 DAEMON AI backbone
- 📱 Full mobile optimization
- 🔒 Secure boot
- ⚡ Neural engine

## Quick Start
\`\`\`bash
npm run dev
open http://localhost:3001
\`\`\`

> Built with React 19 + Zustand + Tailwind CSS

---

*NexusOS Mobile v1.0.0*`;

function renderMd(md: string) {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-white text-lg font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-white text-xl font-bold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-white text-2xl font-black mt-4 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-white/70">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded text-emerald-400 text-[13px]" style="background:rgba(16,185,129,0.1)">$1</code>')
    .replace(/```[\w]*\n?([\s\S]*?)```/gm, '<pre class="p-3 rounded-xl my-3 text-emerald-300 text-[12px] overflow-x-auto" style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15)">$1</pre>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-emerald-500/40 pl-4 text-white/60 italic my-2">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="border-white/10 my-4" />')
    .replace(/^- (.+)$/gm, '<li class="text-white/80 text-[14px] ml-4 list-disc">$1</li>')
    .replace(/<\/li>\n<li/g, '</li><li')
    .replace(/(<li.*<\/li>)/s, '<ul class="space-y-1 my-2">$1</ul>')
    .replace(/\n\n/g, '</p><p class="text-white/70 text-[14px] leading-relaxed my-2">')
    .replace(/^(?!<[h|p|u|b|l|c|p])/gm, '')
    .trim();
}

export default function MobileMarkdown({ onBack }: MobileAppProps) {
  const [content, setContent] = useState(SAMPLE);
  const [preview, setPreview] = useState(true);

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px] flex-1">Markdown</h1>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all"
          style={{
            background: preview ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.07)',
            color: preview ? '#10b981' : 'rgba(255,255,255,0.6)',
            border: `1px solid ${preview ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}
          onClick={() => setPreview(p => !p)}
        >
          {preview ? <Edit3 size={13} /> : <Eye size={13} />}
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {preview ? (
        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          dangerouslySetInnerHTML={{ __html: renderMd(content) }}
        />
      ) : (
        <textarea
          className="flex-1 p-5 bg-transparent text-white/80 font-mono resize-none outline-none"
          style={{
            fontSize: '14px',
            lineHeight: '1.7',
            caretColor: 'var(--nx-accent)',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
          value={content}
          onChange={e => setContent(e.target.value)}
          spellCheck={false}
        />
      )}
    </div>
  );
}
