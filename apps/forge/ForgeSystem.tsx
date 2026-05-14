
import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../../store/osStore';
import { aiService } from '../../services/puterService';
import { vfs } from '../../kernel/fileSystem';
import { memory } from '../../kernel/memory';
import { Cpu, Zap, Code, Eye, RefreshCw, Rocket, Box, Loader2, Sparkles, AlertCircle, CheckCircle, RotateCcw, Braces, FileCode2, Command } from 'lucide-react';

import { localBrain } from '../../services/localBrain';

type ForgeStatus = 'IDLE' | 'ANALYZING' | 'ARCHITECTING' | 'CODING' | 'REPAIRING' | 'INSTALLING' | 'DONE' | 'ERROR';

export default function ForgeSystem({ windowId }: { windowId: string }) {
  const { kernelRules, windows, registerCustomApp, addNotification, openWindow } = useOS();
  const win = windows.find(w => w.id === windowId);

  const [prompt, setPrompt] = useState(win?.data?.autoPrompt || '');
  const [code, setCode] = useState(win?.data?.content || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [view, setView] = useState<'code' | 'preview'>('preview');
  const [status, setStatus] = useState<ForgeStatus>('IDLE');
  const [statusMsg, setStatusMsg] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [isAiConnected, setIsAiConnected] = useState(localBrain.isReady());
  const [isNaming, setIsNaming] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const ready = localBrain.isReady();
      if (ready !== isAiConnected) setIsAiConnected(ready);
    }, 2000);
    return () => clearInterval(interval);
  }, [isAiConnected]);


  const previewRef = useRef<HTMLIFrameElement>(null);
  const codeRef = useRef('');
  const lastUpdateRef = useRef(0);
  const hasAutoStarted = useRef(false);

  const updatePreview = (html: string) => {
    if (previewRef.current?.contentDocument) {
      try {
        const doc = previewRef.current.contentDocument;
        doc.open(); doc.write(html); doc.close();
      } catch {}
    }
  };

  useEffect(() => {
    if (view === 'preview' && codeRef.current) {
      const clean = codeRef.current
        .replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      updatePreview(clean);
    }
  }, [view, code]);

  const handleInstall = async (codeOverride?: string) => {
    const raw = (codeOverride || codeRef.current)
      .replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    // Must contain real HTML — reject empty or non-HTML content
    const htmlStart = raw.search(/<!DOCTYPE\s+html/i) !== -1
      ? raw.search(/<!DOCTYPE\s+html/i)
      : raw.search(/<html/i);
    const content = htmlStart >= 0 ? raw.slice(htmlStart) : raw;
    if (!content || (!content.includes('</body>') && !content.includes('</html>'))) return;

    setStatus('INSTALLING');
    setIsNaming(true);

    // AI generates a classy app name
    let manifestName = 'Forged App';
    try {
      const namePrompt = `Generate a short creative app name (2-3 words maximum, NO generic words like "App" or "Tool") for this concept: "${prompt}". Output ONLY the name, nothing else.`;
      const aiName = await aiService.generateOnce(namePrompt, kernelRules, 'raw');
      const cleaned = aiName.trim()
        .replace(/^["'`]|["'`]$/g, '')
        .replace(/[^\w\s\-\.]/g, '')
        .trim();
      if (cleaned.length >= 3 && cleaned.length <= 32) {
        manifestName = cleaned;
      }
    } catch {}
    setIsNaming(false);

    const timestamp = Date.now();
    const safeFileName = manifestName.replace(/\s+/g, '_');

    // Save to Apps directory
    const appsDir = `/home/user/Apps`;
    if (!vfs.resolveNode(appsDir)) vfs.createDir(appsDir);
    const filePath = `${appsDir}/${safeFileName}_${timestamp}.html`;
    vfs.writeFile(filePath, content);

    // Also place on Desktop
    const desktopDir = `/home/user/Desktop`;
    if (!vfs.resolveNode(desktopDir)) vfs.createDir(desktopDir);
    const desktopPath = `${desktopDir}/${safeFileName}.html`;
    vfs.writeFile(desktopPath, content);

    const appId = `forge_${timestamp}`;
    registerCustomApp({
      id: appId,
      name: manifestName,
      icon: Box,
      defaultSize: { width: 960, height: 720 },
      isCustom: true,
      sourcePath: filePath,
      permissions: ['vfs.read', 'vfs.write', 'network']
    });

    memory.remember(`Created app: "${manifestName}" — ${prompt} (desktop: ${desktopPath})`, ['forge', 'app', 'created']);

    addNotification({
      title: '✅ App Installed',
      message: `"${manifestName}" added to Desktop & app menu.`,
      type: 'success'
    });

    setStatus('DONE');

    if ((useOS.getState() as any).setForging) {
      (useOS.getState() as any).setForging(false);
    }

    if (win?.data?.autoRun) {
      setTimeout(() => openWindow(appId), 300);
    }
  };

  const handleSynthesize = async (retrying = false) => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setRetryCount(0);
    setTokenCount(0);
    if (!retrying) {
      setStatus('ANALYZING'); setStatusMsg('Analyzing requirements...');
      setCode(''); codeRef.current = '';
      setView('preview');
    }

    const MAX_RETRIES = 2;
    let attempts = 0;
    let finalCode = '';

    while (attempts <= MAX_RETRIES) {
      attempts++;
      setRetryCount(attempts - 1);
      setStatus(attempts === 1 ? 'ARCHITECTING' : 'REPAIRING');
      setStatusMsg(attempts === 1 ? 'Architecting structure...' : `Repairing truncated output (attempt ${attempts - 1})...`);

      let buffer = attempts === 1 ? '' : codeRef.current;
      let toks = 0;

      try {
        const userPrompt = attempts === 1
          ? `Build this app completely: ${prompt}`
          : `CONTINUE the HTML from where it was truncated. Last output:\n${codeRef.current.slice(-600)}\nCOMPLETE the HTML. End with </body></html>.`;

        setStatus('CODING');
        setStatusMsg(`Generating code... (${toks} tokens)`);

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Neural Link Timeout (2min)')), 120000);

          aiService.streamChat(userPrompt, kernelRules, (token) => {
            buffer += token;
            toks++;
            if (attempts === 1) {
              codeRef.current = buffer;
            } else {
              codeRef.current += token;
              buffer = codeRef.current;
            }
            setTokenCount(toks);

            const now = Date.now();
            if (now - lastUpdateRef.current > 80) {
              setCode(codeRef.current);
              lastUpdateRef.current = now;
            }
          }, 'forge').then(() => { clearTimeout(timeout); resolve(); }).catch((e) => { clearTimeout(timeout); reject(e); });
        });

        // Extract only the HTML block — strip any prose/markdown leaking before or after
        const raw = codeRef.current;
        const htmlStart = raw.search(/<!DOCTYPE\s+html/i) !== -1
          ? raw.search(/<!DOCTYPE\s+html/i)
          : raw.search(/<html/i);
        const stripped = htmlStart > 0 ? raw.slice(htmlStart) : raw;
        finalCode = stripped
          .replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

        const isComplete = finalCode.includes('</html>') || finalCode.includes('</body>');

        if (isComplete) {
          codeRef.current = finalCode;
          setCode(finalCode);
          updatePreview(finalCode);
          setStatus('IDLE');
          setStatusMsg(`Complete! ${toks} tokens generated.`);
          addNotification({ title: '⚡ Forge', message: 'Synthesis complete.', type: 'success' });

          if (win?.data?.autoRun) {
            setTimeout(() => handleInstall(finalCode), 500);
          }
          break;
        } else if (attempts <= MAX_RETRIES) {
          setStatusMsg(`HTML incomplete, auto-repairing... (attempt ${attempts})`);
          continue;
        } else {
          // Force close and install what we have
          finalCode += '\n</body></html>';
          codeRef.current = finalCode;
          setCode(finalCode);
          updatePreview(finalCode);
          setStatus('ERROR');
          setStatusMsg('Partial output — HTML closed automatically.');
          addNotification({ title: '⚠️ Forge', message: 'Partial generation. HTML auto-closed.', type: 'warning' as any });
          if (win?.data?.autoRun) setTimeout(() => handleInstall(finalCode), 500);
          break;
        }
      } catch (e: any) {
        setStatus('ERROR');
        setStatusMsg(e.message || 'Neural link failed.');
        addNotification({ title: '❌ Forge Error', message: e.message, type: 'error' });
        if (codeRef.current.length > 100) {
          setCode(codeRef.current);
          updatePreview(codeRef.current);
        }
        break;
      }
    }

    setIsGenerating(false);
  };

  useEffect(() => {
    if (win?.data?.autoRun && prompt && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      handleSynthesize();
    }
  }, [win?.data?.autoRun, prompt]);

  const statusColor = {
    IDLE: 'text-zinc-600', ANALYZING: 'text-blue-400', ARCHITECTING: 'text-purple-400',
    CODING: 'text-emerald-400', REPAIRING: 'text-yellow-400', INSTALLING: 'text-cyan-400',
    DONE: 'text-emerald-500', ERROR: 'text-red-400'
  }[status];

  return (
    <div className="h-full flex flex-col bg-[#050508] text-emerald-500 font-mono">
      {/* Top Bar */}
      <div className="p-2 bg-[#0a0a0c] border-b border-white/5 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="p-1 bg-emerald-500/10 rounded">
            <Cpu size={18} className={isGenerating ? 'animate-spin text-emerald-400' : 'text-emerald-600'} />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Neural Forge {isAiConnected ? '(Online)' : '(Offline)'}</div>
            <div className={`text-xs font-mono ${statusColor} flex items-center gap-1`}>
              {(isGenerating || isNaming) && <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
              {isNaming ? 'Naming app...' : isAiConnected ? (statusMsg || status) : 'Waiting for Neural Core...'}
              {isGenerating && tokenCount > 0 && (
                <span className="text-zinc-500 ml-1">({tokenCount} tok)</span>
              )}
              {retryCount > 0 && !isGenerating && (
                <span className="text-yellow-600 ml-1">[{retryCount} retries]</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'DONE' && <CheckCircle size={18} className="text-emerald-500" />}
          {status === 'ERROR' && <AlertCircle size={18} className="text-red-400" />}
          <div className="flex bg-black/60 p-1 rounded-lg border border-white/5">
            <button onClick={() => setView('code')} className={`px-2 py-1 rounded transition-all ${view === 'code' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}><Code size={16}/></button>
            <button onClick={() => setView('preview')} className={`px-2 py-1 rounded transition-all ${view === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}><Eye size={16}/></button>
          </div>
          {code && !isGenerating && !isNaming && (
            <button onClick={() => handleInstall()} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-950/40">
              {isNaming ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
              {isNaming ? 'NAMING...' : 'INSTALL'}
            </button>
          )}
        </div>
      </div>

      {/* Prompt Bar */}
      <div className="p-3 bg-black border-b border-zinc-900/80 flex gap-2 shrink-0">
        <div className="flex-1 relative">
          <input
            className="w-full bg-[#0a0a0c] border border-white/5 rounded-lg px-4 py-2.5 text-sm text-emerald-50 outline-none focus:border-emerald-500/40 transition-all placeholder:text-zinc-500 font-sans"
            placeholder="Describe the app to forge... (e.g. 'Pomodoro timer with dark theme')"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSynthesize()}
            disabled={isGenerating}
          />
          {isGenerating && (
            <div className="absolute right-3 top-2.5 text-xs font-bold text-emerald-500/50 uppercase flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> {status}
            </div>
          )}
        </div>
        <button
          onClick={() => handleSynthesize()}
          disabled={isGenerating || !prompt.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg disabled:opacity-30 hover:scale-105 active:scale-95"
        >
          {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
          {isGenerating ? 'FORGING' : 'FORGE'}
        </button>
        {code && !isGenerating && !isNaming && (
          <button onClick={() => { setCode(''); codeRef.current=''; setStatus('IDLE'); setStatusMsg(''); }} className="p-2 border border-white/10 hover:border-red-500/30 text-zinc-600 hover:text-red-400 rounded-lg transition-all" title="Clear">
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {/* Main Area */}
      <div className="flex-1 relative overflow-hidden bg-[#020204]">
        {/* Loading Overlay */}
        {isGenerating && !code && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-emerald-500/10 border-t-emerald-500 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto text-emerald-500 animate-pulse" size={28} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-xs font-black uppercase tracking-[0.4em] text-emerald-500 animate-pulse">{status}</div>
              <div className="text-xs font-mono text-zinc-600">{statusMsg}</div>
              {tokenCount > 0 && (
                <div className="text-xs font-mono text-zinc-500">{tokenCount} tokens generated</div>
              )}
            </div>
          </div>
        )}

        {/* Code View */}
        <textarea
          className={`w-full h-full bg-transparent p-6 text-xs text-zinc-400 outline-none resize-none font-mono leading-relaxed transition-opacity selection:bg-emerald-500/20 ${view === 'code' ? 'opacity-100 relative z-10' : 'opacity-0 absolute pointer-events-none'}`}
          value={code}
          spellCheck={false}
          readOnly={isGenerating}
          onChange={e => { setCode(e.target.value); codeRef.current = e.target.value; }}
        />

        {/* Preview View */}
        <div className={`w-full h-full transition-opacity ${view === 'preview' ? 'opacity-100 relative z-10' : 'opacity-0 absolute pointer-events-none'}`}>
          <iframe
            ref={previewRef}
            className="w-full h-full border-none bg-[#050508]"
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
            title="Forge Preview"
          />
        </div>

        {/* Idle State */}
        {!isGenerating && !code && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-20 h-20 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center justify-center mb-4">
              <Cpu size={28} className="text-zinc-500" />
            </div>
            <div className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">Neural Core Idle</div>
            <div className="text-xs text-zinc-800 max-w-[240px] text-center">Type an app description above and press FORGE to synthesize</div>
          </div>
        )}
      </div>
    </div>
  );
}
