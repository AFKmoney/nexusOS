import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { sounds } from '../kernel/sounds';

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    sounds.lock();
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[9998] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center cursor-pointer" onClick={onUnlock}>
      <div className="text-7xl font-extralight text-white mb-2 tracking-wider">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-lg text-zinc-500 mb-12">
        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
      <div className="flex items-center gap-2 text-zinc-600 text-sm animate-pulse">
        <Lock size={14} /> Click anywhere to unlock
      </div>
    </div>
  );
}