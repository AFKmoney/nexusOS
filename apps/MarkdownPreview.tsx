import React, { useState, useEffect } from 'react';
import { FileText, Eye, Code, Download, Share2, Sparkles, BookOpen, Layers } from 'lucide-react';
import { useOS } from '../store/osStore';
import DOMPurify from 'dompurify';

export default function MarkdownPreview() {
  const { addNotification } = useOS();
  const [content, setContent] = useState('# NexusOS Documentation\n\n## Core Principles\n1. **Autonomy**: AI-driven system management.\n2. **Extensibility**: Plugin architecture for custom apps.\n3. **Performance**: Token-optimized AI context engine.\n\n```typescript\nconst core = new NeuralCore();\ncore.initialize();\n```\n\n> "Code is architecture. Architecture is intention."');
  const [view, setView] = useState<'split' | 'preview'>('split');

  const renderMarkdown = (text: string) => {
    // Simple MD-to-HTML transform logic
    let html = text
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-black mb-6 mt-2 text-white border-b border-white/10 pb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-4 mt-8 text-emerald-400 uppercase tracking-widest">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mb-3 mt-6 text-zinc-200">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-zinc-400">$1</em>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" class="rounded-xl shadow-2xl my-6 border border-white/5" />')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-emerald-400 hover:underline">$1</a>')
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-emerald-500 bg-white/5 p-4 my-6 italic text-zinc-300 rounded-r-xl">$1</blockquote>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/60 border border-white/10 p-6 rounded-2xl my-6 font-mono text-sm text-emerald-200 overflow-x-auto shadow-inner"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-xs">$1</code>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-6 list-decimal text-zinc-400 mb-2 pl-2">$1</li>')
      .replace(/^- (.*$)/gm, '<li class="ml-6 list-disc text-zinc-400 mb-2 pl-2">$1</li>')
      .replace(/\n/g, '<br/>');
    
    return DOMPurify.sanitize(html);
  };

  const downloadHtml = () => {
    const blob = new Blob([renderMarkdown(content)], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'manifest.html';
    link.click();
    addNotification({ title: 'Export Success', message: 'Logic manifest compiled to HTML.', type: 'success' });
  };

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Manifest Architect</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Logic-to-Visual Translator</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-black/50 p-1 rounded-xl border border-white/5">
            <button onClick={() => setView('split')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'split' ? 'bg-emerald-500 text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Split</button>
            <button onClick={() => setView('preview')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'preview' ? 'bg-emerald-500 text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Preview</button>
          </div>
          <div className="w-px h-6 bg-white/10 mx-2" />
          <button onClick={downloadHtml} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><Download size={18}/></button>
          <button onClick={() => { navigator.clipboard.writeText(content); }} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Copy"><Share2 size={18}/></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Side */}
        {view === 'split' && (
          <div className="flex-1 border-r border-white/5 bg-[#0a0a0c] relative">
            <textarea 
              className="w-full h-full p-8 bg-transparent text-sm font-mono text-emerald-100/70 outline-none resize-none selection:bg-emerald-500/20 leading-relaxed custom-scrollbar"
              spellCheck={false}
              value={content}
              onChange={e => setContent(e.target.value)}
            />
            <div className="absolute top-4 right-6 opacity-20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest pointer-events-none">
              <Layers size={12} /> Source Logic
            </div>
          </div>
        )}

        {/* Preview Side */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar p-10 bg-black/40 ${view === 'preview' ? 'max-w-4xl mx-auto' : ''}`}>
          <div className="relative">
            <div className="absolute top-0 right-0 opacity-20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest pointer-events-none mb-8">
              <Sparkles size={12} className="text-emerald-400" /> Visual Manifest
            </div>
            <div 
              className="prose prose-invert max-w-none prose-emerald"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="h-8 bg-black/60 border-t border-white/5 flex items-center px-6 gap-6 text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] shrink-0">
        <span>Words: {content.split(/\s+/).filter(x => x).length}</span>
        <span>Characters: {content.length}</span>
        <span className="ml-auto flex items-center gap-1.5"><BookOpen size={10} /> Auto-Save Active</span>
      </div>
    </div>
  );
}
