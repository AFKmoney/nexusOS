import React, { RefObject } from 'react';
import { Play } from 'lucide-react';

interface PreviewPaneProps {
  content: string;
  previewRef: RefObject<HTMLIFrameElement | null>;
}

// The right-hand live HTML preview shown when an .html file is open
// and the user has toggled Preview on. Renders the active tab's content
// inside a sandboxed iframe.
export const PreviewPane: React.FC<PreviewPaneProps> = ({ content, previewRef }) => {
  return (
    <div className="w-full flex flex-col bg-[#1E1E1E]">
      <div className="h-10 bg-[#252526] border-b border-[#333] flex items-center px-4 gap-3 shrink-0 shadow-sm z-10">
        <div className="p-1.5 bg-accent/20 rounded-md">
          <Play size={12} className="text-accent" />
        </div>
        <span className="text-xs font-bold text-[#CCCCCC] tracking-wide uppercase">Live Render Engine</span>
        <span className="text-[10px] font-mono text-[#858585] ml-auto border border-[#3C3C3C] px-2 py-0.5 rounded bg-[#1E1E1E]">about:blank</span>
      </div>
      <iframe
        ref={previewRef}
        className="flex-1 w-full h-full border-none bg-[#1E1E1E]"
        sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
        srcDoc={content}
        title="Preview"
      />
    </div>
  );
};
