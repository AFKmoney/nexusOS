import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal, BatteryCharging } from 'lucide-react';
import { useMobile } from '../store/mobileStore';

function BatteryIcon({ level, charging }: { level: number; charging: boolean }) {
  if (charging) return <BatteryCharging size={16} className="text-emerald-400" />;
  const color = level < 20 ? 'text-red-400' : 'text-white';
  return <Battery size={16} className={color} />;
}

export default function MobileStatusBar() {
  const [time, setTime] = useState(new Date());
  const [battery, setBattery] = useState({ level: 0.85, charging: false });
  const { unreadCount, isNotificationPanelOpen, setNotificationPanelOpen, isControlCenterOpen, setControlCenterOpen } = useMobile();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bat: any) => {
        setBattery({ level: bat.level, charging: bat.charging });
        bat.addEventListener('levelchange', () => setBattery(prev => ({ ...prev, level: bat.level })));
        bat.addEventListener('chargingchange', () => setBattery(prev => ({ ...prev, charging: bat.charging })));
      }).catch(() => {});
    }
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="status-bar flex items-end justify-between px-5 pb-1"
      style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
    >
      {/* Left: Time */}
      <button
        className="text-white font-semibold text-[15px] leading-none pointer-events-auto relative"
        onClick={() => { setNotificationPanelOpen(!isNotificationPanelOpen); }}
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        {timeStr}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-3 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
        )}
      </button>

      {/* Dynamic Island / Notch placeholder */}
      <div className="flex-1 flex justify-center pointer-events-none">
        <div className="w-32 h-6 bg-black rounded-full mt-1 opacity-0" />
      </div>

      {/* Right: System indicators */}
      <div
        className="flex items-center gap-1.5 pointer-events-auto"
        onClick={() => setControlCenterOpen(!isControlCenterOpen)}
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <Signal size={14} className="text-white" strokeWidth={2.5} />
        <Wifi size={14} className="text-white" strokeWidth={2.5} />
        <div className="flex items-center gap-0.5">
          <BatteryIcon level={battery.level} charging={battery.charging} />
          <span className="text-white text-[11px] font-medium">
            {Math.round(battery.level * 100)}
          </span>
        </div>
      </div>
    </div>
  );
}
