import React, { useState } from 'react';
import { FileText, Eye, Edit, Download, Copy, Check } from 'lucide-react';
import DOMPurify from 'dompurify';

export default function MarkdownPreviewApp() {
  const [md, setMd] = useState(`# Welcome to Markdown Preview

## Features
- **Bold** and *italic* text
- Code blocks with \`syntax\`
- Lists (ordered and unordered)
- [Links](https://example.com)
- > Blockquotes

## Code Example
\`\`\`javascript
function hello() {
  console.log("NexusOS");
}
\`\`\`

---

### Table
| Feature | Status |
|---------|--------|
| Preview | ✅ |
| Export  | ✅ |
`);
  const [mode, setMode] = useState<'split'|'edit'|'preview'>('split');
  const [copied, setCopied] = useState(false);

  // Simple markdown → HTML converter
  const toHtml = (text: string) => {
    let html = text
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold text-white mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold text-white mt-4 mb-1">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold text-white mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono">$1</code>')
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-2 border-emerald-500/50 pl-3 text-zinc-400 italic my-2">$1</blockquote>')
      .replace(/^\- (.*$)/gm, '<li class="ml-4 list-disc text-zinc-300 text-sm">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal text-zinc-300 text-sm">$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-cyan-400 hover:underline">$1</a>')
      .replace(/^---$/gm, '<hr class="border-white/10 my-4" />')
      .replace(/\n/g, '<br/>');
    // Code blocks
    html = html.replace(/```(\w*)<br\/>([\s\S]*?)```/g, '<pre class="bg-zinc-900 border border-white/5 rounded-lg p-3 my-2 overflow-x-auto"><code class="text-emerald-400 text-xs font-mono">$2</code></pre>');
    // Tables
    html = html.replace(/\|(.*)\|/g, (match) => {
      const cells = match.split('|').filter(Boolean).map(c => c.trim());
      if (cells.every(c => /^[-]+$/.test(c))) return '';
      return `<tr>${cells.map(c => `<td class="border border-white/10 px-3 py-1 text-xs text-zinc-300">${c}</td>`).join('')}</tr>`;
    });
    html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, '<table class="w-full border-collapse my-2">$1</table>');
    return DOMPurify.sanitize(html);
  };

  const copyMd = () => { navigator.clipboard.writeText(md); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const downloadMd = () => { const blob = new Blob([md], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'document.md'; a.click(); };
  const downloadHtml = () => { const blob = new Blob([`<html><body style="background:#111;color:#ccc;font-family:sans-serif;padding:2rem">${toHtml(md)}</body></html>`], { type: 'text/html' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'document.html'; a.click(); };

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100">
      <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-cyan-400" />
          <span className="font-bold text-xs tracking-widest uppercase">Markdown</span>
        </div>
        <div className="flex items-center gap-1">
          {(['edit', 'split', 'preview'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`px-2.5 py-1 rounded-lg text-xs transition ${mode === m ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-300'}`}>
              {m === 'edit' ? <Edit size={12} /> : m === 'preview' ? <Eye size={12} /> : 'Split'}
            </button>
          ))}
          <div className="h-4 w-px bg-white/10 mx-1" />
          <button onClick={copyMd} className="p-1.5 text-zinc-500 hover:text-white transition">{copied ? <Check size={12} /> : <Copy size={12} />}</button>
          <button onClick={downloadMd} className="p-1.5 text-zinc-500 hover:text-white transition" title="Download .md"><Download size={12} /></button>
          <button onClick={downloadHtml} className="px-2 py-1 text-[10px] text-zinc-500 hover:text-white transition border border-white/10 rounded">HTML</button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {(mode === 'edit' || mode === 'split') && (
          <textarea value={md} onChange={e => setMd(e.target.value)} spellCheck={false}
            className={`${mode === 'split' ? 'w-1/2 border-r border-white/5' : 'w-full'} bg-transparent p-4 font-mono text-sm text-zinc-300 outline-none resize-none`} />
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div className={`${mode === 'split' ? 'w-1/2' : 'w-full'} p-4 overflow-auto prose-invert`}
            dangerouslySetInnerHTML={{ __html: toHtml(md) }} />
        )}
      </div>
    </div>
  );
}
