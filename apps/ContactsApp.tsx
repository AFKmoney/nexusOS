import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Trash2, Mail, Phone, User, Edit2, Check, X } from 'lucide-react';
import { uuid } from '../utils/uuid';

interface Contact { id: string; name: string; email: string; phone: string; company: string; avatar: string; }
const LS_KEY = 'nexus_contacts';
const AVATARS = ['🧑‍💻','👩‍🔬','🧑‍🎨','👨‍🚀','👩‍💼','🧙','🦊','🐱','🤖','👽'];

export default function ContactsApp() {
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
  });
  const [selected, setSelected] = useState<string|null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(contacts)); }, [contacts]);

  const add = () => {
    const c: Contact = { id: uuid(), name: 'New Contact', email: '', phone: '', company: '', avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)] };
    setContacts(prev => [...prev, c]);
    setSelected(c.id);
    setEditing(true);
  };

  const update = (id: string, patch: Partial<Contact>) => setContacts(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  const remove = (id: string) => { setContacts(prev => prev.filter(c => c.id !== id)); if (selected === id) setSelected(null); };

  const current = contacts.find(c => c.id === selected);
  const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="h-full flex bg-[#050508] text-zinc-100">
      {/* List */}
      <div className="w-60 border-r border-white/5 flex flex-col shrink-0">
        <div className="p-3 border-b border-white/5 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={12} className="absolute left-2 top-2 text-zinc-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="w-full bg-zinc-900 rounded-lg pl-7 pr-2 py-1.5 text-xs outline-none border border-white/5 focus:border-emerald-500/50" />
          </div>
          <button onClick={add} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition"><Plus size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sorted.map(c => (
            <button key={c.id} onClick={() => { setSelected(c.id); setEditing(false); }}
              className={`w-full text-left px-3 py-2.5 border-b border-white/5 flex items-center gap-2 transition ${selected === c.id ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}>
              <span className="text-lg">{c.avatar}</span>
              <div className="min-w-0">
                <div className="text-sm text-white truncate">{c.name}</div>
                {c.email && <div className="text-[10px] text-zinc-600 truncate">{c.email}</div>}
              </div>
            </button>
          ))}
          {sorted.length === 0 && <div className="p-4 text-xs text-zinc-600 text-center">No contacts</div>}
        </div>
        <div className="p-2 border-t border-white/5 text-[10px] text-zinc-600 text-center">{contacts.length} contacts</div>
      </div>

      {/* Detail */}
      {current ? (
        <div className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{current.avatar}</span>
              {editing ? (
                <input value={current.name} onChange={e => update(current.id, { name: e.target.value })} className="text-xl font-bold bg-transparent outline-none border-b border-emerald-500/50 text-white" />
              ) : (
                <div className="text-xl font-bold text-white">{current.name}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(!editing)} className={`p-1.5 rounded-lg transition ${editing ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                {editing ? <Check size={14} /> : <Edit2 size={14} />}
              </button>
              <button onClick={() => remove(current.id)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg transition"><Trash2 size={14} /></button>
            </div>
          </div>
          {[
            { icon: Mail, label: 'Email', field: 'email' as const },
            { icon: Phone, label: 'Phone', field: 'phone' as const },
            { icon: Users, label: 'Company', field: 'company' as const },
          ].map(f => (
            <div key={f.field} className="flex items-center gap-3 mb-3 p-3 bg-white/5 rounded-xl border border-white/5">
              <f.icon size={16} className="text-zinc-500" />
              {editing ? (
                <input value={current[f.field]} onChange={e => update(current.id, { [f.field]: e.target.value })} placeholder={f.label} className="flex-1 bg-transparent text-sm outline-none text-white" />
              ) : (
                <span className="text-sm text-zinc-300">{current[f.field] || <span className="text-zinc-600 italic">Not set</span>}</span>
              )}
            </div>
          ))}
          {editing && (
            <div className="mt-4">
              <div className="text-xs text-zinc-500 mb-2">Avatar</div>
              <div className="flex gap-2 flex-wrap">
                {AVATARS.map(a => (
                  <button key={a} onClick={() => update(current.id, { avatar: a })} className={`text-2xl p-1 rounded-lg transition ${current.avatar === a ? 'bg-emerald-500/20 ring-1 ring-emerald-500' : 'hover:bg-white/5'}`}>{a}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-600">
          <div className="text-center"><Users size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Select or create a contact</p></div>
        </div>
      )}
    </div>
  );
}
