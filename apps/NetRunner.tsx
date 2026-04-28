import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOS } from '../store/osStore';
import {
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Globe,
  AlertTriangle,
  Search,
  Sparkles,
  Bot,
  X,
  Send,
  Zap,
  Loader2,
  BookOpen,
  Copy,
  ExternalLink,
  Home,
  Shield
} from 'lucide-react';
import { aiService } from '../services/puterService';
import DOMPurify from 'dompurify';
import WebRunnerApp from './WebRunner';

const QUICK_LINKS = [
  { icon: '🔍', label: 'Google', url: 'https://www.google.com' },
  { icon: '🐙', label: 'GitHub', url: 'https://github.com' },
  { icon: '🤗', label: 'HuggingFace', url: 'https://huggingface.co' },
  { icon: '📖', label: 'Wikipedia', url: 'https://en.wikipedia.org' },
  { icon: '🦀', label: 'Reddit', url: 'https://www.reddit.com' },
  { icon: '▶', label: 'YouTube', url: 'https://www.youtube.com' },
  { icon: '𝕏', label: 'X', url: 'https://x.com' },
  { icon: '📦', label: 'NPM', url: 'https://npmjs.com' }
];

type BrowseMode = 'ai' | 'chromium';
type AiMsg = { role: 'user' | 'ai'; content: string; sources?: { title: string; url: string }[] };

export default function NetRunnerApp({ windowId }: { windowId: string }) {
  const { windows, kernelRules, addNotification } = useOS();
  const win = windows.find((w) => w.id === windowId);

  const [url, setUrl] = useState(win?.data?.path || '');
  const [urlInput, setUrlInput] = useState(win?.data?.path || '');
  const [mode, setMode] = useState<BrowseMode>('ai');
  const [isLoading, setIsLoading] = useState(false);

  const [aiContent, setAiContent] = useState('');
  const [aiSources, setAiSources] = useState<{ title: string; url: string }[]>([]);
  const [backStack, setBackStack] = useState<string[]>([]);
  const [fwdStack, setFwdStack] = useState<string[]>([]);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<AiMsg[]>([
    { role: 'ai', content: 'NetRunner AI online. I can browse the web, summarize pages, find information, or answer questions.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  const normalizeUrl = useCallback((target: string) => {
    const finalTarget = target.trim();
    if (!finalTarget) return '';
    const isUrl = /^https?:\/\//i.test(finalTarget) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(finalTarget);
    if (!isUrl) return `https://www.google.com/search?q=${encodeURIComponent(finalTarget)}`;
    if (!/^https?:\/\//i.test(finalTarget)) return `https://${finalTarget}`;
    return finalTarget;
  }, []);

  const aiNavigate = async (target: string) => {
    setIsLoading(true);
    setAiContent('');
    setAiSources([]);
    try {
      addNotification({ title: 'NetRunner', message: `Fetching ${target}...`, type: 'info' });
      const prompt = `You are DAEMON NetRunner, the AI layer of a Chromium-backed browser. The user wants to visit: ${target}

TASK:
- If the URL is a real webpage, summarize its likely content from the page itself when possible.
- If the page cannot be fetched directly, produce a conservative semantic snapshot.
- Keep output valid HTML inside a single <div>.
- Include:
  - a bold title
  - a concise summary
  - structured sections with headings and lists when useful
  - relevant source links

After the HTML, on a new line, output SOURCES: followed by 1-3 relevant URLs formatted as: [Title](url)

Do not invent page contents that cannot be supported. Prefer accuracy over narrative.`;

      const result = await aiService.generateOnce(prompt, kernelRules);

      const sourceMatch = result.match(/SOURCES:(.*)/s);
      const sourceLinks: { title: string; url: string }[] = [];
      if (sourceMatch) {
        const sourceText = sourceMatch[1] ?? '';
        const linkMatches = [...sourceText.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
        linkMatches.forEach((m) => {
          const title = m[1] ?? '';
          const url = m[2] ?? '';
          if (title && url) sourceLinks.push({ title, url });
        });
      }

      let htmlContent = result.replace(/SOURCES:.*$/s, '').trim();
      const codeMatch = htmlContent.match(/```html\s*([\s\S]*?)```/i) || htmlContent.match(/```\s*([\s\S]*?)```/);
      const extractedHtml = codeMatch?.[1];
      if (extractedHtml) htmlContent = extractedHtml.trim();

      setAiContent(htmlContent);
      setAiSources(sourceLinks);
      addNotification({ title: 'NetRunner', message: 'Page loaded.', type: 'success' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown navigation error';
      setAiContent(`<div style="color:#ef4444;padding:20px"><h2>⚠ Navigation Error</h2><p>${message}</p></div>`);
    }
    setIsLoading(false);
  };

  const navigate = useCallback(
    async (target: string) => {
      const finalUrl = normalizeUrl(target);
      if (!finalUrl) return;

      if (url) setBackStack((prev) => [...prev.slice(-20), url]);
      setFwdStack([]);
      setUrl(finalUrl);
      setUrlInput(finalUrl);

      if (mode === 'ai') {
        await aiNavigate(finalUrl);
      }
    },
    [url, mode, normalizeUrl]
  );

  const goBack = () => {
    const prev = backStack[backStack.length - 1];
    if (!prev) return;
    setFwdStack((f) => [url, ...f]);
    setBackStack((b) => b.slice(0, -1));
    setUrl(prev);
    setUrlInput(prev);
    if (mode === 'ai') void aiNavigate(prev);
  };

  const goFwd = () => {
    const next = fwdStack[0];
    if (!next) return;
    setBackStack((b) => [...b, url]);
    setFwdStack((f) => f.slice(1));
    setUrl(next);
    setUrlInput(next);
    if (mode === 'ai') void aiNavigate(next);
  };

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || isChatThinking) return;
    setChatInput('');
    setIsChatThinking(true);

    const pageContext = aiContent ? `[Current page: ${url}]\n${aiContent.slice(0, 1500)}` : '[No page loaded]';
    const prompt = `${pageContext}\n\nUser: ${q}\n\nYou are an AI web assistant embedded in a browser. Answer the user's question using the page context above and your knowledge. Be helpful, direct, and accurate. If they ask you to navigate somewhere, tell them to type the URL in the address bar or suggest a URL.`;

    setChatMsgs((prev) => [...prev, { role: 'user', content: q }, { role: 'ai', content: '' }]);
    try {
      let buf = '';
      await aiService.streamChat(prompt, kernelRules, (token) => {
        buf += token;
        setChatMsgs((prev) => {
          const nextMsgs = [...prev];
          nextMsgs[nextMsgs.length - 1] = { role: 'ai', content: buf };
          return nextMsgs;
        });
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown chat error';
      setChatMsgs((prev) => {
        const nextMsgs = [...prev];
        nextMsgs[nextMsgs.length - 1] = { role: 'ai', content: `Error: ${message}` };
        return nextMsgs;
      });
    }
    setIsChatThinking(false);
  };

  const quickAction = (action: string) => {
    const prompts: Record<string, string> = {
      summarize: `Summarize the following web page content in 3-5 bullet points:\n\n${aiContent.slice(0, 2000)}`,
      keypoints: `Extract the 5 most important takeaways from this page:\n\n${aiContent.slice(0, 2000)}`,
      translate: `Translate the main content of this page to French:\n\n${aiContent.slice(0, 2000)}`,
      facts: `List all verifiable facts and data points from this page:\n\n${aiContent.slice(0, 2000)}`
    };
    if (prompts[action]) {
      setChatInput(prompts[action]);
      setChatOpen(true);
      void sendChat();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void navigate(urlInput);
  };

  const isNewTab = !url;

  return (
    <div className="h-full flex flex-col bg-[#0a0d12] text-slate-200 font-sans overflow-hidden">
      <div className="bg-[#050810] border-b border-white/5 flex items-center gap-1.5 px-2 py-1.5 shrink-0">
        <button onClick={goBack} disabled={!backStack.length} className="p-1.5 hover:bg-white/5 rounded-lg transition-all disabled:opacity-20 text-zinc-500 hover:text-white">
          <ArrowLeft size={15} />
        </button>
        <button onClick={goFwd} disabled={!fwdStack.length} className="p-1.5 hover:bg-white/5 rounded-lg transition-all disabled:opacity-20 text-zinc-500 hover:text-white">
          <ArrowRight size={15} />
        </button>
        <button onClick={() => url && void navigate(url)} className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-zinc-500 hover:text-white">
          {isLoading ? <Loader2 size={15} className="animate-spin text-emerald-400" /> : <RefreshCw size={15} />}
        </button>
        <button onClick={() => setUrl('')} className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-zinc-500 hover:text-white">
          <Home size={15} />
        </button>

        <div className="flex-1 flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 focus-within:border-blue-500/40 rounded-xl px-3 py-1 transition-all">
          {url ? (
            mode === 'ai' ? <Sparkles size={13} className="text-emerald-500 shrink-0" /> : <Shield size={13} className="text-green-500 shrink-0" />
          ) : (
            <Search size={13} className="text-zinc-600 shrink-0" />
          )}
          <input
            className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-zinc-600 font-mono"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
            placeholder="Search or enter URL..."
          />
          {urlInput && (
            <button onClick={() => setUrlInput('')} className="text-zinc-700 hover:text-zinc-400">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex bg-zinc-900 border border-white/5 rounded-xl p-0.5">
          <button onClick={() => setMode('ai')} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${mode === 'ai' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-600 hover:text-zinc-300'}`}>
            <Sparkles size={11} /> AI
          </button>
          <button onClick={() => setMode('chromium')} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${mode === 'chromium' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-600 hover:text-zinc-300'}`}>
            <Globe size={11} /> Chromium
          </button>
        </div>

        <button onClick={() => setChatOpen(!chatOpen)} className={`p-1.5 rounded-xl hover:bg-white/5 transition-all ${chatOpen ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-600 hover:text-zinc-300'}`} title="AI Chat">
          <Bot size={16} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">
          {isNewTab && (
            <div className="flex-1 overflow-y-auto flex flex-col items-center py-12 bg-gradient-to-b from-zinc-950 to-black">
              <div className="w-full max-w-lg px-4">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 mb-2">
                    <Sparkles size={24} className="text-emerald-400" />
                    <span className="text-xl font-black tracking-wider text-white">NetRunner</span>
                  </div>
                  <p className="text-zinc-600 text-sm">AI-Powered Browser · Search or navigate anywhere</p>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 focus-within:border-emerald-500/40 rounded-2xl px-4 py-3 mb-6">
                  <Search size={18} className="text-zinc-600 shrink-0" />
                  <input
                    autoFocus
                    className="flex-1 bg-transparent text-base outline-none text-white placeholder:text-zinc-700"
                    placeholder="Search the web or enter a URL..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button onClick={() => void navigate(urlInput)} className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold transition-all">
                    Go
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-8">
                  {QUICK_LINKS.map((l) => (
                    <button key={l.url} onClick={() => void navigate(l.url)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/15 hover:bg-zinc-800/80 transition-all group">
                      <span className="text-xl">{l.icon}</span>
                      <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-all">{l.label}</span>
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <div className="flex items-center gap-2 mb-3 text-emerald-400 text-xs font-bold">
                    <Sparkles size={13} />
                    AI MODE ACTIVE — Intelligent Rendering
                  </div>
                  <div className="text-xs text-zinc-600 leading-relaxed">
                    AI Mode renders pages as rich semantic snapshots. Toggle to <strong className="text-zinc-400">Chromium</strong> in the toolbar to load the live website in the browser surface.
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isNewTab && mode === 'ai' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-48 gap-4">
                  <Loader2 size={32} className="text-emerald-500 animate-spin" />
                  <div className="text-sm text-zinc-500">NetRunner is analyzing {url}...</div>
                  <div className="text-xs text-zinc-700">AI is constructing semantic snapshot</div>
                </div>
              )}
              {!isLoading && aiContent && (
                <div className="max-w-3xl mx-auto px-6 py-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Sparkles size={13} className="text-emerald-500" />
                      AI Snapshot — {new URL(url.startsWith('http') ? url : `https://${url}`).hostname}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => quickAction('summarize')} className="px-2 py-1 text-xs rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/20 text-zinc-500 hover:text-emerald-400 transition-all flex items-center gap-1">
                        <Zap size={11} /> Summarize
                      </button>
                      <button onClick={() => quickAction('keypoints')} className="px-2 py-1 text-xs rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/20 text-zinc-500 hover:text-emerald-400 transition-all flex items-center gap-1">
                        <BookOpen size={11} /> Key Points
                      </button>
                      <button onClick={() => navigator.clipboard.writeText(aiContent)} className="px-2 py-1 text-xs rounded-lg bg-white/5 border border-white/5 text-zinc-600 hover:text-zinc-300 transition-all">
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>

                  <div
                    className="prose prose-invert max-w-none text-sm leading-relaxed prose-headings:text-white prose-p:text-zinc-300 prose-a:text-emerald-400 prose-strong:text-white prose-code:text-emerald-300 prose-li:text-zinc-300"
                    style={{ lineHeight: '1.8' }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aiContent) }}
                  />

                  {aiSources.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-white/5">
                      <div className="text-xs text-zinc-600 mb-2 uppercase tracking-widest">Sources</div>
                      <div className="flex flex-wrap gap-2">
                        {aiSources.map((s, i) => (
                          <button key={i} onClick={() => void navigate(s.url)} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/5 border border-blue-500/15 hover:border-blue-500/30 text-blue-400 text-xs transition-all">
                            <ExternalLink size={11} /> {s.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isLoading && !aiContent && !isNewTab && (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <AlertTriangle size={32} className="text-zinc-700" />
                  <div className="text-sm text-zinc-600">Page not loaded. Press Enter or click Go.</div>
                </div>
              )}
            </div>
          )}

          {!isNewTab && mode === 'chromium' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-1 bg-amber-500/5 border-b border-amber-500/10 text-xs text-amber-600 flex items-center gap-1.5 px-3 shrink-0">
                <Shield size={11} /> Chromium mode — live page rendering handled by the embedded browser surface.
              </div>
              <div className="flex-1 overflow-hidden">
                <WebRunnerApp windowId={windowId} />
              </div>
            </div>
          )}
        </div>

        {chatOpen && (
          <div className="w-80 border-l border-white/5 bg-[#050810] flex flex-col shrink-0">
            <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bot size={15} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">NetRunner AI</span>
                {isChatThinking && <Loader2 size={12} className="animate-spin text-emerald-500" />}
              </div>
              <button onClick={() => setChatOpen(false)} className="text-zinc-700 hover:text-zinc-300">
                <X size={14} />
              </button>
            </div>

            {aiContent && (
              <div className="p-2 border-b border-white/5 grid grid-cols-2 gap-1">
                {[
                  ['summarize', 'Summarize'],
                  ['keypoints', 'Key Points'],
                  ['facts', 'Find Facts'],
                  ['translate', 'Translate']
                ].map(([a, l]) => (
                  <button key={a} onClick={() => quickAction(a ?? '')} className="p-1.5 rounded-lg bg-white/3 border border-white/5 hover:border-emerald-500/20 text-zinc-600 hover:text-emerald-400 text-xs transition-all">
                    {l}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {chatMsgs.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-full px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap font-sans ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-br-none' : 'bg-emerald-500/5 border border-emerald-500/10 text-emerald-100 rounded-bl-none'}`}>
                    {msg.content || (isChatThinking && i === chatMsgs.length - 1 ? <span className="text-emerald-500 animate-pulse">Thinking...</span> : '')}
                  </div>
                </div>
              ))}
              <div ref={chatScrollRef} />
            </div>

            <div className="p-2 border-t border-white/5">
              <div className="flex items-end gap-2 bg-black/60 border border-white/5 rounded-xl px-3 py-2 focus-within:border-emerald-500/30 transition-all">
                <textarea
                  className="flex-1 bg-transparent text-xs outline-none text-white placeholder:text-zinc-700 resize-none max-h-20 min-h-[18px] font-sans leading-relaxed"
                  placeholder="Ask about this page..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendChat();
                    }
                  }}
                  disabled={isChatThinking}
                  rows={1}
                />
                <button onClick={() => void sendChat()} disabled={!chatInput.trim() || isChatThinking} className="text-emerald-500 disabled:opacity-30 hover:text-emerald-400 transition-all shrink-0">
                  {isChatThinking ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
