import React, { useState, useEffect } from 'react';
import { X, Wifi, Bluetooth, Moon, Sun, Volume2, Plane, Flashlight, RotateCcw, Cpu, Zap } from 'lucide-react';
import { useMobile } from '../store/mobileStore';

function Toggle({ label, icon: Icon, active, onToggle, color = '#10b981' }: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onToggle: () => void;
  color?: string;
}) {
  return (
    <button
      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95"
      style={{
        background: active ? `${color}25` : 'rgba(255,255,255,0.07)',
        border: `1px solid ${active ? `${color}40` : 'rgba(255,255,255,0.08)'}`,
        minWidth: 72,
      }}
      onClick={onToggle}
    >
      <Icon
        size={22}
        style={{ color: active ? color : 'rgba(255,255,255,0.6)' }}
        strokeWidth={2}
      />
      <span
        className="text-[10px] font-medium"
        style={{ color: active ? color : 'rgba(255,255,255,0.5)' }}
      >
        {label}
      </span>
    </button>
  );
}

function Slider({ label, value, onChange, icon: Icon }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 px-1">
      <Icon size={16} className="text-white/50 flex-shrink-0" />
      <div className="flex-1">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={e => onChange(+e.target.value)}
          className="w-full h-1 bg-white/20 rounded-full appearance-none"
          style={{ accentColor: 'var(--nx-accent)' }}
        />
      </div>
      <span className="text-white/40 text-[11px] w-8 text-right">{value}%</span>
    </div>
  );
}

export default function MobileControlCenter() {
  const { isControlCenterOpen, setControlCenterOpen } = useMobile();
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(false);
  const [airplane, setAirplane] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [brightness, setBrightness] = useState(70);
  const [volume, setVolume] = useState(50);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isControlCenterOpen) setVisible(true);
    else {
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [isControlCenterOpen]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60]"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={() => setControlCenterOpen(false)}
    >
      <div
        className="absolute top-0 right-0 bottom-0 w-[85vw] max-w-sm flex flex-col"
        style={{
          background: 'rgba(13,13,18,0.95)',
          backdropFilter: 'blur(28px)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          paddingTop: 'var(--status-bar-height)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-white text-lg font-semibold">Control Center</h2>
          <button
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
            onClick={() => setControlCenterOpen(false)}
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {/* Connectivity Toggles */}
          <div>
            <p className="text-white/40 text-[11px] uppercase tracking-wider mb-2 px-1">Connectivity</p>
            <div className="flex flex-wrap gap-2">
              <Toggle label="Wi-Fi" icon={Wifi} active={wifi} onToggle={() => setWifi(!wifi)} />
              <Toggle label="Bluetooth" icon={Bluetooth} active={bluetooth} onToggle={() => setBluetooth(!bluetooth)} color="#3b82f6" />
              <Toggle label="Airplane" icon={Plane} active={airplane} onToggle={() => setAirplane(!airplane)} color="#f59e0b" />
              <Toggle label="Dark Mode" icon={darkMode ? Moon : Sun} active={darkMode} onToggle={() => setDarkMode(!darkMode)} color="#8b5cf6" />
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4 px-1 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Slider label="Brightness" value={brightness} onChange={setBrightness} icon={Sun} />
            <Slider label="Volume" value={volume} onChange={setVolume} icon={Volume2} />
          </div>

          {/* DAEMON Section */}
          <div>
            <p className="text-white/40 text-[11px] uppercase tracking-wider mb-2 px-1">DAEMON AI</p>
            <div className="flex flex-wrap gap-2">
              <Toggle label="Neural" icon={Cpu} active={true} onToggle={() => {}} color="#10b981" />
              <Toggle label="Torch" icon={Flashlight} active={false} onToggle={() => {}} color="#f59e0b" />
              <Toggle label="Power" icon={Zap} active={true} onToggle={() => {}} color="#6366f1" />
            </div>
          </div>

          {/* System */}
          <div className="px-1 py-3 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-white/40 text-[11px] uppercase tracking-wider px-0 -mt-1">System</p>
            <button className="w-full flex items-center gap-3 py-2 active:opacity-70">
              <RotateCcw size={16} className="text-white/50" />
              <span className="text-white/70 text-[14px]">Restart DAEMON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
