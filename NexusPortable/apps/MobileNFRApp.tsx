import React, { useState, useEffect, useRef } from 'react';
import { useMobile } from '../store/mobileStore';
import { vfs } from '../../kernel/fileSystem';
import { nfrEngine, TrainingMetrics } from '../../utils/nfrEngine';
import { Archive, ArrowRight, FileText, CheckCircle2, RefreshCw, Cpu, HardDrive, FileArchive, Activity, Terminal, Sliders, Play, Brain, MessageSquare, ArrowLeft, Layers, Info } from 'lucide-react';
import { aiService } from '../../services/puterService';

interface MobileNFRAppProps {
    onBack?: () => void;
}

type Tab = 'files' | 'process' | 'chat';

export default function MobileNFRApp({ onBack }: MobileNFRAppProps) {
  const { addNotification, kernelRules } = useMobile();
  const [activeTab, setActiveTab] = useState<Tab>('files');

  const [currentPath, setCurrentPath] = useState('/home/user/Desktop');
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  // NFR Logic State
  const [processing, setProcessing] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [resultStats, setResultStats] = useState<{ original: number, compressed: number, ratio: string } | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role:'user'|'ai', content:string}[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshFiles();
  }, [currentPath]);

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
    setActiveTab('process');
    setProcessing(true);
    setTerminalLogs([]);
    setResultStats(null);
    setMetrics(null);

    addLog(`[INIT] Loading ${selectedFile}...`);
    const fullPath = `${currentPath}/${selectedFile}`;
    const content = vfs.readFile(fullPath);

    if (content === null) {
        addLog(`[ERR] File Read Error.`);
        setProcessing(false);
        return;
    }

    try {
        const entropy = nfrEngine.calculateEntropy(content);
        addLog(`[ANALYSIS] Entropy: ${entropy.toFixed(4)} b/B`);

        const { archive, model } = await nfrEngine.compress(content, 1, (m) => {
            setMetrics(m);
            if (m.epoch % 2000 === 0 || m.epoch === content.length) {
                setTerminalLogs(prev => {
                    const last = prev[prev.length-1];
                    if (last && last.startsWith('>')) return [...prev.slice(0, -1), `> Byte ${m.epoch} | Loss ${m.loss.toFixed(2)}`];
                    return [...prev, `> Byte ${m.epoch} | Loss ${m.loss.toFixed(2)}`];
                });
            }
        });

        const binarySize = Math.floor((archive.length - archive.indexOf(',')) * 0.75);
        const originalSize = content.length;
        const ratio = ((1 - (binarySize / originalSize)) * 100).toFixed(2);

        vfs.writeFile(`${currentPath}/${selectedFile}.dmn`, archive);
        vfs.writeFile(`${currentPath}/${selectedFile}.model`, model);

        addLog(`[DONE] Ratio: ${ratio}%`);
        setResultStats({ original: originalSize, compressed: binarySize, ratio: ratio });
        refreshFiles();
        addNotification({ title: 'NFR Success', message: `Reduced by ${ratio}%`, type: 'success' });
    } catch (e: any) {
        addLog(`[FATAL] ${e.message}`);
    } finally {
        setProcessing(false);
    }
  };

  const handleDecompress = async () => {
      if (!selectedFile) return;
      setActiveTab('process');
      setProcessing(true);
      setTerminalLogs([]);
      addLog(`[INIT] Restoration started...`);

      const fullPath = `${currentPath}/${selectedFile}`;
      const content = vfs.readFile(fullPath);

      if (!content) {
          addLog(`[ERR] Not found.`);
          setProcessing(false);
          return;
      }

      try {
          const { content: restored } = await nfrEngine.decompress(content);
          const newFilename = `restored_${selectedFile.replace('.dmn', '')}`;
          vfs.writeFile(`${currentPath}/${newFilename}`, restored);
          addLog(`[WRITE] Restored: ${newFilename}`);
          refreshFiles();
          addNotification({ title: 'NFR Restored', message: 'Data reconstructed.', type: 'success' });
      } catch (e: any) {
          addLog(`[ERR] ${e.message}`);
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

      const prompt = `[CONTEXT: ${selectedFile}]\n${context?.substring(0, 2000)}\n\n[USER]: ${userMsg}`;
      
      try {
          const response = await aiService.generateOnce(prompt, { ...kernelRules, modelId: 'daemon-fractal' });
          setChatHistory(prev => [...prev, { role: 'ai', content: response }]);
      } catch (e) {
          setChatHistory(prev => [...prev, { role: 'ai', content: "Neural link failed." }]);
      }
  };

  const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 text-emerald-500 font-mono flex flex-col z-[100]">
      {/* Header */}
      <div className="safe-top p-4 bg-zinc-900 border-b border-emerald-900/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 text-zinc-400">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className="text-sm font-bold text-white tracking-widest">NFR REAL</h1>
                <p className="text-[8px] text-zinc-500 uppercase">Adaptive Coder</p>
            </div>
        </div>
        {processing && <Activity size={16} className="text-emerald-500 animate-pulse" />}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-black/40">
        <button onClick={() => setActiveTab('files')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'files' ? 'text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-500' : 'text-zinc-500'}`}>
            <HardDrive size={14} /> Files
        </button>
        <button onClick={() => setActiveTab('process')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'process' ? 'text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-500' : 'text-zinc-500'}`}>
            <Activity size={14} /> Process
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-500' : 'text-zinc-500'}`}>
            <MessageSquare size={14} /> Chat
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* Tab: Files */}
        {activeTab === 'files' && (
            <div className="h-full flex flex-col p-4 animate-in fade-in">
                <div className="text-[10px] text-zinc-600 mb-2 uppercase tracking-widest">Local Directory</div>
                <div className="flex-1 overflow-y-auto space-y-1">
                    {files.map(f => {
                        const isNfr = f.endsWith('.dmn');
                        const isModel = f.endsWith('.model');
                        return (
                            <button
                                key={f}
                                onClick={() => setSelectedFile(f)}
                                disabled={isModel}
                                className={`w-full text-left px-4 py-3 rounded-lg text-xs truncate flex items-center gap-3 transition-all
                                    ${selectedFile === f ? 'bg-emerald-900/30 text-white border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'text-zinc-500 bg-zinc-900/30'}
                                    ${isModel ? 'opacity-30' : ''}
                                `}
                            >
                                {isNfr ? <FileArchive size={16} className="text-orange-400"/> : isModel ? <Info size={16} className="text-purple-400"/> : <FileText size={16} />}
                                {f}
                            </button>
                        )
                    })}
                </div>
                
                {selectedFile && (
                    <div className="mt-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800 space-y-3">
                        <div className="text-[10px] font-bold text-white truncate">{selectedFile}</div>
                        <div className="flex gap-2">
                            {!selectedFile.endsWith('.dmn') ? (
                                <button onClick={handleCompress} disabled={processing} className="flex-1 py-3 bg-emerald-600 text-black font-black rounded-lg text-[10px] uppercase">Compress</button>
                            ) : (
                                <button onClick={handleDecompress} disabled={processing} className="flex-1 py-3 bg-orange-600 text-white font-black rounded-lg text-[10px] uppercase">Restore</button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Tab: Process */}
        {activeTab === 'process' && (
            <div className="h-full flex flex-col p-4 gap-4 animate-in slide-in-from-right-2">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 shrink-0">
                    <div className="bg-black/40 border border-zinc-800 p-3 rounded-xl">
                        <div className="text-[8px] text-zinc-500 uppercase mb-1">Loss Rate</div>
                        <div className="text-lg font-bold text-purple-400">{metrics?.loss.toFixed(2) || "0.00"}</div>
                    </div>
                    <div className="bg-black/40 border border-zinc-800 p-3 rounded-xl">
                        <div className="text-[8px] text-zinc-500 uppercase mb-1">Accuracy</div>
                        <div className="text-lg font-bold text-emerald-400">{metrics?.accuracy.toFixed(1) || "0"}%</div>
                    </div>
                </div>

                {/* Console */}
                <div className="flex-1 bg-black rounded-xl border border-zinc-800 p-3 text-[10px] flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 text-zinc-600 border-b border-zinc-900 pb-2 mb-2">
                        <Terminal size={12} /> nfr_core.bin
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1">
                        {terminalLogs.length === 0 && <div className="text-zinc-700 italic">Standby...</div>}
                        {terminalLogs.map((log, i) => (
                            <div key={i} className={`break-all ${log.includes('[ERR]') ? 'text-red-400' : 'text-zinc-500'}`}>
                                {log}
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>

                {/* Result Card */}
                {resultStats && (
                    <div className="p-4 bg-emerald-900/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                        <div>
                            <div className="text-[8px] text-emerald-500 uppercase">Ratio</div>
                            <div className="text-2xl font-black text-white">{resultStats.ratio}%</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[8px] text-zinc-500 uppercase">Size Reduction</div>
                            <div className="text-[10px] text-zinc-300">{formatBytes(resultStats.original)} → {formatBytes(resultStats.compressed)}</div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Tab: Chat */}
        {activeTab === 'chat' && (
            <div className="h-full flex flex-col animate-in slide-in-from-right-2">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatHistory.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-10">
                            <Brain size={40} className="mb-4" />
                            <p className="text-[10px] uppercase tracking-widest">No Active Neural Link</p>
                            <p className="text-[9px] mt-2 leading-relaxed">Select a file and start a conversation with its compressed fractal representation.</p>
                        </div>
                    )}
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-[13px] leading-relaxed ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-tr-none' : 'bg-emerald-900/20 text-emerald-300 border border-emerald-500/20 rounded-tl-none'}`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
                <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex gap-2">
                    <input 
                        className="flex-1 bg-black border border-zinc-800 rounded-full px-4 py-2 text-xs outline-none focus:border-emerald-500"
                        placeholder="Query archive..."
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleChat()}
                    />
                    <button onClick={handleChat} className="p-2 bg-emerald-600 text-black rounded-full active:scale-90 transition-transform">
                        <ArrowRight size={18}/>
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
