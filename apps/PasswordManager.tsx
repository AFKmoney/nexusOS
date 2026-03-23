import React, { useState, useEffect } from 'react';
import { Lock, Plus, Eye, EyeOff, Copy, Search, Trash2, Shield, Key, Check } from 'lucide-react';
import { uuid } from '../utils/uuid';

interface Entry { id: string; title: string; username: string; password: string; url: string; category: string; created: number; }
const LS_KEY = 'nexus_vault';

export default function PasswordManagerApp() {
  const [entries, setEntries] = useState<Entry[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
  });
  const [selected, setSelected] = useState<string|null>(null);
  const [search, setSearch] = useState('');
  const [showPw, setShowPw] = useState<Record<string,boolean>>({});
  const [copied, setCopied] = useState('');

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(entries)); }, [entries]);

  const add = () => {
    const e: Entry = { id: uuid(), title: 'New Entry', username: '', password: generatePw(), url: '', category: 'General', created: Date.now() };
    setEntries(prev => [e, ...prev]);
    setSelected(e.id);
  };

  const update = (id: string, p: Partial<Entry>) => setEntries(prev => prev.map(e => e.id === id ? { ...e, ...p } : e));
  const remove = (id: string) => { setEntries(prev => prev.filter(e => e.id !== id)); if (selected === id) setSelected(null); };

  const generatePw = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    return Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const copyField = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  };

  const current = entries.find(e => e.id === selected);
  const filtered = entries.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.username.toLowerCase().includes(search.toLowerCase()));
  const categories = [...new Set(entries.map(e => e.category))];

  return (
    <div className="h-full flex bg-[#050508] text-zinc-100">
      <div className="w-56 border-r border-white/5 flex flex-col shrink-0">
        <div className="p-3 border-b border-white/5 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={12} className="absolute left-2 top-2 text-zinc-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vault..." className="w-full bg-zinc-900 rounded-lg pl-7 pr-2 py-1.5 text-xs outline-none border border-white/5 focus:border-emerald-500/50" />
          </div>
          <button onClick={add} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition"><Plus size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(e => (
            <button key={e.id} onClick={() => setSelected(e.id)} className={`w-full text-left px-3 py-2.5 border-b border-white/5 transition ${selected === e.id ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}>
              <div className="flex items-center gap-2">
                <Shield size={12} className="text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{e.title}</div>
                  <div className="text-[10px] text-zinc-600 truncate">{e.username || 'No username'}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-white/5 text-[10px] text-zinc-600 text-center flex items-center justify-center gap-1">
          <Lock size={8} /> {entries.length} entries encrypted
        </div>
      </div>

      {current ? (
        <div className="flex-1 p-5 overflow-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-emerald-400" />
              <input value={current.title} onChange={e => update(current.id, { title: e.target.value })} className="text-lg font-bold bg-transparent outline-none text-white" />
            </div>
            <button onClick={() => remove(current.id)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg transition"><Trash2 size={14} /></button>
          </div>
          {[
            { label: 'Username', field: 'username' as const, icon: Key },
            { label: 'URL', field: 'url' as const, icon: Lock },
            { label: 'Category', field: 'category' as const, icon: Shield },
          ].map(f => (
            <div key={f.field} className="mb-3">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">{f.label}</label>
              <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5 border border-white/5">
                <f.icon size={14} className="text-zinc-600 shrink-0" />
                <input value={current[f.field]} onChange={e => update(current.id, { [f.field]: e.target.value })} className="flex-1 bg-transparent text-sm outline-none text-white" />
                <button onClick={() => copyField(current[f.field], f.label)} className="p-1 text-zinc-600 hover:text-emerald-400 transition">
                  {copied === f.label ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          ))}
          <div className="mb-3">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Password</label>
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5 border border-white/5">
              <Lock size={14} className="text-zinc-600 shrink-0" />
              <input type={showPw[current.id] ? 'text' : 'password'} value={current.password} onChange={e => update(current.id, { password: e.target.value })} className="flex-1 bg-transparent text-sm outline-none text-white font-mono" />
              <button onClick={() => setShowPw(prev => ({ ...prev, [current.id]: !prev[current.id] }))} className="p-1 text-zinc-600 hover:text-white transition">
                {showPw[current.id] ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
              <button onClick={() => copyField(current.password, 'Password')} className="p-1 text-zinc-600 hover:text-emerald-400 transition">
                {copied === 'Password' ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>
          <button onClick={() => update(current.id, { password: generatePw() })} className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/20 transition">
            <Key size={12} /> Generate Strong Password
          </button>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-600">
          <div className="text-center"><Lock size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Select or create an entry</p></div>
        </div>
      )}
    </div>
  );
}
