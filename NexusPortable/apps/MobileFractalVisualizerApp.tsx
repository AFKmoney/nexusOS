import React, { useEffect, useRef, useState } from 'react';
import { useMobile } from '../store/mobileStore';
import { memory } from '../../kernel/memory';
import { Network, Activity, Database, ArrowLeft } from 'lucide-react';

interface MobileFractalVisualizerAppProps {
    onBack?: () => void;
}

export default function MobileFractalVisualizerApp({ onBack }: MobileFractalVisualizerAppProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { kernelRules } = useMobile();
    const [memories, setMemories] = useState(memory.retrieveRaw());
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setMemories(memory.retrieveRaw());
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = canvas.clientWidth;
        let height = canvas.height = canvas.clientHeight;
        let t = 0;
        let animationFrameId: number;

        // Create nodes from memories
        const baseNodes = memories.map((m, i) => ({
            id: m.id,
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 1,
            vy: (Math.random() - 0.5) * 1,
            radius: 6 + (m.score || 0) * 8,
            text: m.content.substring(0, 20) + '...',
            tags: m.tags,
            type: 'memory'
        }));

        // DAEMON Core Node
        const coreNode = {
            id: 'DAEMON_CORE',
            x: width / 2,
            y: height / 2,
            vx: 0,
            vy: 0,
            radius: 15,
            text: 'DAEMON KERNEL',
            tags: ['core'],
            type: 'core'
        };

        const nodes = [coreNode, ...baseNodes];

        const draw = () => {
            ctx.fillStyle = 'rgba(5, 5, 8, 0.3)';
            ctx.fillRect(0, 0, width, height);

            t += 0.02;

            nodes.forEach(node => {
                if (node.type !== 'core') {
                    const dx = coreNode.x - node.x;
                    const dy = coreNode.y - node.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist > 80) {
                        node.vx += (dx / dist) * 0.03;
                        node.vy += (dy / dist) * 0.03;
                    }

                    node.vx += Math.sin(t + node.x) * 0.05;
                    node.vy += Math.cos(t + node.y) * 0.05;

                    node.vx *= 0.98;
                    node.vy *= 0.98;

                    node.x += node.vx;
                    node.y += node.vy;

                    if (node.x < 0 || node.x > width) node.vx *= -1;
                    if (node.y < 0 || node.y > height) node.vy *= -1;
                }
            });

            ctx.lineWidth = 1;
            for (let i = 0; i < nodes.length; i++) {
                const nodeA = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const nodeB = nodes[j];
                    if (!nodeA || !nodeB) continue;
                    const dx = nodeA.x - nodeB.x;
                    const dy = nodeA.y - nodeB.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    const sameTags = nodeA.tags && nodeB.tags && nodeA.tags.some(tag => nodeB.tags.includes(tag));
                    const isCoreResonance = nodeA.type === 'core' || nodeB.type === 'core';

                    if (dist < 150 && (sameTags || isCoreResonance)) {
                        ctx.beginPath();
                        ctx.moveTo(nodeA.x, nodeA.y);
                        ctx.lineTo(nodeB.x, nodeB.y);
                        const opacity = 1 - (dist / 150);
                        ctx.strokeStyle = isCoreResonance ? `rgba(16, 185, 129, ${opacity * 0.4})` : `rgba(139, 92, 246, ${opacity * 0.2})`;
                        ctx.stroke();
                    }
                }
            }

            nodes.forEach(node => {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                
                if (node.type === 'core') {
                    ctx.fillStyle = '#10b981';
                    ctx.shadowColor = '#10b981';
                    ctx.shadowBlur = 15 + Math.sin(t * 5) * 5;
                } else {
                    ctx.fillStyle = '#8b5cf6';
                    ctx.shadowColor = '#8b5cf6';
                    ctx.shadowBlur = 5;
                }

                ctx.fill();
                ctx.shadowBlur = 0;

                if (node.type === 'core') {
                    ctx.fillStyle = 'rgba(255,255,255,0.8)';
                    ctx.font = 'bold 10px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(node.text, node.x, node.y - node.radius - 5);
                }
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        const resize = () => {
            width = canvas.width = canvas.clientWidth;
            height = canvas.height = canvas.clientHeight;
            coreNode.x = width / 2;
            coreNode.y = height / 2;
        };
        window.addEventListener('resize', resize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resize);
        };
    }, [memories]);

    return (
        <div className="fixed inset-0 bg-[#050508] text-white flex flex-col font-mono z-[100]">
            <div className="safe-top h-14 px-4 border-b border-white/10 bg-black/50 backdrop-blur-md z-10 flex items-center gap-3">
                <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                    <Network className="text-emerald-500" size={18} />
                    <h1 className="text-xs font-bold tracking-widest text-emerald-400">DAEMON FRACTAL</h1>
                </div>
                <div className="ml-auto flex gap-3 text-[10px] text-zinc-500">
                    <div className="flex items-center gap-1"><Database size={10} /> {memories.length}</div>
                    <div className="flex items-center gap-1"><Activity size={10} className="animate-pulse text-emerald-500" /> Live</div>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
                <canvas 
                    ref={canvasRef} 
                    className="absolute inset-0 w-full h-full"
                />
                
                {/* Compact Info Panel */}
                <div className="absolute top-4 left-4 right-4 flex justify-between gap-2 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-2 px-3 text-[9px]">
                        <div className="text-zinc-500 uppercase tracking-widest">Active Model</div>
                        <div className="text-emerald-400 font-bold">{kernelRules.modelId}</div>
                    </div>
                    <div className="bg-black/60 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-2 px-3 text-[9px] flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${kernelRules.autonomyEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-zinc-300 uppercase tracking-widest">Autonomy</span>
                    </div>
                </div>
                
                {/* Bottom Instruction */}
                <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none opacity-40">
                    <p className="text-[8px] uppercase tracking-[0.3em] text-zinc-400">Recursive Neural Visualization</p>
                </div>
            </div>
        </div>
    );
}
