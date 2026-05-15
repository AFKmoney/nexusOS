import React, { useState, useEffect } from 'react';
import { vfs } from '../kernel/fileSystem';
import { useOS } from '../store/osStore';
import { Loader2, AlertTriangle, RefreshCw, Code, Eye } from 'lucide-react';

export default function CustomAppRunner({ windowId }: { windowId: string }) {
  const { windows, registry } = useOS();
  const win = windows.find(w => w.id === windowId);
  const app = registry.find(a => a.id === win?.appId);
  const sourcePath = app?.sourcePath;

  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'preview' | 'code'>('preview');

  const loadApp = () => {
    if (!sourcePath) {
      setError('Source path missing for this application.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const content = vfs.readFile(sourcePath);
      if (content) {
        setHtml(content);
        setError('');
      } else {
        setError(`Failed to read application source at ${sourcePath}`);
      }
    } catch (e: any) {
      setError(`Runtime error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApp();
    // Refresh if file changes (optional, but good for dev)
    const interval = setInterval(() => {
       const content = vfs.readFile(sourcePath || '');
       if (content && content !== html) setHtml(content);
    }, 5000);
    return () => clearInterval(interval);
  }, [sourcePath]);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-black">
        <Loader2 size={32} className="text-emerald-500 animate-spin mb-4" />
        <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Initializing Node...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-black p-8 text-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h3 className="text-white font-bold mb-2">Application Link Error</h3>
        <p className="text-zinc-500 text-sm mb-6">{error}</p>
        <button onClick={loadApp} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center gap-2 transition-all">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
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
      
      <div className="h-8 bg-zinc-900 border-t border-white/5 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-4">
           <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px]">{sourcePath}</span>
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
    </div>
  );
}
