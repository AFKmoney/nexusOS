import React, { useState } from 'react';
import { ChevronLeft, Shield, Plus, Eye, EyeOff, Copy, Trash2, Lock, Key, Check } from 'lucide-react';
import type { MobileAppProps } from '../types';

interface VaultEntry {
  id: string;
  site: string;
  username: string;
  password: string;
  note?: string;
  color: string;
}

const STORAGE_KEY = 'nx_vault_entries';
const load = (): VaultEntry[] => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; } };
const save = (e: VaultEntry[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(e));

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4'];

function genPassword(len = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function MobilePasswordManager({ onBack }: MobileAppProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [entries, setEntries] = useState<VaultEntry[]>(load);
  const [adding, setAdding] = useState(false);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ site: '', username: '', password: '', note: '', color: '#10b981' });

  const copy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id); setTimeout(() => setCopied(null), 1500);
  };

  const upd = (e: VaultEntry[]) => { setEntries(e); save(e); };
  const addEntry = () => {
    if (!form.site.trim()) return;
    upd([...entries, { ...form, id: Date.now().toString() }]);
    setAdding(false); setForm({ site: '', username: '', password: '', note: '', color: '#10b981' });
  };

  if (!unlocked) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 gap-8"
        style={{ background: 'var(--nx-surface)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <Shield size={32} className="text-indigo-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-white text-xl font-bold">Cipher Vault</h2>
          <p className="text-white/40 text-[14px] text-center">Enter master PIN to unlock</p>
        </div>
        <div className="flex gap-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="w-3.5 h-3.5 rounded-full"
              style={{ background: i < pin.length ? '#6366f1' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => {
            if (!k) return <div key={i} />;
            return (
              <button key={i}
                className="h-14 rounded-2xl text-white text-xl font-light active:scale-92"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                onClick={() => {
                  if (k === '⌫') { setPin(p => p.slice(0,-1)); return; }
                  const next = (pin + k).slice(0,4);
                  setPin(next);
                  if (next.length === 4) { setTimeout(() => { setUnlocked(true); setPin(''); }, 200); }
                }}>{k}</button>
            );
          })}
        </div>
        <p className="text-white/20 text-[12px]">Default PIN: any 4 digits</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <Shield size={16} className="text-indigo-400" />
        <h1 className="text-white font-semibold text-[15px] flex-1">Cipher Vault</h1>
        <button className="p-1.5 active:opacity-60" onClick={() => setUnlocked(false)}>
          <Lock size={16} className="text-white/40" />
        </button>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
          onClick={() => setAdding(true)}>
          <Plus size={18} className="text-indigo-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {adding && (
          <div className="p-4 rounded-2xl space-y-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
            {[['site','Website / App','text'],['username','Username / Email','email'],['password','Password','password'],['note','Note (optional)','text']].map(([k,p,t]) => (
              <input key={k} className="mobile-input" type={t} placeholder={p}
                value={(form as any)[k]} onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
                style={{ fontSize: '14px', padding: '10px 14px' }} />
            ))}
            <button className="text-indigo-400/70 text-[13px] flex items-center gap-1.5"
              onClick={() => setForm(f => ({...f, password: genPassword()}))}>
              <Key size={13} /> Generate password
            </button>
            <div className="flex gap-2">
              {COLORS.map(c => <button key={c} className="w-6 h-6 rounded-full border-2" style={{ background: c, borderColor: form.color===c?'white':'transparent' }} onClick={() => setForm(f=>({...f,color:c}))} />)}
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" style={{ background: '#6366f1' }} onClick={addEntry}>Save Entry</button>
              <button className="btn-secondary px-4" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        )}

        {entries.length === 0 && !adding ? (
          <div className="flex flex-col items-center justify-center h-48 text-white/20 gap-3">
            <Key size={36} strokeWidth={1.5} />
            <p className="text-[14px]">No saved credentials</p>
          </div>
        ) : entries.map(e => (
          <div key={e.id} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${e.color}20` }}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: e.color+'20' }}>
                  <span className="text-white font-bold text-[13px]">{e.site[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-[14px]">{e.site}</p>
                  <p className="text-white/40 text-[12px]">{e.username}</p>
                </div>
              </div>
              <button className="p-1 active:opacity-60" onClick={() => upd(entries.filter(x=>x.id!==e.id))}>
                <Trash2 size={14} className="text-white/25" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <span className="flex-1 font-mono text-[13px] text-white/60">
                {visible.has(e.id) ? e.password : '••••••••••••'}
              </span>
              <button onClick={() => setVisible(s => { const n=new Set(s); s.has(e.id)?n.delete(e.id):n.add(e.id); return n; })}>
                {visible.has(e.id) ? <EyeOff size={15} className="text-white/40" /> : <Eye size={15} className="text-white/40" />}
              </button>
              <button onClick={() => copy(e.password, e.id)}>
                {copied===e.id ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} className="text-white/40" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
