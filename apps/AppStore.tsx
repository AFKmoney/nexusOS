
import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { Download, Check, Sparkles, Box, Zap, Brain, Search, Wand2, RefreshCw, Layers, Terminal, Rocket, CheckCircle2, Code2, AlertCircle, Layout, LayoutDashboard, Database, Smartphone, Ghost } from 'lucide-react';
import { aiService } from '../services/puterService';
import { vfs } from '../kernel/fileSystem';

interface Blueprint {
    name: string;
    description: string;
    prompt: string;
    icon: any;
}

const AI_BLUEPRINTS: Blueprint[] = [
    {
        name: "Neon Snake",
        description: "Cyberpunk arcade snake with persistent high scores.",
        prompt: "Create a fully functional Snake game on HTML5 Canvas.\nStyle: Cyberpunk aesthetic (Black bg, Neon Green snake, glowing effects).\nFeatures:\n- Score tracking.\n- High Score saved to localStorage.\n- Game Over screen with Restart button.\n- Responsive controls (Arrow keys + Touch buttons).",
        icon: Box
    },
    {
        name: "Task Nexus",
        description: "Kanban-style task manager with drag-and-drop.",
        prompt: "Create a Kanban Task Manager.\nLayout: 3 Columns (To Do, In Progress, Done).\nStyle: Modern dark mode with glassmorphism panels.\nFeatures:\n- Add tasks with titles.\n- Move tasks between columns (buttons or select).\n- Delete tasks.\n- Save ALL state to localStorage instantly.\n- Status indicators.",
        icon: Check
    },
    {
        name: "Calc-X Pro",
        description: "Scientific calculator with history tape.",
        prompt: "Create a Scientific Calculator.\nStyle: Glassmorphism/Dark UI (iOS style).\nFeatures:\n- Standard operations (+,-,*,/).\n- Scientific functions (sin, cos, tan, log).\n- History tape sidebar that saves to localStorage.\n- Large legible display.",
        icon: Zap
    },
    {
        name: "Zen Notes",
        description: "Distraction-free markdown editor.",
        prompt: "Create a minimalist Text Editor.\nStyle: Clean, dark grey focus mode.\nFeatures:\n- Auto-save to localStorage on every keystroke.\n- Word count & Character count.\n- Toggle for 'Focus Mode' (hides UI).\n- Download as .txt button.",
        icon: Sparkles
    }
];

// Helper to map icon strings from AI to Lucide components
const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
        'box': Box, 'zap': Zap, 'check': Check, 'sparkles': Sparkles, 'brain': Brain,
        'terminal': Terminal, 'rocket': Rocket, 'layout': Layout, 'database': Database,
        'smartphone': Smartphone, 'ghost': Ghost, 'code': Code2
    };
    return icons[iconName.toLowerCase()] || Box;
};

interface SynthesisStatus {
    step: 'idle' | 'analyzing' | 'architecting' | 'coding' | 'mounting';
    logs: string[];
}

export default function AppStoreApp() {
    const { registry, installedApps, installApp, kernelRules, registerCustomApp, addNotification, openWindow } = useOS();
    const [activeTab, setActiveTab] = useState<'installed' | 'market' | 'lab'>('market');
    const [installing, setInstalling] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Lab State
    const [labPrompt, setLabPrompt] = useState('');
    const [synthesis, setSynthesis] = useState<SynthesisStatus>({ step: 'idle', logs: [] });

    const addLog = (msg: string) => {
        setSynthesis(prev => ({ ...prev, logs: [...prev.logs.slice(-5), `> ${msg}`] }));
    };

    const handleSynthesize = async (blueprint?: Blueprint) => {
        const promptText = blueprint ? blueprint.prompt : labPrompt;
        const appName = blueprint ? blueprint.name : (labPrompt.slice(0, 15) + "...");

        if (!promptText.trim()) return;

        setInstalling(appName);
        setSynthesis({ step: 'analyzing', logs: ["Initiating Neural Core..."] });

        try {
            addLog("Analyzing requirements...");

            const uniqueId = `gen_${Date.now()}`;
            const storageKey = `nexus_app_${uniqueId}`;

            const systemPrompt = `
            ROLE: Senior Full-Stack Creative Technologist & UI Architect.
            TASK: Build a High-Fidelity, Production-Grade Single-File HTML5 Micro-App for "NexusOS".
            
            [DESIGN SYSTEM - "NEXUS PRIME"]
            - Background: bg-neutral-950 (Deep Space).
            - Text: text-slate-200 (Primary), text-slate-400 (Secondary).
            - Accents: text-emerald-500, bg-emerald-500/10 (Cyberpunk).
            - Style: Glassmorphism, Rounded-xl, Thin borders (border-white/10).
            
            [TECHNICAL PROTOCOLS]
            1. **Tailwind CSS**: Use standard CDN.
            2. **Lucide Icons**: Use <script src="https://unpkg.com/lucide@latest"></script>.
            3. **Architecture**: All logic in one <script> tag. No 'import/export'.
            4. **Persistence**: Use 'localStorage' to save user data automatically.
            5. **Quality**: Fully functional, no placeholders, interactive cursor feedback.
            
            [USER REQUEST]
            "${promptText}"
            
            [OUTPUT FORMAT - STRICT]
            
            ---MANIFEST---
            {
              "name": "App Name",
              "description": "Brief reliable description",
              "icon": "box", 
              "defaultSize": { "width": 800, "height": 600 }
            }
            ---CODE---
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <script src="https://cdn.tailwindcss.com"></script>
              <script src="https://unpkg.com/lucide@latest"></script>
            </head>
            <body class="bg-neutral-950 text-slate-200 overflow-hidden font-sans select-none">
              <!-- Full App Interface Here -->
              <script>
                // Full Application Logic Here
                lucide.createIcons();
              </script>
            </body>
            </html>
            ---END---
          `;

            setSynthesis(prev => ({ ...prev, step: 'architecting' }));
            addLog("Architecting component structure...");

            await new Promise(r => setTimeout(r, 800));

            const result = await aiService.generateOnce(systemPrompt, { ...kernelRules, modelId: kernelRules.modelId || 'daemon-fractal' });

            setSynthesis(prev => ({ ...prev, step: 'coding' }));
            addLog("Synthesizing logic & styles...");

            let manifestPart = "";
            let codePart = "";

            const manifestMatch = result.match(/---MANIFEST---([\s\S]*?)---CODE---/);
            const codeMatch = result.match(/---CODE---([\s\S]*?)---END---/);

            if (manifestMatch && codeMatch) {
                manifestPart = manifestMatch[1].trim();
                codePart = codeMatch[1].trim();
            } else {
                const htmlMatch = result.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
                if (htmlMatch) {
                    codePart = htmlMatch[0];
                    manifestPart = JSON.stringify({
                        name: appName,
                        description: "AI Synthesized Application",
                        icon: "box",
                        defaultSize: { width: 800, height: 600 }
                    });
                } else {
                    throw new Error("Failed to parse AI response. Delimiters missing.");
                }
            }

            let manifest;
            try {
                manifest = JSON.parse(manifestPart);
            } catch (e) {
                throw new Error("Invalid Manifest JSON.");
            }

            let finalCode = codePart;
            if (!finalCode.includes('cdn.tailwindcss.com')) {
                finalCode = finalCode.replace('</head>', '<script src="https://cdn.tailwindcss.com"></script></head>');
            }
            if (!finalCode.includes('unpkg.com/lucide')) {
                finalCode = finalCode.replace('</head>', '<script src="https://unpkg.com/lucide@latest"></script></head>');
            }

            const initScript = `<script>
            window.addEventListener("load", () => {
              if(window.lucide) window.lucide.createIcons();
            });
            setInterval(() => {
               if(window.lucide) window.lucide.createIcons();
            }, 2000);
          </script>`;

            if (finalCode.includes('</body>')) {
                finalCode = finalCode.replace('</body>', `${initScript}</body>`);
            } else {
                finalCode += initScript;
            }

            setSynthesis(prev => ({ ...prev, step: 'mounting' }));
            addLog("Compiling VFS binary...");

            const appId = uniqueId;
            const appDir = `/system/apps/${appId}`;
            vfs.createDir(appDir);
            vfs.writeFile(`${appDir}/manifest.json`, JSON.stringify({ ...manifest, id: appId }, null, 2));
            vfs.writeFile(`${appDir}/index.html`, finalCode);

            registerCustomApp({
                ...manifest,
                id: appId,
                icon: getIconComponent(manifest.icon),
                sourcePath: `${appDir}/index.html`,
                isCustom: true
            });

            addLog("Success: Module registered.");
            addNotification({ title: 'App Synthesized', message: `${manifest.name} installed successfully.`, type: 'success' });

            setTimeout(() => {
                setInstalling(null);
                setSynthesis({ step: 'idle', logs: [] });
                setLabPrompt('');
                openWindow(appId);
            }, 1200);

        } catch (e: any) {
            console.error("Synthesis failed", e);
            addLog(`FATAL: ${e.message}`);
            addNotification({ title: 'Synthesis Failed', message: 'The Neural Core could not construct this app.', type: 'error' });
            setInstalling(null);
        }
    };

    const filteredMarket = AI_BLUEPRINTS.filter(bp =>
        bp.name.toLowerCase().includes(search.toLowerCase()) ||
        bp.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-full bg-zinc-950 text-white flex flex-col font-sans select-none">
            <div className="p-8 bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 border-b border-white/5 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -mr-20 -mt-20" />
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 text-emerald-500 text-sm font-bold uppercase tracking-[0.2em] mb-2">
                            <Layers size={18} /> System Registry v10.5
                        </div>
                        <h1 className="text-4xl font-bold mb-2 tracking-tight flex items-center gap-3">
                            App Repository
                        </h1>
                        <p className="text-zinc-400 max-w-md text-base leading-relaxed">
                            Browse verified modules or use the <strong>Neural Forge</strong> to synthesize custom software on demand.
                        </p>
                    </div>
                    <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
                        <button onClick={() => setActiveTab('market')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'market' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}>MARKET</button>
                        <button onClick={() => setActiveTab('lab')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'lab' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-zinc-400 hover:text-white'}`}>
                            <Wand2 size={16} /> SYNTHESIS LAB
                        </button>
                        <button onClick={() => setActiveTab('installed')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'installed' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}>LIBRARY</button>
                    </div>
                </div>
            </div>

            {activeTab === 'lab' && (
                <div className="p-8 bg-emerald-500/5 border-b border-emerald-500/10 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-black flex items-center justify-center text-emerald-400 shadow-xl border border-emerald-500/20">
                                <Rocket size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Generative Software Engine</h2>
                                <p className="text-base text-zinc-400">Describe any tool, game, or utility. The Neural Core will architect, code, and compile it instantly.</p>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl blur-xl group-focus-within:bg-emerald-500/20 transition-all duration-500" />
                            <textarea
                                className="relative w-full bg-[#09090b] border border-white/10 rounded-2xl p-5 min-h-[140px] outline-none focus:border-emerald-500/50 text-emerald-50 shadow-inner resize-none font-mono text-base leading-relaxed placeholder:text-zinc-700 transition-all"
                                placeholder="// Enter system directive..."
                                value={labPrompt}
                                onChange={e => setLabPrompt(e.target.value)}
                            />
                            <div className="absolute bottom-4 right-4 flex gap-2">
                                <div className="text-xs text-zinc-600 bg-black/50 px-2 py-1 rounded border border-white/5 flex items-center gap-1">
                                    <Code2 size={14} /> HTML5 + Tailwind
                                </div>
                                <button
                                    disabled={!labPrompt.trim() || !!installing}
                                    onClick={() => handleSynthesize()}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-30 shadow-lg shadow-emerald-900/40 hover:scale-105 active:scale-95"
                                >
                                    {installing ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} fill="currentColor" />}
                                    {installing ? "FABRICATING..." : "INITIATE BUILD"}
                                </button>
                            </div>
                        </div>

                        {installing && (
                            <div className="bg-black/80 border border-emerald-500/20 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                        <Terminal size={16} /> Live Compiler Log
                                    </span>
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse delay-75" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20 animate-pulse delay-150" />
                                    </div>
                                </div>
                                <div className="space-y-1.5 font-mono text-xs">
                                    {synthesis.logs.map((log, i) => (
                                        <div key={i} className="text-emerald-400/80 border-l-2 border-emerald-900/50 pl-2 animate-in slide-in-from-left-2">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeTab === 'market' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-2.5 text-zinc-600" size={18} />
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-base outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-600 text-white"
                                placeholder="Filter blueprints..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredMarket.map((bp, i) => (
                                <div key={i} className="bg-zinc-900/60 border border-white/5 rounded-2xl p-6 hover:bg-zinc-900 hover:border-emerald-500/30 transition-all group flex flex-col h-full shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Sparkles className="text-emerald-500/20" size={60} />
                                    </div>
                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div className="p-4 bg-zinc-800 rounded-2xl group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-all group-hover:scale-110 shadow-lg">
                                            <bp.icon size={28} />
                                        </div>
                                        <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded uppercase tracking-wider border border-emerald-500/20">
                                            AI Blueprint
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-xl mb-2 text-white group-hover:text-emerald-400 transition-colors">{bp.name}</h3>
                                    <p className="text-base text-zinc-500 mb-8 flex-1 leading-relaxed">{bp.description}</p>
                                    <button
                                        onClick={() => handleSynthesize(bp)}
                                        disabled={!!installing}
                                        className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 group-hover:shadow-lg group-hover:shadow-emerald-900/10"
                                    >
                                        {installing === bp.name ? (
                                            <RefreshCw size={16} className="animate-spin text-emerald-400" />
                                        ) : (
                                            <Download size={16} />
                                        )}
                                        {installing === bp.name ? "Compiling..." : "Synthesize App"}
                                    </button>
                                </div>
                            ))}
                            {filteredMarket.length === 0 && search && (
                                <button
                                    onClick={() => { setLabPrompt(`Create an app called ${search}. It should...`); setActiveTab('lab'); }}
                                    className="col-span-full py-20 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all group cursor-pointer"
                                >
                                    <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 group-hover:text-emerald-500 transition-colors group-hover:scale-110 duration-300">
                                        <Brain size={40} />
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-zinc-300 text-lg">No match for "{search}"</div>
                                        <div className="text-base text-zinc-600 mt-1 group-hover:text-emerald-400/80 transition-colors">Click to ask the AI to invent it from scratch</div>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'installed' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                        {registry.map(app => {
                            const isInstalled = installedApps.includes(app.id);
                            if (!isInstalled) return null;
                            const Icon = typeof app.icon === 'function' ? app.icon : Box;
                            return (
                                <div key={app.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-5">
                                        <div className="p-3 bg-zinc-800 rounded-xl group-hover:bg-emerald-500/20 transition-colors shadow-lg">
                                            <Icon size={24} className="text-zinc-400 group-hover:text-emerald-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-zinc-100 group-hover:text-white flex items-center gap-2">
                                                {app.name}
                                                {app.isCustom && <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">CUSTOM</span>}
                                            </h3>
                                            <p className="text-sm text-zinc-500 font-mono tracking-tighter opacity-60 mt-0.5">{app.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => openWindow(app.id)}
                                            className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-bold transition-all border border-white/5 hover:border-white/20"
                                        >
                                            LAUNCH
                                        </button>
                                        <div className="px-4 py-2 bg-emerald-500/5 text-emerald-500/50 rounded-lg text-sm font-bold flex items-center gap-2 cursor-default border border-emerald-500/10">
                                            <CheckCircle2 size={18} /> INSTALLED
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
