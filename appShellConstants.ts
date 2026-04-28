export const DESKTOP_DIR_FALLBACK_USER = 'user';

export const PROCEDURAL_WALLPAPERS: Record<string, string> = {
  'nexus://procedural/aurora': `
    <!DOCTYPE html>
    <html><body style="margin:0;overflow:hidden;background:#000">
    <canvas id="c"></canvas>
    <script>
      const c=document.getElementById('c');const ctx=c.getContext('2d');
      let w,h,m={x:0,y:0};
      const resize=()=>{w=c.width=window.innerWidth;h=c.height=window.innerHeight;};
      window.onresize=resize;window.onmousemove=e=>{m.x=e.clientX;m.y=e.clientY};
      resize();
      function draw(t){
        ctx.fillStyle='rgba(0,0,0,0.05)';ctx.fillRect(0,0,w,h);
        for(let i=0;i<3;i++){
          const x=w/2+Math.cos(t/1500+i)*w/4+(m.x-w/2)*0.1;
          const y=h/2+Math.sin(t/2500+i)*h/4+(m.y-h/2)*0.1;
          const g=ctx.createRadialGradient(x,y,0,x,y,w/2);
          g.addColorStop(0,i===0?'rgba(16,185,129,0.2)':i===1?'rgba(59,130,246,0.2)':'rgba(139,92,246,0.2)');
          g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
        }
        requestAnimationFrame(draw);
      }
      draw(0);
    </script></body></html>
  `,
  'nexus://procedural/matrix': `
    <!DOCTYPE html>
    <html><body style="margin:0;overflow:hidden;background:#000">
    <canvas id="c"></canvas>
    <script>
      const c=document.getElementById('c');const ctx=c.getContext('2d');
      let w,h,cols,drops=[];
      const chars="01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
      const resize=()=>{w=c.width=window.innerWidth;h=c.height=window.innerHeight;cols=Math.floor(w/20);drops=Array(cols).fill(1)};
      window.onresize=resize;resize();
      function draw(){
        ctx.fillStyle='rgba(0,0,0,0.05)';ctx.fillRect(0,0,w,h);ctx.fillStyle='#10b981';ctx.font='15px monospace';
        for(let i=0;i<drops.length;i++){
          ctx.fillText(chars[Math.floor(Math.random()*chars.length)],i*20,drops[i]*20);
          if(drops[i]*20>h&&Math.random()>0.975)drops[i]=0;drops[i]++;
        }
      }
      setInterval(draw,33);
    </script></body></html>
  `,
  'nexus://procedural/nebula': `
    <!DOCTYPE html>
    <html><body style="margin:0;overflow:hidden;background:#050508">
    <canvas id="c"></canvas>
    <script>
      const c=document.getElementById('c');const ctx=c.getContext('2d');
      let w,h,m={x:0,y:0},pts=[];
      const resize=()=>{w=c.width=window.innerWidth;h=c.height=window.innerHeight};
      window.onresize=resize;window.onmousemove=e=>{m.x=e.clientX;m.y=e.clientY};resize();
      class P{constructor(){this.init()}init(){this.x=Math.random()*w;this.y=Math.random()*h;this.vx=(Math.random()-0.5);this.vy=(Math.random()-0.5);this.s=Math.random()*2;this.c=Math.random()>0.5?'#10b981':'#3b82f6'}update(){this.x+=this.vx+(m.x-w/2)*0.002;this.y+=this.vy+(m.y-h/2)*0.002;if(this.x<0||this.x>w||this.y<0||this.y>h)this.init()}}
      for(let i=0;i<150;i++)pts.push(new P());
      function draw(){ctx.fillStyle='rgba(5,5,8,0.2)';ctx.fillRect(0,0,w,h);pts.forEach(p=>{p.update();ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,7);ctx.fillStyle=p.c;ctx.fill()});requestAnimationFrame(draw)}
      draw();
    </script></body></html>
  `
};

export const isWallpaperHtmlDocument = (wallpaper: string) =>
  wallpaper.startsWith('nexus://procedural/');

export const getDesktopPath = (userId?: string | null) => `/home/${userId || DESKTOP_DIR_FALLBACK_USER}/Desktop`;
