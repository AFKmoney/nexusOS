import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOS } from '../store/osStore';
import { aiService } from '../services/puterService';
import { vfs, SYSTEM_VFS_APP_ID } from '../kernel/fileSystem';
import { memory } from '../kernel/memory';
import { localBrain } from '../services/localBrain';
import { appGenerator } from '../kernel/appGenerator';
import { FolderOpen, Play, FileCode2, Files } from 'lucide-react';

import { ActivityBar } from './hyperide/ActivityBar';
import { SidePanel } from './hyperide/SidePanel';
import { EditorPane } from './hyperide/EditorPane';
import { PreviewPane } from './hyperide/PreviewPane';
import { AIPanel } from './hyperide/AIPanel';
import { FileContextMenu } from './hyperide/FileContextMenu';
import { highlight } from './hyperide/syntax';
import type {
  EditorTab, AiMsg, SearchHit, CursorPos,
  ContextMenuState, SidePanelKind, ProjectState,
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

export default function HyperIDE({ windowId }: { windowId: string; initPath?: string }) {
  const { kernelRules, addNotification, windows, openWindow } = useOS();

  // Resolve initPath from window data (passed by OS::OPEN_APP:hyperide:/path)
  const win = windows.find(w => w.id === windowId);
  const initPath = win?.data?.path as string | undefined;
  const initProjectRoot = win?.data?.projectRoot as string | undefined;

  // ─── Project state ───────────────────────────────────────────────
  // A project is a folder that serves as the root for multi-file editing.
  // When set, the file tree is scoped to the project root, and "Run"
  // can preview the project's entry point.
  const [project, setProject] = useState<ProjectState | null>(null);

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

  // Open a project if one was passed via window data
  useEffect(() => {
    if (initProjectRoot) {
      const stat = vfs.stat(initProjectRoot);
      if (stat?.type === 'directory') {
        const name = initProjectRoot.split('/').pop() || initProjectRoot;
        setProject({
          rootPath: initProjectRoot,
          name,
          openFiles: [],
          lastOpenedAt: Date.now(),
        });
        setCurrentDir(initProjectRoot);
        // Auto-open the entry file if it exists
        const entryPath = `${initProjectRoot}/index.html`;
        if (vfs.readFile(entryPath, SYSTEM_VFS_APP_ID)) {
          openFile(entryPath);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initProjectRoot]);

  useEffect(() => {
    aiScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  // ─── Project operations ──────────────────────────────────────────
  /**
   * Open a folder as a project. Sets the project root, scopes the file
   * tree to it, and auto-opens index.html if present.
   */
  const openProject = (rootPath: string) => {
    const stat = vfs.stat(rootPath);
    if (stat?.type !== 'directory') {
      addNotification({ title: 'Cannot open project', message: `${rootPath} is not a directory`, type: 'error' });
      return;
    }
    const name = rootPath.split('/').pop() || rootPath;
    setProject({
      rootPath,
      name,
      openFiles: [],
      lastOpenedAt: Date.now(),
    });
    setCurrentDir(rootPath);
    // Auto-open the entry file if it exists
    const entryPath = `${rootPath}/index.html`;
    if (vfs.readFile(entryPath, SYSTEM_VFS_APP_ID)) {
      openFile(entryPath);
    }
    addNotification({ title: 'Project opened', message: name, type: 'info' });
  };

  /**
   * Run the current project — if it's a generated app with an entry,
   * open it in a CustomAppRunner window. Otherwise, just preview the
   * active HTML file.
   */
  const runProject = () => {
    if (!project) return;
    // Check if this is a generated app (has manifest.json)
    const manifestPath = `${project.rootPath}/manifest.json`;
    const manifestRaw = vfs.readFile(manifestPath, SYSTEM_VFS_APP_ID);
    if (manifestRaw) {
      try {
        const manifest = JSON.parse(manifestRaw);
        if (manifest.id) {
          // Open the generated app directly
          openWindow(manifest.id);
          return;
        }
      } catch {}
    }
    // Fallback: open index.html in a new window if it exists
    const entryPath = `${project.rootPath}/index.html`;
    if (vfs.readFile(entryPath, SYSTEM_VFS_APP_ID)) {
      openWindow('forge', { autoPrompt: project.name, content: vfs.readFile(entryPath, SYSTEM_VFS_APP_ID), autoRun: true });
    }
  };

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

      {/* ─── Project toolbar ───────────────────────────────────────── */}
      {/* Shows the current project name + Run button when a project is open.
          When no project is open, shows an "Open Project" prompt. */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0d0d12] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen size={14} className="text-emerald-400 shrink-0" />
          {project ? (
            <>
              <span className="text-xs font-bold text-white truncate">{project.name}</span>
              <span className="text-[10px] text-zinc-500 font-mono truncate">{project.rootPath}</span>
            </>
          ) : (
            <span className="text-xs text-zinc-500">No project open — use OS::OPEN_APP:hyperide with projectRoot, or open a generated app to edit it as a project</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {project && (
            <>
              <button
                onClick={runProject}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold transition-all"
                title="Run project (open in app runner)"
              >
                <Play size={12} /> Run
              </button>
              <button
                onClick={() => setSidePanel('project')}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 text-zinc-400 text-xs transition-all"
                title="Project overview"
              >
                <Files size={12} /> Overview
              </button>
            </>
          )}
        </div>
      </div>

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
