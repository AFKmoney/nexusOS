
import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { aiService } from '../services/puterService';
import { Paintbrush, Loader2, Check, Wand2, Sparkles, Dices, Layers, Layout, Zap, Monitor, Globe, Star } from 'lucide-react';

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
const CHARS='アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
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
    id: 'PLASMA_WAVE',
    name: 'Plasma Wave',
    category: 'Abstract',
    desc: 'Organic fluid plasma — evolving colors',
    preview: 'from-pink-950 via-violet-950 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H;
function resize(){W=c.width=window.innerWidth;H=c.height=window.innerHeight;}
resize();window.onresize=resize;
let t=0;
function draw(){
  t+=0.008;
  const img=x.createImageData(W,H);
  const d=img.data;
  for(let py=0;py<H;py+=2)for(let px=0;px<W;px+=2){
    const nx=px/W*4,ny=py/H*4;
    const v=Math.sin(nx+t)+Math.sin(ny+t*1.3)+Math.sin((nx+ny+t)*0.7)+Math.sin(Math.sqrt((nx-2)**2+(ny-2)**2)+t);
    const hue=(v+4)*22.5;
    const r=Math.sin(hue*Math.PI/180)*127+128;
    const g=Math.sin((hue+120)*Math.PI/180)*127+128;
    const b=Math.sin((hue+240)*Math.PI/180)*127+128;
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
      const i=((py+dy)*W+(px+dx))*4;
      d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;
    }
  }
  x.putImageData(img,0,0);requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  },
  {
    id: 'NEBULA_DRIFT',
    name: 'Nebula Drift',
    category: 'Space',
    desc: 'Deep space cosmic nebula with particle drift',
    preview: 'from-indigo-950 via-purple-950 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H;function resize(){W=c.width=window.innerWidth;H=c.height=window.innerHeight;}resize();window.onresize=resize;
const pts=[];for(let i=0;i<300;i++)pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.15,vy:(Math.random()-.5)*.15,s:Math.random()*2+.5,h:200+Math.random()*80,a:Math.random()});
let t=0;
function draw(){
  t+=0.002;
  x.fillStyle='rgba(0,0,12,0.04)';x.fillRect(0,0,W,H);
  pts.forEach(p=>{
    p.x+=p.vx+Math.sin(t+p.y*.01)*.1;
    p.y+=p.vy+Math.cos(t+p.x*.01)*.1;
    if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
    p.a=Math.sin(t*p.s)*.5+.5;
    const r=x.createRadialGradient(p.x,p.y,0,p.x,p.y,p.s*8);
    r.addColorStop(0,\`hsla(\${p.h},80%,70%,\${p.a})\`);
    r.addColorStop(1,'transparent');
    x.fillStyle=r;x.beginPath();x.arc(p.x,p.y,p.s*8,0,Math.PI*2);x.fill();
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  },
  {
    id: 'DNA_HELIX',
    name: 'DNA Helix',
    category: 'Bio-Tech',
    desc: 'Rotating double helix with glow pulses',
    preview: 'from-teal-950 via-black to-cyan-950',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H;function resize(){W=c.width=window.innerWidth;H=c.height=window.innerHeight;}resize();window.onresize=resize;
let t=0;function draw(){
  x.fillStyle='rgba(0,0,0,0.12)';x.fillRect(0,0,W,H);t+=0.015;
  const cx=W/2,n=40,amp=80,gap=20;
  for(let i=0;i<n;i++){
    const py=i*(H+100)/n-50;
    const a1=t+i*.25,a2=a1+Math.PI;
    const x1=cx+Math.cos(a1)*amp,x2=cx+Math.cos(a2)*amp;
    const g1=Math.cos(a1)*.5+.5,g2=Math.cos(a2)*.5+.5;
    x.beginPath();x.moveTo(x1,py);x.lineTo(x2,py);
    x.strokeStyle=\`rgba(0,220,200,\${0.1+g1*0.2})\`;x.lineWidth=1;x.stroke();
    [[x1,g1],[x2,g2]].forEach(([px,g])=>{
      const r=x.createRadialGradient(px,py,0,px,py,gap);
      r.addColorStop(0,\`rgba(0,255,200,\${0.8+g*0.2})\`);r.addColorStop(1,'transparent');
      x.fillStyle=r;x.beginPath();x.arc(px,py,gap,0,Math.PI*2);x.fill();
    });
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  },
  {
    id: 'AUDIO_WAVE',
    name: 'Sonic Pulse',
    category: 'Abstract',
    desc: 'Animated oscilloscope with ambient colors',
    preview: 'from-rose-950 via-black to-orange-950',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H;function resize(){W=c.width=window.innerWidth;H=c.height=window.innerHeight;}resize();window.onresize=resize;
let t=0;function draw(){
  x.fillStyle='rgba(0,0,0,0.15)';x.fillRect(0,0,W,H);t+=0.02;
  for(let layer=0;layer<4;layer++){
    const freq=1+layer*.7,amp=H/8*(1-layer*.15),hue=layer*60+t*8;
    x.beginPath();
    for(let px=0;px<W;px++){
      const v=amp*Math.sin(px/W*Math.PI*2*freq+t*(1+layer*.3))*Math.sin(t*.3+layer)+amp*.3*Math.sin(px/W*10+t);
      px===0?x.moveTo(px,H/2+v):x.lineTo(px,H/2+v);
    }
    x.strokeStyle=\`hsla(\${hue},80%,60%,\${0.5-layer*.1})\`;x.lineWidth=2-layer*.3;x.stroke();
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  },
];

const STATIC_PRESETS = [
  { category: "Cyberpunk", name: "Neon District", url: "https://images.unsplash.com/photo-1605218427306-6354db696f36?q=80&w=2070&auto=format&fit=crop" },
  { category: "Cyberpunk", name: "Night City", url: "https://images.unsplash.com/photo-1515630278258-407f66498911?q=80&w=2069&auto=format&fit=crop" },
  { category: "Cyberpunk", name: "Blade Runner", url: "https://images.unsplash.com/photo-1555580399-46e7ad4d5469?q=80&w=2070&auto=format&fit=crop" },
  { category: "Deep Space", name: "Event Horizon", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop" },
  { category: "Deep Space", name: "Nebula Core", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2022&auto=format&fit=crop" },
  { category: "Deep Space", name: "Solar Flare", url: "https://images.unsplash.com/photo-1506443432602-ac2fcbadf217?q=80&w=2070&auto=format&fit=crop" },
  { category: "Synth Nature", name: "Mountain Nexus", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop" },
  { category: "Synth Nature", name: "Bioluminescence", url: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=1925&auto=format&fit=crop" },
  { category: "Abstract", name: "Neural Network", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" },
  { category: "Abstract", name: "Liquid Geometry", url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop" },
];

export default function WallpaperApp() {
  const { setWallpaper, kernelRules, addNotification, wallpaper: currentWallpaper } = useOS();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Neural', 'Space', 'Cyberpunk', 'Hacker', 'Abstract', 'Bio-Tech'];
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
      <div className="px-8 py-6 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
            <Paintbrush size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-[0.2em]">Wallpaper Engine</h1>
            <p className="text-zinc-500 text-sm">Animated reactive wallpapers — AI generated or handcrafted.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Presets */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* Animated Presets */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Zap size={16} />
                <h2 className="text-xs font-black uppercase tracking-[0.3em]">Live Animated Wallpapers</h2>
              </div>
              {/* Category filter */}
              <div className="flex gap-1">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-2 py-0.5 rounded-full text-xs transition-all ${activeCategory === cat ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-600 hover:text-zinc-400'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(preset => {
                const isActive = currentWallpaper === preset.code;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setWallpaper(preset.code)}
                    className={`group relative rounded-2xl overflow-hidden border transition-all text-left ${isActive ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-900/30' : 'border-white/5 hover:border-white/20'}`}
                  >
                    {/* Animated preview thumbnail */}
                    <div className={`h-28 bg-gradient-to-br ${preset.preview} relative overflow-hidden`}>
                      <div className="absolute inset-0 flex items-center justify-center opacity-60">
                        <div className="text-3xl font-black opacity-20">{preset.name.charAt(0)}</div>
                      </div>
                      {/* Fake animated bars */}
                      <div className="absolute bottom-2 left-2 right-2 flex gap-0.5 items-end h-8">
                        {Array.from({length: 12}, (_,i) => (
                          <div key={i} className="flex-1 bg-white/10 rounded-sm animate-pulse" style={{height:`${20+Math.sin(i)*50}%`, animationDelay:`${i*0.1}s`}} />
                        ))}
                      </div>
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded-full text-[9px] text-emerald-400 font-bold uppercase tracking-widest border border-emerald-500/20">LIVE</div>
                      {isActive && <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center"><Check size={24} className="text-emerald-400 drop-shadow" /></div>}
                    </div>
                    <div className="p-3 bg-zinc-900/80">
                      <div className="text-sm font-bold text-white mb-0.5">{preset.name}</div>
                      <div className="text-xs text-zinc-500">{preset.desc}</div>
                      <div className="text-xs text-zinc-700 mt-1 font-mono">{preset.category}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Static Presets */}
          <div>
            <div className="flex items-center gap-2 mb-4 text-zinc-500">
              <Layout size={16} />
              <h2 className="text-xs font-black uppercase tracking-[0.3em]">4K Photo Backgrounds</h2>
            </div>
            <div className="space-y-6">
              {['Cyberpunk', 'Deep Space', 'Synth Nature', 'Abstract'].map(category => (
                <div key={category}>
                  <div className="text-xs text-zinc-700 mb-2 font-bold uppercase tracking-widest">{category}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {STATIC_PRESETS.filter(p => p.category === category).map(p => (
                      <button
                        key={p.name}
                        onClick={() => setWallpaper(p.url)}
                        className={`group relative aspect-video rounded-xl overflow-hidden border transition-all ${currentWallpaper === p.url ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-white/5 hover:border-zinc-500'}`}
                      >
                        <img src={p.url} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt={p.name} loading="lazy" />
                        <div className={`absolute inset-0 bg-black/40 flex flex-col justify-end p-2 transition-opacity ${currentWallpaper === p.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <span className="text-xs text-white font-bold drop-shadow-md">{p.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: AI Generator */}
        <div className="w-80 border-l border-white/5 bg-emerald-500/[0.03] flex flex-col shrink-0">
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-emerald-400">
                <Sparkles size={18} />
                <h2 className="text-sm font-black uppercase tracking-widest">Neural Synthesis</h2>
              </div>
              <button
                onClick={handleSuggest}
                disabled={isSuggesting}
                className="p-2 hover:bg-emerald-500/10 rounded-xl text-emerald-500 transition-colors flex items-center gap-1.5 text-xs font-bold"
              >
                {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Dices size={14} />} Inspire
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <textarea
                  className="w-full bg-black/60 border border-white/5 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500/50 min-h-[140px] resize-none font-mono leading-relaxed placeholder:text-zinc-800 transition-all"
                  placeholder="Describe a scene from the future..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
                <div className="absolute bottom-3 right-3 opacity-20 text-xs font-mono text-emerald-500">Canvas Engine</div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-900/20 hover:scale-[1.02] active:scale-95"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                {isGenerating ? "SYNTHESIZING..." : "MANIFEST WALLPAPER"}
              </button>

              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="text-xs text-zinc-600 mb-2">AI generates a live animated HTML5/Canvas wallpaper from your description. The wallpaper will react to particle physics, wave math, and the time of day.</div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-mono">
                  <Star size={10} /> ANIMATED / INTERACTIVE / ENVIRONMENT-REACTIVE
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
