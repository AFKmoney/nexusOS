import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { vfs } from '../kernel/fileSystem';
import { RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';

export default function WebRunnerApp({ windowId }: { windowId: string }) {
  const { windows, updateWindow, addNotification } = useOS();
  const win = windows.find(w => w.id === windowId);
  const path = win?.data?.path || '';
  const lastUpdate = win?.data?.lastUpdate || 0;

  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  const loadContent = () => {
    if (!path) {
        setError("No file specified.");
        return;
    }
    const fileContent = vfs.readFile(path);
    if (fileContent === null) {
        setError(`File not found: ${path}`);
    } else if (fileContent.trim().length === 0) {
        setError(`File is empty: ${path}`);
    } else {
        // Double check against markdown artifacts
        const cleanContent = fileContent.replace(/^```html/i, '').replace(/```$/i, '');
        setContent(cleanContent);
        setError('');
    }
  };

  useEffect(() => {
    loadContent();
  }, [path, lastUpdate]);

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWindow(windowId, { data: { ...win?.data, path: e.target.value } });
  };

  return (
    <div className="h-full flex flex-col bg-white text-black">
      {/* Address Bar */}
      <div className="flex items-center gap-2 p-2 bg-zinc-100 border-b border-zinc-300">
        <div className="flex-1 bg-white border border-zinc-300 rounded px-2 py-1 text-base font-mono flex items-center">
            <span className="text-zinc-500 select-none mr-2">runner://</span>
            <input 
                className="flex-1 outline-none bg-transparent"
                value={path}
                onChange={handlePathChange}
                onKeyDown={(e) => e.key === 'Enter' && loadContent()}
            />
        </div>
        <button onClick={loadContent} className="p-1 hover:bg-zinc-200 rounded text-zinc-600">
            <RefreshCw size={18} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-white">
        {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 p-4 text-center">
                <AlertTriangle size={48} className="mb-4" />
                <h3 className="font-bold mb-2">Application Error</h3>
                <p className="font-mono bg-red-50 p-2 rounded">{error}</p>
            </div>
        ) : (
            <iframe 
                srcDoc={content}
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                title="AI App Runner"
            />
        )}
      </div>
    </div>
  );
}
