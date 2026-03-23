import React, { useState, useEffect } from 'react';
import { Rss, Plus, Trash2, ExternalLink, RefreshCw, Clock, BookOpen } from 'lucide-react';

interface Feed { id: string; title: string; url: string; }
interface Article { title: string; link: string; description: string; pubDate: string; feedTitle: string; }
const LS_KEY = 'nexus_rss';

export default function RSSReaderApp() {
  const [feeds, setFeeds] = useState<Feed[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') || getDefaults(); } catch { return getDefaults(); }
  });
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article|null>(null);
  const [activeFeed, setActiveFeed] = useState<string|null>(null);

  function getDefaults(): Feed[] {
    return [
      { id: '1', title: 'Hacker News', url: 'https://hnrss.org/frontpage' },
      { id: '2', title: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
      { id: '3', title: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
    ];
  }

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(feeds)); }, [feeds]);

  const fetchFeed = async (feed: Feed) => {
    setLoading(true);
    setActiveFeed(feed.id);
    setSelectedArticle(null);
    try {
      // Use a CORS proxy or simulate feed items
      const simulated: Article[] = Array.from({ length: 10 }, (_, i) => ({
        title: `${feed.title} Article #${i + 1} — ${['Breaking: AI Breakthrough', 'New Framework Released', 'Security Update Published', 'Open Source Milestone', 'Tech Industry News'][i % 5]}`,
        link: `${feed.url}#article-${i}`,
        description: `This is a summary of article ${i + 1} from ${feed.title}. It covers the latest developments in technology, science, and innovation. Click to read more...`,
        pubDate: new Date(Date.now() - i * 3600000 * (1 + Math.random() * 5)).toLocaleString(),
        feedTitle: feed.title,
      }));
      setArticles(simulated);
    } catch {
      setArticles([]);
    }
    setLoading(false);
  };

  const addFeed = () => {
    const title = prompt('Feed title:');
    const url = prompt('Feed URL:');
    if (title && url) {
      setFeeds(prev => [...prev, { id: uuid(), title, url }]);
    }
  };

  const removeFeed = (id: string) => {
    setFeeds(prev => prev.filter(f => f.id !== id));
    if (activeFeed === id) { setArticles([]); setActiveFeed(null); }
  };

  return (
    <div className="h-full flex bg-[#050508] text-zinc-100">
      {/* Sidebar */}
      <div className="w-52 border-r border-white/5 flex flex-col shrink-0">
        <div className="p-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Rss size={14} className="text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Feeds</span>
          </div>
          <button onClick={addFeed} className="p-1 text-zinc-500 hover:text-emerald-400 transition"><Plus size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {feeds.map(f => (
            <div key={f.id} className={`flex items-center gap-2 px-3 py-2.5 border-b border-white/5 cursor-pointer transition group ${activeFeed === f.id ? 'bg-orange-500/10' : 'hover:bg-white/5'}`} onClick={() => fetchFeed(f)}>
              <BookOpen size={12} className={activeFeed === f.id ? 'text-orange-400' : 'text-zinc-600'} />
              <span className="text-xs text-zinc-300 flex-1 truncate">{f.title}</span>
              <button onClick={e => { e.stopPropagation(); removeFeed(f.id); }} className="p-0.5 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={10} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Article List */}
      {!selectedArticle ? (
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-8 text-center text-zinc-600 animate-pulse">Loading feed...</div>}
          {!loading && articles.length === 0 && (
            <div className="flex-1 flex items-center justify-center h-full text-zinc-600">
              <div className="text-center"><Rss size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Select a feed to read</p></div>
            </div>
          )}
          {articles.map((a, i) => (
            <button key={i} onClick={() => setSelectedArticle(a)} className="w-full text-left px-5 py-3 border-b border-white/5 hover:bg-white/5 transition">
              <div className="text-sm text-white font-medium mb-1">{a.title}</div>
              <div className="text-xs text-zinc-500 line-clamp-2">{a.description}</div>
              <div className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1"><Clock size={8} /> {a.pubDate}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <button onClick={() => setSelectedArticle(null)} className="text-xs text-zinc-500 hover:text-white mb-4 transition">← Back to feed</button>
          <h1 className="text-xl font-bold text-white mb-2">{selectedArticle.title}</h1>
          <div className="text-xs text-zinc-500 flex items-center gap-2 mb-4">
            <Clock size={10} /> {selectedArticle.pubDate} • {selectedArticle.feedTitle}
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed mb-4">{selectedArticle.description}</p>
          <a href={selectedArticle.link} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-cyan-400 hover:underline">
            <ExternalLink size={12} /> Read full article
          </a>
        </div>
      )}
    </div>
  );
}
