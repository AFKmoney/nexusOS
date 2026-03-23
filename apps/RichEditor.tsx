import React, { useState, useRef, useCallback } from 'react';
import { FileText, Bold, Italic, Underline, List, ListOrdered, Code, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Download, Undo, Redo, Link2 } from 'lucide-react';

export default function RichEditorApp() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [fileName, setFileName] = useState('Untitled');

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }, []);

  const ToolBtn = ({ icon: Icon, cmd, val, tip }: { icon: any; cmd: string; val?: string; tip: string }) => (
    <button onClick={() => exec(cmd, val)} title={tip} className="p-1.5 hover:bg-white/10 rounded-lg transition text-zinc-400 hover:text-white">
      <Icon size={14} />
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
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-amber-400" />
          <input value={fileName} onChange={e => setFileName(e.target.value)} className="font-bold text-sm bg-transparent border-none outline-none text-white tracking-widest uppercase w-40" />
        </div>
        <button onClick={exportHTML} className="flex items-center gap-1 text-xs px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition">
          <Download size={13} /> Export HTML
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-1.5 border-b border-white/5 flex items-center gap-0.5 flex-wrap bg-black/10">
        <ToolBtn icon={Undo} cmd="undo" tip="Undo" />
        <ToolBtn icon={Redo} cmd="redo" tip="Redo" />
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolBtn icon={Bold} cmd="bold" tip="Bold" />
        <ToolBtn icon={Italic} cmd="italic" tip="Italic" />
        <ToolBtn icon={Underline} cmd="underline" tip="Underline" />
        <ToolBtn icon={Code} cmd="formatBlock" val="pre" tip="Code Block" />
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolBtn icon={Heading1} cmd="formatBlock" val="h1" tip="Heading 1" />
        <ToolBtn icon={Heading2} cmd="formatBlock" val="h2" tip="Heading 2" />
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolBtn icon={List} cmd="insertUnorderedList" tip="Bullet List" />
        <ToolBtn icon={ListOrdered} cmd="insertOrderedList" tip="Numbered List" />
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolBtn icon={AlignLeft} cmd="justifyLeft" tip="Align Left" />
        <ToolBtn icon={AlignCenter} cmd="justifyCenter" tip="Center" />
        <ToolBtn icon={AlignRight} cmd="justifyRight" tip="Align Right" />
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button onClick={insertLink} title="Insert Link" className="p-1.5 hover:bg-white/10 rounded-lg transition text-zinc-400 hover:text-white">
          <Link2 size={14} />
        </button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <select onChange={e => exec('fontSize', e.target.value)} className="bg-zinc-900 text-xs text-zinc-400 border border-white/10 rounded px-1 py-0.5 outline-none">
          <option value="2">Small</option>
          <option value="3" selected>Normal</option>
          <option value="4">Large</option>
          <option value="5">Huge</option>
        </select>
        <select onChange={e => exec('foreColor', e.target.value)} className="bg-zinc-900 text-xs text-zinc-400 border border-white/10 rounded px-1 py-0.5 outline-none ml-1">
          <option value="#e2e8f0">White</option>
          <option value="#10b981">Green</option>
          <option value="#f43f5e">Red</option>
          <option value="#3b82f6">Blue</option>
          <option value="#f59e0b">Yellow</option>
          <option value="#8b5cf6">Purple</option>
        </select>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          className="min-h-full outline-none text-zinc-200 leading-relaxed prose prose-invert max-w-none"
          style={{ fontSize: '14px', fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          <h1 style={{ color: '#e2e8f0' }}>Welcome to the Rich Editor</h1>
          <p>Start typing here. Use the toolbar above for formatting.</p>
        </div>
      </div>

      <div className="px-4 py-1.5 border-t border-white/5 text-[10px] text-zinc-600 flex justify-between bg-black/20">
        <span>Rich Text Editor — NexusOS</span>
        <span>Export: HTML</span>
      </div>
    </div>
  );
}
