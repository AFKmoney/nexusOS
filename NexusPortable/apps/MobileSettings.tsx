import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, User, Palette, Cpu, Bell, Shield, Info,
  Moon, Wifi, Volume2, Zap, Key, Globe, Database, RotateCcw, Save, Trash2, Check, ExternalLink
} from 'lucide-react';
import type { MobileAppProps } from '../types';
import { useMobile } from '../store/mobileStore';
import { PROVIDER_PRESETS, aiGateway } from '../../services/aiProviders';

type Section = 'main' | 'appearance' | 'daemon' | 'notifications' | 'security' | 'about' | 'ai-keys';

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
      onClick={(e) => { e.stopPropagation(); onChange(!value); }}
    >
      <div
        className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-200"
        style={{ left: value ? '22px' : '2px' }}
      />
    </button>
  );
}

export default function MobileSettings({ onBack }: MobileAppProps) {
  const { kernelRules, updateKernelRules, accentColor, setAccentColor, addNotification, logout, apiKeys, setApiKey } = useMobile();
  const [section, setSection] = useState<Section>('main');
  
  // Local state for UI only (providers list)
  const [providers] = useState(() => aiGateway.getProviders());
  const [activeProviderId, setActiveProviderId] = useState(() => aiGateway.getActiveProviderId());
  const [testing, setTesting] = useState<string | null>(null);

  const saveAllKeys = () => {
    providers.forEach(p => {
      const key = apiKeys[p.id] || '';
      aiGateway.updateProviderKey(p.id, key);
    });
    aiGateway.setActiveProvider(activeProviderId);
    addNotification({ title: 'AI Infrastructure', message: 'All neural links secured and synchronized.', type: 'success' });
    setSection('daemon');
  };

  const accentColors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316'];

  const sectionTitle: Record<Section, string> = {
    main: 'Settings',
    appearance: 'Appearance',
    daemon: 'DAEMON AI',
    notifications: 'Notifications',
    security: 'Security',
    about: 'About',
    'ai-keys': 'API Configuration',
  };

  const mainRows: SettingRow[] = [
    { icon: Palette, iconBg: 'linear-gradient(135deg,#f59e0b,#ef4444)', label: 'Appearance', sub: 'Themes, accent color', section: 'appearance' },
    { icon: Cpu, iconBg: 'linear-gradient(135deg,#10b981,#059669)', label: 'DAEMON AI', sub: 'Neural engine, model, API keys', section: 'daemon' },
    { icon: Bell, iconBg: 'linear-gradient(135deg,#6366f1,#8b5cf6)', label: 'Notifications', sub: 'Alerts, sounds', section: 'notifications' },
    { icon: Shield, iconBg: 'linear-gradient(135deg,#ef4444,#dc2626)', label: 'Security', sub: 'PIN, lock, privacy', section: 'security' },
    { icon: Info, iconBg: 'linear-gradient(135deg,#64748b,#475569)', label: 'About', sub: 'NexusOS v2.1.2', section: 'about' },
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
          onClick={() => {
            if (section === 'main') onBack();
            else if (section === 'ai-keys') setSection('daemon');
            else setSection('main');
          }}
        >
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px] flex-1">{sectionTitle[section]}</h1>
        {section === 'ai-keys' && (
          <button onClick={saveAllKeys} className="p-2 text-emerald-400 active:scale-90 transition-all">
            <Save size={20} />
          </button>
        )}
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
              {renderRow({ icon: Key, iconBg: 'linear-gradient(135deg,#8b5cf6,#6366f1)', label: 'AI Providers', sub: 'Mistral, OpenAI, Anthropic...', section: 'ai-keys' }, 1)}
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Active Provider', value: activeProviderId.toUpperCase() },
                { label: 'Model', value: kernelRules.modelId || 'claude-sonnet-4-6' },
                { label: 'Tone', value: kernelRules.tone },
                { label: 'Creativity', value: `${kernelRules.creativity * 10}/10` },
              ].map((row, i) => (
                <div key={i} className="list-item" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-white/60 text-[14px] flex-1">{row.label}</p>
                  <p className="text-white text-[14px] font-medium">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'ai-keys' && (
          <div className="px-4 pt-4 pb-6 space-y-6">
            <p className="text-white/40 text-[13px] leading-relaxed">
              Configure your API keys here. Your keys are stored locally on this device.
            </p>
            
            <div className="space-y-4">
              {providers.filter(p => p.id !== 'custom').map(p => (
                <div key={p.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-white/60 text-[12px] uppercase font-bold tracking-widest">{p.name}</p>
                    {p.id === 'lmstudio' || p.id === 'ollama' ? (
                       <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-mono uppercase">Local</span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        className="mobile-input pr-10"
                        type="password"
                        placeholder={p.id === 'lmstudio' || p.id === 'ollama' ? p.baseUrl : 'Enter API Key...'}
                        value={apiKeys[p.id] || ''}
                        onChange={e => setApiKey(p.id, e.target.value)}
                        disabled={p.id === 'lmstudio' || p.id === 'ollama'}
                        style={{ fontSize: '13px', background: 'rgba(255,255,255,0.03)' }}
                      />
                      {(apiKeys[p.id]) && <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />}
                    </div>
                    {p.id !== 'lmstudio' && p.id !== 'ollama' && (
                      <button
                        className="px-3 rounded-xl bg-white/5 border border-white/10 text-white/40 active:bg-white/10 transition-all flex items-center justify-center min-w-[60px]"
                        onClick={() => testKey(p.id)}
                        disabled={testing === p.id}
                      >
                        {testing === p.id ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} className={p.apiKey ? 'text-emerald-400' : ''} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4">
               <button className="btn-primary w-full" onClick={saveAllKeys}>
                 <Save size={16} /> Save Changes
               </button>
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
              <p className="text-white/40 text-[13px]">Mobile Edition · v2.1.2</p>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                ['Version', '2.1.2'],
                ['Platform', 'Mobile / Android / PWA'],
                ['Neural Engine', '3.5.0-Triadic'],
                ['Build', 'Optimized'],
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
