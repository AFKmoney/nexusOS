import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, Plus, Copy, Eye, EyeOff, Trash2, 
  Shield, Key, Save, RefreshCw, Search, CheckCircle2, 
  LogOut, Server, CreditCard, FileText, ChevronLeft, MoreVertical, X
} from 'lucide-react';
import { vfs } from '../../kernel/fileSystem';
import { useMobile } from '../store/mobileStore';
import type { MobileAppProps } from '../types';

// --- CRYPTO UTILS ---
async function generateKey(password: string, salt: Uint8Array) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(data: object, password: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await generateKey(password, salt);
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, encoded);
  const buffer = new Uint8Array(salt.byteLength + iv.byteLength + ciphertext.byteLength);
  buffer.set(salt, 0); buffer.set(iv, salt.byteLength); buffer.set(new Uint8Array(ciphertext), salt.byteLength + iv.byteLength);
  return btoa(String.fromCharCode(...buffer));
}

async function decryptData(packed: string, password: string): Promise<any> {
  try {
    const binary = atob(packed);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
    const salt = buffer.slice(0, 16); const iv = buffer.slice(16, 28); const data = buffer.slice(28);
    const key = await generateKey(password, salt);
    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (e) { throw new Error("Decryption failed"); }
}

export default function MobileSilenceApp({ onBack }: MobileAppProps) {
  const { addNotification } = useMobile();
  const VAULT_PATH = '/home/user/.vault';

  const [locked, setLocked] = useState(true);
  const [hasVault, setHasVault] = useState(false);
  const [password, setPassword] = useState('');
  const [vaultData, setVaultData] = useState<{ items: any[] }>({ items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    setHasVault(!!vfs.stat(VAULT_PATH));
  }, []);

  const handleUnlock = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true); setError('');
    try {
      if (!hasVault) {
        const initialData = { version: 1, items: [] };
        vfs.writeFile(VAULT_PATH, await encryptData(initialData, password));
        setVaultData(initialData); setHasVault(true); setLocked(false);
      } else {
        const content = vfs.readFile(VAULT_PATH);
        if (!content) throw new Error("Corrupted");
        setVaultData(await decryptData(content, password));
        setLocked(false);
      }
    } catch (e) { setError("Invalid Identity Key"); setPassword(''); }
    finally { setLoading(false); }
  };

  const saveVault = async (newData: any) => {
    try {
      vfs.writeFile(VAULT_PATH, await encryptData(newData, password));
      setVaultData(newData);
    } catch (e) { addNotification({ title: 'Vault Error', message: 'Sync failed', type: 'error' }); }
  };

  const handleCreate = () => {
    const newItem = { id: Math.random().toString(36).slice(2), ...formData, updated: Date.now() };
    saveVault({ ...vaultData, items: [...vaultData.items, newItem] });
    setView('list'); setFormData({});
  };

  if (locked) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#050508] p-8 text-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-[24px] border border-emerald-500/20 flex items-center justify-center mb-8 shadow-2xl">
          <Shield size={40} className="text-emerald-400" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-white mb-2">Cipher Vault</h1>
        <p className="text-zinc-500 text-sm mb-10 leading-relaxed max-w-[260px]">
          {hasVault ? "Biometric or passphrase required to decrypt neural vault." : "Initialize your secure container. This cannot be recovered."}
        </p>
        <form onSubmit={handleUnlock} className="w-full space-y-4">
          <input 
            type="password" autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 text-center text-xl outline-none focus:border-emerald-500/50 transition-all text-white placeholder:text-white/10"
            placeholder="Identity Key" value={password} onChange={e => setPassword(e.target.value)}
          />
          {error && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest">{error}</p>}
          <button disabled={loading || !password} className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl uppercase tracking-widest active:scale-95 transition-all disabled:opacity-30">
            {loading ? <RefreshCw className="animate-spin mx-auto" /> : (hasVault ? "Unlock Vault" : "Secure Initial State")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-300">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-black/40">
        <button onClick={view === 'list' ? onBack : () => setView('list')}><ChevronLeft size={24} /></button>
        <h2 className="flex-1 font-bold uppercase tracking-widest text-[14px]">
          {view === 'create' ? 'New Entry' : view === 'detail' ? selectedItem.title : 'Vault'}
        </h2>
        <button onClick={() => setLocked(true)} className="p-2 opacity-40"><Lock size={18} /></button>
      </div>

      {view === 'list' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="relative mb-6">
            <Search size={16} className="absolute left-4 top-3.5 text-white/20" />
            <input className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:bg-white/10" placeholder="Search secrets..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {vaultData.items.filter(i => i.title.toLowerCase().includes(search.toLowerCase())).map(item => (
            <button key={item.id} onClick={() => { setSelectedItem(item); setView('detail'); }} className="w-full flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl active:bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Key size={20} /></div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-white truncate">{item.title}</p>
                <p className="text-[10px] text-zinc-500 truncate">{item.username || 'No Identity'}</p>
              </div>
            </button>
          ))}
          <button onClick={() => setView('create')} className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-500 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center text-black active:scale-90 transition-all"><Plus size={28} /></button>
        </div>
      )}

      {view === 'create' && (
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Service Title</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-emerald-500/40" placeholder="e.g. GitHub" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Identity</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-emerald-500/40" placeholder="Username / Email" value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Secret Key</label>
            <div className="relative">
              <input className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-emerald-500/40 font-mono text-emerald-400" type={showSecret ? "text" : "password"} value={formData.secret || ''} onChange={e => setFormData({...formData, secret: e.target.value})} />
              <button onClick={() => setShowSecret(!showSecret)} className="absolute right-4 top-4 text-white/20">{showSecret ? <EyeOff size={20} /> : <Eye size={20} />}</button>
            </div>
          </div>
          <button onClick={handleCreate} className="w-full bg-emerald-500 py-4 rounded-2xl text-black font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20">Secure Entry</button>
        </div>
      )}

      {view === 'detail' && selectedItem && (
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[32px] space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto"><Key size={32} /></div>
            <h3 className="text-xl font-bold text-white">{selectedItem.title}</h3>
            <div className="space-y-4 text-left">
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <label className="text-[9px] text-zinc-600 uppercase font-black mb-1 block">Identity</label>
                <div className="flex justify-between items-center"><span className="text-zinc-300 font-mono">{selectedItem.username || '—'}</span><button onClick={() => navigator.clipboard.writeText(selectedItem.username)}><Copy size={16} className="text-zinc-600" /></button></div>
              </div>
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <label className="text-[9px] text-zinc-600 uppercase font-black mb-1 block">Secret</label>
                <div className="flex justify-between items-center"><span className="text-emerald-400 font-mono">{showSecret ? selectedItem.secret : '••••••••••••'}</span><div className="flex gap-3"><button onClick={() => setShowSecret(!showSecret)}>{showSecret ? <EyeOff size={16} /> : <Eye size={16} />}</button><button onClick={() => navigator.clipboard.writeText(selectedItem.secret)}><Copy size={16} /></button></div></div>
              </div>
            </div>
            <button onClick={() => { if(confirm("Purge secret?")) { saveVault({ ...vaultData, items: vaultData.items.filter(i => i.id !== selectedItem.id) }); setView('list'); } }} className="text-rose-500/50 text-[10px] font-black uppercase tracking-widest pt-4"><Trash2 size={14} className="inline mr-2" /> Purge Entry</button>
          </div>
        </div>
      )}
    </div>
  );
}
