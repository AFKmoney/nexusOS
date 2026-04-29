
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
    desc: 'Evolving neural network',
    preview: 'from-cyan-950 via-black to-blue-950',
    code: 'NEURAL_STORM'
  },
  {
    id: 'STARFIELD',
    name: 'Hyperspace',
    category: 'Space',
    desc: 'Warp-speed hyperspace',
    preview: 'from-blue-950 via-black to-indigo-950',
    code: 'STARFIELD'
  },
  {
    id: 'CYBER_GRID',
    name: 'Neon Grid',
    category: 'Cyberpunk',
    desc: 'Reactive neon retro grid',
    preview: 'from-purple-950 via-black to-fuchsia-950',
    code: 'CYBER_GRID'
  },
  {
    id: 'MATRIX_CORE',
    name: 'Matrix Core',
    category: 'Hacker',
    desc: 'Green digital rain',
    preview: 'from-green-950 via-black to-emerald-950',
    code: 'MATRIX_CORE'
  },
  {
    id: 'QUANTUM_FIELD',
    name: 'Quantum Field',
    category: 'Neural',
    desc: 'Particle interaction field',
    preview: 'from-blue-950 via-indigo-950 to-black',
    code: 'QUANTUM_FIELD'
  },
  {
    id: 'FRACTAL_ORBIT',
    name: 'Fractal Orbit',
    category: 'Abstract',
    desc: 'Sacred geometry orbits',
    preview: 'from-emerald-950 via-black to-purple-950',
    code: 'FRACTAL_ORBIT'
  },
  {
    id: 'MOUSE_PARTICLES',
    name: 'Cursor Swarm',
    category: 'Interactive',
    desc: 'Particles swarm your cursor',
    preview: 'from-blue-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,mx=0,my=0,p=[];
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);}
r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY;};
for(let i=0;i<200;i++)p.push({x:Math.random()*W,y:Math.random()*H,vx:0,vy:0});
function d(){
  x.fillStyle='rgba(0,0,0,0.1)';x.fillRect(0,0,W,H);
  p.forEach(n=>{
    let dx=mx-n.x, dy=my-n.y, dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<200 && dist>0){ n.vx+=dx/dist*0.5; n.vy+=dy/dist*0.5; }
    n.vx*=0.95; n.vy*=0.95;
    n.x+=n.vx; n.y+=n.vy;
    if(n.x<0)n.x=W; if(n.x>W)n.x=0; if(n.y<0)n.y=H; if(n.y>H)n.y=0;
    x.fillStyle='#0f8';x.fillRect(n.x,n.y,2,2);
  });
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'NEON_RIPPLE',
    name: 'Neon Ripple',
    category: 'Interactive',
    desc: 'Grid ripples with movement',
    preview: 'from-purple-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,mx=-1000,my=-1000;
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);}
r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY;};
function d(){
  x.fillStyle='rgba(0,0,0,0.1)';x.fillRect(0,0,W,H);
  x.strokeStyle='rgba(200,0,255,0.5)';
  for(let i=0;i<W;i+=40){
    for(let j=0;j<H;j+=40){
      let dx=mx-i, dy=my-j, dist=Math.sqrt(dx*dx+dy*dy);
      let s = Math.max(1, 20 - dist/20);
      x.strokeRect(i-s/2,j-s/2,s,s);
    }
  }
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'GRAVITY_WELL',
    name: 'Gravity Well',
    category: 'Interactive',
    desc: 'Cursor acts as a black hole',
    preview: 'from-slate-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,mx=0,my=0,p=[];
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);mx=W/2;my=H/2;}
r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY;};
for(let i=0;i<300;i++)p.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2});
function d(){
  x.fillStyle='rgba(0,0,0,0.2)';x.fillRect(0,0,W,H);
  p.forEach(n=>{
    let dx=mx-n.x, dy=my-n.y, dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>5){ n.vx+=dx/dist/dist*50; n.vy+=dy/dist/dist*50; }
    n.x+=n.vx; n.y+=n.vy;
    x.fillStyle='#fff';x.fillRect(n.x,n.y,1.5,1.5);
  });
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'LASER_GRID',
    name: 'Laser Scan',
    category: 'Cyberpunk',
    desc: 'Lasers follow cursor',
    preview: 'from-red-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,mx=0,my=0;
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);}
r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY;};
function d(){
  x.fillStyle='rgba(0,0,0,0.1)';x.fillRect(0,0,W,H);
  x.strokeStyle='rgba(255,0,0,0.8)';
  x.beginPath();x.moveTo(0,my);x.lineTo(W,my);x.stroke();
  x.beginPath();x.moveTo(mx,0);x.lineTo(mx,H);x.stroke();
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'CONNECT_NODES',
    name: 'Neural Web',
    category: 'Neural',
    desc: 'Nodes connect to cursor',
    preview: 'from-emerald-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,mx=-1000,my=-1000,p=[];
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);}
r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY;};
for(let i=0;i<100;i++)p.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5),vy:(Math.random()-.5)});
function d(){
  x.fillStyle='#000';x.fillRect(0,0,W,H);
  p.forEach(n=>{
    n.x+=n.vx; n.y+=n.vy;
    if(n.x<0||n.x>W)n.vx*=-1;if(n.y<0||n.y>H)n.vy*=-1;
    let dist=Math.hypot(mx-n.x,my-n.y);
    if(dist<150){
      x.strokeStyle="rgba(0,255,150,"+(1-dist/150)+")";
      x.beginPath();x.moveTo(mx,my);x.lineTo(n.x,n.y);x.stroke();
    }
    x.fillStyle='#0f8';x.fillRect(n.x,n.y,2,2);
  });
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'FLUID_TRAIL',
    name: 'Fluid Trail',
    category: 'Interactive',
    desc: 'Trail follows cursor',
    preview: 'from-fuchsia-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,p=[],t=0;
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);}
r();onresize=r;onmousemove=e=>{
  for(let i=0;i<5;i++)p.push({x:e.clientX,y:e.clientY,vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,l:1,c:t*10});
};
function d(){
  t+=0.1;x.fillStyle='rgba(0,0,0,0.1)';x.fillRect(0,0,W,H);
  for(let i=p.length-1;i>=0;i--){
    let n=p[i];n.x+=n.vx;n.y+=n.vy;n.l-=0.02;
    if(n.l<=0){p.splice(i,1);continue;}
    x.fillStyle="hsla("+n.c+",100%,50%,"+n.l+")";
    x.beginPath();x.arc(n.x,n.y,n.l*10,0,Math.PI*2);x.fill();
  }
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'HEX_HIVE',
    name: 'Hex Hive',
    category: 'Abstract',
    desc: 'Hexagon grid response',
    preview: 'from-amber-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,mx=-100,my=-100;
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);}
r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY;};
function hex(cx,cy,s){
  x.beginPath();
  for(let i=0;i<6;i++){
    let a=Math.PI/3*i;
    x.lineTo(cx+s*Math.cos(a),cy+s*Math.sin(a));
  }
  x.closePath();x.stroke();
}
function d(){
  x.fillStyle='#000';x.fillRect(0,0,W,H);
  let s=30, h=s*Math.sqrt(3);
  for(let i=0;i<W/s+2;i++){
    for(let j=0;j<H/h+2;j++){
      let cx=i*s*1.5, cy=j*h+(i%2?h/2:0);
      let dist=Math.hypot(mx-cx,my-cy);
      x.strokeStyle="rgba(255,150,0,"+Math.max(0.1, 1-dist/300)+")";
      hex(cx,cy,s-2);
    }
  }
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'DIGITAL_RAIN_INT',
    name: 'Matrix Flow',
    category: 'Hacker',
    desc: 'Rain parts around mouse',
    preview: 'from-green-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,mx=-1000,my=-1000,drops=[];
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);drops=Array(Math.floor(innerWidth/16)).fill(0);}
r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY;};
function d(){
  x.fillStyle='rgba(0,0,0,0.1)';x.fillRect(0,0,W,H);
  x.fillStyle='#0f0';x.font='15px monospace';
  drops.forEach((y,i)=>{
    let px=i*16, py=y*16;
    let dist=Math.hypot(mx-px,my-py);
    if(dist<100) py+=100-dist;
    x.fillText(Math.random()>0.5?"1":"0",px,py);
    if(py>H&&Math.random()>0.97)drops[i]=0;
    drops[i]++;
  });
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'MAGNETIC_FIELD',
    name: 'Magnetic Field',
    category: 'Interactive',
    desc: 'Vectors align to cursor',
    preview: 'from-cyan-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,mx=0,my=0;
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);}
r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY;};
function d(){
  x.fillStyle='#000';x.fillRect(0,0,W,H);
  x.strokeStyle='#0cf';
  for(let i=20;i<W;i+=40){
    for(let j=20;j<H;j+=40){
      let dx=mx-i, dy=my-j;
      let angle=Math.atan2(dy,dx);
      let dist=Math.hypot(dx,dy);
      let len=Math.min(20, 2000/dist);
      x.beginPath();x.moveTo(i,j);
      x.lineTo(i+Math.cos(angle)*len, j+Math.sin(angle)*len);
      x.stroke();
    }
  }
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'COSMIC_DUST',
    name: 'Cosmic Dust',
    category: 'Space',
    desc: 'Cursor illuminates dust',
    preview: 'from-indigo-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,mx=-1000,my=-1000,p=[];
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);}
r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY;};
for(let i=0;i<1000;i++)p.push({x:Math.random()*W,y:Math.random()*H});
function d(){
  x.fillStyle='rgba(0,0,0,0.1)';x.fillRect(0,0,W,H);
  p.forEach(n=>{
    let dist=Math.hypot(mx-n.x,my-n.y);
    if(dist<200){
      x.fillStyle="rgba(150,100,255,"+(1-dist/200)+")";
      x.beginPath();x.arc(n.x,n.y,Math.random()*3,0,7);x.fill();
    }
  });
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'WAVE_INTERACT',
    name: 'Sine Waves',
    category: 'Abstract',
    desc: 'Mouse distorts waves',
    preview: 'from-teal-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,mx=-1000,my=-1000,t=0;
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);}
r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY;};
function d(){
  t+=0.05;x.fillStyle='rgba(0,0,0,0.1)';x.fillRect(0,0,W,H);
  for(let j=0;j<H;j+=30){
    x.beginPath();
    for(let i=0;i<=W;i+=10){
      let dist=Math.hypot(mx-i,my-j);
      let py=j+Math.sin(i/50+t)*20;
      if(dist<150) py+=Math.sin(dist/20-t*2)*(150-dist)*0.5;
      if(i==0)x.moveTo(i,py); else x.lineTo(i,py);
    }
    x.strokeStyle="hsla("+(j/H*360)+",80%,60%,0.5)";x.stroke();
  }
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'SONAR_PING',
    name: 'Sonar Ping',
    category: 'Interactive',
    desc: 'Sonar waves from cursor',
    preview: 'from-emerald-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,rings=[];
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);}
r();onresize=r;
onmousemove=e=>{if(Math.random()>0.9)rings.push({x:e.clientX,y:e.clientY,r:0});};
onclick=e=>{rings.push({x:e.clientX,y:e.clientY,r:0,thick:true});};
function d(){
  x.fillStyle='rgba(0,0,0,0.1)';x.fillRect(0,0,W,H);
  for(let i=rings.length-1;i>=0;i--){
    let p=rings[i]; p.r+=5;
    if(p.r>W) {rings.splice(i,1);continue;}
    x.beginPath();x.arc(p.x,p.y,p.r,0,7);
    x.strokeStyle="rgba(0,255,150,"+(1-p.r/W)+")";
    x.lineWidth=p.thick?5:1;x.stroke();
  }
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'REPEL_SWARM',
    name: 'Repulsion Swarm',
    category: 'Neural',
    desc: 'Particles fear cursor',
    preview: 'from-rose-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,mx=-1000,my=-1000,p=[];
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);}
r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY;};
for(let i=0;i<400;i++)p.push({ox:Math.random()*10000,oy:Math.random()*10000});
function d(){
  x.fillStyle='rgba(0,0,0,0.2)';x.fillRect(0,0,W,H);
  p.forEach((n,i)=>{
    let tx=(n.ox+Date.now()/50)%W, ty=(n.oy+Date.now()/50)%H;
    let dist=Math.hypot(mx-tx,my-ty);
    if(dist<150){ tx-=(mx-tx)/dist*(150-dist); ty-=(my-ty)/dist*(150-dist); }
    x.fillStyle='#f05';x.fillRect(tx,ty,2,2);
  });
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'FOLLOW_EYES',
    name: 'Observer',
    category: 'Cyberpunk',
    desc: 'Eyes watch cursor',
    preview: 'from-zinc-900 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,mx=0,my=0;
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);mx=W/2;my=H/2;}
r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY;};
function d(){
  x.fillStyle='#000';x.fillRect(0,0,W,H);
  for(let i=50;i<W;i+=100){
    for(let j=50;j<H;j+=100){
      x.fillStyle='#fff';x.beginPath();x.arc(i,j,20,0,7);x.fill();
      let angle=Math.atan2(my-j,mx-i);
      x.fillStyle='#f00';x.beginPath();x.arc(i+Math.cos(angle)*10,j+Math.sin(angle)*10,8,0,7);x.fill();
    }
  }
  requestAnimationFrame(d);
}d();</script></body></html>`
  },
  {
    id: 'LIQUID_CHROME',
    name: 'Liquid Chrome',
    category: 'Abstract',
    desc: 'Metallic liquid surface',
    preview: 'from-gray-700 to-black',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let W,H,mx=0,my=0,t=0;
function r(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);}
r();onresize=r;onmousemove=e=>{mx=e.clientX;my=e.clientY;};
function d(){
  t+=0.05;x.fillStyle='#000';x.fillRect(0,0,W,H);
  for(let i=0;i<W;i+=20){
    for(let j=0;j<H;j+=20){
      let dist=Math.hypot(mx-i,my-j);
      let a=Math.sin(i/50+t)+Math.cos(j/50+t);
      let s=Math.max(2, 10+a*5 - (dist<200?(200-dist)/20:0));
      x.fillStyle="hsl(0,0%,"+(50+a*20)+"%)";
      x.beginPath();x.arc(i,j,s,0,7);x.fill();
    }
  }
  requestAnimationFrame(d);
}d();</script></body></html>`
  }
];
