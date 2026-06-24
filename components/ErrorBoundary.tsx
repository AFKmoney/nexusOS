import React from 'react';
import { Terminal, AlertTriangle } from 'lucide-react';
import { eventBus } from '../kernel/eventBus';

type ErrorBoundaryProps = {
  appId: string;
  windowId: string;
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.appId} crashed:`, error, errorInfo);
    // Send event to DAEMON for self-healing
    eventBus.emit('daemon:urgent', `APP_CRASH: ${this.props.appId} crashed with error "${error.message}". DAEMON MUST read the source code of this app in /apps/ and rewrite it to fix the crash.`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 h-full bg-[#111] text-zinc-300 font-mono text-sm text-center">
          <AlertTriangle size={32} className="text-red-500 mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-red-500 mb-2">CRITICAL PROCESS FAILURE</h2>
          <p className="text-zinc-400 mb-4 max-w-sm">
            Process <span className="text-cyan-400 font-bold">{this.props.appId}</span> encountered a fatal runtime exception. DAEMON autonomy has been engaged for emergency repair.
          </p>
          <div className="bg-black/50 p-4 rounded text-left w-full overflow-auto max-h-40 text-xs border border-red-500/20 text-red-400/80 font-mono break-words whitespace-pre-wrap">
             {this.state.error?.message || "Unknown error"}
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-emerald-500 text-xs animate-pulse">
            <Terminal size={14} />
            <span>AWAITING KERNEL REBUILD...</span>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}