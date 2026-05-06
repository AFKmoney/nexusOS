import React, { useState } from 'react';
import { ChevronLeft, Cpu, Check, Zap, Globe, Brain, ChevronRight } from 'lucide-react';
import type { MobileAppProps } from '../types';
import { useMobile } from '../store/mobileStore';

const PROVIDERS = [
  {
    id: 'anthropic', name: 'Anthropic', icon: '🧠', color: '#d97706',
    models: [
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', desc: 'Most powerful · Best reasoning', tier: 'premium' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', desc: 'Best balance · Recommended', tier: 'standard' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', desc: 'Fastest · Lowest cost', tier: 'fast' },
    ],
  },
  {
    id: 'openai', name: 'OpenAI', icon: '⚡', color: '#10b981',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', desc: 'Multimodal · Best for images', tier: 'premium' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Fast · Cost-efficient', tier: 'fast' },
    ],
  },
  {
    id: 'google', name: 'Google', icon: '🌐', color: '#4285f4',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Fast multimodal', tier: 'fast' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Long context · 1M tokens', tier: 'standard' },
    ],
  },
  {
    id: 'groq', name: 'Groq', icon: '🚀', color: '#f43f5e',
    models: [
      { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', desc: 'Ultra-fast inference', tier: 'fast' },
      { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', desc: 'Open source · Mix of experts', tier: 'fast' },
    ],
  },
];

const TIER_BADGE: Record<string, { label: string; color: string }> = {
  premium: { label: 'Premium', color: '#f59e0b' },
  standard: { label: 'Standard', color: '#10b981' },
  fast: { label: 'Fast', color: '#6366f1' },
};

export default function MobileModelManager({ onBack }: MobileAppProps) {
  const { kernelRules, updateKernelRules } = useMobile();
  const [expandedProvider, setExpandedProvider] = useState<string | null>('anthropic');

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
          <div>
            <p className="text-white/50 text-[11px] uppercase tracking-wider">Active Model</p>
            <p className="text-white font-semibold text-[14px]">{kernelRules.modelId}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {PROVIDERS.map(provider => (
          <div key={provider.id} className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Provider header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
            >
              <span className="text-xl">{provider.icon}</span>
              <span className="text-white font-semibold text-[15px] flex-1">{provider.name}</span>
              <span className="text-white/30 text-[12px]">{provider.models.length} models</span>
              <ChevronRight size={16} className={`text-white/30 transition-transform ${expandedProvider === provider.id ? 'rotate-90' : ''}`} />
            </button>

            {/* Models */}
            {expandedProvider === provider.id && provider.models.map((model, i) => {
              const isActive = kernelRules.modelId === model.id;
              const badge = TIER_BADGE[model.tier]!;
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
                  <div className="flex-1 text-left">
                    <p className="text-white text-[14px] font-medium">{model.name}</p>
                    <p className="text-white/40 text-[12px]">{model.desc}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
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
