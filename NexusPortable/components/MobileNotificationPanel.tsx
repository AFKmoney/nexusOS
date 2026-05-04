import React, { useEffect, useState } from 'react';
import { X, Bell, Trash2, CheckCheck, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { useMobile } from '../store/mobileStore';
import type { MobileNotification } from '../types';

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

export default function MobileNotificationPanel() {
  const {
    isNotificationPanelOpen,
    setNotificationPanelOpen,
    notifications,
    dismissNotification,
    clearAllNotifications,
    markAllRead,
  } = useMobile();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isNotificationPanelOpen) {
      setVisible(true);
      markAllRead();
    } else {
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [isNotificationPanelOpen]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{
        background: 'rgba(5,5,8,0.95)',
        backdropFilter: 'blur(28px)',
        paddingTop: 'var(--status-bar-height)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 className="text-white text-xl font-semibold">Notifications</h2>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/8 active:bg-white/15 text-white/60 text-[13px]"
              onClick={clearAllNotifications}
            >
              <Trash2 size={13} />
              Clear all
            </button>
          )}
          <button
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
            onClick={() => setNotificationPanelOpen(false)}
          >
            <X size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-white/20">
            <CheckCheck size={40} strokeWidth={1.5} className="mb-3" />
            <p className="text-[15px]">No notifications</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              className="flex items-start gap-3 p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <NotifIcon type={notif.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white text-[14px] font-semibold">{notif.title}</p>
                  <span className="text-white/30 text-[11px] flex-shrink-0">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-white/60 text-[13px] mt-0.5 line-clamp-2">{notif.message}</p>
              </div>
              <button
                className="w-6 h-6 flex items-center justify-center text-white/30 flex-shrink-0 active:text-white/60"
                onClick={() => dismissNotification(notif.id)}
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
