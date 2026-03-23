// ── Cron/Scheduler System ─────────────────────────────────────────────────
// Allows kernel-level periodic task execution

export interface CronJob {
  id: string;
  name: string;
  intervalMs: number;
  callback: () => void;
  lastRun: number;
  enabled: boolean;
}

class CronScheduler {
  private jobs: Map<string, CronJob> = new Map();
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();

  register(name: string, intervalMs: number, callback: () => void): string {
    const id = uuid();
    const job: CronJob = { id, name, intervalMs, callback, lastRun: 0, enabled: true };
    this.jobs.set(id, job);
    this.startJob(id);
    return id;
  }

  private startJob(id: string) {
    const job = this.jobs.get(id);
    if (!job || !job.enabled) return;
    const timer = setInterval(() => {
      job.callback();
      job.lastRun = Date.now();
    }, job.intervalMs);
    this.timers.set(id, timer);
  }

  unregister(id: string) {
    const timer = this.timers.get(id);
    if (timer) clearInterval(timer);
    this.timers.delete(id);
    this.jobs.delete(id);
  }

  pause(id: string) {
    const job = this.jobs.get(id);
    if (job) job.enabled = false;
    const timer = this.timers.get(id);
    if (timer) { clearInterval(timer); this.timers.delete(id); }
  }

  resume(id: string) {
    const job = this.jobs.get(id);
    if (job) { job.enabled = true; this.startJob(id); }
  }

  listJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  getJob(id: string): CronJob | undefined {
    return this.jobs.get(id);
  }
}

export const cronScheduler = new CronScheduler();
