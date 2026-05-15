import React, { useState } from 'react';
import { ChevronLeft, FileArchive, ArrowDown, Play, CheckCircle, AlertCircle, RefreshCcw, Info, Home } from 'lucide-react';
import { useOS } from '../../store/osStore';
import { vfs } from '../../kernel/fileSystem';
import type { MobileAppProps } from '../types';

export default function MobileNativeZipApp({ onBack }: MobileAppProps) {
  const { addNotification } = useOS();
  const [sourcePath, setSourcePath] = useState('');
  const [destPath, setDestPath] = useState('');
  const [status, setStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleExtract = async () => {
    if (!sourcePath || !destPath) {
       setErrorMsg('Please provide both Source ZIP and Destination paths.');
       setStatus('error');
       return;
    }

    if (!window.electron || !window.electron.invoke) {
        setErrorMsg('Native IPC is not available in this context.');
        setStatus('error');
        return;
    }

    setStatus('extracting');
    try {
        const result = await window.electron.invoke('native-unzip', { source: sourcePath, dest: destPath });
        if (result.success) {
            setStatus('success');

            // Sync with VFS
            try {
              const vfsDestPath = `/home/user/Downloads/Extracted_${Date.now()}`;
              vfs.createDir(vfsDestPath, '__system__');

              if (result.files && Array.isArray(result.files)) {
                for (const file of result.files) {
                  const relativePath = file.path.replace(destPath, '').replace(/\\/g, '/');
                  const fullVfsPath = `${vfsDestPath}${relativePath}`;

                  if (file.type === 'directory') {
                    vfs.createDir(fullVfsPath, '__system__');
                  } else {
                    vfs.writeFile(fullVfsPath, `[NATIVE FILE STUB]\nOriginal Path: ${file.path}\nSize: ${file.size} bytes`, '__system__');
                  }
                }
              }

              addNotification({ title: 'Extraction Complete', message: `Extracted and synced to VFS`, type: 'success' });
            } catch (vfsErr) {
              console.error("VFS Sync Error", vfsErr);
              addNotification({ title: 'Extraction Complete', message: `Extracted to ${destPath}`, type: 'success' });
            }
        } else {
            setErrorMsg(result.error || 'Failed to extract archive.');
            setStatus('error');
        }
    } catch (err: any) {
        setErrorMsg(err.message || 'Fatal error during extraction.');
        setStatus('error');
    }
  };

  const autofillDesktop = async () => {
      const electron = (window as any).electron;
      if (electron && electron.invoke) {
          try {
              const info = await electron.invoke('get-os-info');
              if (info && info.userInfo && info.userInfo.homedir) {
                  const desktop = info.platform === 'win32' 
                    ? `${info.userInfo.homedir}\\Desktop\\NexusExtracted`
                    : `${info.userInfo.homedir}/Desktop/NexusExtracted`;
                  setDestPath(desktop);
                  return;
              }
          } catch {}
      }
      setDestPath('C:\\Archive\\Extracted'); 
  };

  return (
    <div className="h-full flex flex-col bg-[#050505] text-zinc-300 font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 rounded-full active:bg-white/10 transition-colors" onClick={onBack}>
            <ChevronLeft size={24} className="text-white" />
          </button>
          <div>
            <h1 className="text-[14px] font-black uppercase tracking-[0.1em] text-white">Zip Extractor</h1>
            <p className="text-[10px] text-orange-400 font-mono uppercase tracking-widest">Native Bridge</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <FileArchive size={16} className="text-orange-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Warning Banner */}
        <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex gap-3">
          <Info size={18} className="text-orange-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-zinc-400">
            <strong className="text-orange-400 uppercase font-black tracking-wider block mb-1">Warning: Native Execution</strong>
            This tool operates outside the sandbox. It will extract physical files directly to your host operating system's storage.
          </div>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Source ZIP Path</label>
            <div className="relative">
              <input 
                value={sourcePath} 
                onChange={e => setSourcePath(e.target.value)}
                placeholder="e.g. C:\Downloads\app.zip"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-center py-2">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
              <ArrowDown size={20} className="text-zinc-600" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Destination Folder</label>
              <button 
                onClick={autofillDesktop}
                className="text-[10px] font-black text-orange-500 uppercase tracking-wider flex items-center gap-1 active:opacity-50"
              >
                <Home size={12} /> Autofill
              </button>
            </div>
            <input 
              value={destPath} 
              onChange={e => setDestPath(e.target.value)}
              placeholder="e.g. C:\Desktop\Extracted"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Actions & Status */}
        <div className="pt-4">
          {status === 'idle' && (
            <button 
              onClick={handleExtract}
              className="w-full h-14 bg-orange-600 active:bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all"
            >
              <Play size={18} fill="currentColor" /> Start Extraction
            </button>
          )}

          {status === 'extracting' && (
            <div className="w-full h-14 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center gap-3 text-orange-400 text-[11px] font-black uppercase tracking-widest">
              <RefreshCcw size={18} className="animate-spin" /> Processing Archive...
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="w-full h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-3 text-emerald-400 text-[11px] font-black uppercase tracking-widest">
                <CheckCircle size={18} /> Extraction Success
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="w-full text-center text-[10px] font-black text-zinc-500 uppercase tracking-widest py-2"
              >
                Extract Another
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl">
              <div className="flex items-center gap-3 text-red-500 mb-3">
                <AlertCircle size={20} />
                <span className="text-[11px] font-black uppercase tracking-wider">Extraction Failed</span>
              </div>
              <p className="text-xs text-zinc-400 mb-4 break-all leading-relaxed">{errorMsg}</p>
              <button 
                onClick={() => setStatus('idle')}
                className="w-full h-12 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-black uppercase tracking-widest active:bg-red-500 active:text-white transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Capability Footer */}
      <div className="p-6 bg-zinc-900/30 border-t border-white/5">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">System Level Access</div>
          <p className="text-[9px] text-zinc-500 font-mono max-w-[200px]">
            Uses host binary [Expand-Archive] or [unzip] via Node.js secure bridge.
          </p>
        </div>
      </div>
    </div>
  );
}
