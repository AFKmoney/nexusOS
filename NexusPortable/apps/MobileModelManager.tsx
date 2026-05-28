import React, { useState } from 'react';
import { ChevronLeft, Cpu, Check, Brain, ChevronRight } from 'lucide-react';
import type { MobileAppProps } from '../types';
import { useMobile } from '../store/mobileStore';
import { PROVIDER_PRESETS } from '../../services/aiProviders';

const PROVIDER_METADATA: Record<string, { icon: string; color: string }> = {
  openai: { icon: '⚡', color: '#10b981' },
  anthropic: { icon: '🧠', color: '#d97706' },
  google: { icon: '🌐', color: '#4285f4' },
  groq: { icon: '🚀', color: '#f43f5e' },
  mistral: { icon: '🌪️', color: '#f59e0b' },
  codestral: { icon: '💻', color: '#6366f1' },
  deepseek: { icon: '🔍', color: '#3b82f6' },
  openrouter: { icon: '🌉', color: '#7c3aed' },
  zhipu: { icon: '🇨🇳', color: '#ef4444' },
  together: { icon: '🤝', color: '#ec4899' },
  ollama: { icon: '🦙', color: '#ffffff' },
  lmstudio: { icon: '🏠', color: '#94a3b8' },
  xai: { icon: '𝕏', color: '#ffffff' },
  cerebras: { icon: '🧠', color: '#fb923c' },
  perplexity: { icon: '❓', color: '#2dd4bf' },
  fireworks: { icon: '🎆', color: '#f472b6' },
  clod: { icon: '☁️', color: '#38bdf8' },
  custom: { icon: '🛠️', color: '#94a3b8' },
};

type TierBadge = { label: string; color: string };
const DEFAULT_BADGE: TierBadge = { label: 'Standard', color: '#10b981' };
const TIER_BADGE: Record<string, TierBadge> = {
  premium: { label: 'Premium', color: '#f59e0b' },
  standard: DEFAULT_BADGE,
  fast: { label: 'Fast', color: '#6366f1' },
};

export default function MobileModelManager({ onBack }: MobileAppProps) {
  const { kernelRules, updateKernelRules } = useMobile();
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  // Group PROVIDER_PRESETS into the mobile-friendly format
  const providers = PROVIDER_PRESETS.map(preset => {
    const id = preset.id || 'custom';
    const meta = PROVIDER_METADATA[id] || { icon: '🤖', color: '#94a3b8' };
    const modelsList = preset.models || (preset.defaultModel ? [preset.defaultModel] : []);
    
    return {
      id,
      name: preset.name || 'Unknown',
      icon: meta.icon,
      color: meta.color,
      models: modelsList.map(mId => {
        if (!mId) return null;
        // Simple heuristic for tiering
        let tier = 'standard';
        const low = mId.toLowerCase();
        if (low.includes('opus') || low.includes('pro') || low.includes('large') || low.includes('gpt-4o') || low.includes('70b') || low.includes('r1')) tier = 'premium';
        if (low.includes('haiku') || low.includes('flash') || low.includes('mini') || low.includes('8b') || low.includes('small')) tier = 'fast';
        
        return {
          id: mId,
          name: mId.split('/').pop() || mId, // Simplified name
          desc: id === 'openrouter' ? `Via OpenRouter: ${mId}` : `Neural model by ${preset.name}`,
          tier
        };
      }).filter(Boolean) as any[]
    };
  });

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <Brain size={17} className="text-emerald-400" />
        <h1 className="text-white font-semibold text-[16px] flex-1">Model Manager</h1>
      </div>

      {/* Current model banner */}
      <div className="px-4 py-3 flex-shrink-0"
        style={{ background: 'rgba(16,185,129,0.05)', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="flex items-center gap-3">
          <Cpu size={18} className="text-emerald-400" />
          <div className="flex-1 overflow-hidden">
            <p className="text-white/50 text-[11px] uppercase tracking-wider">Active Model</p>
            <p className="text-white font-semibold text-[14px] truncate">{kernelRules.modelId}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {providers.filter(p => p.id !== 'custom').map(provider => (
          <div key={provider.id} className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Provider header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
            >
              <span className="text-xl">{provider.icon}</span>
              <span className="text-white font-semibold text-[15px] flex-1 text-left">{provider.name}</span>
              <span className="text-white/30 text-[12px]">{provider.models.length} models</span>
              <ChevronRight size={16} className={`text-white/30 transition-transform ${expandedProvider === provider.id ? 'rotate-90' : ''}`} />
            </button>

            {/* Models */}
            {expandedProvider === provider.id && provider.models.map((model) => {
              const isActive = kernelRules.modelId === model.id;
              const badge = TIER_BADGE[model.tier] ?? DEFAULT_BADGE;
              return (
                <button
                  key={model.id}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition-all"
                  style={{ background: isActive ? `${provider.color}08` : 'transparent', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                  onClick={() => updateKernelRules({ modelId: model.id })}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: isActive ? provider.color + '20' : 'rgba(255,255,255,0.05)' }}>
                    {isActive ? <Check size={16} style={{ color: provider.color }} /> : <div className="w-2 h-2 rounded-full bg-white/20" />}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-white text-[14px] font-medium truncate">{model.name}</p>
                    <p className="text-white/40 text-[12px] truncate">{model.desc}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                    style={{ background: badge.color + '20', color: badge.color }}>
                    {badge.label}
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        <p className="text-white/20 text-[12px] text-center py-2">
          API keys are configured in Settings → DAEMON AI
        </p>
      </div>
    </div>
  );
}
