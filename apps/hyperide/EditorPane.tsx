import React, { RefObject } from 'react';
import {
  Save, CheckCheck, Replace, MoreHorizontal, X, Code, Play,
  Box, ShieldAlert, ChevronRight,
} from 'lucide-react';
import { fileIcon } from './syntax';
import type { EditorTab, CursorPos } from './types';
import Editor, { useMonaco } from '@monaco-editor/react';

interface EditorPaneProps {
  tabs: EditorTab[];
  activeIdx: number;
  activeTab: EditorTab | null;
  ext: string;
  highlighted: string;
  lineCount: number;
  cursorPos: CursorPos;
  wordWrap: boolean;
  showPreview: boolean;
  showFindReplace: boolean;
  savedIndicator: boolean;
  searchQuery: string;
  replaceQuery: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  onSelectTab: (idx: number) => void;
  onCloseTab: (idx: number) => void;
  onSave: () => void;
  onTogglePreview: () => void;
  onToggleFindReplace: () => void;
  onCloseFindReplace: () => void;
  onContentChange: (content: string) => void;
  onCursorChange: (pos?: { line: number, col: number }) => void;
  onSearchQueryChange: (v: string) => void;
  onReplaceQueryChange: (v: string) => void;
  onFindAndReplace: () => void;
  onBrowseFiles: () => void;
  onNewManifest: () => void;
}

// The central editor area: action bar (Save / Preview / Find-Replace),
// the tab strip, the line-numbered textarea with syntax-highlight
// overlay, and the bottom status bar. Pure presentational component.
export const EditorPane: React.FC<EditorPaneProps> = (props) => {
  const {
    tabs, activeIdx, activeTab, ext, highlighted, lineCount,
    cursorPos, wordWrap, showPreview, showFindReplace, savedIndicator,
    searchQuery, replaceQuery, editorRef,
    onSelectTab, onCloseTab, onSave, onTogglePreview, onToggleFindReplace,
    onCloseFindReplace, onContentChange, onCursorChange,
    onSearchQueryChange, onReplaceQueryChange, onFindAndReplace,
    onBrowseFiles, onNewManifest,
  } = props;

  const monaco = useMonaco();
  
  const getLanguage = (extension: string) => {
    switch(extension) {
      case 'ts':
      case 'tsx': return 'typescript';
      case 'js':
      case 'jsx': return 'javascript';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'py': return 'python';
      case 'sh': return 'shell';
      default: return 'plaintext';
    }
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    editor.onDidChangeCursorPosition((e: any) => {
      onCursorChange({ line: e.position.lineNumber, col: e.position.column });
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave();
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#1E1E1E] relative">
      {/* Top Header / Tabs */}
      <div className="flex flex-col shrink-0 bg-[#252526]">
        {/* Action Bar */}
        <div className="h-11 flex items-center justify-between px-4 border-b border-[#333] bg-[#252526]">
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              disabled={!activeTab || !activeTab.modified}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab?.modified
                  ? 'bg-[#007ACC] text-white hover:bg-[#005A9E]'
                  : 'text-zinc-500'
              }`}
            >
              {savedIndicator ? <CheckCheck size={14} /> : <Save size={14} />}{' '}
              {savedIndicator ? 'Saved' : 'Save'}
            </button>
            {ext === 'html' && (
              <button
                onClick={onTogglePreview}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-black uppercase tracking-widest transition-all ${
                  showPreview
                    ? 'bg-[#007ACC] text-white'
                    : 'text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Play size={14} className={showPreview ? 'animate-pulse' : ''} /> Preview
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFindReplace}
              className="p-1.5 text-zinc-500 hover:text-[#007ACC] hover:bg-[#007ACC]/10 rounded transition-all"
              title="Find / Replace"
            >
              <Replace size={14} />
            </button>
          </div>
        </div>

        {/* Find & Replace Overlay */}
        {showFindReplace && (
          <div className="px-4 py-2.5 bg-[#252526] border-b border-[#333] flex items-center gap-3 shrink-0 shadow-lg">
            <Replace size={16} className="text-[#007ACC]" />
            <input
              autoFocus
              className="w-48 bg-[#3C3C3C] border border-[#3C3C3C] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-[#007ACC]"
              placeholder="Find..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
            <input
              className="w-48 bg-[#3C3C3C] border border-[#3C3C3C] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-[#007ACC]"
              placeholder="Replace with..."
              value={replaceQuery}
              onChange={(e) => onReplaceQueryChange(e.target.value)}
            />
            <button
              onClick={onFindAndReplace}
              disabled={!activeTab || !searchQuery}
              className="px-4 py-1.5 bg-[#007ACC] hover:bg-[#005A9E] rounded text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-30"
            >
              Replace All
            </button>
            <button
              onClick={onCloseFindReplace}
              className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors ml-auto"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tabs Row */}
        {tabs.length > 0 && (
          <div className="flex items-end bg-[#2D2D2D] border-b border-[#1E1E1E] overflow-x-auto custom-scrollbar h-9">
            {tabs.map((tab, i) => (
              <div
                key={tab.path}
                onClick={() => onSelectTab(i)}
                className={`group flex items-center gap-2 px-3 h-full min-w-[120px] max-w-[200px] cursor-pointer select-none transition-all relative ${
                  i === activeIdx
                    ? 'bg-[#1E1E1E] text-[#CCCCCC] border-t-2 border-[#007ACC]'
                    : 'bg-[#2D2D2D] text-[#969696] hover:bg-[#2D2D2D]'
                }`}
              >
                <div className="opacity-80">
                  {fileIcon(tab.name, 14)}
                </div>
                <span className="truncate text-[13px] font-sans flex-1">{tab.name}</span>
                {tab.modified ? (
                  <div className="w-2 h-2 rounded-full bg-white shrink-0" />
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCloseTab(i); }}
                    className={`p-0.5 rounded text-zinc-400 hover:text-white transition-all shrink-0 ${i === activeIdx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {!activeTab ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1E1E1E]">
            <div className="w-32 h-32 mb-8 relative flex items-center justify-center">
              <Code size={80} className="text-[#333]" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-[0.3em] text-[#CCCCCC] mb-3">
              HyperIDE
            </h2>
            <p className="text-[#969696] font-mono text-sm max-w-md text-center mb-10 leading-relaxed">
              VS Code style editor powered by Monaco
            </p>
            <div className="flex gap-4">
              <button
                onClick={onBrowseFiles}
                className="px-8 py-3.5 bg-[#007ACC] hover:bg-[#005A9E] rounded text-sm font-black text-white uppercase tracking-[0.2em] transition-all"
              >
                Browse Files
              </button>
              <button
                onClick={onNewManifest}
                className="px-8 py-3.5 bg-transparent border border-[#007ACC] hover:bg-[#007ACC]/10 rounded text-sm font-black text-[#007ACC] uppercase tracking-[0.2em] transition-all"
              >
                New App
              </button>
            </div>
          </div>
        ) : (
          <div className={`flex-1 flex flex-col overflow-hidden ${showPreview ? 'w-1/2 border-r border-[#333]' : ''}`}>
            <div className="flex-1 flex overflow-hidden bg-[#1E1E1E]">
              <div className="flex-1 relative">
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={getLanguage(ext)}
                  value={activeTab.content}
                  onChange={(val) => onContentChange(val || '')}
                  onMount={handleEditorMount}
                  options={{
                    wordWrap: wordWrap ? 'on' : 'off',
                    minimap: { enabled: true },
                    fontSize: 14,
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    lineHeight: 24,
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    formatOnPaste: true,
                    tabSize: 2,
                    folding: true,
                    links: true,
                    autoIndent: 'full',
                  }}
                />
              </div>
            </div>

            {/* Status Bar */}
            <div className="h-6 bg-[#007ACC] flex items-center px-3 justify-between text-[11px] text-white select-none z-20">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer">
                  <Box size={12} /> {activeTab.name}
                </span>
                <span className="hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer">
                  Ln {cursorPos.line}, Col {cursorPos.col}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer">UTF-8</span>
                <span className="hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer">{getLanguage(ext)}</span>
                <span className="flex items-center gap-1.5 hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer">
                  <ShieldAlert size={12} /> Prettier
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
