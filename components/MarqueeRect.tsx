// components/MarqueeRect.tsx
import React from 'react';

// Box-select rectangle drawn on the desktop while the user drags from empty space.
// Purely visual — pointer-events disabled.
export const MarqueeRect: React.FC<{ start: { x: number; y: number }; end: { x: number; y: number } }> = ({ start, end }) => {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return (
    <div
      className="fixed pointer-events-none border border-emerald-400/60 bg-emerald-400/10 rounded-sm"
      style={{ left, top, width, height, zIndex: 9300 }}
    />
  );
};
