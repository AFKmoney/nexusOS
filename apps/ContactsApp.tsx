import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Mail, Phone, MapPin, Trash2, Edit3, ShieldCheck, Star } from 'lucide-react';
import { useOS } from '../store/osStore';
import { uuid } from '../utils/uuid';

interface Contact { id: string; name: string; email: string; phone: string; tags: string[]; favorite: boolean; }
const LS_KEY = 'nexus_contacts_v2';

export default function ContactsApp() {
  const { addNotification } = useOS();
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', name: 'Philippe-Antoine Robert', email: 'creator@nexus.os', phone: '+1 048 000 000', tags: ['CREATOR', 'ROOT'], favorite: true },
      { id: '2', name: 'DAEMON Core', email: 'ai@nexus.os', phone: 'LOCAL_PIPE_01', tags: ['AI', 'SYSTEM'], favorite: true },
    ];
  });

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(contacts));
  }, [contacts]);

  const addContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim()) return;
    const c: Contact = { 
      id: uuid(), 
      name: newContact.name, 
      email: newContact.email, 
      phone: newContact.phone, 
      tags: ['NODE'], 
      favorite: false 
    };
    setContacts(prev => [...prev, c]);
    setNewContact({ name: '', email: '', phone: '' });
    setShowAdd(false);
    addNotification({ title: 'Node Registered', message: `${c.name} added to local matrix.`, type: 'success' });
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const toggleFavorite = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, favorite: !c.favorite } : c));
  };

  const filtered = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (a.favorite === b.favorite ? 0 : a.favorite ? -1 : 1));

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Users size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Node Directory</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Participant Uplink Registry</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105">
          <UserPlus size={14} /> Register Node
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / Search */}
        <div className="w-72 border-r border-white/5 flex flex-col shrink-0 bg-black/20">
          <div className="p-4 border-b border-white/5">
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 text-zinc-600 group-focus-within:text-blue-400 transition-colors" size={14} />
              <input 
                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                placeholder="Search nodes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filtered.map(c => (
              <button 
                key={c.id}
                onClick={() => toggleFavorite(c.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${c.favorite ? 'bg-blue-500 text-black shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-zinc-800 text-zinc-400 border border-white/5'}`}>
                  {c.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-zinc-200 truncate group-hover:text-white transition-colors">{c.name}</div>
                  <div className="text-[10px] text-zinc-600 truncate">{c.tags[0]}</div>
                </div>
                {c.favorite && <Star size={12} className="text-blue-400 fill-current" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 relative">
          <div className="max-w-2xl mx-auto">
            {showAdd ? (
              <form onSubmit={addContact} className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 animate-in zoom-in-95 duration-200">
                <h2 className="text-xl font-black uppercase tracking-widest mb-8 text-white">Register New Entity</h2>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Display Name</label>
                    <input required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Email Hash</label>
                      <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Communication ID</label>
                      <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none" value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="submit" className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95">Verify & Add</button>
                    <button type="button" onClick={() => setShowAdd(false)} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">Cancel</button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-8">
                {filtered.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {filtered.map(c => (
                      <div key={c.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-6">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl border-4 border-[#050508] shadow-2xl ${c.favorite ? 'bg-gradient-to-br from-blue-400 to-indigo-600 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                            {c.name[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-black text-white">{c.name}</h3>
                              <div className="flex gap-1">
                                {c.tags.map(t => (
                                  <span key={t} className="text-[8px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase tracking-tighter">{t}</span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1.5 text-zinc-500 text-xs"><Mail size={12}/> {c.email}</div>
                              <div className="flex items-center gap-1.5 text-zinc-500 text-xs"><Phone size={12}/> {c.phone}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => toggleFavorite(c.id)} className={`p-2 rounded-xl transition-all ${c.favorite ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}><Star size={18} fill={c.favorite ? 'currentColor' : 'none'} /></button>
                          <button onClick={() => deleteContact(c.id)} className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center opacity-20">
                    <Users size={64} className="mx-auto mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest">Directory data empty</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
