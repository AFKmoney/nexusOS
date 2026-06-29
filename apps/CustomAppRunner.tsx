import React, { useState, useEffect, useRef } from 'react';
import { vfs, SYSTEM_VFS_APP_ID } from '../kernel/fileSystem';
import { useOS } from '../store/osStore';
import { appGenerator } from '../kernel/appGenerator';
import { Loader2, AlertTriangle, RefreshCw, Code, Eye, ChevronLeft, FolderOpen } from 'lucide-react';

export default function CustomAppRunner({ windowId, onBack, appId }: { windowId: string, onBack?: () => void, appId?: string }) {
  const desktopState = useOS();
  const { openWindow } = desktopState;

  // Find app manifest in the desktop registry
  const registry = desktopState.registry;
  const windows = desktopState.windows;

  // For desktop, the appId is resolved from the window state when not passed directly.
  const targetAppId = appId || windows.find(w => w.id === windowId)?.appId;
  const app = registry.find(a => a.id === targetAppId);
  const sourcePath = app?.sourcePath;

  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const retryCount = useRef(0);

  // Determine if this is a multi-file generated app (has a manifest.json
  // in /system/apps/<id>/) vs a single-file forged app (just an HTML file).
  const isGeneratedApp = !!(targetAppId?.startsWith('gen_') ||
    (sourcePath && sourcePath.includes('/system/apps/')));

  const loadApp = () => {
    if (!sourcePath && !targetAppId) {
      setError('Source path missing for this application.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let content: string | null = null;

      // For generated apps, use appGenerator.getInlinedEntry() which
      // inlines CSS and JS into the HTML so it works in an iframe
      // without path resolution issues.
      if (isGeneratedApp && targetAppId) {
        content = appGenerator.getInlinedEntry(targetAppId);
      }

      // Fallback: read the single HTML file directly (legacy forged apps)
      if (!content && sourcePath) {
        content = vfs.readFile(sourcePath, SYSTEM_VFS_APP_ID);
      }

      if (content) {
        setHtml(content);
        setError('');
        setLoading(false);
      } else if (retryCount.current < 5) {
        // Retry because IndexedDB might be slow or file might be in the middle of being written
        retryCount.current++;
        setTimeout(loadApp, 500);
      } else {
        setError(`Failed to read application source at ${sourcePath || targetAppId}`);
        setLoading(false);
      }
    } catch (e: any) {
      setError(`Runtime error: ${e.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    retryCount.current = 0;
    loadApp();

    // Refresh if file changes (optional, but good for dev)
    const interval = setInterval(() => {
      let content: string | null = null;
      if (isGeneratedApp && targetAppId) {
        content = appGenerator.getInlinedEntry(targetAppId);
      } else if (sourcePath) {
        content = vfs.readFile(sourcePath, SYSTEM_VFS_APP_ID);
      }
      if (content && content !== html) setHtml(content);
    }, 5000);
    return () => clearInterval(interval);
  }, [sourcePath, targetAppId, isGeneratedApp]);

  // Open the app's source in HyperIDE for editing
  const editInHyperIDE = () => {
    if (!targetAppId) return;
    const appDir = `/system/apps/${targetAppId}`;
    openWindow('hyperide', { projectRoot: appDir });
  };

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-black">
        <Loader2 size={32} className="text-emerald-500 animate-spin mb-4" />
        <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Linking Neural Neural Circuits...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        {onBack && (
           <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
             <button onClick={onBack} className="p-1.5 rounded-xl active:bg-white/10">
               <ChevronLeft size={22} className="text-white" />
             </button>
             <span className="text-white font-semibold">Error</span>
           </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h3 className="text-white font-bold mb-2">Application Link Error</h3>
          <p className="text-zinc-500 text-sm mb-6">{error}</p>
          <button onClick={() => { retryCount.current=0; loadApp(); }} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center gap-2 transition-all">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {onBack && (
        <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-[#080808] border-b border-white/5 z-50 relative">
          <div className="flex items-center gap-3">
            <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
              <ChevronLeft size={22} className="text-white" />
            </button>
            <h1 className="text-white font-semibold text-[16px]">{app?.name || 'Forged App'}</h1>
            {isGeneratedApp && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold uppercase">Generated</span>
            )}
          </div>
          <div className="flex gap-2">
            {isGeneratedApp && (
              <button
                onClick={editInHyperIDE}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition-all"
                title="Edit source in HyperIDE"
              >
                <FolderOpen size={14} /> Edit
              </button>
            )}
             <button onClick={() => setView('preview')} className={`p-1.5 rounded-xl ${view === 'preview' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-600'}`}>
               <Eye size={18} />
             </button>
             <button onClick={() => setView('code')} className={`p-1.5 rounded-xl ${view === 'code' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-600'}`}>
               <Code size={18} />
             </button>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        {view === 'preview' ? (
          <iframe
            srcDoc={html}
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
            title={app?.name || 'Custom App'}
          />
        ) : (
          <textarea
            className="w-full h-full p-4 bg-zinc-950 text-emerald-500 font-mono text-xs outline-none resize-none"
            value={html}
            readOnly
          />
        )}
      </div>

      {!onBack && (
        <div className="h-8 bg-zinc-900 border-t border-white/5 flex items-center justify-between px-3 shrink-0">
          <div className="flex items-center gap-4">
             <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px]">{sourcePath}</span>
             {isGeneratedApp && (
               <button
                 onClick={editInHyperIDE}
                 className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
                 title="Edit in HyperIDE"
               >
                 <FolderOpen size={11} /> Edit
               </button>
             )}
          </div>
          <div className="flex gap-2">
             <button onClick={() => setView('preview')} className={`p-1 rounded ${view === 'preview' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-600 hover:text-zinc-400'}`}>
               <Eye size={12} />
             </button>
             <button onClick={() => setView('code')} className={`p-1 rounded ${view === 'code' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-600 hover:text-zinc-400'}`}>
               <Code size={12} />
             </button>
          </div>
        </div>
      )}
    </div>
  );
}

