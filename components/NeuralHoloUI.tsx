import React, { useState, useEffect } from 'react';
import { eventBus, OS_EVENTS } from '../kernel/eventBus';

interface HoloElement {
  id: string;
  type: 'text' | 'box' | 'line';
  content?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  duration?: number;
}

export function NeuralHoloUI() {
  const [elements, setElements] = useState<HoloElement[]>([]);

  useEffect(() => {
    const handleDraw = (payload: any) => {
      const newElement: HoloElement = {
        id: `holo_${Date.now()}_${Math.random()}`,
        type: payload.type || 'text',
        content: payload.content,
        x: payload.x || 0,
        y: payload.y || 0,
        width: payload.width,
        height: payload.height,
        color: payload.color || 'rgba(16, 185, 129, 0.8)', // Default Matrix Green
        duration: payload.duration || 5000,
      };

      setElements((prev) => [...prev, newElement]);

      // Auto-remove after duration
      if (newElement.duration && newElement.duration > 0) {
        setTimeout(() => {
          setElements((prev) => prev.filter((el) => el.id !== newElement.id));
        }, newElement.duration);
      }
    };

    const unsubscribe = eventBus.on(OS_EVENTS.DAEMON_DRAW_HOLO, handleDraw);
    return () => unsubscribe();
  }, []);

  if (elements.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {elements.map((el) => {
        if (el.type === 'text') {
          return (
            <div
              key={el.id}
              className="absolute font-mono text-sm tracking-widest animate-pulse drop-shadow-md"
              style={{
                left: el.x,
                top: el.y,
                color: el.color,
                textShadow: `0 0 10px ${el.color}, 0 0 20px ${el.color}`,
              }}
            >
              {el.content}
            </div>
          );
        }
        
        if (el.type === 'box') {
          return (
            <div
              key={el.id}
              className="absolute border-2 animate-pulse"
              style={{
                left: el.x,
                top: el.y,
                width: el.width || 100,
                height: el.height || 100,
                borderColor: el.color,
                boxShadow: `0 0 15px ${el.color} inset, 0 0 15px ${el.color}`,
              }}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
