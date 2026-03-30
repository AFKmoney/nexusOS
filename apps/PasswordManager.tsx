import React, { useState, useEffect } from 'react';
import { Lock, Shield, Key, Eye, EyeOff, Copy, Trash2, Plus, Search, ExternalLink, RefreshCw, Check } from 'lucide-react';
import { useOS } from '../store/osStore';
import { uuid } from '../utils/uuid';

interface Entry { id: string; site: string; username: string; pass: string; url: string; }
const LS_KEY = 'nexus_vault_v2';

export default function PasswordManager() {
  const { addNotification } = useOS();
  const [entries, setEntries] = useState<Entry[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', site: 'GitHub', username: 'afkmoney', pass: '********', url: 'https://github.com' },
      { id: '2', site: 'Nexus Registry', username: 'daemon_core', pass: '********', url: 'https://nexus.os' },
    ];
  });

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showPass, setShowPass] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState({ site: '', username: '', pass: '', url: '' });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(entries));
  }, [entries]);

  const addEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.site.trim()) return;
    const entry: Entry = { ...newEntry, id: uuid() };
    setEntries([entry, ...entries]);
    setNewEntry({ site: '', username: '', pass: '', url: '' });
    setShowAdd(false);
    addNotification({ title: 'Vault Updated', message: `Credential for ${entry.site} secured.`, type: 'success' });
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = entries.filter(e => e.site.toLowerCase().includes(search.toLowerCase()) || e.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
            <Lock size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Cipher Vault</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">AES-GCM Encrypted Node Credentials</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95">
          <Plus size={14} /> New Cipher
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / Search */}
        <div className="w-72 border-r border-white/5 flex flex-col shrink-0 bg-black/20">
          <div className="p-4 border-b border-white/5">
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 text-zinc-600 group-focus-within:text-amber-400 transition-colors" size={14} />
              <input 
                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700 font-mono"
                placeholder="Search vault..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filtered.map(e => (
              <div key={e.id} className="p-3 rounded-xl hover:bg-white/5 transition-all text-left group flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-zinc-200 truncate group-hover:text-white transition-colors">{e.site}</div>
                  <div className="text-[9px] text-zinc-600 truncate font-mono uppercase tracking-tighter">{e.username}</div>
                </div>
                <Shield size={12} className="text-zinc-800 group-hover:text-amber-500/40 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-[#0a0a0c]">
          <div className="max-w-3xl mx-auto">
            {showAdd ? (
              <form onSubmit={addEntry} className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 animate-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-xl font-black uppercase tracking-widest mb-8 text-white">Secure New Credentials</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Service / Site Name</label>
                    <input required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500/50 outline-none" value={newEntry.site} onChange={e => setNewEntry({...newEntry, site: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Identity / Username</label>
                    <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500/50 outline-none" value={newEntry.username} onChange={e => setNewEntry({...newEntry, username: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Cipher / Password</label>
                    <input type="password" required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500/50 outline-none" value={newEntry.pass} onChange={e => setNewEntry({...newEntry, pass: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Service URL</label>
                    <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500/50 outline-none" value={newEntry.url} onChange={e => setNewEntry({...newEntry, url: e.target.value})} />
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button type="submit" className="flex-1 py-4 bg-amber-600 hover:bg-amber-500 text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95">Encrypt & Store</button>
                  <button type="button" onClick={() => setShowAdd(false)} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filtered.map(e => (
                  <div key={e.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.04] transition-all group">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 text-amber-400">
                          <Key size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white">{e.site}</h3>
                          <a href={e.url} className="text-[10px] text-zinc-600 hover:text-amber-400 transition-colors font-mono">{e.url}</a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => deleteEntry(e.id)} className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={18} /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/40 rounded-2xl p-4 border border-white/5 relative">
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Identity</span>
                        <div className="text-sm font-mono text-zinc-300">{e.username}</div>
                        <button onClick={() => copyToClipboard(e.username, e.id + '_u')} className="absolute right-3 top-4 p-1.5 text-zinc-600 hover:text-white transition-colors">
                          <Copy size={14} />
                        </button>
                      </div>
                      <div className="bg-black/40 rounded-2xl p-4 border border-white/5 relative">
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Cipher</span>
                        <div className="text-sm font-mono text-zinc-300">{showPass === e.id ? e.pass : '••••••••••••'}</div>
                        <div className="absolute right-3 top-4 flex gap-1">
                          <button onClick={() => setShowPass(showPass === e.id ? null : e.id)} className="p-1.5 text-zinc-600 hover:text-white transition-colors">
                            {showPass === e.id ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button onClick={() => copyToClipboard(e.pass, e.id + '_p')} className="p-1.5 text-zinc-600 hover:text-white transition-colors">
                            {copiedId === e.id + '_p' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
