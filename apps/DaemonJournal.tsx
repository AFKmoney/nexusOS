import React, { useState, useRef, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { BookOpen, Download, Trash2, Filter } from 'lucide-react';

export default function DaemonJournalApp() {
  const { autonomyLog } = useOS();
  const [filter, setFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [autonomyLog, autoScroll]);

  const filtered = filter
    ? autonomyLog.filter(l => l.toLowerCase().includes(filter.toLowerCase()))
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
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-violet-400" />
          <span className="font-bold tracking-widest text-sm uppercase">DAEMON Journal</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20">{filtered.length} entries</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1 text-xs rounded-lg border transition-all ${autoScroll ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-white/10 text-zinc-500'}`}
          >
            Live
          </button>
          <button
            onClick={exportLogs}
            className="p-1.5 text-zinc-500 hover:text-white transition-colors"
            title="Export logs"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 py-2 border-b border-white/5 bg-black/20 shrink-0">
        <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5">
          <Filter size={12} className="text-zinc-500" />
          <input
            className="flex-1 bg-transparent text-sm outline-none text-zinc-200 placeholder-zinc-600"
            placeholder="Filter log entries..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Log feed */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-0.5 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-zinc-600 text-center mt-8">No log entries yet. DAEMON will write here as it operates.</div>
        ) : (
          filtered.map((entry, i) => (
            <div key={i} className={`${colorize(entry)} leading-relaxed`}>
              <span className="text-zinc-500 mr-2">{String(i + 1).padStart(4, '0')}</span>
              {entry}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
