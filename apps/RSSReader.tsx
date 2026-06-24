import React, { useState, useEffect } from 'react';
import { Rss, Plus, Trash2, ExternalLink, RefreshCw, Globe, Newspaper, Zap } from 'lucide-react';
import { useOS } from '../store/osStore';
import { uuid } from '../utils/uuid';

interface Feed { id: string; url: string; title: string; category: string; }
interface Article { title: string; link: string; snippet: string; date: string; source: string; }

const LS_KEY = 'nexus_rss_v2';

export default function RSSReader() {
  const { addNotification } = useOS();
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
        const items = Array.from(xml.querySelectorAll('item')).slice(0, 8);
        for (const item of items) {
          allArticles.push({
            title: item.querySelector('title')?.textContent?.trim() || 'Untitled',
            link: item.querySelector('link')?.textContent?.trim() || '#',
            snippet: (item.querySelector('description')?.textContent || '').replace(/<[^>]*>/g, '').slice(0, 180).trim(),
            date: item.querySelector('pubDate')?.textContent?.trim() || new Date().toISOString(),
            source: feed.title,
          });
        }
      } catch {
        // Feed failed silently — continue with others
      }
    }

    // Sort by date descending
    allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setArticles(allArticles.length > 0 ? allArticles : []);
    setLoading(false);
  };


  const addFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    const f: Feed = { id: uuid(), url: newUrl, title: newUrl.split('/')[2] || 'New Feed', category: 'General' };
    setFeeds(prev => [...prev, f]);
    setNewUrl('');
    addNotification({ title: 'Feed Linked', message: `Uplink established with ${f.title}`, type: 'success' });
  };

  const deleteFeed = (id: string) => {
    setFeeds(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
            <Rss size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Neural Stream</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Decentralized Intelligence Feed</p>
          </div>
        </div>
        <button onClick={refreshArticles} disabled={loading} className="p-2 hover:bg-white/5 rounded-xl transition-all text-zinc-400 hover:text-white">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-white/5 flex flex-col shrink-0 bg-black/20">
          <div className="p-4 border-b border-white/5">
            <form onSubmit={addFeed} className="relative">
              <input 
                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 px-3 pr-10 text-[10px] outline-none focus:border-orange-500/50 transition-all font-mono"
                placeholder="Uplink RSS URL..."
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
              />
              <button className="absolute right-2 top-1.5 p-1 text-orange-500"><Plus size={14}/></button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            <button onClick={() => setActiveFeedId('all')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${activeFeedId === 'all' ? 'bg-orange-500/10 text-orange-400' : 'text-zinc-500 hover:bg-white/5'}`}>
              <Globe size={14} /> <span className="text-xs font-bold uppercase tracking-widest">Global Stream</span>
            </button>
            <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-3 mt-4 mb-2">Sources</div>
            {feeds.map(f => (
              <div key={f.id} className="group relative flex items-center">
                <button 
                  onClick={() => setActiveFeedId(f.id)}
                  className={`flex-1 flex items-center gap-3 p-3 rounded-xl transition-all text-left ${activeFeedId === f.id ? 'bg-orange-500/10 text-orange-400' : 'text-zinc-500 hover:bg-white/5'}`}
                >
                  <Newspaper size={14} />
                  <span className="text-xs font-bold truncate">{f.title}</span>
                </button>
                <button onClick={() => deleteFeed(f.id)} className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"><Trash2 size={12}/></button>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-black/40">
          <div className="max-w-3xl mx-auto space-y-6">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-4 opacity-40">
                <RefreshCw size={32} className="animate-spin text-orange-500" />
                <div className="text-xs font-black uppercase tracking-[0.2em]">Synchronizing Stream...</div>
              </div>
            ) : (
              articles.map((art, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.04] transition-all group">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[8px] font-black uppercase tracking-widest border border-orange-500/20">{art.source}</span>
                    <span className="text-[9px] text-zinc-600 font-mono">{new Date(art.date).toLocaleDateString()}</span>
                  </div>
                  <h2 className="text-lg font-bold text-zinc-100 group-hover:text-orange-400 transition-colors mb-2">{art.title}</h2>
                  <p className="text-sm text-zinc-500 leading-relaxed mb-4">{art.snippet}</p>
                  <a href={art.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/70 hover:text-orange-400 transition-colors">
                    Access Node <ExternalLink size={12} />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
