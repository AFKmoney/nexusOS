import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Globe, Home, X, BookOpen, Lock } from 'lucide-react';
import type { MobileAppProps } from '../types';

const BOOKMARKS = [
  { title: 'Anthropic', url: 'https://anthropic.com', icon: '🤖' },
  { title: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: '📚' },
  { title: 'Tailwind CSS', url: 'https://tailwindcss.com', icon: '🎨' },
];

export default function MobileBrowser({ onBack }: MobileAppProps) {
  const [url, setUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = (target: string) => {
    let nav = target.trim();
    if (!nav) return;
    if (!nav.startsWith('http://') && !nav.startsWith('https://')) {
      if (nav.includes('.') && !nav.includes(' ')) {
        nav = 'https://' + nav;
      } else {
        nav = `https://www.google.com/search?q=${encodeURIComponent(nav)}`;
      }
    }
    setUrl(nav);
    setInputUrl(nav);
    setIsEditing(false);
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const displayUrl = url
    ? new URL(url).hostname.replace('www.', '')
    : 'NexusOS Browser';

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      {/* Address Bar */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.95)' }}
      >
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={20} className="text-white/70" />
        </button>

        {/* URL Field */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <Globe size={14} className="text-white/40 flex-shrink-0" />
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-white text-[14px] outline-none"
              style={{ fontSize: '16px', userSelect: 'text', WebkitUserSelect: 'text' }}
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && navigate(inputUrl)}
              placeholder="Search or enter URL..."
              autoFocus
              onFocus={e => e.target.select()}
            />
            <button onClick={() => setIsEditing(false)}>
              <X size={14} className="text-white/40" />
            </button>
          </div>
        ) : (
          <button
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={() => { setIsEditing(true); setTimeout(() => inputRef.current?.select(), 50); }}
          >
            {url ? <Lock size={12} className="text-emerald-400/60 flex-shrink-0" /> : <Globe size={12} className="text-white/30 flex-shrink-0" />}
            <span className="text-white/60 text-[14px] truncate">{displayUrl}</span>
          </button>
        )}

        <button
          className="p-1.5 rounded-xl active:bg-white/10"
          onClick={() => iframeRef.current?.contentWindow?.location.reload()}
        >
          <RefreshCw size={17} className={`text-white/60 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {!url ? (
          /* New Tab Page */
          <div className="h-full overflow-y-auto px-4 py-6">
            <h2 className="text-white text-xl font-semibold mb-5">Bookmarks</h2>
            <div className="grid grid-cols-2 gap-3">
              {BOOKMARKS.map(bm => (
                <button
                  key={bm.url}
                  className="flex items-center gap-3 p-4 rounded-2xl text-left active:scale-95 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
                  onClick={() => navigate(bm.url)}
                >
                  <span className="text-2xl">{bm.icon}</span>
                  <div className="min-w-0">
                    <p className="text-white text-[13px] font-medium truncate">{bm.title}</p>
                    <p className="text-white/30 text-[11px] truncate">{bm.url.replace('https://', '')}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick searches */}
            <h2 className="text-white text-xl font-semibold mt-6 mb-4">Quick Search</h2>
            <div className="space-y-2">
              {['Claude AI', 'React docs', 'TypeScript handbook', 'NexusOS'].map(q => (
                <button
                  key={q}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left active:bg-white/8 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onClick={() => navigate(q)}
                >
                  <Globe size={15} className="text-white/30" />
                  <span className="text-white/70 text-[14px]">{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
            onLoad={() => setLoading(false)}
            title="Browser"
          />
        )}

        {loading && (
          <div className="absolute top-0 left-0 right-0 h-0.5"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full"
              style={{ background: 'var(--nx-accent)', width: '60%', animation: 'slideRight 1.5s ease-in-out infinite' }}
            />
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        className="flex items-center justify-around px-4 py-2 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.95)' }}
      >
        <button className="p-2 rounded-xl active:bg-white/10" onClick={() => setUrl('')}>
          <Home size={19} className="text-white/60" />
        </button>
        <button className="p-2 rounded-xl active:bg-white/10">
          <BookOpen size={19} className="text-white/60" />
        </button>
        <button className="p-2 rounded-xl active:bg-white/10">
          <ChevronLeft size={19} className="text-white/60" />
        </button>
        <button className="p-2 rounded-xl active:bg-white/10">
          <ChevronRight size={19} className="text-white/60" />
        </button>
      </div>
    </div>
  );
}
