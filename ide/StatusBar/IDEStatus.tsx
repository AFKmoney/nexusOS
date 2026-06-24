
import React from 'react';
import { GitBranch, Wifi, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';

export const IDEStatus = ({ isAiWorking, lineCount }: { isAiWorking: boolean, lineCount: number }) => {
  return (
    <div className="h-6 bg-[#18181b] border-t border-white/5 flex items-center justify-between px-3 text-[9px] font-medium text-zinc-500 uppercase tracking-tight shrink-0 select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-emerald-500">
          <GitBranch size={10} />
          <span>main*</span>
        </div>
        <div className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors">
          <CheckCircle2 size={10} className="text-emerald-500" />
          <span>No Problems</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isAiWorking ? (
          <div className="flex items-center gap-1.5 text-purple-400 animate-pulse">
            <Cpu size={10} />
            <span>Neural Synthesis...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-zinc-400 opacity-60">
            <Sparkles size={10} />
            <span>AI Ready</span>
          </div>
        )}
        <div className="flex gap-3">
          <span>Ln {lineCount}, Col 1</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span className="text-emerald-500 font-bold tracking-widest">TypeScript</span>
        </div>
      </div>
    </div>
  );
};
