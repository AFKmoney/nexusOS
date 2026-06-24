export const DESKTOP_DIR_FALLBACK_USER = 'user';

export const PROCEDURAL_WALLPAPERS: Record<string, string> = {
  'nexus://procedural/aurora': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#010208"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0,mx=0,my=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();
const bands=[{hue:160,speed:1,phase:0},{hue:200,speed:1.3,phase:2},{hue:280,speed:0.7,phase:4.5},{hue:140,speed:1.8,phase:1.2}];
function draw(){
  g.fillStyle='rgba(1,2,8,0.08)';g.fillRect(0,0,W,H);
  t+=0.01;
  bands.forEach(b=>{
    g.beginPath();
    for(let x=0;x<=W;x+=4){
      const y=H*0.3+Math.sin(x*0.004+t*b.speed+b.phase)*H*0.12+Math.sin(x*0.009-t*b.speed*0.5)*H*0.06+(mx-W/2)*0.04+(my-H/2)*0.02;
      x===0?g.moveTo(x,y):g.lineTo(x,y);
    }
    g.lineTo(W,H);g.lineTo(0,H);g.closePath();
    const gg=g.createLinearGradient(0,H*0.2,0,H*0.7);
    gg.addColorStop(0,'transparent');
    gg.addColorStop(0.3,\`hsla(\${b.hue},100%,60%,0.06)\`);
    gg.addColorStop(0.6,\`hsla(\${b.hue},100%,50%,0.12)\`);
    gg.addColorStop(1,'transparent');
    g.fillStyle=gg;g.fill();
    g.strokeStyle=\`hsla(\${b.hue},100%,70%,0.4)\`;g.lineWidth=1.5;g.stroke();
  });
  for(let i=0;i<3;i++){const x=W*0.2+i*W*0.3+(mx-W/2)*0.1;const y=H*0.3+Math.sin(t+i*2)*H*0.1+(my-H/2)*0.05;const r=g.createRadialGradient(x,y,0,x,y,W*0.25);r.addColorStop(0,\`hsla(\${140+i*60},100%,70%,0.07)\`);r.addColorStop(1,'transparent');g.fillStyle=r;g.fillRect(0,0,W,H);}
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,

  'nexus://procedural/matrix': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000300"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,cols,drops=[],speeds=[],bright=[];
const ch="01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ∑∇⊕⊗#$@";
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);cols=Math.floor(W/18);drops=[];speeds=[];bright=[];for(let i=0;i<cols;i++){drops.push(Math.random()*-80);speeds.push(0.3+Math.random()*0.8);bright.push(Math.random());}}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(0,3,0,0.07)';g.fillRect(0,0,W,H);
  for(let i=0;i<cols;i++){
    const y=drops[i]*18;const b=bright[i];
    g.font=\`\${12+b*3}px monospace\`;
    for(let j=0;j<Math.floor(8+b*14);j++){
      const cy=y-j*18;if(cy<0||cy>H)continue;
      const a=Math.max(0,(1-j/(8+b*14))*(0.4+b*0.5));
      if(j===0&&b>0.7){g.fillStyle=\`rgba(180,255,200,0.95)\`;}
      else g.fillStyle=\`rgba(0,\${Math.floor(150+b*80)},\${Math.floor(40+b*40)},\${a})\`;
      if(Math.random()<0.1+b*0.1)g.fillText(ch[Math.floor(Math.random()*ch.length)],i*18,cy);
    }
    drops[i]+=speeds[i];
    if(y>H&&Math.random()>0.975){drops[i]=0;bright[i]=Math.random();}
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,

  'nexus://procedural/nebula': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#020108"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,mx=0,my=0,t=0,pts=[],stars=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);pts=[];for(let i=0;i<200;i++)pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*0.6,vy:(Math.random()-.5)*0.6,s:Math.random()*2.5+0.5,hue:Math.random()>0.5?160:220,a:Math.random()*0.6+0.2,drift:Math.random()*6});stars=[];for(let i=0;i<150;i++)stars.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1,a:Math.random()});}
window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();
function draw(){
  g.fillStyle='rgba(2,1,8,0.1)';g.fillRect(0,0,W,H);
  t+=0.008;
  stars.forEach(s=>{g.beginPath();g.arc(s.x,s.y,s.r,0,7);g.fillStyle=\`rgba(255,255,255,\${s.a*(0.5+Math.sin(t*s.r*3)*0.5)})\`;g.fill();});
  for(let i=0;i<3;i++){const rx=W*(0.2+i*0.3),ry=H*(0.3+Math.sin(t*0.4+i)*0.2);const rg=g.createRadialGradient(rx,ry,0,rx,ry,W*0.3);rg.addColorStop(0,\`hsla(\${160+i*80},100%,50%,0.06)\`);rg.addColorStop(1,'transparent');g.fillStyle=rg;g.fillRect(0,0,W,H);}
  pts.forEach(p=>{
    p.x+=p.vx+Math.sin(t+p.drift)*0.15+(mx-W/2)*0.0008;
    p.y+=p.vy+Math.cos(t*0.7+p.drift)*0.15+(my-H/2)*0.0008;
    if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
    const grd=g.createRadialGradient(p.x,p.y,0,p.x,p.y,p.s*4);
    grd.addColorStop(0,\`hsla(\${p.hue},100%,75%,\${p.a})\`);grd.addColorStop(1,'transparent');
    g.fillStyle=grd;g.beginPath();g.arc(p.x,p.y,p.s*4,0,7);g.fill();
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`
};

// Detect both nexus:// protocol URIs and inline HTML strings
export const isWallpaperHtmlDocument = (wallpaper: string) =>
  wallpaper.startsWith('nexus://procedural/') ||
  wallpaper.startsWith('<!DOCTYPE') ||
  wallpaper.startsWith('<html') ||
  wallpaper.startsWith('/home/') ||   // VFS paths (user-generated wallpapers)
  wallpaper.startsWith('/system/');   // VFS paths (system wallpapers)

export const getDesktopPath = (userId?: string | null) => `/home/${userId || DESKTOP_DIR_FALLBACK_USER}/Desktop`;
