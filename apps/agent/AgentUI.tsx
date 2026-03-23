
import React, { useState, useRef, useEffect } from 'react';
import { useOS } from '../../store/osStore';
import { aiService } from '../../services/puterService';
import { ShieldCheck, Zap, Circle, BrainCircuit, Send, Square, ChevronDown, Copy, Activity } from 'lucide-react';
import { commander } from '../../kernel/commander';

export default function AgentUI({ windowId }: { windowId: string }) {
    const { kernelRules, openWindow, windows } = useOS();
    const win = windows.find(w => w.id === windowId);
    const initialContext = win?.data?.initialContext || '';
    const initialPrompt = win?.data?.initialPrompt || '';

    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<any[]>([{ role: 'ai', content: "NEXUS.PRIME ONLINE.\nRecursive communication channel established.", timestamp: Date.now() }]);
    const [isThinking, setIsThinking] = useState(false);
    const hasStarted = useRef(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isThinking]);

    useEffect(() => {
        if (hasStarted.current || (!initialPrompt && !initialContext)) return;
        hasStarted.current = true;

        const displayMsg = initialPrompt || "Analyzing context...";
        const actualPayload = initialContext
            ? `[CONTEXT]\n${initialContext}\n[/CONTEXT]\n\nquery: ${initialPrompt || "Analyze this."}`
            : initialPrompt;

        executeAgent(displayMsg, actualPayload);
    }, [initialPrompt, initialContext]);

    const executeAgent = async (displayMsg: string, navPayload: string) => {
        setMessages(prev => [...prev, { role: 'user', content: displayMsg, timestamp: Date.now() }]);
        setInput('');
        setIsThinking(true);

        try {
            let fullBuffer = "";
            setMessages(prev => [...prev, { role: 'ai', content: '', timestamp: Date.now() }]);

            await aiService.streamChat(navPayload, kernelRules, (token) => {
                fullBuffer += token;
                setMessages(current => {
                    const newArr = [...current];
                    const lastIdx = newArr.length - 1;
                    newArr[lastIdx] = { ...newArr[lastIdx], content: fullBuffer };
                    return newArr;
                });
            });
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', content: "LINK_FRACTURE: RECONNECTING...", timestamp: Date.now() }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleTransaction = (userMsg: string) => {
        if (!userMsg.trim()) return;
        executeAgent(userMsg, userMsg);
    };

    return (
        <div className="h-full flex flex-col bg-[#050505] text-emerald-500 font-mono">
            <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a0a] border-b border-emerald-900/30">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span className="font-bold tracking-widest text-sm uppercase">Nexus Agent Core</span>
                </div>
                <div className="flex items-center gap-2 text-xs"><Circle size={6} fill="#10b981" className="animate-pulse" /> LIVE</div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl border ${m.role === 'user' ? 'bg-zinc-900 border-zinc-800' : 'bg-black/40 border-emerald-900/20'}`}>
                            <div className="text-sm opacity-50 mb-2 uppercase tracking-tighter">{m.role}</div>
                            <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                        </div>
                    </div>
                ))}
                <div ref={scrollRef} />
            </div>

            <div className="p-4 bg-black/80 border-t border-emerald-900/30">
                <div className="flex items-center gap-3 bg-[#0f0f0f] border border-zinc-800 rounded-xl px-4 py-3">
                    <input className="flex-1 bg-transparent border-none outline-none text-emerald-100" placeholder="Enter directive..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTransaction(input)} />
                    <button onClick={() => handleTransaction(input)} className="text-emerald-500 hover:text-white transition-colors"><Send size={18} /></button>
                </div>
            </div>
        </div>
    );
}
