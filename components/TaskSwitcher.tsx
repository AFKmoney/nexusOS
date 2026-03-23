import React, { useEffect, useState } from 'react';
import { useOS } from '../store/osStore';
import { Box } from 'lucide-react';

export default function TaskSwitcher() {
  const { windows, focusWindow, registry } = useOS();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Trigger with Ctrl + Q
      if (e.ctrlKey && e.key === 'q') {
        e.preventDefault();
        setIsOpen(true);
        setSelectedIndex((prev) => (windows.length > 0 ? (prev + 1) % windows.length : 0));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        if (isOpen) {
          setIsOpen(false);
          const winToFocus = windows[selectedIndex];
          if (winToFocus) {
            focusWindow(winToFocus.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, selectedIndex, windows, focusWindow]);

  if (!isOpen || windows.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-md flex items-center justify-center pointer-events-none animate-in fade-in duration-150">
      <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-3xl flex gap-4 overflow-x-auto items-center justify-center">
        {windows.map((win, i) => {
          const app = registry.find(a => a.id === win.appId);
          const Icon = app?.icon || Box;
          const isSelected = i === selectedIndex;
          
          return (
            <div 
              key={win.id}
              className={`flex flex-col items-center justify-center w-32 h-32 rounded-xl transition-all duration-200 ${
                isSelected ? 'bg-white/10 border border-white/20 scale-110 shadow-xl' : 'opacity-60 scale-95 border border-transparent'
              }`}
            >
              <Icon size={48} className={isSelected ? 'text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'text-zinc-500'} />
              <div className={`mt-4 text-xs font-bold text-center truncate w-full px-2 ${isSelected ? 'text-white' : 'text-zinc-500'}`}>
                {app?.name}
              </div>
              <div className="text-[9px] text-zinc-600 truncate w-full px-2 text-center mt-1">
                {win.title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
