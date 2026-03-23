/**
 * PROCESS MANAGER — Tracks all running "processes" (windows) with PID, state, and lifetime
 */

export interface ProcessInfo {
  pid: number;
  appId: string;
  windowId: string;
  name: string;
  state: 'running' | 'minimized' | 'suspended';
  startedAt: number;
  memoryEstimate: number; // in KB, simulated
}

let nextPid = 1000;

class ProcessManager {
  private processes: Map<string, ProcessInfo> = new Map();

  spawn(windowId: string, appId: string, name: string): ProcessInfo {
    const proc: ProcessInfo = {
      pid: nextPid++,
      appId,
      windowId,
      name,
      state: 'running',
      startedAt: Date.now(),
      memoryEstimate: Math.round(2000 + Math.random() * 8000),
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

  getTotalMemory(): number {
    let total = 0;
    this.processes.forEach(p => { total += p.memoryEstimate; });
    return total;
  }

  count(): number { return this.processes.size; }
}

export const processManager = new ProcessManager();
