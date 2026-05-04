import React, { useState } from 'react';
import { User, Cpu, ArrowRight } from 'lucide-react';
import { useMobile } from '../store/mobileStore';
import type { UserProfile } from '../types';

export default function LoginScreen() {
  const { profiles, login } = useMobile();
  const [selected, setSelected] = useState<UserProfile | null>(profiles[0] ?? null);

  const handleLogin = () => {
    if (selected) login(selected.id);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-between z-[990]"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.12) 0%, var(--nx-surface) 70%)',
        paddingTop: 'max(var(--safe-top), 60px)',
        paddingBottom: 'max(var(--safe-bottom), 40px)',
      }}
    >
      {/* Top */}
      <div className="flex flex-col items-center gap-2 mt-8">
        <div
          className="w-16 h-16 rounded-[22px] flex items-center justify-center mb-2"
          style={{
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)',
            boxShadow: '0 0 30px rgba(16,185,129,0.15)',
          }}
        >
          <Cpu size={32} style={{ color: 'var(--nx-accent)' }} strokeWidth={1.5} />
        </div>
        <h1 className="text-white text-2xl font-bold">NexusOS</h1>
        <p className="text-white/30 text-sm">Mobile Edition</p>
      </div>

      {/* Profile Cards */}
      <div className="flex flex-col items-center gap-3 w-full px-6">
        {profiles.map(profile => (
          <button
            key={profile.id}
            className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-98"
            style={{
              background: selected?.id === profile.id
                ? `rgba(16,185,129,0.12)`
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${selected?.id === profile.id ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}
            onClick={() => setSelected(profile)}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: profile.themeColor + '25', border: `2px solid ${profile.themeColor}50` }}
            >
              {profile.avatar ? (
                <img src={profile.avatar} className="w-full h-full rounded-full object-cover" alt="" />
              ) : (
                <User size={22} style={{ color: profile.themeColor }} />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-semibold text-[16px]">{profile.name}</p>
              <p className="text-white/40 text-[12px]">{profile.isAdmin ? 'Administrator' : 'User'}</p>
            </div>
            {selected?.id === profile.id && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'var(--nx-accent)' }}>
                <span className="text-black text-[10px] font-bold">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Login Button */}
      <div className="w-full px-6">
        <button
          className="btn-primary w-full"
          onClick={handleLogin}
          disabled={!selected}
        >
          Enter NexusOS
          <ArrowRight size={18} />
        </button>
        <p className="text-white/20 text-[12px] text-center mt-4">
          Sovereign Neural OS · v1.0.0
        </p>
      </div>
    </div>
  );
}
