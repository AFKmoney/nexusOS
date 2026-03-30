import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { aiService } from '../services/puterService';
import { Paintbrush, Loader2, Check, Wand2, Sparkles, Dices, Zap, Star, Eye, Code } from 'lucide-react';

// ── Animated wallpaper templates (self-contained HTML5/Canvas) ──────────────
const ANIMATED_PRESETS = [
  {
    id: 'NEURAL_STORM',
    name: 'Neural Storm',
    category: 'Neural',
    desc: 'Evolving neural network — reacts to time of day',
    preview: 'from-cyan-950 via-black to-blue-950',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,nodes=[],edges=[];const N=120;
const h=new Date().getHours();
const hue=h<6?260:h<12?180:h<18?140:h<21?30:260;
function resize(){W=c.width=window.innerWidth;H=c.height=window.innerHeight;}
resize();window.onresize=resize;
for(let i=0;i<N;i++)nodes.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:Math.random()*2+1,pulse:Math.random()*Math.PI*2});
function draw(){
  x.fillStyle='rgba(0,0,0,0.07)';x.fillRect(0,0,W,H);
  const t=Date.now()/1000;
  nodes.forEach((n,i)=>{
    n.x+=n.vx;n.y+=n.vy;n.pulse+=0.03;
    if(n.x<0||n.x>W)n.vx*=-1;if(n.y<0||n.y>H)n.vy*=-1;
    const glow=Math.sin(n.pulse)*0.5+0.5;
    x.beginPath();x.arc(n.x,n.y,n.r+glow*2,0,Math.PI*2);
    x.fillStyle=\`hsla(\${hue+i%40},80%,60%,\${0.4+glow*0.6})\`;x.fill();
    nodes.forEach((m,j)=>{if(j<=i)return;const dx=n.x-m.x,dy=n.y-m.y,d=Math.sqrt(dx*dx+dy*dy);
      if(d<120){x.beginPath();x.moveTo(n.x,n.y);x.lineTo(m.x,m.y);
        const a=(1-d/120)*0.15;x.strokeStyle=\`hsla(\${hue},70%,60%,\${a})\`;x.lineWidth=0.5;x.stroke();}
    });
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  },
  {
    id: 'STARFIELD',
    name: 'Hyperspace',
    category: 'Space',
    desc: 'Warp-speed hyperspace with star streaks',
    preview: 'from-blue-950 via-black to-indigo-950',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,stars=[];const N=500,SPEED=4;
function resize(){W=c.width=window.innerWidth;H=c.height=window.innerHeight;init();}
function init(){stars=[];for(let i=0;i<N;i++)stars.push({x:Math.random()*W-W/2,y:Math.random()*H-H/2,z:Math.random()*W,pz:0});}
resize();window.onresize=resize;
function draw(){
  x.fillStyle='rgba(0,0,8,0.9)';x.fillRect(0,0,W,H);
  x.save();x.translate(W/2,H/2);
  stars.forEach(s=>{
    s.pz=s.z;s.z-=SPEED;
    if(s.z<=0)Object.assign(s,{x:(Math.random()-.5)*W,y:(Math.random()-.5)*H,z:W,pz:W});
    const sx=s.x/s.z*W,sy=s.y/s.z*H;
    const px=s.x/s.pz*W,py=s.y/s.pz*H;
    const size=Math.max(0.1,(1-s.z/W)*3);
    const brightness=Math.floor((1-s.z/W)*255);
    x.strokeStyle=\`rgb(\${brightness},\${brightness},\${Math.min(255,brightness+80)})\`;
    x.lineWidth=size;x.beginPath();x.moveTo(px,py);x.lineTo(sx,sy);x.stroke();
  });
  x.restore();requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  },
  {
    id: 'CYBER_GRID',
    name: 'Neon Grid',
    category: 'Cyberpunk',
    desc: 'Reactive neon retro grid — perspective & pulse',
    preview: 'from-purple-950 via-black to-fuchsia-950',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,t=0;
function resize(){W=c.width=window.innerWidth;H=c.height=window.innerHeight;}
resize();window.onresize=resize;
function draw(){
  t+=0.005;
  x.fillStyle='rgba(0,0,0,0.15)';x.fillRect(0,0,W,H);
  const vp=0.6+Math.sin(t*0.3)*0.05;
  const cols=24,rows=20;
  const cx=W/2,cy=H*vp;
  x.strokeStyle='rgba(180,0,255,0.25)';x.lineWidth=0.8;
  for(let i=-cols;i<=cols;i++){
    const tx=cx+i*(W/cols);
    x.beginPath();x.moveTo(tx,cy);x.lineTo(cx+i*.5*W,H);x.stroke();
  }
  for(let j=0;j<rows;j++){
    const progress=j/rows;
    const y2=cy+Math.pow(progress,2)*(H-cy);
    const hw=(W/2)*progress*1.5;
    x.beginPath();x.moveTo(cx-hw,y2);x.lineTo(cx+hw,y2);
    const bright=Math.sin(j/5-t*2)*.5+.5;
    x.strokeStyle=\`rgba(\${150+bright*105},0,255,\${0.1+bright*0.4})\`;
    x.lineWidth=bright*1.5;x.stroke();
  }
  const pulses=3;
  for(let p=0;p<pulses;p++){
    const pt=(t+p*(2/pulses))%(2);
    const py=cy+(H-cy)*Math.abs(pt-1);
    const hw=(W/2)*(Math.min(pt,2-pt))*1.5;
    x.beginPath();x.moveTo(cx-hw,py);x.lineTo(cx+hw,py);
    x.strokeStyle='rgba(255,80,255,0.8)';x.lineWidth=1.5;x.stroke();
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  },
  {
    id: 'MATRIX_CORE',
    name: 'Matrix Core',
    category: 'Hacker',
    desc: 'The source code of reality — green digital rain',
    preview: 'from-green-950 via-black to-emerald-950',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,cols,drops,chars;
const CHARS='アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ마ミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
function resize(){
  W=c.width=window.innerWidth;H=c.height=window.innerHeight;
  cols=Math.floor(W/16);drops=Array(cols).fill(1);
}
resize();window.onresize=resize;
function draw(){
  x.fillStyle='rgba(0,0,0,0.05)';x.fillRect(0,0,W,H);
  x.font='14px monospace';
  drops.forEach((y,i)=>{
    const ch=CHARS[Math.floor(Math.random()*CHARS.length)];
    const bright=Math.random()>.98?1:0;
    x.fillStyle=bright?'#fff':\`hsl(120,80%,\${30+Math.random()*30}%)\`;
    x.fillText(ch,i*16,y*16);
    if(y*16>H&&Math.random()>.975)drops[i]=0;
    drops[i]++;
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  },
  {
    id: 'QUANTUM_FIELD',
    name: 'Quantum Field',
    category: 'Neural',
    desc: 'Dynamic particle interaction field',
    preview: 'from-blue-950 via-indigo-950 to-black',
    code: 'QUANTUM_FIELD'
  },
  {
    id: 'FRACTAL_ORBIT',
    name: 'Fractal Orbit',
    category: 'Abstract',
    desc: 'Sacred geometry and orbital paths',
    preview: 'from-emerald-950 via-black to-purple-950',
    code: 'FRACTAL_ORBIT'
  }
];

export default function WallpaperApp() {
  const { setWallpaper, kernelRules, addNotification, wallpaper: currentWallpaper } = useOS();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Neural', 'Space', 'Cyberpunk', 'Hacker', 'Abstract'];
  const filtered = activeCategory === 'All' ? ANIMATED_PRESETS : ANIMATED_PRESETS.filter(p => p.category === activeCategory);

  const handleSuggest = async () => {
    setIsSuggesting(true);
    try {
      const suggestion = await aiService.generateOnce(
        "Give me a one-sentence artistic prompt for an animated HTML5/Canvas cyberpunk sci-fi wallpaper. Be creative, vivid, specific. One sentence only.",
        kernelRules
      );
      setPrompt(suggestion.replace(/"/g, ''));
    } catch (e) {
      addNotification({ title: 'AI Error', message: 'Failed to generate suggestion.', type: 'error' });
    }
    setIsSuggesting(false);
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      addNotification({ title: 'Neural Core', message: 'Architecting visual logic...', type: 'info' });
      const systemPrompt = `You are a generative art engine. Create a FULLY ANIMATED HTML5/Canvas wallpaper.
REQUIREMENTS:
- Single HTML file starting with <!DOCTYPE html>
- Full-screen, no scrollbars (body: margin:0; overflow:hidden)
- Must use requestAnimationFrame animation loop
- Must be visually stunning with particle systems, waves, or geometric patterns
- Cyberpunk/Sci-Fi/Abstract aesthetics only
- Use only vanilla JS and Canvas API — no external libraries
- Must react to ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'night'} time of day for colors

USER VISION: "${prompt}"

RETURN: ONLY the single HTML file. No markdown. No code blocks. Start with <!DOCTYPE html>.`;

      const code = await aiService.generateOnce(systemPrompt, kernelRules);
      const cleanCode = code.replace(/```html(\s|\\n)*/gi, '').replace(/```(\s|\\n)*/g, '').trim();

      if (cleanCode.includes('<!DOCTYPE') || cleanCode.includes('<html')) {
        setWallpaper(cleanCode);
        addNotification({ title: 'Neural Art', message: 'Animated wallpaper synthesized.', type: 'success' });
      } else {
        throw new Error("Invalid generation format");
      }
    } catch (e) {
      addNotification({ title: 'Synthesis Error', message: 'Could not manifest vision.', type: 'error' });
    }
    setIsGenerating(false);
  };

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/5 shrink-0 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Paintbrush size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-[0.25em]">Wallpaper Engine</h1>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Sovereign Visual Manifestation</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Presets */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20">
          
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-emerald-400">
                <Zap size={16} className="animate-pulse" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em]">Neural Live Presets</h2>
              </div>
              {/* Category filter */}
              <div className="flex gap-1.5">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-zinc-500 hover:text-zinc-300 bg-white/5'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(preset => {
                const isActive = currentWallpaper === preset.code;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setWallpaper(preset.code)}
                    className={`group relative rounded-2xl overflow-hidden border transition-all duration-500 text-left ${isActive ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.3)] scale-[1.02]' : 'border-white/5 hover:border-white/20 hover:scale-[1.01]'}`}
                  >
                    {/* Animated preview thumbnail */}
                    <div className={`h-32 bg-gradient-to-br ${preset.preview} relative overflow-hidden`}>
                      <div className="absolute inset-0 flex items-center justify-center opacity-40">
                        <div className="text-4xl font-black opacity-10">{preset.name.charAt(0)}</div>
                      </div>
                      {/* Animated bars */}
                      <div className="absolute bottom-3 left-3 right-3 flex gap-1 items-end h-10">
                        {Array.from({length: 16}, (_,i) => (
                          <div key={i} className="flex-1 bg-white/20 rounded-full animate-pulse" style={{height:`${20+Math.sin(i)*60}%`, animationDelay:`${i*0.05}s`}} />
                        ))}
                      </div>
                      <div className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-500 text-black text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]">LIVE</div>
                      {isActive && (
                        <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[2px] flex items-center justify-center">
                          <Check size={32} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-[#0a0a0c]">
                      <div className="text-xs font-black text-white mb-1 uppercase tracking-wider">{preset.name}</div>
                      <div className="text-[10px] text-zinc-500 line-clamp-1">{preset.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: AI Generator */}
        <div className="w-80 border-l border-white/5 bg-[#030305] flex flex-col shrink-0">
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-emerald-400">
                <Sparkles size={18} />
                <h2 className="text-xs font-black uppercase tracking-[0.2em]">Neural Synthesis</h2>
              </div>
              <button
                onClick={handleSuggest}
                disabled={isSuggesting}
                className="p-2 hover:bg-emerald-500/10 rounded-xl text-emerald-500 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-transparent hover:border-emerald-500/30"
              >
                {isSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Dices size={12} />} Inspire
              </button>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-emerald-500/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <textarea
                  className="w-full relative bg-black/60 border border-white/10 rounded-2xl p-5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50 min-h-[180px] resize-none font-mono leading-relaxed placeholder:text-zinc-800 transition-all shadow-inner"
                  placeholder="[DIRECTIVE] Define visual geometry..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
                <div className="absolute bottom-4 right-4 opacity-30 text-[9px] font-black font-mono text-emerald-500 tracking-widest">NEXUS.RENDER_V2</div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-900 disabled:text-zinc-700 text-black rounded-2xl font-black text-xs uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-95"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} fill="currentColor" />}
                {isGenerating ? "FORGING..." : "INITIATE MANIFEST"}
              </button>

              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50" />
                <div className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                  <Star size={10} className="text-emerald-500" /> System Capabilities
                </div>
                <div className="text-[10px] text-zinc-600 leading-relaxed font-mono">
                  Generates real-time HTML5/Canvas kernels. Wallpapers are interactive, lightweight, and adapt to the system's temporal state.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
