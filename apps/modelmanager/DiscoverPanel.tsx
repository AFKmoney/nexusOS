import React from 'react';
import {
  Search, Download, CheckCircle, AlertCircle, Loader2,
  Star, FileText,
} from 'lucide-react';
import type { CatalogModel, DownloadStatus } from './shared';
import { sizeLabelForModel } from './shared';

interface DiscoverPanelProps {
  searchQuery: string;
  isSearchingRemote: boolean;
  allDiscoverModels: CatalogModel[];
  downloadStatus: Record<string, DownloadStatus>;
  selectedModelKey: string;
  onSetSearchQuery: (v: string) => void;
  onSelectModel: (key: string) => void;
  onDownload: (model: CatalogModel) => void;
  onPickFilename: (model: CatalogModel) => void;
  isInstalledModel: (model: CatalogModel) => boolean;
}

export const DiscoverPanel: React.FC<DiscoverPanelProps> = (props) => {
  const {
    searchQuery, isSearchingRemote, allDiscoverModels,
    downloadStatus, selectedModelKey,
    onSetSearchQuery, onSelectModel, onDownload, onPickFilename,
    isInstalledModel,
  } = props;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-2.5 text-zinc-600" />
        <input
          className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/40 transition-all"
          placeholder="Search models on Hugging Face..."
          value={searchQuery}
          onChange={(e) => onSetSearchQuery(e.target.value)}
        />
        {isSearchingRemote && (
          <div className="absolute right-3 top-2.5">
            <Loader2 size={16} className="text-emerald-500 animate-spin" />
          </div>
        )}
      </div>

      {allDiscoverModels.map((model) => {
        const key = `${model.repoId}/${model.filename}`;
        const statusKey = model.repoId;
        const dl = downloadStatus[statusKey];
        const isInstalled = isInstalledModel(model);
        const isSelected = selectedModelKey === key;
        return (
          <div key={key} className={`p-4 rounded-xl border transition-all ${isSelected ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <div className="text-base font-bold text-white">{model.name}</div>
                  <div className="flex items-center gap-0.5 text-yellow-400 text-xs">
                    <Star size={12} fill="currentColor" /> {model.rating}
                  </div>
                  <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase tracking-widest text-zinc-500">
                    {sizeLabelForModel(model)}
                  </div>
                </div>
                <div className="text-xs text-zinc-500 mb-2">{model.description}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-zinc-600 font-mono">{model.author}</span>
                  <span className="text-xs text-zinc-500">·</span>
                  <button
                    onClick={() => onPickFilename(model)}
                    className="text-xs text-zinc-600 flex items-center gap-1 hover:text-emerald-400 transition-colors"
                  >
                    <FileText size={12} /> {model.filename}
                  </button>
                  {model.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-xs">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                <button
                  onClick={() => onSelectModel(key)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest border transition-all ${isSelected ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300'}`}
                >
                  Select
                </button>

                {isInstalled ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                    <CheckCircle size={16} /> Installed
                  </div>
                ) : dl?.state === 'downloading' ? (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 text-blue-400 text-xs">
                      <Loader2 size={14} className="animate-spin" /> {dl.pct}%
                    </div>
                    <div className="text-xs text-zinc-600 max-w-[120px] text-right truncate">{dl.msg}</div>
                  </div>
                ) : dl?.state === 'done' ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                    <CheckCircle size={16} /> Ready
                  </div>
                ) : dl?.state === 'error' ? (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 text-red-400 text-xs">
                      <AlertCircle size={14} /> Failed
                    </div>
                    <button
                      onClick={() => onDownload(model)}
                      className="text-xs text-zinc-600 hover:text-white underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onDownload(model)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all hover:scale-105"
                  >
                    <Download size={14} /> Download
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
