import React, { useEffect } from "react";
import { useOS } from "../store/osStore";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function WelcomeApp({ id }: { id: string }) {
  const { setHasSeenIntro, closeWindow } = useOS();

  useEffect(() => {
    setHasSeenIntro(true);
  }, [setHasSeenIntro]);

  return (
    <div className="h-full flex items-center justify-center bg-[#050508] text-zinc-100 p-10">
      <div className="max-w-xl w-full rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-4 text-emerald-400">
          <CheckCircle2 size={22} />
          <span className="text-xs uppercase tracking-[0.3em] font-black">System ready</span>
        </div>

        <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-3">
          NexusOS
        </h1>

        <p className="text-sm leading-6 text-zinc-300 mb-8">
          Interface initialisée. Aucun texte d’introduction n’est affiché.
        </p>

        <button
          onClick={() => closeWindow(id)}
          className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-zinc-100 text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-colors"
        >
          <span>Continue</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
