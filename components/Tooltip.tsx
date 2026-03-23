import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export default function Tooltip({ text, children, position = 'top', delay = 400 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const triggerRef = useRef<HTMLDivElement>(null);

  const show = () => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        switch (position) {
          case 'top': setCoords({ x: rect.left + rect.width / 2, y: rect.top - 6 }); break;
          case 'bottom': setCoords({ x: rect.left + rect.width / 2, y: rect.bottom + 6 }); break;
          case 'left': setCoords({ x: rect.left - 6, y: rect.top + rect.height / 2 }); break;
          case 'right': setCoords({ x: rect.right + 6, y: rect.top + rect.height / 2 }); break;
        }
      }
      setVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const positionClass: Record<string, string> = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
    right: '-translate-y-1/2',
  };

  return (
    <>
      <div ref={triggerRef} onMouseEnter={show} onMouseLeave={hide} className="inline-flex">
        {children}
      </div>
      {visible && (
        <div
          className={`fixed z-[10000] px-2.5 py-1 text-[11px] text-white bg-zinc-800/95 border border-white/10 rounded-lg shadow-xl pointer-events-none backdrop-blur-sm ${positionClass[position]}`}
          style={{ left: coords.x, top: coords.y }}
        >
          {text}
        </div>
      )}
    </>
  );
}
