import React, { useState, useEffect } from 'react';
import { Rss, Plus, Trash2, ExternalLink, RefreshCw, Globe, Newspaper, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useMobile } from '../store/mobileStore';
import { uuid } from '../../utils/uuid';
import type { MobileAppProps } from '../types';

interface Feed { id: string; url: string; title: string; category: string; }
interface Article { title: string; link: string; snippet: string; date: string; source: string; }

const LS_KEY = 'nexus_rss_v2';

export default function MobileRSSReaderApp({ onBack }: MobileAppProps) {
  const { addNotification } = useMobile();
  const [feeds, setFeeds] = useState<Feed[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', url: 'https://news.ycombinator.com/rss', title: 'Hacker News', category: 'Tech' },
      { id: '2', url: 'https://techcrunch.com/feed/', title: 'TechCrunch', category: 'Tech' },
    ];
  });

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [activeFeedId, setActiveFeedId] = useState<string>('all');
  const [isManagingFeeds, setIsManagingFeeds] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(feeds));
    refreshArticles();
  }, [feeds, activeFeedId]);

  const refreshArticles = async () => {
    setLoading(true);
    const targetFeeds = activeFeedId === 'all' ? feeds : feeds.filter(f => f.id === activeFeedId);
    const allArticles: Article[] = [];

    for (const feed of targetFeeds) {
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}`;
        const res = await fetch(proxyUrl);
        const json = await res.json();
        const parser = new DOMParser();
        const xml = parser.parseFromString(json.contents, 'application/xml');
        const items = Array.from(xml.querySelectorAll('item')).slice(0, 10);
        for (const item of items) {
          allArticles.push({
            title: item.querySelector('title')?.textContent?.trim() || 'Untitled',
            link: item.querySelector('link')?.textContent?.trim() || '#',
            snippet: (item.querySelector('description')?.textContent || '').replace(/<[^>]*>/g, '').slice(0, 150).trim(),
            date: item.querySelector('pubDate')?.textContent?.trim() || new Date().toISOString(),
            source: feed.title,
          });
        }
      } catch {
        // Silently continue
      }
    }

    allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setArticles(allArticles);
    setLoading(false);
  };

  const addFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    const f: Feed = { 
      id: uuid(), 
      url: newUrl, 
      title: newUrl.split('/')[2] || 'New Feed', 
      category: 'General' 
    };
    setFeeds(prev => [...prev, f]);
    setNewUrl('');
    addNotification({ title: 'Feed Linked', message: `Uplink established with ${f.title}`, type: 'success' });
  };

  const deleteFeed = (id: string) => {
    setFeeds(prev => prev.filter(f => f.id !== id));
    if (activeFeedId === id) setActiveFeedId('all');
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button
          className="p-1.5 rounded-xl active:bg-white/10 transition-colors"
          onClick={isManagingFeeds ? () => setIsManagingFeeds(false) : onBack}
        >
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold text-[16px]">
            {isManagingFeeds ? 'Manage Feeds' : 'Neural Stream'}
          </h1>
        </div>
        {!isManagingFeeds && (
          <div className="flex items-center gap-2">
            <button 
              onClick={refreshArticles} 
              disabled={loading}
              className="p-2 text-zinc-400 active:text-white transition-colors"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => setIsManagingFeeds(true)}
              className="p-2 text-zinc-400 active:text-orange-400 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {/* Articles View */}
        {!isManagingFeeds && (
          <div className="h-full flex flex-col">
            {/* Category Selector */}
            <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar shrink-0">
              <button 
                onClick={() => setActiveFeedId('all')}
                className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeFeedId === 'all' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-white/5 text-zinc-500 border-transparent'}`}
              >
                Global Stream
              </button>
              {feeds.map(f => (
                <button 
                  key={f.id}
                  onClick={() => setActiveFeedId(f.id)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeFeedId === f.id ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-white/5 text-zinc-500 border-transparent'}`}
                >
                  {f.title}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
              {loading ? (
                <div className="py-20 flex flex-col items-center gap-4 opacity-40">
                  <RefreshCw size={32} className="animate-spin text-orange-500" />
                  <div className="text-[12px] font-black uppercase tracking-[0.2em]">Syncing Neural Stream...</div>
                </div>
              ) : articles.length > 0 ? (
                articles.map((art, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 active:bg-white/[0.05] transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[8px] font-black uppercase tracking-widest border border-orange-500/20">{art.source}</span>
                      <span className="text-[9px] text-zinc-600 font-mono">{new Date(art.date).toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-[15px] font-bold text-zinc-100 mb-2 leading-tight">{art.title}</h2>
                    <p className="text-[13px] text-zinc-500 leading-relaxed mb-3 line-clamp-3">{art.snippet}</p>
                    <a 
                      href={art.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/70 active:text-orange-400 transition-colors"
                    >
                      Access Node <ExternalLink size={12} />
                    </a>
                  </div>
                ))
              ) : (
                <div className="py-20 flex flex-col items-center justify-center opacity-20 text-center px-8">
                  <Rss size={48} className="mb-4" />
                  <p className="text-[14px] font-bold uppercase tracking-widest">No articles found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manage Feeds View */}
        {isManagingFeeds && (
          <div className="h-full flex flex-col bg-black/20 animate-in slide-in-from-right duration-300">
            <div className="p-4 flex-shrink-0">
              <form onSubmit={addFeed} className="relative">
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 pr-12 text-[14px] text-white outline-none focus:border-orange-500/50 transition-all font-mono placeholder:text-white/20"
                  placeholder="Paste RSS Uplink URL..."
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-2 w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white active:scale-90 transition-all shadow-[0_0_10px_rgba(249,115,22,0.4)]"
                >
                  <Plus size={18}/>
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2 mb-2 mt-4">Active Uplinks</p>
              {feeds.map(f => (
                <div key={f.id} className="group relative flex items-center bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center flex-shrink-0 mr-4">
                    <Newspaper size={20} />
                  </div>
                  <div className="flex-1 min-w-0 pr-10">
                    <span className="text-[14px] font-bold text-white truncate block">{f.title}</span>
                    <span className="text-[10px] text-white/30 truncate block font-mono">{f.url}</span>
                  </div>
                  <button 
                    onClick={() => deleteFeed(f.id)} 
                    className="absolute right-4 p-2 text-zinc-600 active:text-red-400 transition-all"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
