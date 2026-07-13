import React, { useState, useRef, useEffect } from 'react';

export function Resizer({ onDrag }: { onDrag: (dx: number) => void }) {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      onDrag(e.movementX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onDrag]);

  return (
    <div
      className="w-1 hover:w-1.5 hover:bg-[#007ACC] bg-[#2D2D2D] cursor-col-resize shrink-0 transition-all z-10"
      onMouseDown={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
    />
  );
}
