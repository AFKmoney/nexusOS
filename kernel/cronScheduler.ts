// ── Cron/Scheduler System ─────────────────────────────────────────────────
// Allows kernel-level periodic task execution with Cron expressions and persistence

import { uuid } from '../utils/uuid';
import { eventBus } from './eventBus';
import { kernelLog } from './log';

const STORAGE_KEY = 'nexus_cron_v2';

export interface CronJob {
  id: string;
  name: string;
  expression: string | null; // e.g., "*/5 * * * *" or null for pure interval
  intervalMs: number | null;
  actionCmd: string; // The command or event to trigger
  lastRun: number;
  enabled: boolean;
  history: { time: number, status: 'success' | 'error' }[];
}

class CronScheduler {
  private jobs: Map<string, CronJob> = new Map();
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private cronTickTimer: ReturnType<typeof setInterval> | null = null;
  private isLoaded = false;

  constructor() {
    // Delay load to ensure browser API is ready
    setTimeout(() => {
      this.load();
      this.startCronTick();
    }, 100);
  }

  private save() {
    if (!this.isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.jobs.values())));
    } catch (e) {
      kernelLog.warn('[CronScheduler] Save failed:', e);
    }
  }

  private load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: CronJob[] = JSON.parse(saved);
        parsed.forEach(job => {
          this.jobs.set(job.id, job);
          if (job.enabled && job.intervalMs) {
            this.startIntervalJob(job.id);
          }
        });
      }
    } catch (e) {
      kernelLog.warn('[CronScheduler] Load failed:', e);
    }
    this.isLoaded = true;
  }

  private startCronTick() {
    // Check every minute at exactly the top of the minute
    const now = new Date();
    const msToNextMin = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    setTimeout(() => {
      this.tick();
      this.cronTickTimer = setInterval(() => this.tick(), 60000);
    }, msToNextMin);
  }

  private tick() {
    const now = new Date();
    this.jobs.forEach(job => {
      if (job.enabled && job.expression && this.matchCron(job.expression, now)) {
        this.executeJob(job);
      }
    });
  }

  private matchCron(expr: string, date: Date): boolean {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return false;

    const minutePart = parts[0];
    const hourPart = parts[1];
    const dayOfMonthPart = parts[2];
    const monthPart = parts[3];
    const dayOfWeekPart = parts[4];

    const m = date.getMinutes();
    const h = date.getHours();
    const dom = date.getDate();
    const mon = date.getMonth() + 1;
    const dow = date.getDay();

    const matchPart = (part: string | undefined, val: number) => {
      if (!part) return false;
      if (part === '*') return true;
      if (part.startsWith('*/')) {
        const step = parseInt(part.slice(2));
        return !isNaN(step) && val % step === 0;
      }
      return parseInt(part) === val;
    };

    return matchPart(minutePart, m) &&
           matchPart(hourPart, h) &&
           matchPart(dayOfMonthPart, dom) &&
           matchPart(monthPart, mon) &&
           matchPart(dayOfWeekPart, dow);
  }

  public executeJob(job: CronJob) {
    try {
      // Emit the action so DAEMON or OS can catch it
      eventBus.emit('CRON_TRIGGERED', { jobId: job.id, action: job.actionCmd, name: job.name });
      job.lastRun = Date.now();
      job.history = [{ time: job.lastRun, status: 'success' as const }, ...job.history].slice(0, 50);
      this.save();
    } catch (e) {
      job.history = [{ time: Date.now(), status: 'error' as const }, ...job.history].slice(0, 50);
      this.save();
    }
  }

  private startIntervalJob(id: string) {
    const job = this.jobs.get(id);
    if (!job || !job.enabled || !job.intervalMs) return;
    const timer = setInterval(() => {
      this.executeJob(job);
    }, job.intervalMs);
    this.timers.set(id, timer);
  }

  public register(name: string, schedule: { expression?: string, intervalMs?: number }, actionCmd: string): string {
    const id = uuid();
    const job: CronJob = {
      id, name,
      expression: schedule.expression || null,
      intervalMs: schedule.intervalMs || null,
      actionCmd,
      lastRun: 0,
      enabled: true,
      history: []
    };
    this.jobs.set(id, job);
    if (job.intervalMs) this.startIntervalJob(id);
    this.save();
    return id;
  }

  public unregister(id: string) {
    const timer = this.timers.get(id);
    if (timer) clearInterval(timer);
    this.timers.delete(id);
    this.jobs.delete(id);
    this.save();
  }

  public pause(id: string) {
    const job = this.jobs.get(id);
    if (job) job.enabled = false;
    const timer = this.timers.get(id);
    if (timer) { clearInterval(timer); this.timers.delete(id); }
    this.save();
  }

  public resume(id: string) {
    const job = this.jobs.get(id);
    if (!job) return;
    job.enabled = true;
    if (job.intervalMs) this.startIntervalJob(id);
    this.save();
  }

  public listJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  public getJob(id: string): CronJob | undefined {
    return this.jobs.get(id);
  }
}

export const cronScheduler = new CronScheduler();