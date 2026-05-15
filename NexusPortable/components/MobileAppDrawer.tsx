import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useMobile } from '../store/mobileStore';
import { MOBILE_APPS } from '../appRegistry';

export default function MobileAppDrawer() {
  const { isAppDrawerOpen, setAppDrawerOpen, openApp, registry } = useMobile();
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isAppDrawerOpen) {
      setVisible(true);
      setQuery('');
    } else {
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [isAppDrawerOpen]);

  if (!visible) return null;

  const apps = registry.filter(a => !(a as any).hidden);
  const filtered = query
    ? apps.filter(a => a.name.toLowerCase().includes(query.toLowerCase()))
    : apps;

  const grouped: Record<string, typeof apps> = {};
  filtered.forEach(app => {
    const letter = app.name[0]!.toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(app);
  });
  const letters = Object.keys(grouped).sort();

  const handleOpen = (appId: string) => {
    openApp(appId);
    setAppDrawerOpen(false);
  };

  const getBg = (app: any) => app.iconBg || 'linear-gradient(135deg, #374151 0%, #111827 100%)';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(5,5,8,0.97)', backdropFilter: 'blur(24px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-3">
        <h2 className="text-white text-xl font-semibold">All Apps</h2>
        <button
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
          onClick={() => setAppDrawerOpen(false)}
        >
          <X size={18} className="text-white" />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 mb-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/8 border border-white/10">
          <Search size={16} className="text-white/40" />
          <input
            className="flex-1 bg-transparent text-white text-[15px] outline-none placeholder:text-white/30"
            placeholder="Search apps..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus={false}
            style={{ fontSize: '16px', userSelect: 'text', WebkitUserSelect: 'text' }}
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X size={14} className="text-white/40" />
            </button>
          )}
        </div>
      </div>

      {/* App List */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {query ? (
          <div className="grid grid-cols-4 gap-y-6 gap-x-2 pt-2">
            {filtered.map(app => {
              const Icon = app.icon;
              return (
                <div key={app.id} className="flex justify-center">
                  <div className="app-icon" onClick={() => handleOpen(app.id)}>
                    <div className="icon-bg" style={{ background: getBg(app), width: 56, height: 56, borderRadius: 14 }}>
                      <Icon size={24} className="text-white" strokeWidth={1.8} />
                    </div>
                    <span className="icon-label text-[11px]">{app.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          letters.map(letter => (
            <div key={letter}>
              <div className="section-header pl-0 pt-4 pb-2">{letter}</div>
              {grouped[letter]!.map(app => {
                const Icon = app.icon;
                return (
                  <div
                    key={app.id}
                    className="list-item rounded-2xl mb-2"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}
                    onClick={() => handleOpen(app.id)}
                  >
                    <div
                      className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
                      style={{ background: getBg(app) }}
                    >
                      <Icon size={20} className="text-white" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-[15px] font-medium">{app.name}</div>
                      {app.description && (
                        <div className="text-white/40 text-[12px] mt-0.5 line-clamp-1">{app.description}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
