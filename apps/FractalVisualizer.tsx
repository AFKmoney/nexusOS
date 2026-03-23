import React, { useEffect, useRef, useState } from 'react';
import { useOS } from '../store/osStore';
import { memory } from '../kernel/memory';
import { Network, Activity, Database, Cpu } from 'lucide-react';

export default function FractalVisualizer() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { kernelRules } = useOS();
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

        // Create nodes from memories + fake connection nodes
        const baseNodes = memories.map((m, i) => ({
            id: m.id,
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            radius: 8 + (m.score || 0) * 10,
            text: m.content.substring(0, 30) + '...',
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
            radius: 20,
            text: 'DAEMON KERNEL',
            tags: ['core'],
            type: 'core'
        };

        const nodes = [coreNode, ...baseNodes];

        const draw = () => {
            ctx.fillStyle = 'rgba(5, 5, 8, 0.2)';
            ctx.fillRect(0, 0, width, height);

            t += 0.02;

            // Physics update
            nodes.forEach(node => {
                if (node.type !== 'core') {
                    // Pull towards core slightly
                    const dx = coreNode.x - node.x;
                    const dy = coreNode.y - node.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist > 100) {
                        node.vx += (dx / dist) * 0.05;
                        node.vy += (dy / dist) * 0.05;
                    }

                    // Floating randomness
                    node.vx += Math.sin(t + node.x) * 0.1;
                    node.vy += Math.cos(t + node.y) * 0.1;

                    // Friction
                    node.vx *= 0.95;
                    node.vy *= 0.95;

                    node.x += node.vx;
                    node.y += node.vy;

                    // Boundaries
                    if (node.x < 0 || node.x > width) node.vx *= -1;
                    if (node.y < 0 || node.y > height) node.vy *= -1;
                }
            });

            // Draw connections
            ctx.lineWidth = 1;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    // Connect to core or if tags overlap
                    const sameTags = nodes[i].tags && nodes[j].tags && nodes[i].tags.some(tag => nodes[j].tags.includes(tag));
                    const isCoreResonance = nodes[i].type === 'core' || nodes[j].type === 'core';

                    if (dist < 200 && (sameTags || isCoreResonance)) {
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        const opacity = 1 - (dist / 200);
                        ctx.strokeStyle = isCoreResonance ? `rgba(16, 185, 129, ${opacity * 0.5})` : `rgba(139, 92, 246, ${opacity * 0.3})`;
                        ctx.stroke();
                    }
                }
            }

            // Draw nodes
            nodes.forEach(node => {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                
                if (node.type === 'core') {
                    ctx.fillStyle = '#10b981';
                    ctx.shadowColor = '#10b981';
                    ctx.shadowBlur = 20 + Math.sin(t * 5) * 10;
                } else {
                    ctx.fillStyle = '#8b5cf6';
                    ctx.shadowColor = '#8b5cf6';
                    ctx.shadowBlur = 10;
                }

                ctx.fill();
                ctx.shadowBlur = 0; // reset for performance

                // Text
                if (node.type === 'core' || hoveredNode === node.text) {
                    ctx.fillStyle = 'white';
                    ctx.font = node.type === 'core' ? 'bold 12px monospace' : '10px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(node.text, node.x, node.y - node.radius - 8);
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
    }, [memories, hoveredNode]);

    return (
        <div className="h-full w-full bg-[#050508] text-white flex flex-col font-mono relative">
            <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-black/50 backdrop-blur-md z-10 shrink-0">
                <Network className="text-emerald-500" size={20} />
                <h1 className="text-sm font-bold tracking-widest text-emerald-400">DAEMON FRACTAL CORTEX</h1>
                <div className="flex gap-4 ml-auto text-xs text-zinc-500">
                    <div className="flex items-center gap-1"><Database size={12} /> {memories.length} Nodes</div>
                    <div className="flex items-center gap-1"><Activity size={12} /> Live Sync</div>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
                <canvas 
                    ref={canvasRef} 
                    className="absolute inset-0 w-full h-full cursor-crosshair"
                />
                
                {/* Overlay Panel */}
                <div className="absolute top-4 left-4 w-64 bg-black/60 backdrop-blur-xl border border-emerald-500/20 rounded-xl p-4 flex flex-col gap-4 pointer-events-none">
                    <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">State Analysis</div>
                        <div className="text-xs text-emerald-400">Stable Fractal Resonance</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Active Model</div>
                        <div className="text-xs text-emerald-400">{kernelRules.modelId}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Autonomy Core</div>
                        <div className="text-xs flex items-center gap-2">
                            {kernelRules.autonomyEnabled ? (
                                <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active</>
                            ) : (
                                <><span className="w-2 h-2 rounded-full bg-red-500" /> Standby</>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
