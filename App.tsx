
import React, { useEffect, useState } from 'react';
import { useOS } from './store/osStore';
import { WindowFrame } from './components/WindowFrame';
import TaskSwitcher from './components/TaskSwitcher';
import ContextMenu from './components/ContextMenu';
import StartMenu from './components/StartMenu';
import Taskbar from './components/Taskbar';
import { vfs } from './kernel/fileSystem';
import { getSmartIcon } from './utils/smartIcons';
import { Lock, Cpu, Zap, Users } from 'lucide-react';
import { bindOsStore } from './services/puterService';
import { toolForge } from './kernel/toolForge';
import { sounds } from './kernel/sounds';
import { themeEngine } from './kernel/themeEngine';
import GlobalSearchOverlay from './components/GlobalSearch';
import BiosScreen from './components/BiosScreen';

// DAEMON Bridge — Auto-initializes on import. If installed, boots silently.
import './kernel/daemonBridge';

const PROCEDURAL_WALLPAPERS: Record<string, string> = {
  'NEURAL_GLOBE': `
    <!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000">
    <canvas id="c"></canvas><script>
    const c=document.getElementById("c"),ctx=c.getContext("2d");
    let w,h,t=0;
    function resize(){w=c.width=window.innerWidth;h=c.height=window.innerHeight;}
    window.onresize=resize;resize();
    function draw(){
      ctx.fillStyle="rgba(0,0,0,0.15)";ctx.fillRect(0,0,w,h);
      ctx.strokeStyle="rgba(16,185,129,0.3)";ctx.lineWidth=1;
      const center={x:w/2,y:h/2}, radius=Math.min(w,h)*0.35;
      for(let i=0;i<20;i++){
        ctx.beginPath();
        for(let j=0;j<64;j++){
          const angle=(j/64)*Math.PI*2;
          const lat=(i/20)*Math.PI;
          const x=center.x+radius*Math.sin(lat)*Math.cos(angle+t);
          const y=center.y+radius*Math.cos(lat);
          if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.closePath();ctx.stroke();
      }
      t+=0.01;requestAnimationFrame(draw);
    }draw();</script></body></html>`,
  'STARFIELD': `
    <!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#050508">
    <canvas id="c"></canvas><script>
    const c=document.getElementById("c"),ctx=c.getContext("2d");
    let w,h;function resize(){w=c.width=window.innerWidth;h=c.height=window.innerHeight;}
    window.onresize=resize;resize();
    const stars=Array(400).fill(0).map(()=>({x:Math.random()*w,y:Math.random()*h,z:Math.random()*w,s:Math.random()*2}));
    function draw(){
      ctx.fillStyle="#050508";ctx.fillRect(0,0,w,h);
      stars.forEach(s=>{
        s.z-=4;if(s.z<=0)s.z=w;
        const x=(s.x-w/2)*(w/s.z)+w/2, y=(s.y-h/2)*(w/s.z)+h/2;
        const size=(1-s.z/w)*3;
        ctx.fillStyle="rgba(150,200,255,"+(1-s.z/w)+")";
        ctx.fillRect(x,y,size,size);
      });
      requestAnimationFrame(draw);
    }draw();</script></body></html>`,
  'MATRIX_CORE': `
    <!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000">
    <canvas id="c"></canvas><script>
    const c=document.getElementById("c"),ctx=c.getContext("2d");
    let w,h;function resize(){w=c.width=window.innerWidth;h=c.height=window.innerHeight;}
    window.onresize=resize;resize();
    const cols=Math.floor(w/20)+1,ypos=Array(cols).fill(0);
    function draw(){
      ctx.fillStyle="rgba(0,0,0,0.05)";ctx.fillRect(0,0,w,h);
      ctx.fillStyle="#0f0";ctx.font="15pt monospace";
      ypos.forEach((y,i)=>{
        const text=String.fromCharCode(Math.random()*128);
        ctx.fillText(text,i*20,y);
        if(y>100+Math.random()*10000)ypos[i]=0;else ypos[i]=y+20;
      });
      requestAnimationFrame(draw);
    }setInterval(draw,50);</script></body></html>`,
  'CYBER_GRID': `
    <!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#050505">
    <canvas id="c"></canvas><script>
    const c=document.getElementById("c"),ctx=c.getContext("2d");
    let w,h,offset=0;
    function resize(){w=c.width=window.innerWidth;h=c.height=window.innerHeight;}
    window.onresize=resize;resize();
    function draw(){
      ctx.fillStyle="#050505";ctx.fillRect(0,0,w,h);
      ctx.strokeStyle="#1e1e1e";ctx.lineWidth=1;
      offset=(offset+0.5)%40;
      for(let x=offset;x<w;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
      for(let y=offset;y<h;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      ctx.strokeStyle="rgba(16,185,129,0.15)";ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
      requestAnimationFrame(draw);
    }draw();</script></body></html>`
};

function NeuralThoughtStream() {
  const { autonomyLog, currentObjective, autonomyState, kernelRules } = useOS();
  if (!kernelRules.autonomyEnabled) return null;

  return (
    <div className="fixed top-20 right-6 w-72 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 z-0 pointer-events-none select-none animate-in fade-in slide-in-from-right-10 duration-700">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-1.5 rounded-lg ${autonomyState !== 'IDLE' ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-zinc-800 text-zinc-500'}`}>
          <Cpu size={14} />
        </div>
        <div className="flex-1">
          <div className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Neural Engine</div>
          <div className="text-[11px] text-white font-medium truncate">{currentObjective}</div>
        </div>
      </div>
      <div className="space-y-2 h-40 overflow-hidden relative">
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/40 to-transparent z-10" />
        {autonomyLog.slice(-5).map((log, i) => (
          <div key={i} className="text-[9px] font-mono text-zinc-500 border-l border-white/10 pl-2">
            <span className="text-emerald-500/50 mr-2">{">>>"}</span>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}

function BootScreen() {
  const { setBooted } = useOS();
  const [bootPhase, setBootPhase] = useState(0);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const bootMsgs = [
    'DAEMON Core initializing...',
    'Loading kernel: VFS, Memory, EventBus, IPC',
    'ProcessManager → started',
    'FileSystem → /home mounted',
    'ErrorGuard → 5-layer validation active',
    'ToolForge v2 → 10 native actions loaded',
    'Neural Spine → manifest snapshot compiled',
    'ThemeEngine → accent applied',
    'PermissionSystem → sandbox enforced',
    'DAEMON.CORE → Link check initiated',
  ];

  useEffect(() => {
    if (bootPhase < bootMsgs.length) {
      const t = setTimeout(() => {
        setBootLines(prev => [...prev, bootMsgs[bootPhase]]);
        setBootPhase(p => p + 1);
        setProgress(((bootPhase + 1) / bootMsgs.length) * 100);
      }, 120 + Math.random() * 80);
      return () => clearTimeout(t);
    } else {
      // Auto-boot after all messages
      const t = setTimeout(() => {
        sounds.boot();
        setTimeout(() => {
          setBooted(true);
          setTimeout(() => {
            useOS.getState().addNotification({
              title: 'NexusOS',
              message: 'System ready. All modules loaded.',
              type: 'success'
            });
          }, 2000);
        }, 300);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [bootPhase]);

  const [showBios, setShowBios] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'F2') setShowBios(true); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center font-mono relative overflow-hidden" style={{ backgroundColor: '#000', width: '100vw', height: '100vh' }}>
      {/* Animated scan lines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.03) 2px, rgba(16,185,129,0.03) 4px)',
      }} />
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 60%)',
      }} />

      {/* Logo */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
          <Zap className="text-emerald-500 animate-pulse" size={36} />
        </div>
        <div className="text-white font-black tracking-[0.4em] text-2xl text-center" style={{ color: 'white' }}>
          NEXUS<span className="text-emerald-500">OS</span>
        </div>
        <div className="text-zinc-600 text-xs text-center tracking-[0.3em] mt-1 uppercase">Sovereign Operating System</div>
      </div>

      {/* Progress bar */}
      <div className="w-72 mb-6">
        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Boot messages */}
      <div className="w-80 h-44 overflow-hidden">
        {bootLines.map((line, i) => (
          <div key={i} className="text-[10px] font-mono text-emerald-400/60 mb-0.5" style={{
            animation: 'fadeIn 0.2s ease-out',
            opacity: i === bootLines.length - 1 ? 1 : 0.5,
          }}>
            <span className="text-emerald-600 mr-1.5">▸</span>{line}
          </div>
        ))}
        {bootPhase < bootMsgs.length && (
          <div className="text-[10px] text-emerald-600 animate-pulse mt-1">▋</div>
        )}
        {bootPhase >= bootMsgs.length && (
          <div className="text-[11px] text-emerald-400 font-bold mt-2 animate-pulse tracking-widest">
            ⚡ BOOTING...
          </div>
        )}
      </div>

      <div className="absolute bottom-6 text-[9px] text-zinc-800 font-mono tracking-widest">
        DAEMON.CORE v3.0 · F2 for BIOS
      </div>

      {showBios && <BiosScreen onExit={() => setShowBios(false)} />}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

// ── Desktop Widgets ───────────────────────────────────────────────────────────
function DesktopWidgets() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="absolute top-8 right-8 flex flex-col gap-1 pointer-events-none select-none z-0 text-white/90 items-end animate-in fade-in duration-1000">
      <div className="text-7xl font-extralight tracking-tighter drop-shadow-lg">{time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
      <div className="text-xl font-medium drop-shadow-md text-emerald-400/90">{time.toLocaleDateString([], {weekday: 'long', month:'long', day:'numeric'})}</div>
    </div>
  );
}

// ── Lock Screen ───────────────────────────────────────────────────────────────
function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    sounds.lock();
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[9998] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center cursor-pointer" onClick={onUnlock}>
      <div className="text-7xl font-extralight text-white mb-2 tracking-wider">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-lg text-zinc-500 mb-12">
        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
      <div className="flex items-center gap-2 text-zinc-600 text-sm animate-pulse">
        <Lock size={14} /> Click anywhere to unlock
      </div>
    </div>
  );
}

export default function App() {
  const { booted, isLoggedIn, hasSeenIntro, uiScale, windows, activeWorkspace, wallpaper, login, openContextMenu, openWindow, closeWindow, addNotification, isSearchOpen, toggleSearch, profiles, currentUser } = useOS();
  const [locked, setLocked] = useState(false);

  // ── First Boot Intro ────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoggedIn && !hasSeenIntro) {
      const isWelcomeOpen = useOS.getState().windows.some(w => w.appId === 'welcome');
      if (!isWelcomeOpen) {
        openWindow('welcome');
      }
    }
  }, [isLoggedIn, hasSeenIntro, openWindow]);

  // ── Initialize OS services ──────────────────────────────────────────────
  useEffect(() => {
    const homeDir = `/home/${currentUser?.id || 'user'}/Desktop`;
    if (!vfs.resolveNode(homeDir)) vfs.createDir(homeDir);
    themeEngine.apply();
    bindOsStore(() => ({ ...useOS.getState(), windows: useOS.getState().windows }));

    toolForge.bindOsActions(async (action) => {
      const store = useOS.getState();
      switch (action.type) {
        case 'OPEN_APP': {
          const [appId, filePath] = action.args;
          store.openWindow(appId, filePath ? { path: filePath } : undefined);
          return `[OS::OPEN_APP] → ✅ "${appId}" opened`;
        }
        case 'NOTIFY': {
          const [title, msg] = action.args;
          store.addNotification({ title: title || 'DAEMON', message: msg || '', type: 'info' });
          return `[OS::NOTIFY] → ✅ Notification sent`;
        }
        case 'BUILD_APP': {
          const [desc] = action.args;
          store.openWindow('neuralforge', { prompt: desc });
          return `[OS::BUILD_APP] → ✅ NeuralForge launched for: "${desc}"`;
        }
        case 'OPEN_URL': {
          const [url] = action.args;
          store.openWindow('netrunner', { path: url });
          return `[OS::OPEN_URL] → ✅ NetRunner opening: ${url}`;
        }
        default:
          return `[OS::${action.type}] → handled internally`;
      }
    });
  }, []);

  // ── Keyboard Shortcuts System ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Space → Global Search
      if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); toggleSearch(); return; }
      // Ctrl+T → Terminal
      if (e.ctrlKey && e.key === 't') { e.preventDefault(); openWindow('terminal'); sounds.windowOpen(); return; }
      // Ctrl+E → File Explorer
      if (e.ctrlKey && e.key === 'e') { e.preventDefault(); openWindow('explorer'); sounds.windowOpen(); return; }
      // Ctrl+L → Lock Screen
      if (e.ctrlKey && e.key === 'l') { e.preventDefault(); setLocked(true); return; }
      // Ctrl+W → Close focused window
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        const ws = useOS.getState().windows;
        const focused = ws.length > 0 ? ws[ws.length - 1].id : null;
        if (focused) { closeWindow(focused); sounds.windowClose(); }
        return;
      }
      // Ctrl+D → Dashboard
      if (e.ctrlKey && e.key === 'd') { e.preventDefault(); openWindow('dashboard'); sounds.windowOpen(); return; }
      // Ctrl+N → Notepad
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); openWindow('notepad'); sounds.windowOpen(); return; }
      // F11 → Toggle Fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        (window as any).electron?.send('toggle-fullscreen');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openWindow, closeWindow]);

  const handleGlobalContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-title-bar') || (e.target as HTMLElement).closest('.taskbar')) return;
    e.preventDefault();
    openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'desktop' });
  };

  const handleFileOpen = (path: string) => {
    const node = vfs.stat(path);
    if (!node) return;
    if (node.type === 'directory') {
      openWindow('explorer', { path });
    } else {
      // File Type Associations
      if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif')) {
        openWindow('image_viewer', { path });
      } else if (path.endsWith('.mp4') || path.endsWith('.webm')) {
        openWindow('video_player', { path });
      } else if (path.endsWith('.pdf')) {
        openWindow('pdf_viewer', { path });
      } else if (path.endsWith('.md')) {
        openWindow('markdown_preview', { path });
      } else if (path.endsWith('.html')) {
        openWindow('web_runner', { path });
      } else {
        openWindow('notepad', { path });
      }
    }
  };

  const handleDesktopDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sourcePath = e.dataTransfer.getData('text/plain');
    
    const destPath = `/home/${currentUser?.id || 'user'}/Desktop`;
    
    // External File Drop Support
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       Array.from(e.dataTransfer.files).forEach(f => {
          const file = f as File;
          const reader = new FileReader();
          reader.onload = (ev) => {
             vfs.writeFile(`${destPath}/${file.name}`, ev.target?.result as string);
          };
          reader.readAsDataURL(file); 
       });
       return;
    }

    // Internal File Move
    if (sourcePath && !sourcePath.startsWith(`${destPath}/`)) {
       vfs.move(sourcePath, `${destPath}/${sourcePath.split('/').pop()}`);
    }
  };

  if (!booted) return <BootScreen />;
  if (!isLoggedIn) return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative overflow-hidden font-sans" style={{ backgroundColor: '#050505', color: 'white' }}>
      {/* Animated gradient background */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 30% 50%, rgba(16,185,129,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(6,95,70,0.08) 0%, transparent 50%)',
      }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />
      {/* Scan lines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.01) 3px, rgba(255,255,255,0.01) 4px)',
      }} />
      
      <div className="z-10 flex flex-col items-center">
         <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
           <Zap className="text-emerald-500" size={32} />
         </div>
         <h1 className="text-3xl font-extralight text-white tracking-[0.25em] uppercase mb-2 drop-shadow-lg" style={{ color: 'white' }}>NexusOS</h1>
         <div className="text-xs text-zinc-600 tracking-[0.2em] uppercase mb-12">Select Profile</div>
         
         <div className="flex gap-8">
            {profiles.map(p => (
               <div 
                  key={p.id} 
                  onClick={() => login(p.id)}
                  className="flex flex-col items-center gap-4 cursor-pointer group"
               >
                  <div 
                     className="w-20 h-20 rounded-2xl flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-xl backdrop-blur-md border border-white/10 group-hover:border-emerald-500/40 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                     style={{ backgroundColor: `${p.themeColor}20`, color: p.themeColor }}
                  >
                     <Users size={28} />
                  </div>
                  <div className="text-center">
                     <div className="text-white font-medium text-base tracking-wide group-hover:text-emerald-300 transition-colors drop-shadow-md">{p.name}</div>
                     {p.isAdmin && <div className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mt-1">Administrator</div>}
                     {p.id === 'daemon' && <div className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase mt-1 animate-pulse">DAEMON AI</div>}
                  </div>
               </div>
            ))}
         </div>
         
         <div className="mt-16 text-[10px] font-mono text-zinc-700 tracking-widest flex items-center gap-2">
            <Lock size={10} /> ENCRYPTED BOOT · <span className="text-emerald-600">VERIFIED</span>
         </div>
      </div>
    </div>
  );

  return (
    <div
      className="h-screen w-screen overflow-hidden relative"
      onContextMenu={handleGlobalContextMenu}
    >
      {/* Wallpaper Layer */}
      {(PROCEDURAL_WALLPAPERS[wallpaper] || wallpaper.startsWith('<!DOCTYPE') || wallpaper.startsWith('<html')) ? (
        <iframe
          srcDoc={PROCEDURAL_WALLPAPERS[wallpaper] || wallpaper}
          className="absolute inset-0 w-full h-full border-none pointer-events-none"
        />
      ) : (
        <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000" style={{ backgroundImage: `url('${wallpaper}')` }} />
      )}

      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] pointer-events-none" />

      <DesktopWidgets />
      <NeuralThoughtStream />

      {/* ── Scalable OS Layer ───────────────────────────────────────── */}
      <div
        className="absolute inset-0 z-10 overflow-hidden"
        style={{
          transform: `scale(${uiScale})`,
          transformOrigin: 'top left',
          width: `${100 / uiScale}%`,
          height: `${100 / uiScale}%`,
        }}
      >
        {/* Desktop Content Area */}
        <div 
           className="absolute inset-0 bottom-12 p-6 overflow-hidden"
           onDragOver={(e) => e.preventDefault()}
           onDrop={handleDesktopDrop}
        >
          {/* Desktop Grid */}
          <div className="grid grid-cols-[repeat(auto-fill,100px)] grid-rows-[repeat(auto-fill,100px)] gap-4 h-full">
            {vfs.listDir(`/home/${currentUser?.id || 'user'}/Desktop`).map(name => (
              <div
                key={name}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', `/home/${currentUser?.id || 'user'}/Desktop/${name}`); }}
                className="flex flex-col items-center p-2 rounded-xl hover:bg-white/5 cursor-pointer group"
                onDoubleClick={() => handleFileOpen(`/home/${currentUser?.id || 'user'}/Desktop/${name}`)}
                onContextMenu={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'icon', filePath: `/home/${currentUser?.id || 'user'}/Desktop/${name}` });
                }}
              >
                <div className="w-12 h-12 bg-zinc-900/50 rounded-xl flex items-center justify-center border border-white/5 group-hover:border-emerald-500/30 transition-all shadow-md group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  {getSmartIcon(`/home/${currentUser?.id || 'user'}/Desktop/${name}`, 24)}
                </div>
                <span className="text-[11px] text-zinc-300 mt-2 text-center truncate w-full drop-shadow-md font-medium group-hover:text-white transition-colors">{name}</span>
              </div>
            ))}
          </div>

          {windows.filter(w => w.workspaceId === activeWorkspace || !w.workspaceId).map(win => (
            <WindowFrame key={win.id} windowState={win} />
          ))}
        </div>

        <StartMenu />
        <TaskSwitcher />
        <ContextMenu />
        <Taskbar />
      </div>

      {/* Lock Screen */}
      {locked && <LockScreen onUnlock={() => setLocked(false)} />}

      {/* Global Search Overlay */}
      {isSearchOpen && <GlobalSearchOverlay />}
    </div>
  );
}
