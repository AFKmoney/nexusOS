
export interface WallpaperPreset {
  id: string;
  name: string;
  category: string;
  desc: string;
  preview: string;
  code: string;
}

export const WALLPAPER_LIBRARY: WallpaperPreset[] = [
  {
    id: 'NEURAL_STORM',
    name: 'Neural Storm',
    category: 'Neural',
    desc: 'Evolving neural network with synaptic fire',
    preview: 'from-cyan-950 via-black to-blue-950',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#020408"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,nodes=[],t=0,mx=0,my=0;function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);nodes=[];for(let i=0;i<80;i++)nodes.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:Math.random()*2+1,fire:0,hue:Math.random()>.5?180:220});}window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();function draw(){g.fillStyle=\'rgba(2,4,8,0.15)\';g.fillRect(0,0,W,H);t+=0.016;nodes.forEach((n,i)=>{n.x+=n.vx+(mx-W/2)*3e-4;n.y+=n.vy+(my-H/2)*3e-4;if(n.x<0)n.x=W;if(n.x>W)n.x=0;if(n.y<0)n.y=H;if(n.y>H)n.y=0;n.fire=Math.max(0,n.fire-.02);nodes.slice(i+1).forEach(m=>{const dx=m.x-n.x,dy=m.y-n.y,d=Math.sqrt(dx*dx+dy*dy);if(d<120){const a=(1-d/120)*.6*(n.fire>0||m.fire>0?2:1);g.beginPath();g.moveTo(n.x,n.y);g.lineTo(m.x,m.y);g.strokeStyle=\'hsla(\'+n.hue+\',100%,\'+(60+n.fire*40)+\'%,\'+a+\')\';g.lineWidth=n.fire>0?1.5:.5;g.stroke();if(Math.random()<.001){n.fire=1;m.fire=.8;}}});const grd=g.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r*3+n.fire*8);grd.addColorStop(0,\'hsla(\'+n.hue+\',100%,\'+(70+n.fire*30)+\'%,\'+(0.9+n.fire*.1)+\')\');grd.addColorStop(1,\'transparent\');g.fillStyle=grd;g.beginPath();g.arc(n.x,n.y,n.r*2+n.fire*6,0,7);g.fill();});requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'STARFIELD',
    name: 'Hyperspace',
    category: 'Space',
    desc: 'Warp-speed star tunnel',
    preview: 'from-blue-950 via-black to-indigo-950',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000005"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,stars=[],speed=3;function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);stars=[];for(let i=0;i<500;i++)stars.push({x:(Math.random()-.5)*W*3,y:(Math.random()-.5)*H*3,z:Math.random()*W,pz:0});}window.onresize=init;init();function draw(){g.fillStyle=\'rgba(0,0,5,0.2)\';g.fillRect(0,0,W,H);const cx=W/2,cy=H/2;stars.forEach(s=>{s.pz=s.z;s.z-=speed;if(s.z<=0){s.x=(Math.random()-.5)*W*3;s.y=(Math.random()-.5)*H*3;s.z=W;s.pz=W;}const sx=cx+s.x/s.z*W,sy=cy+s.y/s.z*H,px=cx+s.x/s.pz*W,py=cy+s.y/s.pz*H,size=Math.max(.1,(1-s.z/W)*3),bright=Math.max(0,1-s.z/W);g.beginPath();g.moveTo(px,py);g.lineTo(sx,sy);g.strokeStyle=\'rgba(\'+(180+bright*75|0)+\',\'+(200+bright*55|0)+\',255,\'+bright+\')\';g.lineWidth=size;g.stroke();});speed=2+Math.sin(Date.now()/3e3)*1.5;requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'CYBER_GRID',
    name: 'Neon Grid',
    category: 'Cyberpunk',
    desc: 'Reactive neon retro grid with pulse',
    preview: 'from-purple-950 via-black to-fuchsia-950',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#050008"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,t=0,mx=0,my=0;function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);}window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();function draw(){g.fillStyle=\'rgba(5,0,8,0.25)\';g.fillRect(0,0,W,H);t+=.02;const rows=24,cols=38,horizon=H*.5+Math.sin(t*.3)*H*.05,vanishX=W/2+(mx-W/2)*.1;for(let r=0;r<rows;r++){const py=horizon+(r/rows)*(H-horizon)*1.8;if(py>H)continue;const pulse=.4+.5*Math.sin(t*2-r*.5),d=Math.abs(py-my)/H,bright=Math.max(0,1-d*2)*.6+.2;g.beginPath();g.moveTo(0,py);g.lineTo(W,py);g.strokeStyle=\'rgba(180,0,255,\'+(pulse*bright*.8)+\')\';g.lineWidth=.5+pulse;g.stroke();}for(let col=0;col<=cols;col++){const nx=col/cols,tx=vanishX+(nx-.5)*(W*1.8),pulse=.3+.6*Math.sin(t*1.5+col*.4),d=Math.abs(tx-mx)/W,bright=Math.max(0,1-d*1.5)*.5+.2;g.beginPath();g.moveTo(vanishX,horizon);g.lineTo(tx,H*1.2);g.strokeStyle=\'rgba(255,0,180,\'+(pulse*bright)+\')\';g.lineWidth=.5+pulse*.8;g.stroke();}const scanY=(t*60)%H,sg=g.createLinearGradient(0,scanY-40,0,scanY+40);sg.addColorStop(0,\'transparent\');sg.addColorStop(.5,\'rgba(255,50,200,0.08)\');sg.addColorStop(1,\'transparent\');g.fillStyle=sg;g.fillRect(0,scanY-40,W,80);requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'MATRIX_CORE',
    name: 'Matrix Core',
    category: 'Hacker',
    desc: 'Green digital rain with Katakana glyphs',
    preview: 'from-green-950 via-black to-emerald-950',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000300"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,cols,drops=[],speeds=[],bright=[];const ch=\'01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ⊕⊗∑∇∫\';function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);cols=Math.floor(W/18);drops=[];speeds=[];bright=[];for(let i=0;i<cols;i++){drops.push(Math.random()*-100);speeds.push(.3+Math.random()*.7);bright.push(Math.random());}}window.onresize=init;init();function draw(){g.fillStyle=\'rgba(0,3,0,0.07)\';g.fillRect(0,0,W,H);for(let i=0;i<cols;i++){const y=drops[i]*18,b=bright[i];g.font=(13+b*4|0)+\'px monospace\';for(let j=0;j<(8+b*14|0);j++){const cy=y-j*18;if(cy<0||cy>H)continue;const a=Math.max(0,(1-j/(8+b*14))*(.4+b*.5));if(j===0&&b>.7)g.fillStyle=\'rgba(180,255,200,0.95)\';else g.fillStyle=\'rgba(0,\'+(150+b*80|0)+\',\'+(40+b*40|0)+\',\'+a+\')\';if(Math.random()<.1+b*.1)g.fillText(ch[Math.random()*ch.length|0],i*18,cy);}drops[i]+=speeds[i];if(y>H&&Math.random()>.975){drops[i]=0;bright[i]=Math.random();}}requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'QUANTUM_FIELD',
    name: 'Quantum Field',
    category: 'Neural',
    desc: 'Charged particle interaction field',
    preview: 'from-blue-950 via-indigo-950 to-black',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#020308"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,pts=[],mx=0,my=0;function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);pts=[];for(let i=0;i<100;i++)pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*1.5,vy:(Math.random()-.5)*1.5,charge:Math.random()>.5?1:-1,energy:0});}window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();function draw(){g.fillStyle=\'rgba(2,3,8,0.12)\';g.fillRect(0,0,W,H);pts.forEach(p=>{let fx=0,fy=0;pts.forEach(q=>{if(p===q)return;const dx=p.x-q.x,dy=p.y-q.y,d2=dx*dx+dy*dy,d=Math.sqrt(d2);if(d<150&&d>1){const f=p.charge*q.charge*15/d2;fx+=f*dx/d;fy+=f*dy/d;}});const mdx=p.x-mx,mdy=p.y-my,md=Math.sqrt(mdx*mdx+mdy*mdy);if(md<200&&md>1){fx+=50*mdx/md/md;fy+=50*mdy/md/md;}p.vx=(p.vx+fx*.016)*.98;p.vy=(p.vy+fy*.016)*.98;p.energy=Math.min(1,Math.sqrt(p.vx*p.vx+p.vy*p.vy)/3);p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;const hue=p.charge>0?200:280,r=2+p.energy*4;pts.forEach(q=>{if(p===q)return;const dx=q.x-p.x,dy=q.y-p.y,d=Math.sqrt(dx*dx+dy*dy);if(d<80){const a=(1-d/80)*.5;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.strokeStyle=\'hsla(\'+(p.charge===q.charge?200:0)+\',100%,70%,\'+(a*.4)+\')\';g.lineWidth=.5;g.stroke();}});const grd=g.createRadialGradient(p.x,p.y,0,p.x,p.y,r*3);grd.addColorStop(0,\'hsla(\'+hue+\',100%,80%,0.9)\');grd.addColorStop(1,\'transparent\');g.fillStyle=grd;g.beginPath();g.arc(p.x,p.y,r*3,0,7);g.fill();});requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'FRACTAL_ORBIT',
    name: 'Fractal Orbit',
    category: 'Abstract',
    desc: 'Sacred geometry in perpetual motion',
    preview: 'from-emerald-950 via-black to-purple-950',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#020308"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,t=0;function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);}window.onresize=init;init();function poly(x,y,r,n,rot,color,lw){g.beginPath();for(let i=0;i<=n;i++){const a=rot+i/n*Math.PI*2;i?g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}g.strokeStyle=color;g.lineWidth=lw;g.stroke();}function rosette(cx,cy,r,n,rot,hue,a){for(let i=0;i<n;i++){const angle=rot+i/n*Math.PI*2,x2=cx+Math.cos(angle)*r,y2=cy+Math.sin(angle)*r;g.beginPath();g.moveTo(cx,cy);g.lineTo(x2,y2);g.strokeStyle=\'hsla(\'+hue+\',100%,70%,\'+(a*.4)+\')\';g.lineWidth=.5;g.stroke();poly(x2,y2,r*.3,6,angle+t*.5,\'hsla(\'+(hue+60)+\',100%,70%,\'+(a*.6)+\')\',0.5);}}function draw(){g.fillStyle=\'rgba(2,3,8,0.1)\';g.fillRect(0,0,W,H);t+=.008;const cx=W/2,cy=H/2,R=Math.min(W,H)*.38;poly(cx,cy,R,6,t,\'hsla(160,100%,60%,0.7)\',1);poly(cx,cy,R*.7,6,t+Math.PI/6,\'hsla(280,100%,70%,0.5)\',0.8);poly(cx,cy,R*.45,3,t*1.5,\'hsla(60,100%,70%,0.6)\',0.8);rosette(cx,cy,R,12,t*.5,160,0.8);rosette(cx,cy,R*.5,8,-t*.7,280,0.6);for(let i=0;i<6;i++){const a=t+i/6*Math.PI*2,ox=cx+Math.cos(a)*R,oy=cy+Math.sin(a)*R;poly(ox,oy,R*.18,6,-a,\'hsla(\'+(160+i*30)+\',100%,65%,0.5)\',0.6);for(let j=0;j<6;j++){const b=a*2+j/6*Math.PI*2,sx=ox+Math.cos(b)*R*.12,sy=oy+Math.sin(b)*R*.12;g.beginPath();g.arc(sx,sy,2,0,7);g.fillStyle=\'hsla(\'+(220+j*20)+\',100%,80%,0.8)\';g.fill();}}requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'MOUSE_PARTICLES',
    name: 'Cursor Swarm',
    category: 'Interactive',
    desc: 'Particles swarm your cursor',
    preview: 'from-blue-900 to-black',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),x=c.getContext(\'2d\');let W,H,mx=0,my=0,p=[];function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';x.scale(devicePixelRatio,devicePixelRatio);}r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY};for(let i=0;i<200;i++)p.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight,vx:0,vy:0,hue:Math.random()*60+160});function d(){x.fillStyle=\'rgba(0,0,0,0.1)\';x.fillRect(0,0,W,H);p.forEach(n=>{const dx=mx-n.x,dy=my-n.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist<200&&dist>0){n.vx+=dx/dist*.8;n.vy+=dy/dist*.8;}if(dist>250){n.vx+=(Math.random()-.5)*.2;n.vy+=(Math.random()-.5)*.2;}n.vx*=.95;n.vy*=.95;n.x+=n.vx;n.y+=n.vy;if(n.x<0)n.x=W;if(n.x>W)n.x=0;if(n.y<0)n.y=H;if(n.y>H)n.y=0;const sp=Math.sqrt(n.vx*n.vx+n.vy*n.vy);x.fillStyle=\'hsla(\'+n.hue+\',100%,\'+(60+sp*10)+\'%,\'+(0.5+sp*.2)+\')\';x.fillRect(n.x,n.y,1.5+sp*.5,1.5+sp*.5);});requestAnimationFrame(d);}d();</script></body></html>'
  },
  {
    id: 'NEON_RIPPLE',
    name: 'Neon Ripple',
    category: 'Interactive',
    desc: 'Click anywhere to send ripples',
    preview: 'from-cyan-900 to-black',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000508"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,ripples=[];function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);}window.onresize=init;init();window.onclick=e=>{for(let i=0;i<4;i++)ripples.push({x:e.clientX,y:e.clientY,r:0,maxR:Math.min(W,H)*.6,a:.9,hue:160+i*40,lw:3-i*.5,spd:3+i*2});};window.onmousemove=e=>{if(Math.random()<.03)ripples.push({x:e.clientX,y:e.clientY,r:0,maxR:80,a:.4,hue:180,lw:.8,spd:2});};setInterval(()=>ripples.push({x:Math.random()*W,y:Math.random()*H,r:0,maxR:200+Math.random()*200,a:.3,hue:160+Math.random()*80,lw:.5,spd:1+Math.random()*2}),2000);function draw(){g.fillStyle=\'rgba(0,5,8,0.12)\';g.fillRect(0,0,W,H);ripples=ripples.filter(r=>{r.r+=r.spd;r.a*=.975;g.beginPath();g.arc(r.x,r.y,r.r,0,Math.PI*2);g.strokeStyle=\'hsla(\'+r.hue+\',100%,70%,\'+r.a+\')\';g.lineWidth=r.lw;g.stroke();return r.r<r.maxR&&r.a>.005;});requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'GRAVITY_WELL',
    name: 'Gravity Well',
    category: 'Interactive',
    desc: 'Mouse creates gravitational lensing',
    preview: 'from-indigo-900 to-black',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000208"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,mx=0,my=0,pts=[];function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);pts=[];for(let i=0;i<300;i++)pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,hue:200+Math.random()*80,s:Math.random()*1.5+.5});}window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();function draw(){g.fillStyle=\'rgba(0,2,8,0.1)\';g.fillRect(0,0,W,H);pts.forEach(p=>{const dx=mx-p.x,dy=my-p.y,d=Math.sqrt(dx*dx+dy*dy)+1,f=Math.min(4,8e4/(d*d));p.vx=(p.vx+f*dx/d*.016)*.99;p.vy=(p.vy+f*dy/d*.016)*.99;const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);if(spd>8){p.vx*=8/spd;p.vy*=8/spd;}p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W||p.y<0||p.y>H){p.x=Math.random()*W;p.y=Math.random()*H;p.vx=p.vy=0;}g.fillStyle=\'hsla(\'+p.hue+\',100%,\'+(50+spd*8|0)+\'%,0.8)\';g.beginPath();g.arc(p.x,p.y,p.s,0,7);g.fill();});requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'FLUID_TRAIL',
    name: 'Fluid Trail',
    category: 'Interactive',
    desc: 'Fluid dynamics follow your cursor',
    preview: 'from-teal-900 to-black',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,mx=0,my=0,pmx=0,pmy=0,pts=[];function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);}window.onresize=init;window.onmousemove=e=>{pmx=mx;pmy=my;mx=e.clientX;my=e.clientY;const vx=mx-pmx,vy=my-pmy,spd=Math.sqrt(vx*vx+vy*vy);for(let i=0;i<Math.min(8,spd/3+1);i++)pts.push({x:mx,y:my,vx:vx*.3+(Math.random()-.5)*spd*.4,vy:vy*.3+(Math.random()-.5)*spd*.4,life:1,hue:160+Math.random()*60,s:3+spd*.1});};init();function draw(){g.fillStyle=\'rgba(0,0,0,0.08)\';g.fillRect(0,0,W,H);pts=pts.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=.97;p.vy=p.vy*.97+.05;p.life-=.015;p.s*=.99;if(p.life<=0)return false;const grd=g.createRadialGradient(p.x,p.y,0,p.x,p.y,p.s*3);grd.addColorStop(0,\'hsla(\'+p.hue+\',100%,70%,\'+(p.life*.8)+\')\');grd.addColorStop(1,\'transparent\');g.fillStyle=grd;g.beginPath();g.arc(p.x,p.y,p.s*3,0,7);g.fill();return true;});requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'NEURAL_WEB',
    name: 'Neural Web',
    category: 'Interactive',
    desc: 'Click to spark neural propagation',
    preview: 'from-emerald-900 to-black',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#020408"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,nodes=[];function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);nodes=[];for(let i=0;i<100;i++)nodes.push({x:Math.random()*W,y:Math.random()*H,fire:0});}window.onresize=init;init();window.onclick=e=>{const n=nodes.reduce((a,b)=>Math.hypot(a.x-e.clientX,a.y-e.clientY)<Math.hypot(b.x-e.clientX,b.y-e.clientY)?a:b);n.fire=1;};function draw(){g.fillStyle=\'rgba(2,4,8,0.15)\';g.fillRect(0,0,W,H);nodes.forEach((n,i)=>{n.fire=Math.max(0,n.fire-.03);nodes.slice(i+1).forEach(m=>{const dx=m.x-n.x,dy=m.y-n.y,d=Math.sqrt(dx*dx+dy*dy);if(d<130){const intensity=(n.fire+m.fire)*.5;g.beginPath();g.moveTo(n.x,n.y);g.lineTo(m.x,m.y);g.strokeStyle=\'rgba(16,\'+(185*intensity|0)+\',\'+(129*intensity|0)+\',\'+(0.1+intensity*.6)+\')\';g.lineWidth=.5+intensity*2;g.stroke();if(n.fire>.6&&m.fire<.1&&d<100&&Math.random()<.05)m.fire=n.fire*.7;}});const r=3+n.fire*8,grd=g.createRadialGradient(n.x,n.y,0,n.x,n.y,r);grd.addColorStop(0,\'rgba(16,185,129,\'+(0.3+n.fire*.7)+\')\');grd.addColorStop(1,\'transparent\');g.fillStyle=grd;g.beginPath();g.arc(n.x,n.y,r,0,7);g.fill();});requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'SONAR_PING',
    name: 'Sonar Ping',
    category: 'Interactive',
    desc: 'Radar sweep with depth echoes',
    preview: 'from-green-900 to-black',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000802"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,angle=0,blips=[],pings=[];function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);blips=[];for(let i=0;i<20;i++)blips.push({x:Math.random()*W,y:Math.random()*H,s:Math.random()*3+1,bright:0});}window.onresize=init;window.onclick=e=>{pings.push({x:e.clientX,y:e.clientY,r:0,a:1});};init();function draw(){g.fillStyle=\'rgba(0,8,2,0.15)\';g.fillRect(0,0,W,H);const ox=W/2,oy=H/2,R=Math.min(W,H)*.44;g.strokeStyle=\'rgba(0,255,80,0.15)\';g.lineWidth=.5;for(let i=1;i<5;i++){g.beginPath();g.arc(ox,oy,R*i/4,0,7);g.stroke();}g.beginPath();g.moveTo(ox-R,oy);g.lineTo(ox+R,oy);g.moveTo(ox,oy-R);g.lineTo(ox,oy+R);g.stroke();for(let i=0;i<20;i++){const a=angle-i*.04;g.beginPath();g.moveTo(ox,oy);g.lineTo(ox+Math.cos(a)*R,oy+Math.sin(a)*R);g.strokeStyle=\'rgba(0,255,80,\'+((20-i)/20*.4)+\')\';g.lineWidth=2;g.stroke();}angle+=.04;blips.forEach(b=>{const ba=Math.atan2(b.y-oy,b.x-ox),diff=((angle-ba)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);if(diff<.15)b.bright=1;else b.bright=Math.max(0,b.bright-.008);if(b.bright>0){g.beginPath();g.arc(b.x,b.y,b.s+b.bright*4,0,7);g.fillStyle=\'rgba(0,255,80,\'+b.bright+\')\';g.fill();}});pings=pings.filter(p=>{p.r+=3;p.a*=.96;g.beginPath();g.arc(p.x,p.y,p.r,0,7);g.strokeStyle=\'rgba(100,255,150,\'+p.a+\')\';g.lineWidth=1.5;g.stroke();return p.a>.01;});requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'MAGNETIC_FIELD',
    name: 'Magnetic Field',
    category: 'Interactive',
    desc: 'Mouse is a magnetic pole',
    preview: 'from-rose-900 to-black',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#080002"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,mx=0,my=0,lines=[];function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);lines=[];const step=50;for(let x=step/2;x<W;x+=step)for(let y=step/2;y<H;y+=step)lines.push({ox:x,oy:y,pts:[]});}window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();function fAt(px,py){const dx=mx-px,dy=my-py,d2=dx*dx+dy*dy+1,f=Math.min(2,5e3/d2),d=Math.sqrt(d2);return{fx:f*dx/d,fy:f*dy/d};}function draw(){g.fillStyle=\'rgba(8,0,2,0.2)\';g.fillRect(0,0,W,H);lines.forEach(l=>{l.pts=[];let px=l.ox,py=l.oy;for(let i=0;i<12;i++){l.pts.push([px,py]);const{fx,fy}=fAt(px,py);px+=fx*8;py+=fy*8;if(px<0||px>W||py<0||py>H)break;}if(l.pts.length<2)return;for(let i=0;i<l.pts.length-1;i++){const t=i/l.pts.length;g.beginPath();g.moveTo(l.pts[i][0],l.pts[i][1]);g.lineTo(l.pts[i+1][0],l.pts[i+1][1]);g.strokeStyle=\'hsla(\'+(t*60+310)+\',100%,60%,\'+(t*.7+.1)+\')\';g.lineWidth=.8+t;g.stroke();}const last=l.pts[l.pts.length-1];g.beginPath();g.arc(last[0],last[1],2,0,7);g.fillStyle=\'rgba(255,100,150,0.6)\';g.fill();});requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'LIQUID_CHROME',
    name: 'Liquid Chrome',
    category: 'Abstract',
    desc: 'Metallic liquid morphing surface',
    preview: 'from-slate-800 via-black to-zinc-900',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#050506"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,t=0,mx=0,my=0;function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);}window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();function noise(x,y,t){return Math.sin(x*.008+t)*Math.cos(y*.006+t*1.3)+Math.sin((x+y)*.005+t*.7)*.5+Math.sin(x*.003-y*.004+t*1.7)*.3;}function draw(){t+=.012;const res=6;for(let y=0;y<H;y+=res){for(let x=0;x<W;x+=res){const n=noise(x+(mx-W/2)*.01,y+(my-H/2)*.01,t),n2=noise(x*1.7,y*1.7,t*1.4+1),v=(n+n2)*.5,light=30+v*80+40,sat=5+Math.abs(v)*15,hue=200+v*40;g.fillStyle=\'hsl(\'+hue+\',\'+sat+\'%,\'+(Math.max(0,Math.min(100,light)))+\'%)\';g.fillRect(x,y,res+1,res+1);}}requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'SINE_WAVES',
    name: 'Sine Waves',
    category: 'Abstract',
    desc: 'Layered chromatic wave ribbons',
    preview: 'from-blue-950 via-purple-950 to-black',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#020108"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,t=0,my=0;function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);my=H/2;}window.onresize=init;window.onmousemove=e=>{my=e.clientY};init();const waves=[{hue:200,freq:1.2,amp:.12,speed:1,phase:0},{hue:260,freq:1.8,amp:.09,speed:1.3,phase:1.2},{hue:160,freq:.9,amp:.15,speed:.7,phase:2.5},{hue:300,freq:2.4,amp:.06,speed:1.8,phase:.8},{hue:180,freq:.6,amp:.18,speed:.5,phase:4}];function draw(){g.fillStyle=\'rgba(2,1,8,0.15)\';g.fillRect(0,0,W,H);t+=.02;const cy=H/2+(my-H/2)*.3;waves.forEach((w,wi)=>{g.beginPath();for(let x=0;x<=W;x+=2){const y=cy+Math.sin(x*w.freq*.006+t*w.speed+w.phase)*H*w.amp+Math.sin(x*w.freq*.003-t*w.speed*.5)*H*w.amp*.4;x===0?g.moveTo(x,y):g.lineTo(x,y);}g.strokeStyle=\'hsla(\'+(w.hue+t*10)+\',100%,65%,0.5)\';g.lineWidth=2-wi*.2;g.stroke();});requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'HEX_HIVE',
    name: 'Hex Hive',
    category: 'Abstract',
    desc: 'Living hexagonal pulse matrix',
    preview: 'from-amber-950 via-black to-orange-950',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#050300"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,t=0,mx=0,my=0;function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);mx=W/2;my=H/2;}window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();function hex(x,y,r,fill,stroke,lw){g.beginPath();for(let i=0;i<6;i++){const a=i/6*Math.PI*2-Math.PI/6;i?g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke();}}function draw(){g.fillStyle=\'rgba(5,3,0,0.2)\';g.fillRect(0,0,W,H);t+=.02;const r=36,rw=r*2,rh=r*Math.sqrt(3);for(let row=-2;row<H/rh+2;row++){for(let col=-2;col<W/rw*1.5+2;col++){const x=col*rw*.75,y=row*rh+(col%2?rh/2:0),dx=x-mx,dy=y-my,d=Math.sqrt(dx*dx+dy*dy),wave=Math.sin(d*.03-t*2)*.5+.5,pulse=Math.sin(t*1.5+col*.3+row*.4)*.5+.5,v=wave*.7+pulse*.3,hue=30+v*40,light=v*40+5,alpha=v*.6+.1;if(v>.1)hex(x,y,r*.88,\'hsla(\'+hue+\',90%,\'+light+\'%,\'+alpha+\')\',\'hsla(\'+(hue+20)+\',100%,60%,\'+(alpha*.8)+\')\',0.8);}}requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'COSMIC_DUST',
    name: 'Cosmic Dust',
    category: 'Space',
    desc: 'Nebula dust cloud with auroras',
    preview: 'from-purple-950 via-blue-950 to-black',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#010012"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,dust=[],stars=[],t=0;function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);dust=[];for(let i=0;i<200;i++)dust.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*3+.5,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,hue:200+Math.random()*120,a:Math.random()*.6+.1,drift:Math.random()*6});stars=[];for(let i=0;i<300;i++)stars.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.2,a:Math.random()*.8+.2,f:Math.random()*6});}window.onresize=init;init();function draw(){g.fillStyle=\'rgba(1,0,18,0.08)\';g.fillRect(0,0,W,H);t+=.008;stars.forEach(s=>{g.beginPath();g.arc(s.x,s.y,s.r,0,7);g.fillStyle=\'rgba(255,255,255,\'+(0.2+Math.sin(t*s.f)*.3+.3)+\')\';g.fill();});for(let i=0;i<3;i++){const ax=W*(.2+i*.3),ay=H*.3+Math.sin(t*.5+i)*H*.2,ag=g.createRadialGradient(ax,ay,0,ax,ay,W*.3);ag.addColorStop(0,\'hsla(\'+(260+i*40)+\',100%,50%,0.04)\');ag.addColorStop(1,\'transparent\');g.fillStyle=ag;g.fillRect(0,0,W,H);}dust.forEach(d=>{d.x+=d.vx+Math.sin(t+d.drift)*.1;d.y+=d.vy+Math.cos(t*.7+d.drift)*.1;if(d.x<0)d.x=W;if(d.x>W)d.x=0;if(d.y<0)d.y=H;if(d.y>H)d.y=0;const grd=g.createRadialGradient(d.x,d.y,0,d.x,d.y,d.r*4);grd.addColorStop(0,\'hsla(\'+d.hue+\',100%,80%,\'+d.a+\')\');grd.addColorStop(1,\'transparent\');g.fillStyle=grd;g.beginPath();g.arc(d.x,d.y,d.r*4,0,7);g.fill();});requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'LASER_SCAN',
    name: 'Laser Scan',
    category: 'Cyberpunk',
    desc: 'Rotating laser beams with interference',
    preview: 'from-red-950 via-black to-pink-950',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#040001"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,t=0,mx=0,my=0;function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);}window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();function laser(cx,cy,angle,hue,len,lw){const ex=cx+Math.cos(angle)*len,ey=cy+Math.sin(angle)*len,bx=cx-Math.cos(angle)*len,by=cy-Math.sin(angle)*len;const gl=g.createLinearGradient(bx,by,ex,ey);gl.addColorStop(0,\'transparent\');gl.addColorStop(.5,\'hsla(\'+hue+\',100%,70%,0.12)\');gl.addColorStop(1,\'transparent\');g.beginPath();g.moveTo(bx,by);g.lineTo(ex,ey);g.strokeStyle=gl;g.lineWidth=lw*8;g.stroke();g.beginPath();g.moveTo(bx,by);g.lineTo(ex,ey);g.strokeStyle=\'hsla(\'+hue+\',100%,70%,0.9)\';g.lineWidth=lw;g.stroke();}function draw(){g.fillStyle=\'rgba(4,0,1,0.12)\';g.fillRect(0,0,W,H);t+=.02;const cx=W/2+(mx-W/2)*.2,cy=H/2+(my-H/2)*.2,len=Math.sqrt(W*W+H*H);laser(cx,cy,t,0,len,1);laser(cx,cy,t+Math.PI/3,20,len,.8);laser(cx,cy,t*1.3+Math.PI*.7,340,len*.7,.6);laser(cx,cy,-t*.8+Math.PI*1.4,280,len*.5,.5);for(let i=0;i<6;i++){const a=t*2+i/6*Math.PI*2,r=80+Math.sin(t*3+i)*40,px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r;g.beginPath();g.arc(px,py,3,0,7);g.fillStyle=\'hsla(\'+(i*30)+\',100%,80%,0.8)\';g.fill();const grd=g.createRadialGradient(px,py,0,px,py,20);grd.addColorStop(0,\'hsla(\'+(i*30)+\',100%,70%,0.3)\');grd.addColorStop(1,\'transparent\');g.fillStyle=grd;g.beginPath();g.arc(px,py,20,0,7);g.fill();}requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'OBSERVER',
    name: 'Observer',
    category: 'Cyberpunk',
    desc: 'Pulsing eye with retinal scan',
    preview: 'from-orange-950 via-black to-red-950',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#020100"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,t=0,mx=0,my=0;function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);mx=W/2;my=H/2;}window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();function draw(){g.fillStyle=\'rgba(2,1,0,0.15)\';g.fillRect(0,0,W,H);t+=.015;const cx=W/2,cy=H/2,R=Math.min(W,H)*.28,pulse=.85+Math.sin(t*2)*.15,eyeW=R*2.2*pulse,eyeH=R*.9*(.7+Math.sin(t*1.5)*.3);g.beginPath();g.ellipse(cx,cy,eyeW,eyeH,0,0,Math.PI*2);const eg=g.createRadialGradient(cx,cy,0,cx,cy,eyeW);eg.addColorStop(0,\'rgba(255,200,0,0.08)\');eg.addColorStop(.7,\'rgba(255,80,0,0.04)\');eg.addColorStop(1,\'transparent\');g.fillStyle=eg;g.fill();g.strokeStyle=\'rgba(255,140,0,\'+(0.5+Math.sin(t)*.3)+\')\';g.lineWidth=1.5;g.stroke();const lx=cx+(mx-cx)*.4,ly=cy+(my-cy)*.3,ig=g.createRadialGradient(lx,ly,0,lx,ly,R*.5);ig.addColorStop(0,\'rgba(255,100,0,0.9)\');ig.addColorStop(.4,\'rgba(180,20,0,0.8)\');ig.addColorStop(1,\'rgba(0,0,0,0.95)\');g.beginPath();g.arc(lx,ly,R*.5,0,7);g.fillStyle=ig;g.fill();g.beginPath();g.arc(lx,ly,R*.12,0,7);g.fillStyle=\'rgba(0,0,0,0.98)\';g.fill();g.beginPath();g.arc(lx-R*.06,ly-R*.06,R*.04,0,7);g.fillStyle=\'rgba(255,255,255,0.8)\';g.fill();for(let i=0;i<8;i++){const a=i/8*Math.PI*2+t*.3,r1=R*.55,r2=R*.8+Math.sin(t*3+i)*R*.1;g.beginPath();g.moveTo(lx+Math.cos(a)*r1,ly+Math.sin(a)*r1);g.lineTo(lx+Math.cos(a)*r2,ly+Math.sin(a)*r2);g.strokeStyle=\'rgba(255,140,0,\'+(0.2+Math.sin(t*2+i)*.15)+\')\';g.lineWidth=1;g.stroke();}const scanY=cy-eyeH+((t*80)%(eyeH*2));if(scanY>cy-eyeH&&scanY<cy+eyeH){const sl=g.createLinearGradient(cx-eyeW,scanY,cx+eyeW,scanY);sl.addColorStop(0,\'transparent\');sl.addColorStop(.5,\'rgba(255,200,0,0.12)\');sl.addColorStop(1,\'transparent\');g.fillStyle=sl;g.fillRect(cx-eyeW,scanY,eyeW*2,3);}requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'MATRIX_FLOW',
    name: 'Matrix Flow',
    category: 'Hacker',
    desc: 'Volumetric data cascade',
    preview: 'from-emerald-950 to-black',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,streams=[];const ABC=\'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&アイウエオカキクケコサシスセソ\';function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);streams=[];const cols=Math.floor(W/14);for(let i=0;i<cols;i++)streams.push({x:i*14+7,y:Math.random()*-H,speed:1+Math.random()*3,len:8+Math.floor(Math.random()*20),chars:[],hue:Math.random()>.15?145:0});}window.onresize=init;init();function draw(){g.fillStyle=\'rgba(0,0,0,0.06)\';g.fillRect(0,0,W,H);streams.forEach(s=>{s.y+=s.speed;if(s.y-s.len*14>H){s.y=Math.random()*-100;s.speed=1+Math.random()*3;s.hue=Math.random()>.15?145:0;}for(let i=0;i<s.len;i++){const cy=s.y-i*14;if(cy<0||cy>H)continue;const bright=1-i/s.len;if(i===0)g.fillStyle=\'hsla(\'+s.hue+\',10%,98%,\'+bright+\')\';else g.fillStyle=\'hsla(\'+s.hue+\',100%,\'+(40+bright*35|0)+\'%,\'+(bright*.85)+\')\';g.font=(12+Math.floor(bright*2))+\'px monospace\';if(Math.random()<.1+bright*.1||!s.chars[i])s.chars[i]=ABC[Math.random()*ABC.length|0];g.fillText(s.chars[i],s.x-6,cy);}});requestAnimationFrame(draw);}draw();</script></body></html>'
  },
  {
    id: 'REPULSION_SWARM',
    name: 'Repulsion Swarm',
    category: 'Neural',
    desc: 'Intelligent boid swarm avoids cursor',
    preview: 'from-sky-950 via-black to-cyan-950',
    code: '<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#010408"><canvas id="c"></canvas><script>const c=document.getElementById(\'c\'),g=c.getContext(\'2d\');let W,H,mx=0,my=0,boids=[];function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+\'px\';c.style.height=H+\'px\';g.scale(devicePixelRatio,devicePixelRatio);boids=[];for(let i=0;i<180;i++)boids.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2,hue:180+Math.random()*40});}window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();function draw(){g.fillStyle=\'rgba(1,4,8,0.12)\';g.fillRect(0,0,W,H);boids.forEach(b=>{let ax=0,ay=0,sx=0,sy=0,cx=0,cy=0,cn=0,sn=0;const mdx=b.x-mx,mdy=b.y-my,md=Math.sqrt(mdx*mdx+mdy*mdy);if(md<150&&md>0){ax+=mdx/md*(150-md)*.04;ay+=mdy/md*(150-md)*.04;}boids.forEach(o=>{if(o===b)return;const dx=o.x-b.x,dy=o.y-b.y,d=Math.sqrt(dx*dx+dy*dy);if(d<80&&d>0){if(d<25){sx-=dx/d;sy-=dy/d;sn++;}cx+=o.x;cy+=o.y;cn++;ax+=o.vx*.02;ay+=o.vy*.02;}});if(cn>0){ax+=(cx/cn-b.x)*.003;ay+=(cy/cn-b.y)*.003;}if(sn>0){ax+=sx/sn*.1;ay+=sy/sn*.1;}b.vx=(b.vx+ax)*.97;b.vy=(b.vy+ay)*.97;const spd=Math.sqrt(b.vx*b.vx+b.vy*b.vy);if(spd>4){b.vx*=4/spd;b.vy*=4/spd;}if(spd<.5){b.vx+=(Math.random()-.5)*.3;b.vy+=(Math.random()-.5)*.3;}b.x+=b.vx;b.y+=b.vy;if(b.x<0)b.x=W;if(b.x>W)b.x=0;if(b.y<0)b.y=H;if(b.y>H)b.y=0;const angle=Math.atan2(b.vy,b.vx);g.save();g.translate(b.x,b.y);g.rotate(angle);g.fillStyle=\'hsla(\'+b.hue+\',100%,70%,0.8)\';g.beginPath();g.moveTo(5,0);g.lineTo(-3,2.5);g.lineTo(-3,-2.5);g.closePath();g.fill();g.restore();});requestAnimationFrame(draw);}draw();</script></body></html>'
  }
];
