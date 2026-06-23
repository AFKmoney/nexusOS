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
    <div className="w-1/2 flex flex-col bg-white">
      <div className="h-10 bg-zinc-100 border-b border-zinc-300 flex items-center px-4 gap-3 shrink-0 shadow-sm z-10">
        <div className="p-1.5 bg-emerald-500/20 rounded-md">
          <Play size={12} className="text-emerald-600" />
        </div>
        <span className="text-xs font-bold text-zinc-800 tracking-wide uppercase">Live Render Engine</span>
        <span className="text-[10px] font-mono text-zinc-400 ml-auto border border-zinc-200 px-2 py-0.5 rounded bg-white">about:blank</span>
      </div>
      <iframe
        ref={previewRef}
        className="flex-1 w-full h-full border-none bg-white"
        sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
        srcDoc={content}
        title="Preview"
      />
    </div>
  );
};
