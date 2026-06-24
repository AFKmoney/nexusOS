import React, { useState } from 'react';
import { useOS } from '../store/osStore';
import { FileArchive, FolderOpen, ArrowRight, Play, CheckCircle, AlertCircle, RefreshCcw } from 'lucide-react';
import { vfs } from '../kernel/fileSystem';

export default function NativeZipApp() {
  const { addNotification } = useOS();
  const [sourcePath, setSourcePath] = useState('');
  const [destPath, setDestPath] = useState('');
  const [status, setStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleExtract = async () => {
    if (!sourcePath || !destPath) {
       setErrorMsg('Please provide both Source ZIP path and Destination path.');
       setStatus('error');
       return;
    }

    if (!window.electron || !window.electron.invoke) {
        setErrorMsg('Native Node.js IPC is not available in web context.');
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
                    // For files, we just create a stub in VFS pointing to the external file
                    vfs.writeFile(fullVfsPath, `[NATIVE FILE STUB]\nOriginal Path: ${file.path}\nSize: ${file.size} bytes`, '__system__');
                  }
                }
              }

              addNotification({ title: 'Extraction Complete', message: `Extracted natively and synced to VFS at ${vfsDestPath}`, type: 'success' });
            } catch (vfsErr) {
              console.error("VFS Sync Error", vfsErr);
              addNotification({ title: 'Extraction Complete', message: `Extracted to ${destPath}, but VFS sync failed.`, type: 'success' });
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
    <div className="flex flex-col h-full bg-[#111] text-zinc-300 font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-zinc-900 border-b border-white/5 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
             <FileArchive size={20} className="text-orange-400" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">Native Archive Extractor</div>
            <div className="text-xs text-zinc-500">Unpacks real host ZIP files via Node.js IPC</div>
          </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
         
         {/* Instruction Banner */}
         <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 mb-6 flex gap-3">
             <InfoIcon />
             <div>
                <strong>Non-Simulated Execution:</strong> This tool bridges out of the NexusOS sandbox and directly calls host utility commands (<code className="bg-black/50 px-1 rounded">Expand-Archive</code> on Windows) to perform physical file extractions on your hard drive. 
             </div>
         </div>

         <div className="space-y-4">
            <div>
               <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Full Path to .ZIP File</label>
               <input 
                 value={sourcePath} onChange={e => setSourcePath(e.target.value)}
                 placeholder="e.g. C:\Users\PHIL\Downloads\archive.zip"
                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-orange-500/50 transition-colors"
               />
            </div>
            
            <div className="flex justify-center">
               <ArrowRight size={24} className="text-zinc-500" />
            </div>

            <div>
               <div className="flex justify-between items-end mb-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Destination Folder</label>
                  <button onClick={autofillDesktop} className="text-[10px] text-orange-400 hover:text-orange-300">Autofill Temp</button>
               </div>
               <input 
                 value={destPath} onChange={e => setDestPath(e.target.value)}
                 placeholder="e.g. C:\Users\PHIL\Desktop\ExtractedFiles"
                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-orange-500/50 transition-colors"
               />
            </div>
         </div>

         {/* Status Area */}
         <div className="mt-8">
            {status === 'idle' && (
                <button 
                  onClick={handleExtract}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                   <Play size={18} /> Execute Native Extraction
                </button>
            )}

            {status === 'extracting' && (
                <div className="w-full py-3 border border-orange-500/30 bg-orange-500/10 text-orange-400 rounded-xl font-bold flex items-center justify-center gap-2">
                   <RefreshCcw size={18} className="animate-spin" /> Extracting Archive via Host OS...
                </div>
            )}

            {status === 'success' && (
                <div className="w-full py-3 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold flex items-center justify-center gap-2">
                   <CheckCircle size={18} /> Extraction Completed Successfully
                </div>
            )}

            {status === 'error' && (
                <div className="w-full p-4 border border-red-500/30 bg-red-500/10 text-red-400 rounded-xl text-sm flex gap-3 items-start">
                   <AlertCircle size={20} className="shrink-0 mt-0.5" />
                   <div>
                       <div className="font-bold mb-1">Extraction Failed</div>
                       <div className="opacity-80 text-xs break-all">{errorMsg}</div>
                       <button onClick={() => setStatus('idle')} className="mt-3 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs">Try Again</button>
                   </div>
                </div>
            )}
         </div>

      </div>
    </div>
  );
}

function InfoIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
}
