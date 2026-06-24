import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOS } from '../store/osStore';
import { aiService } from '../services/puterService';
import { vfs } from '../kernel/fileSystem';
import { memory } from '../kernel/memory';
import { localBrain } from '../services/localBrain';

import { ActivityBar } from './hyperide/ActivityBar';
import { SidePanel } from './hyperide/SidePanel';
import { EditorPane } from './hyperide/EditorPane';
import { PreviewPane } from './hyperide/PreviewPane';
import { AIPanel } from './hyperide/AIPanel';
import { FileContextMenu } from './hyperide/FileContextMenu';
import { highlight } from './hyperide/syntax';
import type {
  EditorTab, AiMsg, SearchHit, CursorPos,
  ContextMenuState, SidePanelKind,
} from './hyperide/types';

// ─────────────────────────────────────────────────────────────────────
// HyperIDE orchestrator
//
// This component owns all IDE state and wiring (file ops, AI calls,
// keyboard shortcuts, search). Rendering is delegated to the
// sub-components under apps/hyperide/. The orchestrator's job is:
//   1. Hold the source of truth (tabs, activeIdx, search results…)
//   2. Expose action callbacks to sub-components
//   3. Wire keyboard shortcuts and side-effects
//
// Total: ~180 lines. Before decomposition this file was 786 lines and
// mixed presentation, state, and rendering for every panel.
// ─────────────────────────────────────────────────────────────────────

export default function HyperIDE({ windowId, initPath }: { windowId: string; initPath?: string }) {
  const { kernelRules, addNotification } = useOS();

  // ─── Tab state ───────────────────────────────────────────────────
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [currentDir, setCurrentDir] = useState('/home/user');

  // ─── UI panel toggles ────────────────────────────────────────────
  const [sidePanel, setSidePanel] = useState<SidePanelKind>('files');
  const [showSide, setShowSide] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);

  // ─── New-file / rename inline forms ──────────────────────────────
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileDir, setNewFileDir] = useState('');
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // ─── Save indicator ──────────────────────────────────────────────
  const [savedIndicator, setSavedIndicator] = useState(false);

  // ─── AI state ────────────────────────────────────────────────────
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAiConnected, setIsAiConnected] = useState(localBrain.isReady());
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([
    {
      role: 'ai',
      content: `⚡ **NEXUS Neural Forge** ${localBrain.isReady() ? 'Online' : 'Initializing'}...\n\nI am connected to the kernel. I can:\n- **Refactor** & optimize logic\n- **Debug** complex errors\n- **Generate** complete files\n- **Explain** architecture\n\nWhat are we building today, Creator?`,
    },
  ]);
  const [aiInput, setAiInput] = useState('');

  // ─── Search state ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);

  // ─── Cursor + context menu ───────────────────────────────────────
  const [cursorPos, setCursorPos] = useState<CursorPos>({ line: 1, col: 1 });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ─── Refs ────────────────────────────────────────────────────────
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  // ─── Derived ─────────────────────────────────────────────────────
  const activeTab = tabs[activeIdx] ?? null;
  const ext = activeTab?.name.split('.').pop()?.toLowerCase() || 'txt';
  const highlighted = activeTab ? highlight(activeTab.content, ext) : '';
  const lineCount = activeTab ? activeTab.content.split('\n').length : 1;

  // ─── Effects ─────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const ready = localBrain.isReady();
      if (ready !== isAiConnected) setIsAiConnected(ready);
    }, 2000);
    return () => clearInterval(interval);
  }, [isAiConnected]);

  useEffect(() => {
    if (initPath) openFile(initPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initPath]);

  useEffect(() => {
    aiScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  // ─── File operations ─────────────────────────────────────────────
  const openFile = (path: string) => {
    const existing = tabs.findIndex((t) => t.path === path);
    if (existing >= 0) { setActiveIdx(existing); return; }
    const stat = vfs.stat(path);
    if (stat?.type === 'directory') return;
    const content = vfs.readFile(path) ?? '';
    const name = path.split('/').pop() || path;
    const newTabs = [...tabs, { path, name, content, modified: false }];
    setTabs(newTabs);
    setActiveIdx(newTabs.length - 1);
    const parts = path.split('/'); parts.pop();
    setCurrentDir(parts.join('/') || '/home/user');
  };

  const updateContent = (content: string) => {
    setTabs((prev) => prev.map((t, i) => (i === activeIdx ? { ...t, content, modified: true } : t)));
    if (showPreview && previewRef.current?.contentDocument) {
      const doc = previewRef.current.contentDocument;
      doc.open(); doc.write(content); doc.close();
    }
  };

  const saveFile = useCallback(() => {
    if (!activeTab) return;
    vfs.writeFile(activeTab.path, activeTab.content);
    setTabs((prev) => prev.map((t, i) => (i === activeIdx ? { ...t, modified: false } : t)));
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
    memory.remember(`Edited file: ${activeTab.name}`, ['ide', 'file']);
  }, [activeTab, activeIdx]);

  // Keyboard shortcuts — declared after saveFile so the dependency is defined.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveFile(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') { e.preventDefault(); setShowFindReplace((r) => !r); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setSidePanel('search'); setShowSide(true); }
      if (e.key === 'Escape') { setContextMenu(null); setShowFindReplace(false); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [saveFile]);

  const closeTab = (idx: number) => {
    const next = tabs.filter((_, i) => i !== idx);
    setTabs(next);
    setActiveIdx(Math.min(activeIdx, Math.max(0, next.length - 1)));
  };

  const createFile = (dir?: string) => {
    const targetDir = dir || newFileDir || currentDir;
    if (!newFileName.trim()) return;
    const p = `${targetDir}/${newFileName}`;
    vfs.writeFile(p, '');
    openFile(p);
    setNewFileName('');
    setShowNewFile(false);
    setNewFileDir('');
  };

  const deleteFile = (path: string) => {
    vfs.delete(path);
    setTabs((prev) => prev.filter((t) => t.path !== path));
    setContextMenu(null);
  };

  const duplicateFile = (filePath: string) => {
    const content = vfs.readFile(filePath) || '';
    const parts = filePath.split('/');
    const fileName = parts.pop() || 'file';
    const dir = parts.join('/');
    const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
    const baseName = ext ? fileName.slice(0, -ext.length) : fileName;
    const newPath = `${dir}/${baseName}_copy${ext}`;
    vfs.writeFile(newPath, content);
    setContextMenu(null);
    addNotification({ title: 'File Duplicated', message: `Created ${baseName}_copy${ext}`, type: 'success' });
  };

  const startRename = (path: string) => {
    setRenameTarget(path);
    setRenameValue(path.split('/').pop() || '');
    setContextMenu(null);
  };

  const doRename = () => {
    if (!renameTarget || !renameValue.trim()) { setRenameTarget(null); return; }
    const parts = renameTarget.split('/'); parts.pop();
    const newPath = [...parts, renameValue.trim()].join('/');
    const content = vfs.readFile(renameTarget) || '';
    vfs.writeFile(newPath, content);
    vfs.delete(renameTarget);
    setTabs((prev) => prev.map((t) => (t.path === renameTarget ? { ...t, path: newPath, name: renameValue.trim(), modified: true } : t)));
    setRenameTarget(null);
  };

  // ─── Search ──────────────────────────────────────────────────────
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const results: SearchHit[] = [];
    const searchDir = (dir: string) => {
      const items = vfs.listDir(dir) || [];
      items.forEach((item) => {
        const fp = `${dir}/${item}`;
        const stat = vfs.stat(fp);
        if (stat?.type === 'directory') { searchDir(fp); return; }
        const content = vfs.readFile(fp) || '';
        content.split('\n').forEach((line, i) => {
          if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({ path: fp, line: i + 1, text: line.trim().slice(0, 100) });
          }
        });
      });
    };
    searchDir('/home/user');
    searchDir('/system/apps');
    setSearchResults(results.slice(0, 100));
  };

  const findAndReplace = () => {
    if (!activeTab || !searchQuery) return;
    const newContent = activeTab.content.split(searchQuery).join(replaceQuery);
    updateContent(newContent);
    addNotification({ title: 'Replace Done', message: `Replaced all occurrences of "${searchQuery}"`, type: 'success' });
  };

  const handleContextMenu = (e: React.MouseEvent, path: string, isDir: boolean) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, path, isDir });
  };

  // ─── AI integration ──────────────────────────────────────────────
  const askAI = async (question?: string) => {
    const q = question || aiInput.trim();
    if (!q || isAiThinking) return;
    setAiInput('');
    setIsAiThinking(true);
    const fileContext = activeTab
      ? `[CURRENT FILE: ${activeTab.name}]\n\`\`\`${ext}\n${activeTab.content.slice(0, 4000)}\n\`\`\``
      : '[No file open. Provide general architectural guidance.]';
    const prompt = `${fileContext}\n\n[USER REQUEST]: ${q}\nAlways provide high-quality, production-ready code. Use modern patterns.`;

    setAiMessages((prev) => [...prev, { role: 'user', content: q }, { role: 'ai', content: '' }]);
    try {
      let buf = '';
      await aiService.streamChat(prompt, kernelRules, (token) => {
        buf += token;
        setAiMessages((prev) => {
          const u = [...prev];
          u[u.length - 1] = { role: 'ai', content: buf };
          return u;
        });
      }, 'ide');
    } catch (e: any) {
      setAiMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = { role: 'ai', content: `[Error: ${e.message}]` };
        return u;
      });
    } finally {
      setIsAiThinking(false);
    }
  };

  const applyAICode = (msgContent?: string) => {
    const content = msgContent ?? aiMessages.slice().reverse().find((m) => m.role === 'ai')?.content ?? '';
    if (!content || !activeTab) return;
    const blocks = [...content.matchAll(/```(?:\w+)?\n([\s\S]*?)```/g)].map((m) => m[1] ?? '');
    const code = blocks.length
      ? blocks.reduce((a, b) => (b.length > a.length ? b : a))
      : content.replace(/```(?:\w+)?/g, '').trim();
    updateContent(code.trim());
    addNotification({ title: '⚡ Code Applied', message: `Neural synthesis injected into ${activeTab.name}`, type: 'success' });
  };

  const copyCode = (content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
  };

  const aiAction = (action: string) => {
    const prompts: Record<string, string> = {
      explain: 'Explain exactly what this code does — step by step, in plain language.',
      fix: 'Find ALL bugs in this code. Return the COMPLETE fixed file with comments.',
      refactor: 'Refactor this code for maximum performance and readability. Return the complete refactored file.',
      document: 'Add comprehensive JSDoc/docstring comments. Return the complete documented file.',
      tests: 'Write comprehensive unit tests for this code.',
      complete: 'Complete or extend this code.',
      optimize: 'Optimize this code for performance.',
    };
    askAI(prompts[action] || prompts.explain);
  };

  // ─── Editor utils ────────────────────────────────────────────────
  const updateCursorPos = () => {
    const ta = editorRef.current;
    if (!ta || !activeTab) return;
    const before = activeTab.content.slice(0, ta.selectionStart);
    const lines = before.split('\n');
    const lastLine = lines[lines.length - 1] ?? '';
    setCursorPos({ line: lines.length, col: lastLine.length + 1 });
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div
      className="h-full flex bg-[#09090B] text-slate-200 font-sans text-sm overflow-hidden"
      onClick={() => setContextMenu(null)}
    >
      <ActivityBar
        sidePanel={sidePanel}
        showSide={showSide}
        showAI={showAI}
        wordWrap={wordWrap}
        onTogglePanel={(id) => {
          setSidePanel(id);
          setShowSide(sidePanel === id ? !showSide : true);
        }}
        onToggleWordWrap={() => setWordWrap((w) => !w)}
        onToggleAI={() => setShowAI(!showAI)}
      />

      {showSide && (
        <SidePanel
          sidePanel={sidePanel}
          showNewFile={showNewFile}
          newFileName={newFileName}
          newFileDir={newFileDir}
          renameTarget={renameTarget}
          renameValue={renameValue}
          searchQuery={searchQuery}
          searchResults={searchResults}
          activeTabPath={activeTab?.path || ''}
          modifiedTabs={tabs.filter((t) => t.modified)}
          onNewFileClick={() => { setNewFileDir(''); setShowNewFile(true); }}
          onSetNewFileName={setNewFileName}
          onCreateFile={() => createFile()}
          onCancelNewFile={() => setShowNewFile(false)}
          onSetRenameValue={setRenameValue}
          onDoRename={doRename}
          onCancelRename={() => setRenameTarget(null)}
          onSetSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          onOpenFile={openFile}
          onContextMenu={handleContextMenu}
          onClose={() => setShowSide(false)}
          onNeuralReview={() =>
            askAI('Review all recently modified files and suggest what I should review before committing, noting any bugs, style issues, or missing tests.')
          }
        />
      )}

      <EditorPane
        tabs={tabs}
        activeIdx={activeIdx}
        activeTab={activeTab}
        ext={ext}
        highlighted={highlighted}
        lineCount={lineCount}
        cursorPos={cursorPos}
        wordWrap={wordWrap}
        showPreview={showPreview}
        showFindReplace={showFindReplace}
        savedIndicator={savedIndicator}
        searchQuery={searchQuery}
        replaceQuery={replaceQuery}
        editorRef={editorRef}
        onSelectTab={setActiveIdx}
        onCloseTab={closeTab}
        onSave={saveFile}
        onTogglePreview={() => setShowPreview(!showPreview)}
        onToggleFindReplace={() => setShowFindReplace((r) => !r)}
        onCloseFindReplace={() => setShowFindReplace(false)}
        onContentChange={updateContent}
        onCursorChange={updateCursorPos}
        onSearchQueryChange={setSearchQuery}
        onReplaceQueryChange={setReplaceQuery}
        onFindAndReplace={findAndReplace}
        onBrowseFiles={() => { setShowSide(true); setSidePanel('files'); }}
        onNewManifest={() => { setShowSide(true); setSidePanel('files'); setShowNewFile(true); }}
      />

      {showPreview && activeTab && (
        <PreviewPane content={activeTab.content} previewRef={previewRef} />
      )}

      {showAI && (
        <AIPanel
          aiMessages={aiMessages}
          aiInput={aiInput}
          isAiThinking={isAiThinking}
          activeTab={activeTab}
          aiScrollRef={aiScrollRef}
          onSetAiInput={setAiInput}
          onAsk={askAI}
          onAiAction={aiAction}
          onCopyCode={copyCode}
          onApplyAICode={applyAICode}
          onClose={() => setShowAI(false)}
        />
      )}

      {contextMenu && (
        <FileContextMenu
          state={contextMenu}
          onNewFileHere={(path) => { setNewFileDir(path); setShowNewFile(true); setContextMenu(null); }}
          onOpenFolder={(path) => { openFile(path); setContextMenu(null); }}
          onOpenFile={(path) => { openFile(path); setContextMenu(null); }}
          onRename={startRename}
          onDuplicate={duplicateFile}
          onCopyPath={(path) => { navigator.clipboard.writeText(path); setContextMenu(null); }}
          onDelete={deleteFile}
        />
      )}
    </div>
  );
}
