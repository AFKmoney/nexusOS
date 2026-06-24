import React, { RefObject } from 'react';
import {
  Save, CheckCheck, Replace, MoreHorizontal, X, Code, Play,
  Box, ShieldAlert, ChevronRight,
} from 'lucide-react';
import { fileIcon } from './syntax';
import type { EditorTab, CursorPos } from './types';

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
  onCursorChange: () => void;
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

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0E0E11] relative">
      {/* Top Header / Tabs */}
      <div className="flex flex-col shrink-0 bg-[#09090B]">
        {/* Action Bar */}
        <div className="h-11 flex items-center justify-between px-4 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent">
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              disabled={!activeTab || !activeTab.modified}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all shadow-sm ${
                activeTab?.modified
                  ? 'bg-blue-500 text-white hover:bg-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                  : 'bg-white/5 text-zinc-500'
              }`}
            >
              {savedIndicator ? <CheckCheck size={14} /> : <Save size={14} />}{' '}
              {savedIndicator ? 'Saved' : 'Save'}
            </button>
            {ext === 'html' && (
              <button
                onClick={onTogglePreview}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                  showPreview
                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Play size={14} className={showPreview ? 'animate-pulse' : ''} /> Preview
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 bg-black/40 rounded-xl p-1 border border-white/5">
            <button
              onClick={onToggleFindReplace}
              className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
              title="Find / Replace"
            >
              <Replace size={14} />
            </button>
            <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="More Options">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Find & Replace Overlay */}
        {showFindReplace && (
          <div className="px-4 py-2.5 bg-zinc-900 border-b border-white/5 flex items-center gap-3 shrink-0 animate-in slide-in-from-top-2 shadow-lg">
            <Replace size={16} className="text-blue-400" />
            <input
              className="flex-1 max-w-xs bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500/50 text-white font-mono shadow-inner transition-colors"
              placeholder="Find..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
            <ChevronRight size={14} className="text-zinc-600" />
            <input
              className="flex-1 max-w-xs bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-yellow-500/50 text-white font-mono shadow-inner transition-colors"
              placeholder="Replace with..."
              value={replaceQuery}
              onChange={(e) => onReplaceQueryChange(e.target.value)}
            />
            <button
              onClick={onFindAndReplace}
              disabled={!activeTab || !searchQuery}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-30 shadow-md"
            >
              Replace All
            </button>
            <button
              onClick={onCloseFindReplace}
              className="p-1 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors ml-auto"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tabs Row */}
        {tabs.length > 0 && (
          <div className="flex items-end bg-[#0A0A0C] border-b border-white/5 overflow-x-auto custom-scrollbar h-10 px-2 gap-1 pt-2">
            {tabs.map((tab, i) => (
              <div
                key={tab.path}
                onClick={() => onSelectTab(i)}
                className={`group flex items-center gap-2 px-4 py-2 min-w-[140px] max-w-[220px] cursor-pointer select-none rounded-t-xl transition-all relative ${
                  i === activeIdx
                    ? 'bg-[#0E0E11] text-white shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-10 before:absolute before:top-0 before:left-2 before:right-2 before:h-0.5 before:bg-blue-500 before:rounded-b-full'
                    : 'bg-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                }`}
              >
                <div className={`transition-transform drop-shadow-md ${i === activeIdx ? 'scale-110' : ''}`}>
                  {fileIcon(tab.name, 14)}
                </div>
                <span className="truncate text-xs font-medium flex-1">{tab.name}</span>
                {tab.modified ? (
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCloseTab(i); }}
                    className="opacity-0 group-hover:opacity-100 hover:bg-red-500/20 p-1 rounded-md text-zinc-400 hover:text-red-400 transition-all shrink-0"
                  >
                    <X size={12} />
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0E0E11]">
            <div className="w-32 h-32 mb-8 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
              <Code size={80} className="text-zinc-800 relative z-10 drop-shadow-2xl" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-[0.3em] text-white mb-3">
              HyperIDE <span className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">Core</span>
            </h2>
            <p className="text-zinc-500 font-mono text-sm max-w-md text-center mb-10 leading-relaxed">
              The integrated development environment. Open a manifest from the explorer or instantiate a new node.
            </p>
            <div className="flex gap-4">
              <button
                onClick={onBrowseFiles}
                className="px-8 py-3.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-sm font-black text-blue-400 uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]"
              >
                Browse Files
              </button>
              <button
                onClick={onNewManifest}
                className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-black text-white uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                New Manifest
              </button>
            </div>
          </div>
        ) : (
          <div className={`flex-1 flex flex-col overflow-hidden ${showPreview ? 'w-1/2 border-r border-white/10' : ''}`}>
            <div className="flex-1 flex overflow-hidden bg-[#0E0E11]">
              {/* Line Numbers Gutter */}
              <div className="w-14 shrink-0 bg-[#0A0A0C] border-r border-white/5 flex flex-col items-end py-4 pr-3 select-none overflow-hidden">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div
                    key={i}
                    className={`text-[13px] leading-6 font-mono transition-colors ${
                      i + 1 === cursorPos.line
                        ? 'text-blue-400 font-bold drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]'
                        : 'text-zinc-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Text Area / Highlight Overlay */}
              <div
                className="flex-1 relative overflow-auto custom-scrollbar"
                onClick={onCursorChange}
                onKeyUp={onCursorChange}
              >
                <pre
                  className={`absolute inset-0 p-4 text-[13px] leading-6 font-mono pointer-events-none ${
                    wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
                  } overflow-hidden text-transparent`}
                  dangerouslySetInnerHTML={{ __html: highlighted }}
                  aria-hidden
                />
                <textarea
                  ref={editorRef}
                  className={`absolute inset-0 w-full h-full p-4 text-[13px] leading-6 font-mono bg-transparent text-transparent caret-blue-400 outline-none resize-none selection:bg-blue-500/30 z-10 ${
                    wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
                  }`}
                  value={activeTab.content}
                  onChange={(e) => onContentChange(e.target.value)}
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const s = e.currentTarget.selectionStart ?? 0;
                      const end = e.currentTarget.selectionEnd ?? s;
                      const v = activeTab.content.substring(0, s) + '  ' + activeTab.content.substring(end);
                      onContentChange(v);
                      setTimeout(() => {
                        if (editorRef.current) {
                          editorRef.current.selectionStart = editorRef.current.selectionEnd = s + 2;
                        }
                      }, 0);
                    }
                  }}
                />
              </div>
            </div>

            {/* Status Bar */}
            <div className="h-8 bg-[#050508] border-t border-white/5 flex items-center px-4 justify-between text-[10px] font-mono uppercase tracking-widest select-none shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-20">
              <div className="flex items-center gap-5 text-zinc-500">
                <span className="text-blue-400 font-bold flex items-center gap-1.5">
                  <Box size={12} /> {activeTab.name}
                </span>
                <span className="bg-black/50 px-2 py-0.5 rounded border border-white/5">
                  Ln {cursorPos.line}, Col {cursorPos.col}
                </span>
                <span className="bg-white/5 px-2 py-0.5 rounded text-zinc-400">{ext}</span>
              </div>
              <div className="flex items-center gap-5 text-zinc-600">
                <span>UTF-8</span>
                <span>{wordWrap ? 'Wrap ON' : 'Wrap OFF'}</span>
                <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">
                  <ShieldAlert size={10} /> Secure
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
