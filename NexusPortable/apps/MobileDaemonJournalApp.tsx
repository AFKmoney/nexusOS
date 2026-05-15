import React, { useState, useRef, useEffect } from 'react';
import { useMobile } from '../store/mobileStore';
import { BookOpen, Download, Search, ChevronLeft } from 'lucide-react';
import type { MobileAppProps } from '../types';

export default function MobileDaemonJournalApp({ onBack }: MobileAppProps) {
  const { autonomyLog } = useMobile();
  const [filter, setFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [autonomyLog, autoScroll]);

  const filtered = filter
    ? autonomyLog.filter((l: string) => l.toLowerCase().includes(filter.toLowerCase()))
    : autonomyLog;

  const exportLogs = () => {
    const blob = new Blob([filtered.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'daemon_journal.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const colorize = (log: string) => {
    if (log.includes('ERR') || log.includes('ERROR')) return 'text-red-400';
    if (log.includes('COMPLETE') || log.includes('ready') || log.includes('ONLINE')) return 'text-emerald-400';
    if (log.includes('ANALYZING') || log.includes('PROMPTING')) return 'text-cyan-400';
    if (log.includes('FORGE') || log.includes('BUILD')) return 'text-amber-400';
    if (log.includes('TOOL')) return 'text-violet-400';
    return 'text-zinc-400';
  };

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <button className="p-2 -ml-2 rounded-xl active:bg-white/10 transition-colors" onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-violet-400" />
            <h1 className="text-[15px] font-bold uppercase tracking-widest">DAEMON Journal</h1>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
            {filtered.length} entries detected
          </p>
        </div>
        <button
          onClick={exportLogs}
          className="p-2 text-zinc-400 active:text-white transition-colors"
        >
          <Download size={20} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="px-4 py-3 shrink-0 bg-black/20 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <Search size={16} className="text-zinc-500" />
            <input
              className="flex-1 bg-transparent text-[15px] outline-none text-zinc-200 placeholder-zinc-600"
              placeholder="Search log entries..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl border transition-all ${autoScroll ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-white/10 text-zinc-500 bg-white/5'}`}
          >
            Live
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-4 opacity-40">
            <BookOpen size={48} />
            <p className="text-sm font-bold uppercase tracking-widest">No matching entries</p>
          </div>
        ) : (
          filtered.map((entry: string, i: number) => (
            <div key={i} className={`flex gap-3 ${colorize(entry)} leading-relaxed break-all`}>
              <span className="text-zinc-600 shrink-0 select-none">{String(i + 1).padStart(4, '0')}</span>
              <span>{entry}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
