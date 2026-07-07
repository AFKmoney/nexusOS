// components/SnapOverlay.tsx
import React from 'react';
import { computeSnapRect } from '../kernel/windowManager/snapEngine.ts';
import { TASKBAR_RESERVED } from '../kernel/windowManager/constants.ts';
import type { SnapZone } from '../kernel/windowManager/types.ts';

// Translucent rectangle shown while dragging a window toward a snap zone.
// Purely visual — pointer-events disabled so it never interferes with the drag.
export const SnapOverlay: React.FC<{ zone: SnapZone }> = ({ zone }) => {
  const vp = { width: window.innerWidth, height: window.innerHeight - TASKBAR_RESERVED };
  const r = computeSnapRect(zone, vp);
  return (
    <div
      className="fixed pointer-events-none border-2 border-emerald-400/60 bg-emerald-400/15 rounded-xl transition-all duration-100"
      style={{
        left: r.x,
        top: r.y,
        width: r.width,
        height: r.height,
        zIndex: 9400, // just below OVERLAY_UI (9500) and the picker, above normal windows
        boxShadow: '0 0 40px rgba(16,185,129,0.3)',
      }}
    />
  );
};
