import React from 'react';
import { Code, Copy, Search, GitBranch, WrapText, Sparkles, Settings2, Layout } from 'lucide-react';
import { useOS } from '../../store/osStore';
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
    { id: 'project', icon: Layout, title: 'Project Overview' },
  ];

  return (
    <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-2 shrink-0 z-20 relative">
      <div className="w-8 h-8 rounded flex items-center justify-center mb-2">
        <Code size={24} className="text-[#007ACC]" />
      </div>
      {panels.map(({ id, icon: Icon, title }) => (
        <button
          key={id}
          title={title}
          onClick={() => onTogglePanel(id)}
          className={`w-10 h-10 rounded flex items-center justify-center transition-all relative ${
            sidePanel === id && showSide
              ? 'text-white'
              : 'text-[#858585] hover:text-white'
          }`}
        >
          {sidePanel === id && showSide && (
            <div className="absolute left-[-4px] top-1 bottom-1 w-0.5 bg-[#007ACC]" />
          )}
          <Icon size={24} strokeWidth={1.5} />
        </button>
      ))}
      <div className="flex-1" />
      <button
        title="Toggle Word Wrap"
        onClick={onToggleWordWrap}
        className={`w-10 h-10 rounded flex items-center justify-center transition-all ${
          wordWrap
            ? 'text-[#007ACC]'
            : 'text-[#858585] hover:text-white'
        }`}
      >
        <WrapText size={22} strokeWidth={1.5} />
      </button>
      <button
        title="Toggle AI Composer (Cmd+L)"
        onClick={onToggleAI}
        className={`w-10 h-10 rounded flex items-center justify-center transition-all ${
          showAI
            ? 'text-[#007ACC]'
            : 'text-[#858585] hover:text-[#007ACC]'
        }`}
      >
        <Sparkles size={22} strokeWidth={1.5} />
      </button>
      <button
        title="Settings"
        onClick={() => { useOS.getState().openWindow('settings'); }}
        className="w-10 h-10 rounded flex items-center justify-center text-[#858585] hover:text-white transition-all mt-2"
      >
        <Settings2 size={24} strokeWidth={1.5} />
      </button>
    </div>
  );
};
