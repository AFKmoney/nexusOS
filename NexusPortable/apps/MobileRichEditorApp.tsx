import React, { useState, useRef, useCallback } from 'react';
import { ChevronLeft, FileText, Bold, Italic, Underline, List, ListOrdered, Code, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Download, Undo, Redo, Link2 } from 'lucide-react';
import type { MobileAppProps } from '../types';

export default function MobileRichEditorApp({ onBack }: MobileAppProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [fileName, setFileName] = useState('Untitled');

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }, []);

  const ToolBtn = ({ icon: Icon, cmd, val, tip }: { icon: any; cmd: string; val?: string; tip: string }) => (
    <button 
      onClick={() => exec(cmd, val)} 
      title={tip} 
      className="p-2.5 active:bg-white/10 rounded-xl transition text-zinc-400 active:text-white shrink-0"
    >
      <Icon size={18} />
    </button>
  );

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) exec('createLink', url);
  };

  const exportHTML = () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title><style>body{font-family:system-ui;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333;}h1,h2{margin-top:1.5em;}code{background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:0.9em;}</style></head><body>${content}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${fileName}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-black/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
            <ChevronLeft size={22} className="text-white" />
          </button>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-amber-400" />
            <input 
              value={fileName} 
              onChange={e => setFileName(e.target.value)} 
              className="font-bold text-sm bg-transparent border-none outline-none text-white tracking-widest uppercase w-32 focus:ring-0" 
            />
          </div>
        </div>
        <button 
          onClick={exportHTML} 
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl active:bg-emerald-500/30 transition font-bold uppercase tracking-wider"
        >
          <Download size={13} /> Export
        </button>
      </div>

      {/* Scrollable Toolbar */}
      <div className="px-2 py-1 border-b border-white/5 flex items-center gap-1 overflow-x-auto bg-black/20 no-scrollbar shrink-0">
        <ToolBtn icon={Undo} cmd="undo" tip="Undo" />
        <ToolBtn icon={Redo} cmd="redo" tip="Redo" />
        <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
        <ToolBtn icon={Bold} cmd="bold" tip="Bold" />
        <ToolBtn icon={Italic} cmd="italic" tip="Italic" />
        <ToolBtn icon={Underline} cmd="underline" tip="Underline" />
        <ToolBtn icon={Code} cmd="formatBlock" val="pre" tip="Code Block" />
        <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
        <ToolBtn icon={Heading1} cmd="formatBlock" val="h1" tip="Heading 1" />
        <ToolBtn icon={Heading2} cmd="formatBlock" val="h2" tip="Heading 2" />
        <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
        <ToolBtn icon={List} cmd="insertUnorderedList" tip="Bullet List" />
        <ToolBtn icon={ListOrdered} cmd="insertOrderedList" tip="Numbered List" />
        <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
        <ToolBtn icon={AlignLeft} cmd="justifyLeft" tip="Align Left" />
        <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
        <button onClick={insertLink} title="Insert Link" className="p-2.5 active:bg-white/10 rounded-xl transition text-zinc-400 active:text-white shrink-0">
          <Link2 size={18} />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
        <select 
          onChange={e => exec('fontSize', e.target.value)} 
          className="bg-zinc-900 text-xs text-zinc-300 border border-white/10 rounded-lg px-2 py-1 outline-none mr-2"
        >
          <option value="2">Small</option>
          <option value="3" selected>Normal</option>
          <option value="4">Large</option>
          <option value="5">Huge</option>
        </select>
        <select 
          onChange={e => exec('foreColor', e.target.value)} 
          className="bg-zinc-900 text-xs text-zinc-300 border border-white/10 rounded-lg px-2 py-1 outline-none"
        >
          <option value="#e2e8f0">White</option>
          <option value="#10b981">Green</option>
          <option value="#f43f5e">Red</option>
          <option value="#3b82f6">Blue</option>
          <option value="#f59e0b">Yellow</option>
          <option value="#8b5cf6">Purple</option>
        </select>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-5 bg-zinc-950/50">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          className="min-h-full outline-none text-zinc-200 leading-relaxed prose prose-invert max-w-none pb-20"
          style={{ fontSize: '16px', fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          <h1 style={{ color: '#e2e8f0' }}>New Document</h1>
          <p>Start composing your neural manuscript here...</p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 border-t border-white/5 text-[10px] text-zinc-500 flex justify-between bg-black/40 backdrop-blur-md">
        <span className="uppercase tracking-widest font-bold">Rich Text Protocol // 0.1</span>
        <span>HTML Export Ready</span>
      </div>
    </div>
  );
}
