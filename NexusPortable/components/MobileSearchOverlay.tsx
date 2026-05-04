import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useMobile } from '../store/mobileStore';
import { MOBILE_APPS } from '../appRegistry';

export default function MobileSearchOverlay() {
  const { isSearchOpen, setSearchOpen, openApp } = useMobile();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

  const apps = MOBILE_APPS.filter(a => !a.hidden);
  const filtered = query
    ? apps.filter(a =>
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        (a.description ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleOpen = (appId: string) => {
    openApp(appId);
    setSearchOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col"
      style={{
        background: 'rgba(5,5,8,0.96)',
        backdropFilter: 'blur(24px)',
        paddingTop: 'var(--status-bar-height)',
      }}
    >
      {/* Search Input */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <div
          className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <Search size={17} className="text-white/50 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-white outline-none placeholder:text-white/30"
            placeholder="Search apps, files..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ fontSize: '16px', userSelect: 'text', WebkitUserSelect: 'text' }}
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X size={15} className="text-white/40" />
            </button>
          )}
        </div>
        <button
          className="text-white/60 text-[15px] px-2"
          onClick={() => setSearchOpen(false)}
        >
          Cancel
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {query && filtered.length === 0 && (
          <div className="flex items-center justify-center py-12 text-white/20 text-[15px]">
            No results for "{query}"
          </div>
        )}

        {filtered.length > 0 && (
          <>
            <p className="section-header pl-0">Apps</p>
            {filtered.map(app => {
              const Icon = app.icon;
              return (
                <div
                  key={app.id}
                  className="list-item rounded-2xl mb-2"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}
                  onClick={() => handleOpen(app.id)}
                >
                  <div
                    className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
                    style={{ background: app.iconBg }}
                  >
                    <Icon size={20} className="text-white" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-[15px] font-medium">{app.name}</p>
                    {app.description && (
                      <p className="text-white/40 text-[12px] mt-0.5">{app.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {!query && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-white/20">
            <Search size={32} strokeWidth={1.5} />
            <p className="text-[14px]">Type to search</p>
          </div>
        )}
      </div>
    </div>
  );
}
