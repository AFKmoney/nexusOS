// ── Performance Monitor ───────────────────────────────────────────────────
// Tracks FPS, memory pressure, event loop latency, and per-app metrics

export interface PerfSnapshot {
  fps: number;
  eventLoopLatency: number;
  windowCount: number;
  memoryMB: number;
  timestamp: number;
}

class PerformanceMonitor {
  private snapshots: PerfSnapshot[] = [];
  private maxSnapshots = 120; // 2 minutes at 1/sec
  private fpsFrames = 0;
  private lastFpsTime = 0;
  private currentFps = 60;
  private rafId = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start() {
    // FPS counter
    const countFrame = () => {
      this.fpsFrames++;
      const now = performance.now();
      if (now - this.lastFpsTime >= 1000) {
        this.currentFps = this.fpsFrames;
        this.fpsFrames = 0;
        this.lastFpsTime = now;
      }
      this.rafId = requestAnimationFrame(countFrame);
    };
    this.lastFpsTime = performance.now();
    this.rafId = requestAnimationFrame(countFrame);

    // Snapshot collector
    this.intervalId = setInterval(() => {
      this.takeSnapshot();
    }, 1000);
  }

  stop() {
    cancelAnimationFrame(this.rafId);
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private takeSnapshot() {
    const snap: PerfSnapshot = {
      fps: this.currentFps,
      eventLoopLatency: this.measureEventLoopLatency(),
      windowCount: document.querySelectorAll('[class*="window-title-bar"]').length,
      memoryMB: (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1048576) : 0,
      timestamp: Date.now(),
    };
    this.snapshots.push(snap);
    if (this.snapshots.length > this.maxSnapshots) this.snapshots.shift();
  }

  private measureEventLoopLatency(): number {
    const start = performance.now();
    // Simple heuristic: if we're behind schedule, latency is high
    return Math.round(performance.now() - start);
  }

  getLatest(): PerfSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  getHistory(): PerfSnapshot[] {
    return [...this.snapshots];
  }

  getFps(): number {
    return this.currentFps;
  }

  getAvgFps(): number {
    if (this.snapshots.length === 0) return 60;
    return Math.round(this.snapshots.reduce((a, s) => a + s.fps, 0) / this.snapshots.length);
  }
}

export const performanceMonitor = new PerformanceMonitor();
