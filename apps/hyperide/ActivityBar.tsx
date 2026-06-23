import React from 'react';
import { Code, Copy, Search, GitBranch, WrapText, Sparkles, Settings2 } from 'lucide-react';
import type { SidePanelKind } from './types';

interface ActivityBarProps {
  sidePanel: SidePanelKind;
  showSide: boolean;
  showAI: boolean;
  wordWrap: boolean;
  onTogglePanel: (id: SidePanelKind) => void;
  onToggleWordWrap: () => void;
  onToggleAI: () => void;
}

// Left-most vertical icon strip: file explorer / search / git toggles,
// plus word-wrap and AI-panel toggles at the bottom. Pure presentational
// component — all state lives in the parent.
export const ActivityBar: React.FC<ActivityBarProps> = ({
  sidePanel,
  showSide,
  showAI,
  wordWrap,
  onTogglePanel,
  onToggleWordWrap,
  onToggleAI,
}) => {
  const panels: { id: SidePanelKind; icon: typeof Copy; title: string }[] = [
    { id: 'files', icon: Copy, title: 'Explorer' },
    { id: 'search', icon: Search, title: 'Search' },
    { id: 'git', icon: GitBranch, title: 'Source Control' },
  ];

  return (
    <div className="w-14 bg-black/60 backdrop-blur-xl border-r border-white/5 flex flex-col items-center py-4 gap-3 shrink-0 shadow-xl z-20 relative">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
        <Code size={18} className="text-white" />
      </div>

      {panels.map(({ id, icon: Icon, title }) => (
        <button
          key={id}
          title={title}
          onClick={() => onTogglePanel(id)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group ${
            sidePanel === id && showSide
              ? 'bg-white/10 text-white shadow-inner'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          {sidePanel === id && showSide && (
            <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
          )}
          <Icon size={20} className="group-hover:scale-110 transition-transform" />
        </button>
      ))}

      <div className="flex-1" />

      <button
        title="Toggle Word Wrap"
        onClick={onToggleWordWrap}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          wordWrap
            ? 'bg-blue-500/20 text-blue-400'
            : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
        }`}
      >
        <WrapText size={18} />
      </button>
      <button
        title="Toggle Neural Engine"
        onClick={onToggleAI}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          showAI
            ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            : 'text-zinc-500 hover:text-emerald-400 hover:bg-white/5'
        }`}
      >
        <Sparkles size={20} />
      </button>
      <button
        title="Settings"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all mt-2"
      >
        <Settings2 size={20} />
      </button>
    </div>
  );
};
