import React, { useEffect, useMemo, useRef } from 'react';
import { PROCEDURAL_WALLPAPERS } from '../appShellConstants';
import { vfs, SYSTEM_VFS_APP_ID } from '../kernel/fileSystem';
import { useOS } from '../store/osStore';

// Maximum parallax shift, in pixels, at full motion strength.
const MAX_PARALLAX_PX = 26;

type DesktopWallpaperProps = {
  wallpaper: string;
};

// Bootstrap injected into every animated wallpaper iframe. The desktop renders
// wallpapers in a `pointer-events-none` sandboxed iframe so that desktop icons
// and windows stay interactive — which means the iframe never receives native
// mouse events. Without this bridge, every "reactive" wallpaper (cursor swarm,
// gravity well, ripples, etc.) would silently fail to react. We forward pointer
// activity from the parent via postMessage and re-dispatch it as synthetic
// MouseEvents so the wallpaper's own `window.onmousemove` / `onclick` handlers
// fire exactly as their authors intended.
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
    } catch (e) { /* older engines: ignore */ }
  });
})();
</script>`;

// Heuristic: is this a self-contained animated HTML document?
const isHtmlDocument = (s: string) =>
  s.startsWith('<!DOCTYPE') || s.startsWith('<html');

// Inject the pointer bridge into an HTML wallpaper document.
function withPointerBridge(html: string): string {
  if (html.includes('</body>')) {
    return html.replace('</body>', POINTER_BRIDGE + '</body>');
  }
  if (html.includes('</html>')) {
    return html.replace('</html>', POINTER_BRIDGE + '</html>');
  }
  return html + POINTER_BRIDGE;
}

export default function DesktopWallpaper({ wallpaper }: DesktopWallpaperProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const motionStrength = useOS(state => state.wallpaperMotionStrength);
  const motionRef = useRef(motionStrength);
  motionRef.current = motionStrength;

  // Resolve the wallpaper value into either an HTML document string (animated)
  // or an image URL (static). Returns null when nothing renders.
  const resolved = useMemo<{ kind: 'html'; doc: string } | { kind: 'image'; url: string } | null>(() => {
    if (!wallpaper) return null;

    if (wallpaper.startsWith('nexus://procedural/')) {
      const html = PROCEDURAL_WALLPAPERS[wallpaper];
      return html ? { kind: 'html', doc: withPointerBridge(html) } : null;
    }

    if (isHtmlDocument(wallpaper)) {
      return { kind: 'html', doc: withPointerBridge(wallpaper) };
    }

    // VFS path (user-generated or system wallpapers saved as files)
    if (wallpaper.startsWith('/')) {
      const content = vfs.readFile(wallpaper, SYSTEM_VFS_APP_ID) ?? '';
      if (isHtmlDocument(content)) {
        return { kind: 'html', doc: withPointerBridge(content) };
      }
      return null;
    }

    return { kind: 'image', url: wallpaper };
  }, [wallpaper]);

  // Forward desktop pointer activity into the animated iframe.
  // Throttled with requestAnimationFrame to avoid jank — without this,
  // every mousemove triggers a style mutation on the iframe, causing
  // layout thrashing.
  useEffect(() => {
    if (!resolved || resolved.kind !== 'html') return;

    let rafId: number | null = null;
    let lastMoveEvent: MouseEvent | null = null;

    const post = (kind: 'mousemove' | 'click', e: MouseEvent) => {
      const win = iframeRef.current?.contentWindow;
      if (win) win.postMessage({ __nexusPointer: true, kind, x: e.clientX, y: e.clientY }, '*');
    };

    const applyParallax = (e: MouseEvent) => {
      const el = iframeRef.current;
      if (!el) return;
      const strength = motionRef.current ?? 0;
      if (strength === 0) return;
      const offsetX = ((e.clientX / window.innerWidth) - 0.5) * 2 * MAX_PARALLAX_PX * strength;
      const offsetY = ((e.clientY / window.innerHeight) - 0.5) * 2 * MAX_PARALLAX_PX * strength;
      el.style.transform = `scale(1.06) translate(${-offsetX}px, ${-offsetY}px)`;
    };

    const onMove = (e: MouseEvent) => {
      lastMoveEvent = e;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (lastMoveEvent) {
            post('mousemove', lastMoveEvent);
            applyParallax(lastMoveEvent);
          }
        });
      }
    };
    const onClick = (e: MouseEvent) => post('click', e);

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('click', onClick, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [resolved]);

  if (!resolved) return null;

  if (resolved.kind === 'html') {
    return (
      <iframe
        ref={iframeRef}
        srcDoc={resolved.doc}
        className="absolute inset-0 w-full h-full border-none pointer-events-none"
        style={{ transform: 'scale(1.06)', transition: 'transform 0.18s ease-out', willChange: 'transform' }}
        sandbox="allow-scripts"
        title="wallpaper"
      />
    );
  }

  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url('${resolved.url}')` }}
    />
  );
}
