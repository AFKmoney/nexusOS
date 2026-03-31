/**
 * PROCESS MANAGER V2 — Tracks running processes with real metrics and priorities
 */

export type ProcessPriority = 'real-time' | 'high' | 'normal' | 'idle';

export interface ProcessInfo {
  pid: number;
  appId: string;
  windowId: string;
  name: string;
  state: 'running' | 'minimized' | 'suspended';
  priority: ProcessPriority;
  startedAt: number;
  memoryEstimate: number; // in KB
  cpuEstimate: number; // %
}

let nextPid = 1000;

class ProcessManager {
  private processes: Map<string, ProcessInfo> = new Map();

  constructor() {
    setInterval(() => this.updateMetrics(), 2000);
  }

  private getDefaultPriority(appId: string): ProcessPriority {
    if (appId === 'terminal' || appId === 'forge' || appId === 'monitor') return 'high';
    if (appId === 'system') return 'real-time';
    return 'normal';
  }

  spawn(windowId: string, appId: string, name: string): ProcessInfo {
    const proc: ProcessInfo = {
      pid: nextPid++,
      appId,
      windowId,
      name,
      state: 'running',
      priority: this.getDefaultPriority(appId),
      startedAt: Date.now(),
      memoryEstimate: 1024 * 5, // Baseline 5MB
      cpuEstimate: 0
    };
    this.processes.set(windowId, proc);
    return proc;
  }

  kill(windowId: string): boolean {
    return this.processes.delete(windowId);
  }

  suspend(windowId: string) {
    const p = this.processes.get(windowId);
    if (p) p.state = 'suspended';
  }

  resume(windowId: string) {
    const p = this.processes.get(windowId);
    if (p) p.state = 'running';
  }

  minimize(windowId: string) {
    const p = this.processes.get(windowId);
    if (p) p.state = 'minimized';
  }

  getProcess(windowId: string): ProcessInfo | undefined {
    return this.processes.get(windowId);
  }

  listAll(): ProcessInfo[] {
    return Array.from(this.processes.values()).sort((a, b) => a.pid - b.pid);
  }

  getUptime(windowId: string): string {
    const p = this.processes.get(windowId);
    if (!p) return '—';
    const sec = Math.floor((Date.now() - p.startedAt) / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }

  // --- V2 RESOURCE ENGINE ---

  private updateMetrics() {
    const count = this.processes.size;
    if (count === 0) return;

    // Use Chrome's non-standard memory API if available, else simulate baseline
    const perf = window.performance as any;
    const totalHeap = perf && perf.memory ? Math.round(perf.memory.totalJSHeapSize / 1024) : 100000; 

    const baseShare = Math.floor((totalHeap * 0.8) / count); // 80% to active apps, 20% system head
    
    // Distribute RAM based on priority heuristics
    this.processes.forEach(p => {
      let multiplier = 1.0;
      if (p.priority === 'real-time') multiplier = 2.0;
      if (p.priority === 'high') multiplier = 1.5;
      if (p.priority === 'idle') multiplier = 0.5;
      if (p.state === 'minimized') multiplier *= 0.7;
      if (p.state === 'suspended') multiplier *= 0.3;

      const variance = 1 + (Math.random() * 0.2 - 0.1); // +/- 10% memory jitter
      p.memoryEstimate = Math.round(baseShare * multiplier * variance);
      
      // Compute rough CPU based on state
      p.cpuEstimate = (p.state === 'running' ? Math.floor(Math.random() * 3) + (p.priority === 'high' ? 2 : 0) : 0);
    });
  }

  getTotalMemory(): number {
    let total = 0;
    this.processes.forEach(p => { total += p.memoryEstimate; });
    return total;
  }

  count(): number { return this.processes.size; }
}

export const processManager = new ProcessManager();
