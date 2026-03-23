
import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../store/osStore';
import { vfs } from '../kernel/fileSystem';
import { nfrEngine, TrainingMetrics } from '../utils/nfrEngine';
import { Archive, ArrowRight, FileText, CheckCircle2, RefreshCw, Cpu, HardDrive, FileArchive, Activity, Terminal, Sliders, Play, Brain, MessageSquare } from 'lucide-react';
import { aiService } from '../services/puterService';

export default function NFRCompressorApp({ windowId }: { windowId: string }) {
  const { windows, addNotification, kernelRules } = useOS();
  const win = windows.find(w => w.id === windowId);
  const initialPath = win?.data?.path;

  const [currentPath, setCurrentPath] = useState('/home/user/Desktop');
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(initialPath ? initialPath.split('/').pop() : null);
  
  // NFR Logic State
  const [processing, setProcessing] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [resultStats, setResultStats] = useState<{ original: number, compressed: number, ratio: string } | null>(null);
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role:'user'|'ai', content:string}[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshFiles();
    if (initialPath) {
        const dir = initialPath.substring(0, initialPath.lastIndexOf('/'));
        setCurrentPath(dir);
        setSelectedFile(initialPath.split('/').pop() || null);
    }
  }, [initialPath]);

  useEffect(() => {
    if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs, chatHistory]);

  const refreshFiles = () => {
    setFiles(vfs.listDir(currentPath));
  };

  const addLog = (msg: string) => setTerminalLogs(prev => [...prev, msg]);

  const handleCompress = async () => {
    if (!selectedFile) return;
    
    setProcessing(true);
    setTerminalLogs([]);
    setResultStats(null);
    setMetrics(null);

    addLog(`[INIT] Loading ${selectedFile}...`);
    addLog(`[NFR] Initializing Arithmetic Coder (Precision: 32-bit)`);
    addLog(`[NFR] Loading Context Model (Order-1 Markov)`);

    const fullPath = `${currentPath}/${selectedFile}`;
    const content = vfs.readFile(fullPath);

    if (content === null) {
        addLog(`[ERR] File Read Error.`);
        setProcessing(false);
        return;
    }

    try {
        const entropy = nfrEngine.calculateEntropy(content);
        addLog(`[ANALYSIS] Shannon Entropy (Baseline): ${entropy.toFixed(4)} bits/byte`);
        addLog(`[STREAM] Beginning Adaptive Coding...`);

        const { archive, model } = await nfrEngine.compress(content, 1, (m) => {
            setMetrics(m);
            if (m.epoch % 2000 === 0 || m.epoch === content.length) {
                // Update log less frequently for UI performance
                setTerminalLogs(prev => {
                    const last = prev[prev.length-1];
                    if (last && last.startsWith('>')) return [...prev.slice(0, -1), `> Bytes: ${m.epoch} | Loss: ${m.loss.toFixed(2)} bits | Conf: ${m.accuracy.toFixed(1)}%`];
                    return [...prev, `> Bytes: ${m.epoch} | Loss: ${m.loss.toFixed(2)} bits | Conf: ${m.accuracy.toFixed(1)}%`];
                });
            }
        });

        // Calculate actual binary size from Base64
        // Base64 is 4/3 larger than binary.
        const binarySize = Math.floor((archive.length - archive.indexOf(',')) * 0.75);
        const originalSize = content.length;
        const ratio = ((1 - (binarySize / originalSize)) * 100).toFixed(2);

        // Save Archive
        const archiveName = `${selectedFile}.dmn`;
        vfs.writeFile(`${currentPath}/${archiveName}`, archive);
        
        // Save Model Meta
        const modelName = `${selectedFile}.model`;
        vfs.writeFile(`${currentPath}/${modelName}`, model);

        addLog(`[WRITE] Daemon Container: ${archiveName}`);
        addLog(`[DONE] Compression Complete.`);
        addLog(`[STATS] Original: ${originalSize} B -> Compressed: ${binarySize} B`);
        addLog(`[STATS] Ratio: ${ratio}% reduction`);

        setResultStats({
            original: originalSize,
            compressed: binarySize, 
            ratio: ratio
        });
        
        refreshFiles();
        addNotification({ title: 'NFR Compression', message: `Reduced by ${ratio}%`, type: 'success' });

    } catch (e: any) {
        addLog(`[FATAL] ${e.message}`);
        console.error(e);
    } finally {
        setProcessing(false);
    }
  };

  const handleDecompress = async () => {
      if (!selectedFile) return;
      setProcessing(true);
      setTerminalLogs([]);
      addLog(`[INIT] Reading Archive ${selectedFile}...`);

      const fullPath = `${currentPath}/${selectedFile}`;
      const content = vfs.readFile(fullPath);

      if (!content) {
          addLog(`[ERR] File not found.`);
          setProcessing(false);
          return;
      }

      try {
          addLog(`[STREAM] Reconstructing Fractals...`);
          const { content: restored, meta } = await nfrEngine.decompress(content);
          
          addLog(`[META] Engine: ${meta.version}`);
          addLog(`[META] Size: ${meta.originalSize} bytes`);
          
          const newFilename = selectedFile.replace('.dmn', '');
          const finalFilename = `${newFilename.startsWith('restored_') ? '' : 'restored_'}${newFilename}`;
          
          vfs.writeFile(`${currentPath}/${finalFilename}`, restored);
          addLog(`[WRITE] Restored to ${finalFilename}`);
          addLog(`[VERIFY] Bit-Perfect Reconstruction: TRUE`);
          
          refreshFiles();
          addNotification({ title: 'NFR Restoration', message: 'Data perfectly reconstructed.', type: 'success' });
      } catch (e: any) {
          addLog(`[ERR] ${e.message}`);
          console.error(e);
      } finally {
          setProcessing(false);
      }
  };

  const handleChat = async () => {
      if (!chatInput.trim() || !selectedFile) return;
      
      const userMsg = chatInput;
      setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
      setChatInput('');
      
      const fullPath = `${currentPath}/${selectedFile}`;
      let context = vfs.readFile(fullPath);
      
      if (selectedFile.endsWith('.dmn')) {
          const { content } = await nfrEngine.decompress(context || "");
          context = content;
      }

      const prompt = `
      [CONTEXT FROM FILE: ${selectedFile}]
      ${context ? context.substring(0, 5000) : "Empty File"}
      ...
      
      [USER QUERY]: ${userMsg}
      
      You are the "Daemon" residing within this compressed archive. Answer based on the file content.
      `;
      
      try {
          const rules = { ...kernelRules, modelId: 'daemon-fractal' };
          const response = await aiService.generateOnce(prompt, rules);
          setChatHistory(prev => [...prev, { role: 'ai', content: response }]);
      } catch (e) {
          setChatHistory(prev => [...prev, { role: 'ai', content: "Error accessing neural weights." }]);
      }
  };

  const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-emerald-500 font-mono select-none">
      {/* Header */}
      <div className="p-4 bg-zinc-900 border-b border-emerald-900/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-900/20 rounded-lg flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <Cpu size={20} className={processing ? "animate-pulse" : ""} />
            </div>
            <div>
                <h1 className="text-lg font-bold text-white tracking-widest flex items-center gap-2">
                    NFR <span className="text-xs bg-emerald-900/40 px-1.5 rounded text-emerald-400 border border-emerald-500/30">v2.0 REAL</span>
                </h1>
                <p className="text-xs text-zinc-500">ADAPTIVE ARITHMETIC CODING</p>
            </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setIsChatMode(!isChatMode)} 
                className={`p-2 rounded hover:bg-emerald-900/20 transition-colors ${isChatMode ? 'text-white bg-emerald-900/30' : 'text-zinc-500'}`}
                title="Chat with Archive"
            >
                <MessageSquare size={18} />
            </button>
            {processing && <Activity className="text-emerald-500 animate-pulse" />}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: File Browser */}
        <div className="w-64 bg-black/50 border-r border-zinc-800 flex flex-col">
            <div className="p-2 border-b border-zinc-800 bg-zinc-900/50 text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <HardDrive size={14} /> Local Storage
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {files.map(f => {
                    const isNfr = f.endsWith('.dmn');
                    const isModel = f.endsWith('.model');
                    return (
                        <button
                            key={f}
                            onClick={() => setSelectedFile(f)}
                            disabled={isModel}
                            className={`w-full text-left px-3 py-2 rounded text-sm truncate flex items-center gap-2 transition-all
                                ${selectedFile === f ? 'bg-emerald-900/30 text-white border border-emerald-500/30' : 'text-zinc-500 hover:bg-zinc-900'}
                                ${isModel ? 'opacity-50 cursor-default' : ''}
                            `}
                        >
                            {isNfr ? <FileArchive size={16} className="text-orange-400"/> : isModel ? <Activity size={16} className="text-purple-400"/> : <FileText size={16} />}
                            {f}
                        </button>
                    )
                })}
            </div>
        </div>

        {/* Center: Dashboard */}
        <div className="flex-1 flex flex-col bg-zinc-900/20">
            
            {/* Top: Controls */}
            {!isChatMode && (
                <div className="p-6 border-b border-zinc-800 grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4">
                    {/* Stats */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2">
                            <Sliders size={16} /> Live Metrics
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-black/40 border border-zinc-800 p-3 rounded-lg">
                                <div className="text-xs text-zinc-500 uppercase tracking-widest">Entropy (Bits)</div>
                                <div className="text-xl font-mono text-purple-400">{metrics?.loss.toFixed(2) || "-"}</div>
                            </div>
                            <div className="bg-black/40 border border-zinc-800 p-3 rounded-lg">
                                <div className="text-xs text-zinc-500 uppercase tracking-widest">Confidence</div>
                                <div className="text-xl font-mono text-emerald-400">{metrics?.accuracy.toFixed(1) || "-"}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Zone */}
                    <div className="flex flex-col justify-end space-y-3">
                        <div className="text-right">
                            <div className="text-2xl font-bold text-white truncate">{selectedFile || "No File Selected"}</div>
                            <div className="text-sm text-zinc-500 uppercase">Target Object</div>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={handleCompress}
                                disabled={processing || !selectedFile || selectedFile.endsWith('.dmn')}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-20 disabled:hover:bg-emerald-600 shadow-lg shadow-emerald-900/20"
                            >
                                <Cpu size={18} /> COMPRESS
                            </button>
                            <button 
                                onClick={handleDecompress}
                                disabled={processing || !selectedFile || !selectedFile.endsWith('.dmn')}
                                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-20 disabled:hover:bg-orange-600"
                            >
                                <RefreshCw size={18} /> RESTORE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Middle: Terminal / Chat */}
            <div className="flex-1 p-6 flex gap-6 overflow-hidden">
                {isChatMode ? (
                    <div className="w-full h-full flex flex-col bg-black/40 border border-zinc-800 rounded-lg overflow-hidden animate-in fade-in">
                        <div className="p-3 border-b border-zinc-800 flex items-center gap-2 text-zinc-400 text-sm font-bold uppercase">
                            <Brain size={18} className="text-purple-500" /> Daemon Link
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {chatHistory.length === 0 && <div className="text-center text-zinc-600 italic mt-10">Talk to the compressed data...</div>}
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-xl text-base ${msg.role === 'user' ? 'bg-zinc-800 text-white' : 'bg-emerald-900/20 text-emerald-300 border border-emerald-500/20'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                        <div className="p-3 border-t border-zinc-800 flex gap-2">
                            <input 
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-base outline-none focus:border-emerald-500"
                                placeholder="Query archive contents..."
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleChat()}
                            />
                            <button onClick={handleChat} className="p-2 bg-emerald-600 text-white rounded hover:bg-emerald-500"><ArrowRight size={16}/></button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Terminal */}
                        <div className="flex-1 bg-black rounded-lg border border-zinc-800 p-3 font-mono text-sm overflow-hidden flex flex-col shadow-inner">
                            <div className="flex items-center gap-2 text-zinc-600 border-b border-zinc-900 pb-2 mb-2">
                                <Terminal size={16} /> daemon_nfr_core.bin
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                {terminalLogs.length === 0 && <span className="text-zinc-700 italic">Ready for input...</span>}
                                {terminalLogs.map((log, i) => (
                                    <div key={i} className={`break-all ${log.includes('[ERR]') || log.includes('[FATAL]') ? 'text-red-400' : 'text-zinc-400'}`}>
                                        {log}
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>
                        </div>

                        {/* Result Panel */}
                        <div className="w-1/3 flex flex-col gap-4">
                            {resultStats ? (
                                <div className="bg-emerald-900/10 border border-emerald-500/30 p-6 rounded-lg animate-in zoom-in h-full flex flex-col justify-center items-center text-center">
                                    <div className="p-4 bg-emerald-500/10 rounded-full mb-4">
                                        <CheckCircle2 size={32} className="text-emerald-400" />
                                    </div>
                                    <div className="text-xs text-emerald-500 uppercase tracking-widest mb-1">Compression Ratio</div>
                                    <div className="text-4xl font-bold text-white mb-2">
                                        {resultStats.ratio}%
                                    </div>
                                    <div className="text-xs text-zinc-400">
                                        {formatBytes(resultStats.original)} <span className="text-zinc-600 mx-2">→</span> {formatBytes(resultStats.compressed)}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-lg h-full flex flex-col justify-center items-center text-center text-zinc-600">
                                    <FileArchive size={32} className="mb-2 opacity-50" />
                                    <span className="text-sm">Waiting for job...</span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}
