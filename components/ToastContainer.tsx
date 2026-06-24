import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { X, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export default function ToastContainer() {
  const { notifications } = useOS();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Watch for new notifications and create toasts
  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[notifications.length - 1];
    if (!latest || dismissed.has(latest.id)) return;
    
    setToasts(prev => {
      if (prev.some(t => t.id === latest.id)) return prev;
      return [...prev.slice(-4), { id: latest.id, title: latest.title, message: latest.message, type: (latest.type || 'info') as Toast['type'], timestamp: Date.now() }];
    });

    // Auto-dismiss after 4s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== latest.id));
      setDismissed(prev => new Set(prev).add(latest.id));
    }, 4000);
  }, [notifications.length]);

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    setDismissed(prev => new Set(prev).add(id));
  };

  const typeConfig = {
    info: { icon: Info, color: 'border-cyan-500/50 bg-cyan-500/5', iconColor: 'text-cyan-400' },
    success: { icon: CheckCircle, color: 'border-emerald-500/50 bg-emerald-500/5', iconColor: 'text-emerald-400' },
    warning: { icon: AlertTriangle, color: 'border-amber-500/50 bg-amber-500/5', iconColor: 'text-amber-400' },
    error: { icon: XCircle, color: 'border-red-500/50 bg-red-500/5', iconColor: 'text-red-400' },
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9997] space-y-2 pointer-events-none" style={{ maxWidth: 360 }}>
      {toasts.map((toast, i) => {
        const cfg = typeConfig[toast.type];
        const Icon = cfg.icon;
        return (
          <div key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl ${cfg.color} animate-in slide-in-from-right-5 fade-in duration-300`}
            style={{ animationDelay: `${i * 50}ms` }}>
            <Icon size={16} className={`${cfg.iconColor} mt-0.5 shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">{toast.title}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{toast.message}</div>
            </div>
            <button onClick={() => dismiss(toast.id)} className="p-0.5 text-zinc-600 hover:text-white transition shrink-0"><X size={12} /></button>
          </div>
        );
      })}
    </div>
  );
}
