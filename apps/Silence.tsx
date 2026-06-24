
import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../store/osStore';
import { vfs } from '../kernel/fileSystem';
import { 
  Lock, Unlock, Plus, Copy, Eye, EyeOff, Trash2, 
  Shield, Key, Save, RefreshCw, Search, CheckCircle2, 
  LogOut, Server, CreditCard, FileText
} from 'lucide-react';
import { uuid } from '../utils/uuid';

// --- CRYPTO UTILS ---

async function generateKey(password: string, salt: Uint8Array) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", 
    enc.encode(password), 
    { name: "PBKDF2" }, 
    false, 
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
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
  const enc = new TextEncoder();
  const encoded = enc.encode(JSON.stringify(data));
  
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoded
  );

  // Pack: salt + iv + ciphertext
  const buffer = new Uint8Array(salt.byteLength + iv.byteLength + ciphertext.byteLength);
  buffer.set(salt, 0);
  buffer.set(iv, salt.byteLength);
  buffer.set(new Uint8Array(ciphertext), salt.byteLength + iv.byteLength);

  return btoa(String.fromCharCode(...buffer));
}

async function decryptData(packed: string, password: string): Promise<any> {
  try {
    const binary = atob(packed);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);

    const salt = buffer.slice(0, 16);
    const iv = buffer.slice(16, 28);
    const data = buffer.slice(28);

    const key = await generateKey(password, salt);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  } catch (e) {
    throw new Error("Decryption failed");
  }
}

// --- TYPES ---

interface VaultItem {
  id: string;
  title: string;
  username?: string;
  secret: string;
  category: 'login' | 'card' | 'note' | 'api';
  url?: string;
  updated: number;
}

interface VaultData {
  version: 1;
  items: VaultItem[];
}

// --- COMPONENTS ---

export default function CipherVaultApp({ windowId }: { windowId: string }) {
  const { addNotification } = useOS();
  const VAULT_PATH = '/home/user/.vault';

  // State
  const [locked, setLocked] = useState(true);
  const [hasVault, setHasVault] = useState(false);
  const [password, setPassword] = useState('');
  const [vaultData, setVaultData] = useState<VaultData>({ version: 1, items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // UI State
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);

  // New Item Form
  const [formData, setFormData] = useState<Partial<VaultItem>>({});
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    const exists = vfs.stat(VAULT_PATH);
    setHasVault(!!exists);
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!hasVault) {
        // Create New
        const initialData: VaultData = { version: 1, items: [] };
        const encrypted = await encryptData(initialData, password);
        vfs.writeFile(VAULT_PATH, encrypted);
        setVaultData(initialData);
        setHasVault(true);
        setLocked(false);
        addNotification({ title: 'Vault Created', message: 'Master password set successfully.', type: 'success' });
      } else {
        // Unlock Existing
        const content = vfs.readFile(VAULT_PATH);
        if (!content) throw new Error("Vault file corrupted");
        const data = await decryptData(content, password);
        setVaultData(data);
        setLocked(false);
        addNotification({ title: 'Vault Unlocked', message: 'Identity verified.', type: 'success' });
      }
    } catch (e) {
      setError("Invalid Password or Corrupted Data");
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const saveVault = async (newData: VaultData) => {
      setLoading(true);
      try {
          const encrypted = await encryptData(newData, password);
          vfs.writeFile(VAULT_PATH, encrypted);
          setVaultData(newData);
      } catch (e) {
          addNotification({ title: 'Save Failed', message: 'Could not encrypt data.', type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleCreate = () => {
      const newItem: VaultItem = {
          id: uuid(),
          title: formData.title || 'Untitled',
          username: formData.username || '',
          secret: formData.secret || '',
          category: (formData.category as any) || 'login',
          url: formData.url || '',
          updated: Date.now()
      };
      const newData = { ...vaultData, items: [...vaultData.items, newItem] };
      saveVault(newData);
      setView('list');
      setFormData({});
      addNotification({ title: 'Entry Added', message: 'Credentials secured.', type: 'success' });
  };

  const handleDelete = (id: string) => {
      if (confirm("Permanently delete this item?")) {
          const newData = { ...vaultData, items: vaultData.items.filter(i => i.id !== id) };
          saveVault(newData);
          setView('list');
          setSelectedItem(null);
      }
  };

  const generatePassword = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
      let pass = "";
      for (let i = 0; i < 16; i++) {
          pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setFormData(prev => ({ ...prev, secret: pass }));
      setShowSecret(true);
  };

  const copyToClipboard = (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      addNotification({ title: 'Copied', message: `${label} copied to clipboard.`, type: 'info' });
  };

  // --- RENDERERS ---

  if (locked) {
      return (
          <div className="h-full flex flex-col items-center justify-center bg-zinc-950 text-white p-8">
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800 shadow-2xl">
                  <Shield size={32} className="text-emerald-500" />
              </div>
              
              <h1 className="text-2xl font-bold mb-2">Cipher Vault</h1>
              <p className="text-zinc-500 mb-8 text-center text-base max-w-xs">
                  {hasVault 
                    ? "Enter your Master Password to decrypt your secure storage." 
                    : "Initialize your secure vault. Choose a Master Password carefully; it cannot be recovered."}
              </p>

              <form onSubmit={handleUnlock} className="w-full max-w-xs space-y-4">
                  <div className="relative group">
                      <Lock size={16} className="absolute left-3 top-3 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                      <input 
                        type="password" 
                        autoFocus
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-base outline-none focus:border-emerald-500/50 focus:bg-zinc-900 transition-all text-center tracking-widest"
                        placeholder="Master Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                  </div>
                  
                  {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                  <button 
                    disabled={loading || !password}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {loading ? <RefreshCw className="animate-spin" size={16} /> : (hasVault ? <Unlock size={16} /> : <Save size={16} />)}
                      {hasVault ? "Decrypt & Unlock" : "Initialize Vault"}
                  </button>
              </form>
          </div>
      );
  }

  const filteredItems = vaultData.items.filter(item => {
      if (filter !== 'all' && item.category !== filter) return false;
      if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
  });

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-200 font-sans">
        
        {/* Navbar */}
        <div className="h-12 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-900/50 shrink-0">
            <div className="flex items-center gap-2 font-bold text-emerald-500">
                <Shield size={18} />
                <span>Cipher Vault</span>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setLocked(true)} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Lock">
                    <LogOut size={16} />
                </button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-16 md:w-48 border-r border-zinc-800 bg-black/20 flex flex-col">
                <div className="p-3 space-y-1">
                    {[
                        { id: 'all', icon: Server, label: 'All Items' },
                        { id: 'login', icon: Key, label: 'Logins' },
                        { id: 'card', icon: CreditCard, label: 'Cards' },
                        { id: 'note', icon: FileText, label: 'Notes' },
                    ].map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => { setFilter(cat.id); setView('list'); setSelectedItem(null); }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                ${filter === cat.id ? 'bg-emerald-900/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}
                            `}
                        >
                            <cat.icon size={16} />
                            <span className="hidden md:inline">{cat.label}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-auto p-3">
                    <button 
                        onClick={() => { setView('create'); setFormData({}); setShowSecret(false); }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        <Plus size={16} /> <span className="hidden md:inline font-bold text-sm">New Item</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
                
                {/* Search Bar */}
                {view === 'list' && (
                    <div className="p-4 pb-2">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-2.5 text-zinc-600" />
                            <input 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-base outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-600"
                                placeholder="Search vault..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* List View */}
                {view === 'list' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {filteredItems.map(item => (
                            <div 
                                key={item.id}
                                onClick={() => { setSelectedItem(item); setView('detail'); }}
                                className="bg-zinc-900/50 border border-zinc-800/50 p-3 rounded-xl hover:bg-zinc-900 hover:border-zinc-700 cursor-pointer transition-all group flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                        ${item.category === 'login' ? 'bg-blue-900/20 text-blue-400' : 
                                          item.category === 'card' ? 'bg-purple-900/20 text-purple-400' : 
                                          'bg-zinc-800 text-zinc-400'}
                                    `}>
                                        {item.category === 'login' ? <Key size={18} /> : 
                                         item.category === 'card' ? <CreditCard size={18} /> : 
                                         <FileText size={18} />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-base text-zinc-200">{item.title}</div>
                                        <div className="text-sm text-zinc-500">{item.username || 'No Identity'}</div>
                                    </div>
                                </div>
                                <div className="text-zinc-600 group-hover:text-emerald-500 transition-colors">
                                    <Eye size={16} />
                                </div>
                            </div>
                        ))}
                        {filteredItems.length === 0 && (
                            <div className="text-center text-zinc-600 py-10 text-base">No items found in {filter}</div>
                        )}
                    </div>
                )}

                {/* Detail View */}
                {view === 'detail' && selectedItem && (
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-md mx-auto space-y-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">{selectedItem.title}</h2>
                                <button onClick={() => setView('list')} className="text-zinc-500 hover:text-white text-sm">Close</button>
                            </div>

                            <div className="space-y-4">
                                {selectedItem.username && (
                                    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                        <label className="text-sm text-zinc-500 uppercase tracking-widest block mb-1">Identity</label>
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-emerald-400">{selectedItem.username}</span>
                                            <button onClick={() => copyToClipboard(selectedItem.username!, 'Username')} className="text-zinc-500 hover:text-white">
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                    <label className="text-sm text-zinc-500 uppercase tracking-widest block mb-1">Secret</label>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="font-mono text-white truncate">
                                            {showSecret ? selectedItem.secret : '••••••••••••••••'}
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => setShowSecret(!showSecret)} className="text-zinc-500 hover:text-white">
                                                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                            <button onClick={() => copyToClipboard(selectedItem.secret, 'Secret')} className="text-zinc-500 hover:text-white">
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {selectedItem.url && (
                                    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                        <label className="text-sm text-zinc-500 uppercase tracking-widest block mb-1">Target</label>
                                        <a href={selectedItem.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-base truncate block">
                                            {selectedItem.url}
                                        </a>
                                    </div>
                                )}

                                <div className="pt-8">
                                    <button 
                                        onClick={() => handleDelete(selectedItem.id)}
                                        className="w-full border border-red-900/50 text-red-500 hover:bg-red-950/30 py-3 rounded-lg text-base font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Trash2 size={16} /> Delete Entry
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create View */}
                {view === 'create' && (
                     <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-md mx-auto space-y-4">
                            <h2 className="text-xl font-bold text-white mb-6">New Secure Entry</h2>
                            
                            <div className="space-y-1">
                                <label className="text-sm text-zinc-500">Title</label>
                                <input 
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-base outline-none focus:border-emerald-500" 
                                    placeholder="e.g. Google Account"
                                    value={formData.title || ''}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-zinc-500">Category</label>
                                    <select 
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-base outline-none"
                                        value={formData.category || 'login'}
                                        onChange={e => setFormData({...formData, category: e.target.value as any})}
                                    >
                                        <option value="login">Login</option>
                                        <option value="card">Card</option>
                                        <option value="note">Note</option>
                                        <option value="api">API Key</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-zinc-500">Identity / Username</label>
                                    <input 
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-base outline-none focus:border-emerald-500" 
                                        placeholder="e.g. user@email.com"
                                        value={formData.username || ''}
                                        onChange={e => setFormData({...formData, username: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-zinc-500 flex justify-between">
                                    <span>Secret / Password</span>
                                    <button onClick={generatePassword} className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 font-bold">
                                        <RefreshCw size={14} /> Generate
                                    </button>
                                </label>
                                <div className="relative">
                                    <input 
                                        type={showSecret ? "text" : "password"}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-base outline-none focus:border-emerald-500 font-mono text-emerald-400" 
                                        placeholder="••••••••"
                                        value={formData.secret || ''}
                                        onChange={e => setFormData({...formData, secret: e.target.value})}
                                    />
                                    <button 
                                        onClick={() => setShowSecret(!showSecret)}
                                        className="absolute right-3 top-2.5 text-zinc-600 hover:text-zinc-300"
                                    >
                                        {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-zinc-500">Target URL (Optional)</label>
                                <input 
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-base outline-none focus:border-emerald-500" 
                                    placeholder="https://..."
                                    value={formData.url || ''}
                                    onChange={e => setFormData({...formData, url: e.target.value})}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button onClick={() => setView('list')} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-base font-medium">Cancel</button>
                                <button onClick={handleCreate} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-base font-bold shadow-lg shadow-emerald-900/20">Save Entry</button>
                            </div>
                        </div>
                     </div>
                )}

            </div>
        </div>
    </div>
  );
}
