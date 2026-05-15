import React, { useState } from 'react';
import { ChevronLeft, Trash2, Bell, Info, AlertTriangle, CheckCircle, AlertCircle, CheckCheck, Filter } from 'lucide-react';
import { useMobile } from '../store/mobileStore';
import type { MobileAppProps, MobileNotification } from '../types';

function NotifIcon({ type }: { type: MobileNotification['type'] }) {
  const map = {
    info: { Icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    success: { Icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    error: { Icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
    warning: { Icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    system: { Icon: Bell, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  };
  const { Icon, color, bg } = map[type] ?? map.info;
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
      <Icon size={18} className={color} />
    </div>
  );
}

export default function MobileNotificationCenterApp({ onBack }: MobileAppProps) {
  const {
    notifications,
    dismissNotification,
    clearAllNotifications,
    markAllRead,
  } = useMobile();

  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'error' | 'system'>('all');

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);

  const filters: Array<{ id: typeof filter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'info', label: 'Info' },
    { id: 'warning', label: 'Alerts' },
    { id: 'error', label: 'Errors' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#050508]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
            <ChevronLeft size={22} className="text-white" />
          </button>
          <h1 className="text-white font-semibold text-[16px]">Notification Center</h1>
        </div>
        {notifications.length > 0 && (
          <button
            className="p-2 rounded-xl active:bg-white/10 text-white/60"
            onClick={clearAllNotifications}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar shrink-0">
        <Filter size={14} className="text-white/30 flex-shrink-0 mr-1" />
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
              filter === f.id
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/60 active:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-white/20">
            <CheckCheck size={48} strokeWidth={1} className="mb-4 opacity-50" />
            <p className="text-[15px] font-medium">Clear skies</p>
            <p className="text-[12px] mt-1">No notifications found for this filter</p>
          </div>
        ) : (
          filtered.map(notif => (
            <div
              key={notif.id}
              className="flex items-start gap-3 p-4 rounded-2xl animate-fade-in"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <NotifIcon type={notif.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white text-[14px] font-semibold">{notif.title || 'System'}</p>
                  <span className="text-white/30 text-[11px] flex-shrink-0">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-white/60 text-[13px] mt-0.5 leading-relaxed">{notif.message}</p>
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center text-white/20 active:text-white/60 flex-shrink-0"
                onClick={() => dismissNotification(notif.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Mark as read footer */}
      {notifications.some(n => !n.read) && (
        <div className="px-4 py-3 bg-black/20 border-t border-white/5 shrink-0">
          <button
            className="w-full py-3 rounded-2xl bg-white/5 active:bg-white/10 text-white/70 text-[14px] font-medium transition-all"
            onClick={markAllRead}
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
}
