import React, { useState } from 'react';
import { useOS } from '../store/osStore';
import { Bell, X, Info, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';

export default function NotificationCenterApp() {
  const { notifications } = useOS();
  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');

  const filtered = filter === 'all' ? notifications : notifications.filter((n: any) => n.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={14} className="text-amber-400" />;
      case 'error': return <AlertTriangle size={14} className="text-rose-400" />;
      case 'success': return <CheckCircle2 size={14} className="text-emerald-400" />;
      default: return <Info size={14} className="text-cyan-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100">
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-cyan-400" />
          <span className="font-bold text-sm tracking-widest uppercase">Notifications</span>
          <span className="text-xs text-zinc-500 ml-2">({notifications.length})</span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b border-white/5 flex gap-2">
        {(['all', 'info', 'warning', 'error'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full capitalize transition-all ${
              filter === f ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:text-white'
            }`}
          >{f}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Bell size={32} className="mb-3 opacity-30" />
            <span className="text-sm">No notifications</span>
          </div>
        ) : (
          filtered.map((n: any, i: number) => (
            <div key={i} className="bg-neutral-900/60 border border-white/5 rounded-xl p-3 flex items-start gap-3 hover:bg-white/5 transition-colors">
              <div className="mt-0.5">{getIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{n.title || 'DAEMON'}</div>
                <div className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{n.message}</div>
                {n.timestamp && (
                  <div className="text-[10px] text-zinc-600 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
