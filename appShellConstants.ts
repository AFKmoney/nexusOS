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
const ch="01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ∑∇⊕⊗#\$@";
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
</script></body></html>`,
  'nexus://procedural/waves': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#050510"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(5,5,16,0.1)';g.fillRect(0,0,W,H);
  t+=0.02;
  for(let i=0;i<5;i++){
    g.beginPath();
    g.strokeStyle=\`hsla(\${180+i*20},100%,60%,0.5)\`;
    g.lineWidth=2;
    for(let x=0;x<W;x+=10){
      let y=H/2+Math.sin(x*0.01+t+i)*100+Math.cos(x*0.02-t*0.5)*50;
      if(x===0)g.moveTo(x,y);else g.lineTo(x,y);
    }
    g.stroke();
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/particles': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#111"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,pts=[],mx=0,my=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
pts=[];for(let i=0;i<100;i++)pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2});}
window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();
function draw(){
  g.clearRect(0,0,W,H);
  pts.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy;
    if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
    g.fillStyle='#0ff';g.beginPath();g.arc(p.x,p.y,2,0,7);g.fill();
    pts.forEach(p2=>{
      let d=Math.hypot(p.x-p2.x,p.y-p2.y);
      if(d<100){g.strokeStyle=\`rgba(0,255,255,\${1-d/100})\`;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p2.x,p2.y);g.stroke();}
    });
    let d=Math.hypot(p.x-mx,p.y-my);
    if(d<150){g.strokeStyle=\`rgba(255,0,255,\${1-d/150})\`;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(mx,my);g.stroke();}
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/starlight': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,stars=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
stars=[];for(let i=0;i<400;i++)stars.push({x:Math.random()*2-1,y:Math.random()*2-1,z:Math.random()});}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(0,0,0,0.2)';g.fillRect(0,0,W,H);
  g.translate(W/2,H/2);
  stars.forEach(s=>{
    s.z-=0.005;if(s.z<=0){s.z=1;s.x=Math.random()*2-1;s.y=Math.random()*2-1;}
    let px=s.x/s.z*W/2,py=s.y/s.z*W/2;
    g.fillStyle=\`rgba(255,255,255,\${1-s.z})\`;
    g.fillRect(px,py,1.5-s.z,1.5-s.z);
  });
  g.resetTransform();
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/hexagons': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#1a1a2e"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function hex(x,y,r){
  g.beginPath();
  for(let i=0;i<6;i++){
    let a=i*Math.PI/3;
    if(i===0)g.moveTo(x+r*Math.cos(a),y+r*Math.sin(a));
    else g.lineTo(x+r*Math.cos(a),y+r*Math.sin(a));
  }
  g.closePath();g.stroke();
}
function draw(){
  g.clearRect(0,0,W,H);
  t+=0.02;
  let s=30, h=s*Math.sqrt(3);
  g.lineWidth=2;
  for(let x=-s;x<W+s;x+=s*1.5){
    for(let y=-h;y<H+h;y+=h){
      let cy=y+(Math.round(x/(s*1.5))%2?h/2:0);
      let dist=Math.hypot(x-W/2,cy-H/2);
      g.strokeStyle=\`hsla(\${(dist-t*50)%360},70%,60%,\${0.2+Math.sin(dist*0.01-t)*0.2})\`;
      hex(x,cy,s*0.9);
    }
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/rain': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#0b0c10"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,drops=[],rips=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
for(let i=0;i<100;i++)drops.push({x:Math.random()*W,y:Math.random()*H,v:5+Math.random()*5,l:10+Math.random()*10});}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(11,12,16,0.3)';g.fillRect(0,0,W,H);
  g.strokeStyle='#45a29e';
  drops.forEach(d=>{
    g.beginPath();g.moveTo(d.x,d.y);g.lineTo(d.x,d.y+d.l);g.stroke();
    d.y+=d.v;
    if(d.y>H){
      d.y=-d.l;d.x=Math.random()*W;
      rips.push({x:d.x,y:H,r:0,a:1});
    }
  });
  for(let i=rips.length-1;i>=0;i--){
    let r=rips[i];
    g.strokeStyle=\`rgba(102,252,241,\${r.a})\`;
    g.beginPath();g.ellipse(r.x,r.y,r.r*2,r.r,0,0,7);g.stroke();
    r.r+=2;r.a-=0.05;
    if(r.a<=0)rips.splice(i,1);
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/fireflies': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000200"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,flies=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
flies=[];for(let i=0;i<150;i++)flies.push({x:Math.random()*W,y:Math.random()*H,a:Math.random()*7,vx:Math.random()-.5,vy:Math.random()-.5});}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(0,2,0,0.1)';g.fillRect(0,0,W,H);
  flies.forEach(f=>{
    f.x+=f.vx+Math.sin(f.a)*0.5;f.y+=f.vy+Math.cos(f.a)*0.5;f.a+=0.05;
    if(f.x<0||f.x>W)f.vx*=-1;if(f.y<0||f.y>H)f.vy*=-1;
    let a=0.5+Math.sin(f.a*2)*0.5;
    g.fillStyle=\`rgba(150,255,100,\${a})\`;
    g.beginPath();g.arc(f.x,f.y,2,0,7);g.fill();
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/neon-grid': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#1a0b2e"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.fillStyle='#1a0b2e';g.fillRect(0,0,W,H);
  t+=2;
  g.translate(W/2,H*0.4);
  g.strokeStyle='#f0f';
  g.lineWidth=2;
  for(let z=10;z<400;z+=20){
    let p=z-(t%20);
    if(p<=0)continue;
    let w=W/(p*0.01), y=H/(p*0.01);
    g.globalAlpha=1-p/400;
    g.beginPath();g.moveTo(-w,y);g.lineTo(w,y);g.stroke();
  }
  for(let x=-20;x<=20;x++){
    g.beginPath();g.moveTo(x*50,H);g.lineTo(x*1000,10000);g.stroke();
  }
  g.globalAlpha=1;
  let rad=g.createRadialGradient(0,-100,0,0,-100,150);
  rad.addColorStop(0,'#ff0');rad.addColorStop(1,'transparent');
  g.fillStyle=rad;g.fillRect(-W,-H,W*2,H*2);
  g.resetTransform();
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/circuit': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#001"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,lines=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
lines=[];}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(0,0,17,0.05)';g.fillRect(0,0,W,H);
  if(Math.random()<0.1)lines.push({x:Math.random()*W,y:Math.random()*H,d:Math.floor(Math.random()*4),l:0});
  g.strokeStyle='#0f0';g.lineWidth=2;
  for(let i=lines.length-1;i>=0;i--){
    let l=lines[i];
    g.beginPath();g.moveTo(l.x,l.y);
    if(l.d===0)l.y-=5;else if(l.d===1)l.x+=5;else if(l.d===2)l.y+=5;else l.x-=5;
    g.lineTo(l.x,l.y);g.stroke();
    l.l++;
    if(Math.random()<0.05)l.d=(l.d+(Math.random()<0.5?1:-1)+4)%4;
    if(l.l>50){
      g.fillStyle='#0f0';g.beginPath();g.arc(l.x,l.y,3,0,7);g.fill();
      lines.splice(i,1);
    }
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/bubbles': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#003"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,bubs=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
for(let i=0;i<50;i++)bubs.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*30+10,v:Math.random()*2+1,o:Math.random()*10});}
window.onresize=init;init();
function draw(){
  let rad=g.createLinearGradient(0,0,0,H);rad.addColorStop(0,'#003');rad.addColorStop(1,'#008');
  g.fillStyle=rad;g.fillRect(0,0,W,H);
  bubs.forEach(b=>{
    b.y-=b.v;b.x+=Math.sin(b.y*0.05+b.o);
    if(b.y<-b.r){b.y=H+b.r;b.x=Math.random()*W;}
    g.strokeStyle='rgba(255,255,255,0.4)';g.lineWidth=2;
    g.beginPath();g.arc(b.x,b.y,b.r,0,7);g.stroke();
    g.fillStyle='rgba(255,255,255,0.1)';g.fill();
    g.fillStyle='rgba(255,255,255,0.6)';g.beginPath();g.arc(b.x-b.r*0.3,b.y-b.r*0.3,b.r*0.2,0,7);g.fill();
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/snow': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#0a192f"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,flakes=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
for(let i=0;i<200;i++)flakes.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*3+1,d:Math.random()*10});}
window.onresize=init;init();
function draw(){
  g.fillStyle='#0a192f';g.fillRect(0,0,W,H);
  g.fillStyle='#fff';
  flakes.forEach(f=>{
    g.beginPath();g.arc(f.x,f.y,f.r,0,7);g.fill();
    f.y+=Math.pow(f.r,0.5);f.x+=Math.sin(f.d)*0.5;f.d+=0.01;
    if(f.y>H){f.y=-f.r;f.x=Math.random()*W;}
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/laser': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(0,0,0,0.2)';g.fillRect(0,0,W,H);
  t+=0.05;
  g.globalCompositeOperation='lighter';
  for(let i=0;i<3;i++){
    let y=H/2+Math.sin(t+i*2)*H*0.4;
    g.strokeStyle=\`hsla(\${i*120},100%,50%,0.8)\`;
    g.lineWidth=10+Math.sin(t*2+i)*5;
    g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();
    g.lineWidth=2;g.strokeStyle='#fff';
    g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();
  }
  g.globalCompositeOperation='source-over';
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/binary': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,cols=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
cols=[];for(let x=0;x<W;x+=20)cols.push({x,y:Math.random()*H,v:1+Math.random()*2});}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(0,0,0,0.1)';g.fillRect(0,0,W,H);
  g.font='16px monospace';
  cols.forEach(c=>{
    g.fillStyle='#0f0';g.fillText(Math.random()>0.5?'1':'0',c.x,c.y);
    c.y+=c.v;if(c.y>H)c.y=0;
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/kaleidoscope': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#111"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(17,17,17,0.1)';g.fillRect(0,0,W,H);
  t+=0.02;
  g.translate(W/2,H/2);
  for(let i=0;i<8;i++){
    g.rotate(Math.PI/4);
    g.beginPath();
    g.strokeStyle=\`hsla(\${t*50},100%,50%,0.5)\`;
    g.lineWidth=4;
    g.moveTo(0,0);
    g.bezierCurveTo(Math.cos(t)*100,Math.sin(t)*100,Math.sin(t*0.5)*200,Math.cos(t*0.5)*200,300,0);
    g.stroke();
  }
  g.resetTransform();
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/swirl': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(0,0,0,0.1)';g.fillRect(0,0,W,H);
  t+=0.05;
  g.translate(W/2,H/2);
  for(let i=0;i<300;i++){
    let a=i*0.1+t;
    let r=i*2;
    let x=r*Math.cos(a), y=r*Math.sin(a);
    g.fillStyle=\`hsla(\${i+t*20},100%,50%,1)\`;
    g.beginPath();g.arc(x,y,2,0,7);g.fill();
  }
  g.resetTransform();
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/fire': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,parts=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
for(let i=0;i<300;i++)parts.push({x:Math.random()*W,y:H+Math.random()*100,s:Math.random()*20+10,v:Math.random()*3+1,h:Math.random()*40});}
window.onresize=init;init();
function draw(){
  g.globalCompositeOperation='source-over';
  g.fillStyle='rgba(0,0,0,0.2)';g.fillRect(0,0,W,H);
  g.globalCompositeOperation='lighter';
  parts.forEach(p=>{
    p.y-=p.v;p.s*=0.97;
    g.fillStyle=\`hsla(\${p.h},100%,50%,0.5)\`;
    g.beginPath();g.arc(p.x,p.y,p.s,0,7);g.fill();
    if(p.s<0.5){p.y=H;p.x=Math.random()*W;p.s=Math.random()*20+10;}
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/pulse': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#1a0033"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(26,0,51,0.1)';g.fillRect(0,0,W,H);
  t-=1;
  g.translate(W/2,H/2);
  for(let i=0;i<10;i++){
    let r=(i*50+t)%500;
    if(r<0)r+=500;
    g.strokeStyle=\`rgba(255,0,255,\${1-r/500})\`;
    g.lineWidth=r/50;
    g.beginPath();g.arc(0,0,r,0,7);g.stroke();
  }
  g.resetTransform();
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/crystal': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#05101a"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.clearRect(0,0,W,H);
  let grad=g.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#05101a');grad.addColorStop(1,'#1a3a5a');
  g.fillStyle=grad;g.fillRect(0,0,W,H);
  t+=0.01;
  g.translate(W/2,H/2);
  for(let i=0;i<5;i++){
    g.rotate(t*0.5);
    g.strokeStyle='rgba(100,200,255,0.5)';g.fillStyle='rgba(100,200,255,0.1)';
    g.beginPath();g.moveTo(0,-200+i*20);g.lineTo(100-i*10,0);g.lineTo(0,200-i*20);g.lineTo(-100+i*10,0);g.closePath();
    g.fill();g.stroke();
  }
  g.resetTransform();
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/constellation': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#030014"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,pts=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
pts=[];for(let i=0;i<120;i++)pts.push({x:Math.random()*W,y:Math.random()*H,v:Math.random()*0.5});}
window.onresize=init;init();
function draw(){
  g.clearRect(0,0,W,H);g.fillStyle='#030014';g.fillRect(0,0,W,H);
  pts.forEach(p=>{
    p.y-=p.v;if(p.y<0)p.y=H;
    g.fillStyle='#fff';g.beginPath();g.arc(p.x,p.y,1.5,0,7);g.fill();
    pts.forEach(p2=>{
      let d=Math.hypot(p.x-p2.x,p.y-p2.y);
      if(d<80){g.strokeStyle=\`rgba(150,200,255,\${1-d/80})\`;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p2.x,p2.y);g.stroke();}
    });
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/cyber-city': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,b=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
b=[];for(let i=0;i<50;i++)b.push({x:Math.random()*W,w:Math.random()*50+20,h:Math.random()*H*0.6,s:Math.random()*2+1,c:Math.random()>0.5?'#0ff':'#f0f'});}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(0,0,0,0.1)';g.fillRect(0,0,W,H);
  b.forEach(i=>{
    i.x-=i.s;if(i.x+i.w<0){i.x=W;i.h=Math.random()*H*0.6;}
    g.strokeStyle=i.c;g.lineWidth=2;
    g.strokeRect(i.x,H-i.h,i.w,i.h);
    g.fillStyle='rgba(20,20,20,0.8)';g.fillRect(i.x,H-i.h,i.w,i.h);
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/clock': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#eceff1"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.clearRect(0,0,W,H);
  let d=new Date(), t=d.getTime()*0.001;
  g.translate(W/2,H/2);
  g.strokeStyle='#263238';g.lineCap='round';
  for(let i=0;i<3;i++){
    g.save();
    g.rotate((t*(i===0?1:i===1?1/60:1/3600))*Math.PI*2);
    g.lineWidth=10-i*2;
    g.beginPath();g.moveTo(0,0);g.lineTo(0,-100-i*50);g.stroke();
    g.restore();
  }
  g.fillStyle='#ff5252';g.beginPath();g.arc(0,0,8,0,7);g.fill();
  g.resetTransform();
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/magnetic': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#222"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,mx=0,my=0,pts=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
pts=[];for(let x=0;x<W;x+=30)for(let y=0;y<H;y+=30)pts.push({x,y});}
window.onresize=init;window.onmousemove=e=>{mx=e.clientX;my=e.clientY};init();
function draw(){
  g.clearRect(0,0,W,H);g.fillStyle='#222';g.fillRect(0,0,W,H);
  g.strokeStyle='#aaa';g.lineWidth=2;
  pts.forEach(p=>{
    let a=Math.atan2(p.y-my,p.x-mx);
    let d=Math.hypot(p.y-my,p.x-mx);
    let l=Math.min(15,d*0.1);
    g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x+Math.cos(a)*l,p.y+Math.sin(a)*l);g.stroke();
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/ink': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#eee"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,drops=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(238,238,238,0.05)';g.fillRect(0,0,W,H);
  if(Math.random()<0.05)drops.push({x:Math.random()*W,y:Math.random()*H,r:0,max:Math.random()*100+50});
  g.fillStyle='rgba(0,0,0,0.1)';
  for(let i=drops.length-1;i>=0;i--){
    let d=drops[i];
    g.beginPath();g.arc(d.x,d.y,d.r,0,7);g.fill();
    d.r+=0.5;if(d.r>d.max)drops.splice(i,1);
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/liquid': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,b=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
b=[];for(let i=0;i<10;i++)b.push({x:Math.random()*W,y:Math.random()*H,vx:Math.random()*4-2,vy:Math.random()*4-2});}
window.onresize=init;init();
function draw(){
  g.clearRect(0,0,W,H);
  b.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy;
    if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
  });
  let d=g.getImageData(0,0,W,H),px=d.data;
  for(let x=0;x<W;x+=5)for(let y=0;y<H;y+=5){
    let sum=0;
    b.forEach(p=>{sum+=10000/((x-p.x)**2+(y-p.y)**2);});
    if(sum>1){g.fillStyle='#0af';g.fillRect(x,y,5,5);}
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/fractal-tree': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#1e1e1e"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function tree(x,y,len,ang){
  if(len<4)return;
  g.beginPath();g.moveTo(x,y);
  let nx=x+Math.cos(ang)*len, ny=y+Math.sin(ang)*len;
  g.lineTo(nx,ny);g.stroke();
  tree(nx,ny,len*0.7,ang-Math.PI/4+Math.sin(t)*0.2);
  tree(nx,ny,len*0.7,ang+Math.PI/4-Math.sin(t)*0.2);
}
function draw(){
  g.clearRect(0,0,W,H);g.fillStyle='#1e1e1e';g.fillRect(0,0,W,H);
  t+=0.02;
  g.strokeStyle='#4caf50';g.lineWidth=2;
  tree(W/2,H,150,-Math.PI/2);
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/triangles': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#2b2b2b"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,pts=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
pts=[];for(let i=0;i<50;i++)pts.push({x:Math.random()*W,y:Math.random()*H,vx:Math.random()-.5,vy:Math.random()-.5});}
window.onresize=init;init();
function draw(){
  g.clearRect(0,0,W,H);g.fillStyle='#2b2b2b';g.fillRect(0,0,W,H);
  pts.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
  });
  g.strokeStyle='rgba(255,255,255,0.1)';
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++)for(let k=j+1;k<pts.length;k++){
    let p1=pts[i],p2=pts[j],p3=pts[k];
    if(Math.hypot(p1.x-p2.x,p1.y-p2.y)<150&&Math.hypot(p2.x-p3.x,p2.y-p3.y)<150&&Math.hypot(p1.x-p3.x,p1.y-p3.y)<150){
      g.fillStyle=\`rgba(0,150,255,\${0.2-Math.hypot(p1.x-p2.x,p1.y-p2.y)/150*0.2})\`;
      g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.lineTo(p3.x,p3.y);g.closePath();g.fill();g.stroke();
    }
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/tunnel': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(0,0,0,0.1)';g.fillRect(0,0,W,H);
  t+=2;
  g.translate(W/2,H/2);
  g.strokeStyle='#0f0';
  for(let i=10;i<200;i+=20){
    let z=i-(t%20);if(z<=0)continue;
    let r=5000/z;
    g.globalAlpha=1-z/200;
    g.beginPath();g.arc(0,0,r,0,7);g.stroke();
  }
  g.globalAlpha=1;
  for(let a=0;a<Math.PI*2;a+=Math.PI/4){
    g.beginPath();g.moveTo(Math.cos(a)*25,Math.sin(a)*25);g.lineTo(Math.cos(a)*500,Math.sin(a)*500);g.stroke();
  }
  g.resetTransform();
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/galaxy': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(0,0,0,0.1)';g.fillRect(0,0,W,H);
  t+=0.01;
  g.translate(W/2,H/2);
  g.rotate(t);
  for(let i=0;i<500;i++){
    let a=i*0.1, r=i;
    g.fillStyle=\`hsla(\${i%360},100%,70%,0.8)\`;
    g.fillRect(Math.cos(a)*r,Math.sin(a)*r,2,2);
    g.fillRect(Math.cos(a+Math.PI)*r,Math.sin(a+Math.PI)*r,2,2);
  }
  g.resetTransform();
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/dna': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#111"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.clearRect(0,0,W,H);g.fillStyle='#111';g.fillRect(0,0,W,H);
  t+=0.05;
  g.translate(W/2,0);
  for(let y=0;y<H;y+=20){
    let x1=Math.sin(y*0.02+t)*100, x2=Math.sin(y*0.02+t+Math.PI)*100;
    g.strokeStyle='rgba(255,255,255,0.2)';g.beginPath();g.moveTo(x1,y);g.lineTo(x2,y);g.stroke();
    g.fillStyle='#f05';g.beginPath();g.arc(x1,y,4,0,7);g.fill();
    g.fillStyle='#05f';g.beginPath();g.arc(x2,y,4,0,7);g.fill();
  }
  g.resetTransform();
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/clouds': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#87ceeb"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,cl=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
cl=[];for(let i=0;i<20;i++)cl.push({x:Math.random()*W,y:Math.random()*H*0.5,s:Math.random()*50+50,v:Math.random()*0.5+0.1});}
window.onresize=init;init();
function draw(){
  g.clearRect(0,0,W,H);g.fillStyle='#87ceeb';g.fillRect(0,0,W,H);
  g.fillStyle='rgba(255,255,255,0.8)';
  cl.forEach(c=>{
    c.x+=c.v;if(c.x-c.s*2>W)c.x=-c.s*2;
    g.beginPath();g.arc(c.x,c.y,c.s,0,7);
    g.arc(c.x+c.s,c.y-c.s*0.5,c.s*0.8,0,7);
    g.arc(c.x-c.s,c.y-c.s*0.3,c.s*0.7,0,7);
    g.fill();
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/vawes-3d': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(0,0,0,1)';g.fillRect(0,0,W,H);
  t+=0.05;
  g.strokeStyle='#0f0';
  for(let y=100;y<H;y+=20){
    g.beginPath();
    for(let x=0;x<W;x+=20){
      let z=Math.sin(x*0.01+t)*Math.cos(y*0.01+t)*50;
      let px=x, py=y-z;
      if(x===0)g.moveTo(px,py);else g.lineTo(px,py);
    }
    g.stroke();
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/hyperspace': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,stars=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
stars=[];for(let i=0;i<300;i++)stars.push({x:Math.random()*2-1,y:Math.random()*2-1,z:Math.random()});}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(0,0,0,0.3)';g.fillRect(0,0,W,H);
  g.translate(W/2,H/2);
  stars.forEach(s=>{
    let px=s.x/s.z*W, py=s.y/s.z*H;
    let ppx=s.x/(s.z+0.05)*W, ppy=s.y/(s.z+0.05)*H;
    s.z-=0.05;if(s.z<=0){s.z=1;s.x=Math.random()*2-1;s.y=Math.random()*2-1;}
    g.strokeStyle=\`hsla(\${s.z*360},100%,70%,\${1-s.z})\`;g.lineWidth=2;
    g.beginPath();g.moveTo(ppx,ppy);g.lineTo(px,py);g.stroke();
  });
  g.resetTransform();
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/geometry': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#111"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(17,17,17,0.1)';g.fillRect(0,0,W,H);
  t+=0.01;
  g.translate(W/2,H/2);
  for(let i=0;i<6;i++){
    g.rotate(t+i);
    g.strokeStyle=\`hsla(\${i*60+t*100},70%,50%,0.8)\`;
    g.lineWidth=2;
    g.strokeRect(-100,-100,200,200);
    g.beginPath();g.arc(0,0,150,0,7);g.stroke();
  }
  g.resetTransform();
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/lava': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#200"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  let rad=g.createLinearGradient(0,0,0,H);rad.addColorStop(0,'#400');rad.addColorStop(1,'#f40');
  g.fillStyle=rad;g.fillRect(0,0,W,H);
  t+=0.02;
  g.fillStyle='rgba(255,100,0,0.5)';
  for(let i=0;i<10;i++){
    g.beginPath();
    let cx=W/2+Math.sin(t+i)*W*0.3, cy=H-Math.cos(t*0.5+i)*H*0.5;
    g.arc(cx,cy,50+Math.sin(t*2+i)*30,0,7);g.fill();
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/blocks': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#eee"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,b=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
b=[];for(let x=0;x<W;x+=40)for(let y=0;y<H;y+=40)b.push({x,y,o:Math.random()*10});}
window.onresize=init;init();
function draw(){
  g.clearRect(0,0,W,H);
  let t=Date.now()*0.002;
  b.forEach(i=>{
    let s=20+Math.sin(t+i.o)*20;
    g.fillStyle=\`hsl(\${i.o*36},60%,60%)\`;
    g.fillRect(i.x+20-s/2,i.y+20-s/2,s,s);
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/nodes': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#101"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,n=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
n=[];for(let i=0;i<40;i++)n.push({x:Math.random()*W,y:Math.random()*H,vx:Math.random()-.5,vy:Math.random()-.5});}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(17,0,17,0.2)';g.fillRect(0,0,W,H);
  g.strokeStyle='#f0f';g.lineWidth=1;
  n.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
    n.forEach(p2=>{
      if(Math.hypot(p.x-p2.x,p.y-p2.y)<150){g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p2.x,p2.y);g.stroke();}
    });
    g.fillStyle='#fff';g.beginPath();g.arc(p.x,p.y,3,0,7);g.fill();
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/ocean': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#001a33"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,t=0;
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(0,26,51,0.2)';g.fillRect(0,0,W,H);
  t+=0.02;
  for(let i=0;i<4;i++){
    g.fillStyle=\`hsla(200,100%,\${50-i*10}%,0.4)\`;
    g.beginPath();g.moveTo(0,H);
    for(let x=0;x<=W;x+=20){
      g.lineTo(x,H*0.5+i*40+Math.sin(x*0.01+t+i)*50+Math.sin(x*0.02-t*1.5)*20);
    }
    g.lineTo(W,H);g.fill();
  }
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
  'nexus://procedural/petals': `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#fce4ec"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
let W,H,p=[];
function init(){W=innerWidth;H=innerHeight;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.width=W+'px';c.style.height=H+'px';g.scale(devicePixelRatio,devicePixelRatio);
p=[];for(let i=0;i<50;i++)p.push({x:Math.random()*W,y:Math.random()*H,a:Math.random()*Math.PI*2,v:Math.random()*2+1,s:Math.random()*10+5});}
window.onresize=init;init();
function draw(){
  g.fillStyle='rgba(252,228,236,0.2)';g.fillRect(0,0,W,H);
  p.forEach(i=>{
    i.x+=Math.cos(i.a)*i.v;i.y+=Math.sin(i.a)*i.v+1;i.a+=0.05;
    if(i.y>H+20){i.y=-20;i.x=Math.random()*W;}
    g.fillStyle='#f48fb1';
    g.save();g.translate(i.x,i.y);g.rotate(i.a);
    g.beginPath();g.ellipse(0,0,i.s,i.s*0.5,0,0,7);g.fill();
    g.restore();
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
};

// Detect both nexus:// protocol URIs and inline HTML strings
export const isWallpaperHtmlDocument = (wallpaper: string) =>
  wallpaper.startsWith('nexus://procedural/') ||
  wallpaper.startsWith('<!DOCTYPE') ||
  wallpaper.startsWith('<html') ||
  wallpaper.startsWith('/home/') ||   // VFS paths (user-generated wallpapers)
  wallpaper.startsWith('/system/');   // VFS paths (system wallpapers)

export const getDesktopPath = (userId?: string | null) => `/home/${userId || DESKTOP_DIR_FALLBACK_USER}/Desktop`;
