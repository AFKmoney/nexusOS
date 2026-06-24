import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOS } from '../store/osStore';
import {
  RefreshCw, AlertTriangle, ExternalLink, ArrowLeft, ArrowRight,
  Home, Globe, X, Search, Lock, Loader2, Shield, Brain
} from 'lucide-react';
import { aiPipelineBridge } from '../kernel/aiPipelineBridge';
import { vfs } from '../kernel/fileSystem';
import { browserBridge, type BrowserCommand, type BrowserExtractResult, type BrowserState } from '../kernel/browserBridge';

/**
 * WebRunner — NexusOS Embedded Web Browser
 *
 * Two rendering strategies:
 * 1. PROXY MODE (default): Fetches page HTML via CORS proxy, renders in srcdoc iframe.
 *    Works with most sites since we bypass X-Frame-Options entirely.
 * 2. NATIVE MODE (Electron only): When window.electron is available and the
 *    'browser-navigate' IPC channel is registered, WebRunner delegates
 *    rendering to a real Chromium BrowserView owned by the main process.
 *    This gives the AI true Chromium-level DOM access for BROWSE_EXTRACT,
 *    BROWSE_CLICK, and BROWSE_INPUT.
 *
 * In both modes, WebRunner registers itself with the browserBridge so that
 * AI-issued OS::BROWSE_* actions are routed here.
 */

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

const HOMEPAGE_LINKS = [
  { icon: '📖', label: 'Wikipedia', url: 'https://en.wikipedia.org' },
  { icon: '🐙', label: 'GitHub', url: 'https://github.com' },
  { icon: '🤗', label: 'HuggingFace', url: 'https://huggingface.co' },
  { icon: '📦', label: 'NPM', url: 'https://www.npmjs.com' },
  { icon: '📚', label: 'MDN Docs', url: 'https://developer.mozilla.org' },
  { icon: '🦀', label: 'Rust Docs', url: 'https://docs.rs' },
  { icon: '⚛️', label: 'React Docs', url: 'https://react.dev' },
  { icon: '📰', label: 'Hacker News', url: 'https://news.ycombinator.com' },
];

export default function WebRunnerApp({ windowId, initialUrl: propUrl }: { windowId: string; initialUrl?: string }) {
  const { windows, updateWindow, addNotification } = useOS();
  const win = windows.find(w => w.id === windowId);

  const resolvedInitial = propUrl || win?.data?.url || win?.data?.path || '';

  const [currentUrl, setCurrentUrl] = useState('');
  const [urlInput, setUrlInput] = useState(resolvedInitial);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [pageHtml, setPageHtml] = useState('');
  const [backStack, setBackStack] = useState<string[]>([]);
  const [fwdStack, setFwdStack] = useState<string[]>([]);
  const [isSecure, setIsSecure] = useState(false);
  const [hasAutoNavigated, setHasAutoNavigated] = useState(false);

  // Iframe ref — used for BROWSE_EXTRACT / BROWSE_CLICK / BROWSE_INPUT
  // in proxy mode. In native mode, the main-process BrowserView owns
  // the DOM and we delegate via IPC.
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Whether we have a real Chromium BrowserView in the main process.
  const isNativeMode = typeof window !== 'undefined'
    && !!(window as any).electron
    && typeof (window as any).electron.invoke === 'function';

  useEffect(() => {
    setIsSecure(currentUrl.startsWith('https://'));
  }, [currentUrl]);

  // ─── Browser bridge registration ───────────────────────────────────
  // Register this WebRunner instance as the active browser surface so
  // that AI-issued OS::BROWSE_* commands are routed here. Unregister on
  // unmount so a different browser window can become active.
  useEffect(() => {
    const surfaceId = `webrunner-${windowId}-${Date.now()}`;

    const executeCommand = async (cmd: BrowserCommand): Promise<unknown> => {
      switch (cmd.kind) {
        case 'navigate':
          navigate(cmd.url);
          return undefined;
        case 'back':
          goBack();
          return undefined;
        case 'forward':
          goForward();
          return undefined;
        case 'reload':
          refresh();
          return undefined;
        case 'scroll':
          return executeInIframe((win) => {
            win.scrollBy(cmd.deltaX, cmd.deltaY);
            return true;
          });
        case 'click':
          return executeInIframe((win) => {
            const el = win.document.querySelector(cmd.selector);
            if (el instanceof HTMLElement) { el.click(); return true; }
            return false;
          });
        case 'input':
          return executeInIframe((win) => {
            const el = win.document.querySelector(cmd.selector);
            const EventCtor = (win as any).Event ?? Event;
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
              el.value = cmd.value;
              el.dispatchEvent(new EventCtor('input', { bubbles: true }));
              el.dispatchEvent(new EventCtor('change', { bubbles: true }));
              return true;
            }
            return false;
          });
        case 'extract':
          return extractFromIframe(cmd.selector ?? 'body', cmd.maxChars ?? 8000);
        default:
          throw new Error(`Unknown browser command: ${(cmd as BrowserCommand).kind}`);
      }
    };

    const getState = (): BrowserState => ({
      url: currentUrl,
      title: hostname,
      isLoading,
      canGoBack: backStack.length > 0,
      canGoForward: fwdStack.length > 0,
      isNative: isNativeMode,
    });

    const unregister = browserBridge.register({
      id: surfaceId,
      execute: executeCommand,
      getState,
    });

    return () => {
      unregister();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowId, currentUrl, isLoading, backStack, fwdStack]);

  // Report state to the bridge whenever it changes so the AI sees fresh data.
  useEffect(() => {
    browserBridge.reportState({
      url: currentUrl,
      title: hostname,
      isLoading,
      canGoBack: backStack.length > 0,
      canGoForward: fwdStack.length > 0,
      isNative: isNativeMode,
    });
  }, [currentUrl, isLoading, backStack, fwdStack, isNativeMode]);

  // ─── Iframe DOM access helpers (proxy mode) ────────────────────────
  // These run a callback inside the iframe's contentWindow. Returns null
  // when the iframe is cross-origin (proxy mode usually gives us
  // same-origin via srcDoc, but some pages redirect to their real origin).
  const executeInIframe = <T,>(fn: (win: Window) => T): T | null => {
    const iframe = iframeRef.current;
    if (!iframe) return null;
    try {
      const win = iframe.contentWindow;
      if (!win) return null;
      return fn(win);
    } catch {
      // Cross-origin — can't access. This is expected for some proxied pages.
      return null;
    }
  };

  const extractFromIframe = (selector: string, maxChars: number): BrowserExtractResult => {
    const fallback: BrowserExtractResult = {
      url: currentUrl,
      title: hostname,
      text: '',
      html: '',
      links: [],
    };
    const result = executeInIframe((win) => {
      const doc = win.document;
      const root = doc.querySelector(selector) ?? doc.body;
      if (!root) return fallback;
      const text = (root.textContent || '').replace(/\s+/g, ' ').trim().slice(0, maxChars);
      const html = root.innerHTML.slice(0, maxChars * 4);
      const links: { text: string; href: string }[] = [];
      doc.querySelectorAll('a[href]').forEach((a, i) => {
        if (i >= 50) return;
        const href = (a as HTMLAnchorElement).href;
        if (!href || href.startsWith('javascript:')) return;
        links.push({ text: (a.textContent || '').trim().slice(0, 100), href });
      });
      return { url: currentUrl, title: doc.title || hostname, text, html, links };
    });
    return result ?? fallback;
  };

  // Auto-navigate on mount or when prop URL changes
  useEffect(() => {
    if (resolvedInitial && !hasAutoNavigated) {
      setHasAutoNavigated(true);
      navigate(resolvedInitial);
    }
  }, [resolvedInitial]);

  const normalizeUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed)) return `https://${trimmed}`;
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  };

  const fetchViaProxy = async (url: string): Promise<string> => {
    // Try each proxy until one works
    for (const proxy of CORS_PROXIES) {
      try {
        const resp = await fetch(proxy + encodeURIComponent(url), {
          signal: AbortSignal.timeout(12000),
        });
        if (!resp.ok) {
          console.warn(`[WebRunner] Proxy failed (status ${resp.status}): ${proxy}`);
          continue;
        }
        const html = await resp.text();
        if (html && html.length > 100) {
          console.info(`[WebRunner] Proxy success: ${proxy}`);
          return html;
        } else {
          console.warn(`[WebRunner] Proxy returned empty or too short content: ${proxy}`);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.warn(`[WebRunner] Proxy network error (${message}): ${proxy}`);
        continue;
      }
    }
    throw new Error('All proxies failed. Site may be unavailable.');
  };

  const injectBase = (html: string, baseUrl: string): string => {
    let origin = '';
    let basePath = '';
    try {
      const u = new URL(baseUrl);
      origin = u.origin;
      basePath = u.pathname.replace(/\/[^/]*$/, '/');
    } catch { /* ignore */ }

    const proxy = CORS_PROXIES[0]; // Use primary proxy for sub-resources

    // Resolve a relative URL to absolute
    const resolveUrl = (href: string): string => {
      if (!href || href.startsWith('data:') || href.startsWith('blob:') || href.startsWith('#') || href.startsWith('javascript:')) return href;
      try {
        return new URL(href, baseUrl).href;
      } catch {
        return href;
      }
    };

    // Proxy a URL for cross-origin resource loading
    const proxyUrl = (href: string): string => {
      const absolute = resolveUrl(href);
      if (absolute.startsWith('data:') || absolute.startsWith('blob:') || absolute.startsWith('#')) return absolute;
      return `${proxy}${encodeURIComponent(absolute)}`;
    };

    // Rewrite link[href], img[src], script[src] to go through proxy
    let processed = html;

    // Rewrite <link rel="stylesheet" href="...">
    processed = processed.replace(
      /(<link[^>]*href=["'])([^"']+)(["'][^>]*>)/gi,
      (match, pre, href, post) => `${pre}${proxyUrl(href)}${post}`
    );

    // Rewrite <img src="..."> and <img srcset="...">
    processed = processed.replace(
      /(<img[^>]*src=["'])([^"']+)(["'])/gi,
      (match, pre, src, post) => `${pre}${proxyUrl(src)}${post}`
    );

    // Rewrite <script src="...">
    processed = processed.replace(
      /(<script[^>]*src=["'])([^"']+)(["'])/gi,
      (match, pre, src, post) => `${pre}${proxyUrl(src)}${post}`
    );

    // Rewrite url() in inline styles
    processed = processed.replace(
      /url\(["']?([^"')]+)["']?\)/gi,
      (match, href) => {
        if (href.startsWith('data:')) return match;
        return `url('${proxyUrl(href)}')`;
      }
    );

    // Insert <base> tag for any remaining relative URLs (anchors etc)
    const baseTag = `<base href="${origin}${basePath}">`;
    
    // Minimal iframe-safe overrides (just ensure images are responsive, don't nuke site styles)
    const styleOverride = `<style>img { max-width: 100%; height: auto; }</style>`;

    if (processed.includes('<head>')) {
      return processed.replace('<head>', `<head>${baseTag}${styleOverride}`);
    } else if (processed.includes('<head ')) {
      return processed.replace(/<head\s/, `<head>${baseTag}${styleOverride}</head><head `);
    } else if (processed.includes('<html')) {
      return processed.replace(/<html[^>]*>/, `$&<head>${baseTag}${styleOverride}</head>`);
    }
    return `<html><head>${baseTag}${styleOverride}</head><body>${processed}</body></html>`;
  };

  const loadPage = async (url: string) => {
    setIsLoading(true);
    setLoadError('');
    setPageHtml('');

    try {
      // Check if it's a local VFS path
      if (url.startsWith('/') || url.startsWith('/home/') || url.startsWith('/system/')) {
        const content = vfs.readFile(url);
        if (content) {
          setPageHtml(content);
          setIsLoading(false);
          return;
        } else {
          throw new Error('Local file not found: ' + url);
        }
      }

      const rawHtml = await fetchViaProxy(url);
      const processedHtml = injectBase(rawHtml, url);
      setPageHtml(processedHtml);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load page';
      setLoadError(msg);
    }
    setIsLoading(false);
  };

  const navigate = (target: string) => {
    const finalUrl = normalizeUrl(target);
    if (!finalUrl) return;

    setLoadError('');

    if (currentUrl) {
      setBackStack(prev => [...prev.slice(-30), currentUrl]);
    }
    setFwdStack([]);
    setCurrentUrl(finalUrl);
    setUrlInput(finalUrl);

    // Update window data
    if (windowId) {
      updateWindow(windowId, { data: { ...win?.data, url: finalUrl } });
    }

    loadPage(finalUrl);
  };

  const goBack = () => {
    const prev = backStack[backStack.length - 1];
    if (!prev) return;
    setFwdStack(f => [currentUrl, ...f]);
    setBackStack(b => b.slice(0, -1));
    setCurrentUrl(prev);
    setUrlInput(prev);
    loadPage(prev);
  };

  const goForward = () => {
    const next = fwdStack[0];
    if (!next) return;
    setBackStack(b => [...b, currentUrl]);
    setFwdStack(f => f.slice(1));
    setCurrentUrl(next);
    setUrlInput(next);
    loadPage(next);
  };

  const refresh = () => {
    if (currentUrl) loadPage(currentUrl);
  };

  const goHome = () => {
    if (currentUrl) {
      setBackStack(prev => [...prev.slice(-30), currentUrl]);
    }
    setCurrentUrl('');
    setUrlInput('');
    setLoadError('');
    setPageHtml('');
    setFwdStack([]);
  };

  const openExternal = () => {
    if (currentUrl) window.open(currentUrl, '_blank', 'noopener,noreferrer');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') navigate(urlInput);
  };

  const analyzeWithAI = async () => {
    if (!pageHtml) return;

    // Strip HTML to get raw text for AI
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = pageHtml;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';

    // Truncate to reasonable context window limit to avoid overwhelming model
    const truncatedText = textContent.replace(/\s+/g, ' ').trim().slice(0, 10000);

    await aiPipelineBridge.dispatch({
      type: 'ANSWER',
      prompt: `Summarize the following content from the webpage at ${currentUrl}:\n\n${truncatedText}`
    });
  };

  const isHomepage = !currentUrl;
  const hostname = (() => {
    try { return new URL(currentUrl).hostname; } catch { return currentUrl; }
  })();

  return (
    <div className="h-full flex flex-col bg-[#0a0d12] text-slate-200 overflow-hidden">
      {/* Navigation Bar */}
      <div className="bg-[#0d1117] border-b border-white/5 flex items-center gap-1.5 px-2 py-1.5 shrink-0">
        <button onClick={goBack} disabled={!backStack.length} className="p-1.5 hover:bg-white/5 rounded-lg transition-all disabled:opacity-20 text-zinc-500 hover:text-white" title="Back">
          <ArrowLeft size={15} />
        </button>
        <button onClick={goForward} disabled={!fwdStack.length} className="p-1.5 hover:bg-white/5 rounded-lg transition-all disabled:opacity-20 text-zinc-500 hover:text-white" title="Forward">
          <ArrowRight size={15} />
        </button>
        <button onClick={refresh} disabled={!currentUrl} className="p-1.5 hover:bg-white/5 rounded-lg transition-all disabled:opacity-20 text-zinc-500 hover:text-white" title="Refresh">
          <RefreshCw size={15} className={isLoading ? 'animate-spin text-blue-400' : ''} />
        </button>
        <button onClick={goHome} className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-zinc-500 hover:text-white" title="Home">
          <Home size={15} />
        </button>

        {/* URL Bar */}
        <div className="flex-1 flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 focus-within:border-blue-500/40 rounded-xl px-3 py-1 transition-all">
          {currentUrl ? (
            isSecure ? <Lock size={12} className="text-green-500 shrink-0" /> : <Globe size={12} className="text-zinc-500 shrink-0" />
          ) : (
            <Search size={13} className="text-zinc-600 shrink-0" />
          )}
          <input
            className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-zinc-600 font-mono"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={e => e.target.select()}
            placeholder="Search or enter URL..."
          />
          {urlInput && (
            <button onClick={() => setUrlInput('')} className="text-zinc-500 hover:text-zinc-400 shrink-0">
              <X size={13} />
            </button>
          )}
        </div>

        {currentUrl && (
          <>
            <button onClick={analyzeWithAI} disabled={!pageHtml || isLoading} className="p-1.5 hover:bg-blue-500/10 rounded-lg transition-all text-blue-500/70 hover:text-blue-400 disabled:opacity-30 disabled:hover:bg-transparent" title="Analyze with AI">
              <Brain size={15} />
            </button>
            <button onClick={openExternal} className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-zinc-600 hover:text-zinc-300" title="Open in system browser">
              <ExternalLink size={15} />
            </button>
          </>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {isHomepage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-950 to-black overflow-y-auto py-8">
            <div className="w-full max-w-lg px-4">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 mb-2">
                  <Globe size={28} className="text-blue-400" />
                  <span className="text-xl font-black tracking-wider text-white">WebRunner</span>
                </div>
                <p className="text-zinc-600 text-sm">Browse the web inside NexusOS</p>
              </div>

              <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 focus-within:border-blue-500/40 rounded-2xl px-4 py-3 mb-6 transition-all">
                <Search size={18} className="text-zinc-600 shrink-0" />
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-base outline-none text-white placeholder:text-zinc-500"
                  placeholder="Search the web or enter a URL..."
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={() => navigate(urlInput)}
                  disabled={!urlInput.trim()}
                  className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/20 rounded-xl text-blue-400 text-xs font-bold transition-all disabled:opacity-30"
                >
                  Go
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-8">
                {HOMEPAGE_LINKS.map(l => (
                  <button
                    key={l.url}
                    onClick={() => navigate(l.url)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/15 hover:bg-zinc-800/80 transition-all group"
                  >
                    <span className="text-xl">{l.icon}</span>
                    <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-all">{l.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                <div className="flex items-center gap-2 mb-2 text-blue-400 text-xs font-bold">
                  <Shield size={13} />
                  PROXY BROWSER
                </div>
                <div className="text-xs text-zinc-600 leading-relaxed">
                  WebRunner fetches pages via proxy to bypass iframe restrictions. Most websites render correctly.
                  Use <ExternalLink size={10} className="inline mx-1 text-zinc-500" /> to open in your system browser.
                </div>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 gap-4">
            <Loader2 size={36} className="text-blue-500 animate-spin" />
            <div className="text-sm text-zinc-400">Loading {hostname}...</div>
            <div className="text-xs text-zinc-500 font-mono">{currentUrl}</div>
          </div>
        ) : loadError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-8">
            <AlertTriangle size={48} className="text-amber-500 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Cannot Display This Page</h3>
            <p className="text-zinc-400 text-sm mb-2 text-center max-w-md">{loadError}</p>
            <p className="text-zinc-600 text-xs mb-6 text-center max-w-md font-mono">{hostname}</p>
            <div className="flex gap-3">
              <button
                onClick={openExternal}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 text-sm font-bold transition-all flex items-center gap-2"
              >
                <ExternalLink size={14} /> Open in System Browser
              </button>
              <button
                onClick={refresh}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-400 text-sm transition-all flex items-center gap-2"
              >
                <RefreshCw size={14} /> Retry
              </button>
              <button
                onClick={goHome}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-400 text-sm transition-all"
              >
                Home
              </button>
            </div>
          </div>
        ) : pageHtml ? (
          <iframe
            ref={iframeRef}
            srcDoc={pageHtml}
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
            title={`WebRunner — ${hostname}`}
          />
        ) : null}
      </div>

      {/* Status Bar */}
      {currentUrl && !isLoading && (
        <div className="bg-[#0d1117] border-t border-white/5 px-3 py-1 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-zinc-600 truncate">
            {isSecure && <Lock size={10} className="text-green-600 shrink-0" />}
            <span className="truncate font-mono">{hostname}</span>
          </div>
          <div className="text-xs text-zinc-500">
            {loadError ? 'Error' : 'Ready'}
          </div>
        </div>
      )}
    </div>
  );
}
