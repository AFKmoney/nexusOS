import React, { useState } from 'react';
import { ChevronLeft, Search, Phone, MessageCircle, Mail, Plus, User } from 'lucide-react';
import type { MobileAppProps } from '../types';

const CONTACTS = [
  { id: '1', name: 'Alice Chen', phone: '+1 555-0101', email: 'alice@nexusos.ai', color: '#10b981', initials: 'AC' },
  { id: '2', name: 'Bob Martin', phone: '+1 555-0102', email: 'bob@nexusos.ai', color: '#6366f1', initials: 'BM' },
  { id: '3', name: 'Carol Smith', phone: '+1 555-0103', email: 'carol@nexusos.ai', color: '#f59e0b', initials: 'CS' },
  { id: '4', name: 'DAEMON', phone: 'Neural Link', email: 'daemon@nexusos.ai', color: '#10b981', initials: 'DA' },
  { id: '5', name: 'Eva Müller', phone: '+1 555-0105', email: 'eva@nexusos.ai', color: '#ec4899', initials: 'EM' },
  { id: '6', name: 'Frank Lee', phone: '+1 555-0106', email: 'frank@nexusos.ai', color: '#06b6d4', initials: 'FL' },
];

export default function MobileContacts({ onBack }: MobileAppProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<typeof CONTACTS[0] | null>(null);

  const filtered = CONTACTS.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.phone.includes(query) ||
    c.email.includes(query)
  );

  const grouped: Record<string, typeof CONTACTS> = {};
  filtered.forEach(c => {
    const l = c.name[0].toUpperCase();
    if (!grouped[l]) grouped[l] = [];
    grouped[l].push(c);
  });

  if (selected) {
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={() => setSelected(null)}>
            <ChevronLeft size={22} className="text-white" />
          </button>
          <h1 className="text-white font-semibold text-[16px] flex-1">Contact</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center py-8 px-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
              style={{ background: selected.color + '25', border: `2px solid ${selected.color}40` }}>
              <span className="text-white text-2xl font-semibold">{selected.initials}</span>
            </div>
            <h2 className="text-white text-xl font-bold">{selected.name}</h2>
            <p className="text-white/40 text-[13px] mt-1">Contact</p>
          </div>
          <div className="flex justify-center gap-6 px-6 mb-6">
            {[
              { icon: Phone, label: 'Call', color: '#10b981' },
              { icon: MessageCircle, label: 'Message', color: '#6366f1' },
              { icon: Mail, label: 'Email', color: '#f59e0b' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                  style={{ background: color + '20', border: `1px solid ${color}30` }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <span className="text-white/50 text-[12px]">{label}</span>
              </div>
            ))}
          </div>
          <div className="px-4 space-y-2">
            {[
              { label: 'Phone', value: selected.phone },
              { label: 'Email', value: selected.email },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-white/40 text-[12px] mb-1">{label}</p>
                <p className="text-white text-[15px]">{value}</p>
              </div>
            ))}
          </div>
        </div>
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
        <h1 className="text-white font-semibold text-[16px] flex-1">Contacts</h1>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <Plus size={18} className="text-emerald-400" />
        </button>
      </div>
      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={15} className="text-white/40" />
          <input className="flex-1 bg-transparent text-white text-[14px] outline-none placeholder:text-white/30"
            placeholder="Search contacts..." value={query} onChange={e => setQuery(e.target.value)}
            style={{ fontSize: '16px', userSelect: 'text', WebkitUserSelect: 'text' }} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {Object.keys(grouped).sort().map(letter => (
          <div key={letter}>
            <p className="text-white/40 text-[12px] font-semibold uppercase tracking-wider py-2 mt-2">{letter}</p>
            {grouped[letter].map(contact => (
              <div key={contact.id} className="flex items-center gap-3 p-3 rounded-2xl mb-1 cursor-pointer active:bg-white/5 transition-all"
                onClick={() => setSelected(contact)}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: contact.color + '25', border: `1px solid ${contact.color}40` }}>
                  <span className="text-white text-[13px] font-semibold">{contact.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[15px] font-medium">{contact.name}</p>
                  <p className="text-white/40 text-[12px]">{contact.phone}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
