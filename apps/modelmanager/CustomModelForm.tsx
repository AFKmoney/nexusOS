import React from 'react';
import { Download, Info } from 'lucide-react';

interface CustomModelFormProps {
  customRepo: string;
  customFile: string;
  onSetCustomRepo: (v: string) => void;
  onSetCustomFile: (v: string) => void;
  onSubmit: () => void;
}

export const CustomModelForm: React.FC<CustomModelFormProps> = ({
  customRepo, customFile, onSetCustomRepo, onSetCustomFile, onSubmit,
}) => {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-start gap-3">
        <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300/70 leading-relaxed">
          Enter any Hugging Face repository ID and GGUF filename to add a custom model. NexusOS downloads and registers models with the built-in local inference engine; no LM Studio dependency is required.
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5">Repository ID</div>
          <input
            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/40 transition-all font-mono"
            placeholder="e.g. bartowski/Llama-3.2-3B-Instruct-GGUF"
            value={customRepo}
            onChange={(e) => onSetCustomRepo(e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5">GGUF Filename</div>
          <input
            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/40 transition-all font-mono"
            placeholder="e.g. Llama-3.2-3B-Instruct-Q4_K_M.gguf"
            value={customFile}
            onChange={(e) => onSetCustomFile(e.target.value)}
          />
        </div>
        <button
          onClick={onSubmit}
          disabled={!customRepo || !customFile}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-30"
        >
          <Download size={16} /> Register Model
        </button>
      </div>
    </div>
  );
};
