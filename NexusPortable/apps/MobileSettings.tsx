import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, User, Palette, Cpu, Bell, Shield, Info,
  Moon, Wifi, Volume2, Zap, Key, Globe, Database, RotateCcw
} from 'lucide-react';
import type { MobileAppProps } from '../types';
import { useMobile } from '../store/mobileStore';

type Section = 'main' | 'appearance' | 'daemon' | 'notifications' | 'security' | 'about';

interface SettingRow {
  icon: React.ElementType;
  iconBg: string;
  label: string;
  sub?: string;
  onTap?: () => void;
  right?: React.ReactNode;
  section?: Section;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className="relative w-12 h-7 rounded-full transition-all duration-200 flex-shrink-0"
      style={{
        background: value ? 'var(--nx-accent)' : 'rgba(255,255,255,0.15)',
      }}
      onClick={() => onChange(!value)}
    >
      <div
        className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-200"
        style={{ left: value ? '22px' : '2px' }}
      />
    </button>
  );
}

export default function MobileSettings({ onBack }: MobileAppProps) {
  const { kernelRules, updateKernelRules, accentColor, setAccentColor, addNotification, logout } = useMobile();
  const [section, setSection] = useState<Section>('main');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('nx_anthropic_key') ?? '');

  const accentColors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316'];

  const saveApiKey = () => {
    localStorage.setItem('nx_anthropic_key', apiKey);
    addNotification({ title: 'Settings', message: 'API key saved.', type: 'success' });
  };

  const sectionTitle: Record<Section, string> = {
    main: 'Settings',
    appearance: 'Appearance',
    daemon: 'DAEMON AI',
    notifications: 'Notifications',
    security: 'Security',
    about: 'About',
  };

  const mainRows: SettingRow[] = [
    { icon: Palette, iconBg: 'linear-gradient(135deg,#f59e0b,#ef4444)', label: 'Appearance', sub: 'Themes, accent color', section: 'appearance' },
    { icon: Cpu, iconBg: 'linear-gradient(135deg,#10b981,#059669)', label: 'DAEMON AI', sub: 'Neural engine, model, API keys', section: 'daemon' },
    { icon: Bell, iconBg: 'linear-gradient(135deg,#6366f1,#8b5cf6)', label: 'Notifications', sub: 'Alerts, sounds', section: 'notifications' },
    { icon: Shield, iconBg: 'linear-gradient(135deg,#ef4444,#dc2626)', label: 'Security', sub: 'PIN, lock, privacy', section: 'security' },
    { icon: Info, iconBg: 'linear-gradient(135deg,#64748b,#475569)', label: 'About', sub: 'NexusOS v1.0.0', section: 'about' },
  ];

  const renderRow = (row: SettingRow, i: number) => (
    <div
      key={i}
      className="list-item"
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
      onClick={row.section ? () => setSection(row.section!) : row.onTap}
    >
      <div
        className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
        style={{ background: row.iconBg }}
      >
        <row.icon size={18} className="text-white" strokeWidth={1.8} />
      </div>
      <div className="flex-1">
        <p className="text-white text-[15px] font-medium">{row.label}</p>
        {row.sub && <p className="text-white/40 text-[12px] mt-0.5">{row.sub}</p>}
      </div>
      {row.right ?? (row.section && <ChevronRight size={16} className="text-white/30" />)}
    </div>
  );

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button
          className="p-1.5 rounded-xl active:bg-white/10"
          onClick={section === 'main' ? onBack : () => setSection('main')}
        >
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px]">{sectionTitle[section]}</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {section === 'main' && (
          <div className="px-4 pt-4 pb-6">
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {mainRows.map(renderRow)}
            </div>

            {/* Logout */}
            <div className="mt-6">
              <button
                className="w-full py-3.5 rounded-2xl text-red-400 text-[15px] font-medium active:bg-red-500/10 transition-all"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                onClick={logout}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {section === 'appearance' && (
          <div className="px-4 pt-4 pb-6 space-y-5">
            <div>
              <p className="section-header pl-0">Accent Color</p>
              <div className="flex flex-wrap gap-3 pt-2">
                {accentColors.map(c => (
                  <button
                    key={c}
                    className="w-10 h-10 rounded-full transition-all active:scale-90"
                    style={{
                      background: c,
                      border: `3px solid ${accentColor === c ? 'white' : 'transparent'}`,
                      boxShadow: accentColor === c ? `0 0 12px ${c}60` : 'none',
                    }}
                    onClick={() => setAccentColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {renderRow({ icon: Moon, iconBg: 'linear-gradient(135deg,#1e293b,#334155)', label: 'Dark Mode', right: <Toggle value={true} onChange={() => {}} /> }, 0)}
            </div>
          </div>
        )}

        {section === 'daemon' && (
          <div className="px-4 pt-4 pb-6 space-y-4">
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {renderRow({ icon: Zap, iconBg: 'linear-gradient(135deg,#10b981,#059669)', label: 'Autonomy', sub: 'Let DAEMON act independently', right: <Toggle value={kernelRules.autonomyEnabled} onChange={v => updateKernelRules({ autonomyEnabled: v })} /> }, 0)}
            </div>

            <div>
              <p className="section-header pl-0">Anthropic API Key</p>
              <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <input
                  className="mobile-input"
                  type="password"
                  placeholder="sk-ant-api03-..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  style={{ fontSize: '14px' }}
                />
                <button className="btn-primary w-full" onClick={saveApiKey}>
                  <Key size={15} />
                  Save Key
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Model', value: kernelRules.modelId || 'claude-sonnet-4-6' },
                { label: 'Tone', value: kernelRules.tone },
                { label: 'Creativity', value: `${kernelRules.creativity}/10` },
              ].map((row, i) => (
                <div key={i} className="list-item" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-white/60 text-[14px] flex-1">{row.label}</p>
                  <p className="text-white text-[14px] font-medium">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'notifications' && (
          <div className="px-4 pt-4 pb-6">
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {renderRow({ icon: Bell, iconBg: 'linear-gradient(135deg,#6366f1,#8b5cf6)', label: 'Show Notifications', right: <Toggle value={true} onChange={() => {}} /> }, 0)}
              {renderRow({ icon: Volume2, iconBg: 'linear-gradient(135deg,#f59e0b,#d97706)', label: 'Sound', right: <Toggle value={true} onChange={() => {}} /> }, 1)}
            </div>
          </div>
        )}

        {section === 'security' && (
          <div className="px-4 pt-4 pb-6">
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {renderRow({ icon: Shield, iconBg: 'linear-gradient(135deg,#ef4444,#dc2626)', label: 'Secure Boot', right: <Toggle value={kernelRules.secureBoot} onChange={v => updateKernelRules({ secureBoot: v })} /> }, 0)}
              {renderRow({ icon: Key, iconBg: 'linear-gradient(135deg,#f59e0b,#d97706)', label: 'PIN Lock', sub: 'Require PIN to unlock', right: <Toggle value={false} onChange={() => {}} /> }, 1)}
            </div>
          </div>
        )}

        {section === 'about' && (
          <div className="px-4 pt-4 pb-6 space-y-4">
            <div className="flex flex-col items-center py-6 gap-2">
              <div className="w-16 h-16 rounded-[22px] flex items-center justify-center mb-2"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <Cpu size={32} className="text-emerald-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-white text-xl font-bold">NexusOS</h2>
              <p className="text-white/40 text-[13px]">Mobile Edition · v1.0.0</p>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                ['Version', '1.0.0'],
                ['Platform', 'Mobile / PWA'],
                ['Neural Engine', '2.0.0'],
                ['Build', 'production'],
              ].map(([k, v], i) => (
                <div key={i} className="list-item" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-white/60 text-[14px] flex-1">{k}</p>
                  <p className="text-white text-[14px]">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
