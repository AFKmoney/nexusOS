
import React, { Suspense } from 'react';

const TerminalCore = React.lazy(() => import('./terminal/TerminalCore'));

export default function TerminalApp({ windowId }: { windowId: string }) {
    return (
        <Suspense
            fallback={
                <div className="h-full w-full bg-black text-emerald-400 font-mono text-sm flex items-center justify-center">
                    Loading terminal core...
                </div>
            }
        >
            <TerminalCore />
        </Suspense>
    );
}
