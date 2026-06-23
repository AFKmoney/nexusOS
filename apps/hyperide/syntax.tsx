// ─── Refined Syntax Highlighting (Daemon Dark Theme) ─────────────
// Extracted from HyperIDE.tsx to keep the orchestrator focused on
// state and wiring. The highlighting is intentionally regex-based and
// cheap — it runs on every keystroke against the active tab's content,
// so any heavier tokenizer would hurt editor responsiveness.

import React from 'react';
import {
  File, FolderOpen, Folder, Settings2,
  TerminalSquare, FileJson, FileType2, FileCode2, FileText,
} from 'lucide-react';

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '&quot;');
}

export function highlight(code: string, ext: string): string {
  if (!['html', 'js', 'ts', 'tsx', 'jsx', 'css', 'json', 'py', 'sh', 'md'].includes(ext)) {
    return escapeHtml(code);
  }
  let h = escapeHtml(code);

  if (ext === 'json') {
    return h
      .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="text-sky-300 font-medium">$1</span>:')
      .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="text-emerald-300">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="text-purple-400 font-bold">$1</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-orange-300">$1</span>');
  }
  if (ext === 'md') {
    h = h.replace(/^(#{1,6}\s.+)$/gm, '<span class="text-yellow-400 font-black tracking-wide">$1</span>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<span class="text-white font-bold">$1</span>');
    h = h.replace(/`([^`]+)`/g, '<span class="text-emerald-300 bg-emerald-500/10 px-1 rounded-md border border-emerald-500/20">$1</span>');
    return h;
  }

  // Keywords
  const kw = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'from', 'async', 'await', 'new', 'try', 'catch', 'throw', 'interface', 'type', 'extends', 'implements', 'true', 'false', 'null', 'undefined', 'void', 'def', 'print', 'self', 'elif', 'in', 'not', 'and', 'or', 'is', 'typeof', 'instanceof', 'static', 'private', 'public', 'protected', 'readonly', 'enum', 'switch', 'case', 'break', 'continue', 'delete', 'yield'];
  kw.forEach(k => {
    h = h.replace(new RegExp(`\\b(${k})\\b`, 'g'), `<span class="text-purple-400 font-semibold">$1</span>`);
  });

  // Strings & Comments
  h = h.replace(/(".*?"|'.*?'|`[\s\S]*?`)/g, '<span class="text-emerald-300">$1</span>');
  h = h.replace(/(\/\/[^\n]*)/g, '<span class="text-zinc-500 italic">$1</span>');
  h = h.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-zinc-500 italic">$1</span>');
  h = h.replace(/(#[^\n]*)/g, '<span class="text-zinc-500 italic">$1</span>');

  // Tags (React/HTML)
  if (['html', 'tsx', 'jsx'].includes(ext)) {
    h = h.replace(/(<\/?)([\w.-]+)/g, '$1<span class="text-rose-400 font-medium">$2</span>');
    h = h.replace(/([\w-]+)=("|&#x27;)/g, '<span class="text-sky-300">$1</span>=$2');
  }

  // Numbers & Types/Classes
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-300">$1</span>');
  h = h.replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="text-yellow-200 font-medium">$1</span>');

  // Functions
  h = h.replace(/\b([a-zA-Z0-9_]+)(?=\()/g, '<span class="text-blue-300 font-medium">$1</span>');

  return h;
}

// ─── Dynamic File Icons ─────────────────────────────────────────
export function fileIcon(name: string, size = 14): React.ReactNode {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'tsx' || ext === 'jsx') return <FileCode2 size={size} className="text-cyan-400" />;
  if (ext === 'ts') return <FileType2 size={size} className="text-blue-400" />;
  if (ext === 'js') return <FileCode2 size={size} className="text-yellow-400" />;
  if (ext === 'json') return <FileJson size={size} className="text-yellow-200" />;
  if (ext === 'md') return <FileText size={size} className="text-zinc-300" />;
  if (ext === 'sh' || ext === 'bat') return <TerminalSquare size={size} className="text-emerald-400" />;
  if (ext === 'css') return <FileCode2 size={size} className="text-sky-400" />;
  if (ext === 'py') return <FileCode2 size={size} className="text-green-500" />;
  if (ext === 'html') return <FileCode2 size={size} className="text-orange-500" />;
  if (name.includes('config') || name.startsWith('.')) return <Settings2 size={size} className="text-zinc-500" />;
  return <File size={size} className="text-zinc-500" />;
}

// Re-export for callers that want them grouped.
export { File, Folder, FolderOpen };
