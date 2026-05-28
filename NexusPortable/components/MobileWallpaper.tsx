import React, { useEffect, useMemo, useRef } from 'react';
import { useOS } from '../../store/osStore';
import { PROCEDURAL_WALLPAPERS } from '../../appShellConstants';
import { vfs } from '../../kernel/fileSystem';

// Pointer/touch bridge injected into animated wallpaper iframes. The wallpaper
// runs in a sandboxed iframe behind the touch-native shell, so it never receives
// native input. We forward pointer + touch activity from the host and re-dispatch
// it as synthetic mouse events so cursor/touch-reactive wallpapers respond.
const POINTER_BRIDGE = `<script>
(function(){
  window.addEventListener('message', function(ev){
    var d = ev.data;
    if(!d || d.__nexusPointer !== true) return;
    var init = { clientX: d.x, clientY: d.y, bubbles: true, cancelable: true, view: window };
    try {
      var evt = new MouseEvent(d.kind, init);
      window.dispatchEvent(evt);
      if (document.body) document.body.dispatchEvent(evt);
    } catch (e) {}
  });
})();
</script>`;

const isHtmlDocument = (s: string) =>
  s.startsWith('<!DOCTYPE') || s.startsWith('<html');

function withPointerBridge(html: string): string {
  if (html.includes('</body>')) return html.replace('</body>', POINTER_BRIDGE + '</body>');
  if (html.includes('</html>')) return html.replace('</html>', POINTER_BRIDGE + '</html>');
  return html + POINTER_BRIDGE;
}

// Built-in animated fallback (neural particle field) used when the selected
// wallpaper is not a self-contained HTML document.
function ParticleFallback() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }> = [];
    const COUNT = 60;
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    let t = 0;
    const draw = () => {
      t += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height * 0.3, 0,
        canvas.width / 2, canvas.height * 0.3, canvas.height
      );
      grad.addColorStop(0, 'rgba(16,185,129,0.07)');
      grad.addColorStop(0.5, 'rgba(5,5,8,0.0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16,185,129,${p.alpha * (0.7 + 0.3 * Math.sin(t + p.x * 0.01))})`;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i]!.x - particles[j]!.x;
          const dy = particles[i]!.y - particles[j]!.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(particles[i]!.x, particles[i]!.y);
            ctx.lineTo(particles[j]!.x, particles[j]!.y);
            ctx.strokeStyle = `rgba(16,185,129,${0.08 * (1 - dist / 80)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

export default function MobileWallpaper() {
  const { wallpaper } = useOS();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Resolve the active wallpaper (shared with desktop) into an HTML document or
  // fall back to the built-in animated particle field.
  const doc = useMemo<string | null>(() => {
    if (!wallpaper) return null;
    if (wallpaper.startsWith('nexus://procedural/')) {
      const html = PROCEDURAL_WALLPAPERS[wallpaper];
      return html ? withPointerBridge(html) : null;
    }
    if (isHtmlDocument(wallpaper)) return withPointerBridge(wallpaper);
    if (wallpaper.startsWith('/')) {
      const content = vfs.readFile(wallpaper) ?? '';
      return isHtmlDocument(content) ? withPointerBridge(content) : null;
    }
    return null;
  }, [wallpaper]);

  // Forward touch + pointer activity into the animated iframe.
  useEffect(() => {
    if (!doc) return;

    const post = (kind: 'mousemove' | 'click', x: number, y: number) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      win.postMessage({ __nexusPointer: true, kind, x, y }, '*');
    };

    const onMove = (e: MouseEvent) => post('mousemove', e.clientX, e.clientY);
    const onClick = (e: MouseEvent) => post('click', e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) post('mousemove', t.clientX, t.clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) post('click', t.clientX, t.clientY);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('click', onClick, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchstart', onTouchStart);
    };
  }, [doc]);

  return (
    <div className="fixed inset-0 z-0" style={{ background: 'var(--nx-surface)' }}>
      {doc ? (
        <iframe
          ref={iframeRef}
          srcDoc={doc}
          className="absolute inset-0 w-full h-full border-none pointer-events-none"
          sandbox="allow-scripts"
          title="wallpaper"
        />
      ) : (
        <ParticleFallback />
      )}
    </div>
  );
}
