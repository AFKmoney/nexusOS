// ═══════════════════════════════════════════════════════════════════════
// USAGE TRACKER — Behavioral Resonance Mapping
//
// Records app open events and derives time-aware usage patterns.
// Powers PREDICTIVE_ASSIST mission and Learning Kernel stats.
// ═══════════════════════════════════════════════════════════════════════

interface UsageEntry {
  appId: string;
  timestamp: number;
  hour: number;      // 0-23
  dayOfWeek: number; // 0 (Sun) – 6 (Sat)
}

const STORAGE_KEY = 'nexus_usage_tracker_v1';
const MAX_ENTRIES = 500;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

class UsageTracker {
  private entries: UsageEntry[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.entries = JSON.parse(raw);
    } catch {}
  }

  private save() {
    try {
      // Only keep latest MAX_ENTRIES to avoid unbounded growth
      if (this.entries.length > MAX_ENTRIES) {
        this.entries = this.entries.slice(-MAX_ENTRIES);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {}
  }

  public trackAppOpen(appId: string) {
    const now = new Date();
    this.entries.push({
      appId,
      timestamp: now.getTime(),
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
    });
    this.save();
  }

  public getMostUsed(n = 5): Array<{ appId: string; count: number }> {
    const counts: Record<string, number> = {};
    this.entries.forEach(e => { counts[e.appId] = (counts[e.appId] || 0) + 1; });
    return Object.entries(counts)
      .map(([appId, count]) => ({ appId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }

  // Score apps by time-of-day match + recency within the last 7 days.
  // Returns sorted candidates for predictive pre-loading.
  public getPredictedApps(topN = 3): Array<{ appId: string; score: number }> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const cutoff = Date.now() - SEVEN_DAYS_MS;

    const scores: Record<string, number> = {};
    this.entries.forEach(e => {
      if (e.timestamp < cutoff) return;
      // 1.0 at exact hour match, fades linearly over ±3 hours
      const hourProximity = Math.max(0, 1 - Math.abs(e.hour - currentHour) / 3);
      const dayBonus = e.dayOfWeek === currentDay ? 0.25 : 0;
      const recencyBonus = (e.timestamp - cutoff) / SEVEN_DAYS_MS * 0.15;
      scores[e.appId] = (scores[e.appId] || 0) + hourProximity * 0.6 + dayBonus + recencyBonus;
    });

    return Object.entries(scores)
      .map(([appId, score]) => ({ appId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  public getPatternSummary(): string {
    const top = this.getMostUsed(3);
    if (top.length === 0) return 'No behavioral patterns yet.';
    return top.map(t => `${t.appId}(×${t.count})`).join(', ');
  }

  public getTotalSessions(): number {
    return this.entries.length;
  }

  // Field coherence: ratio of recent activity vs max capacity (0-1)
  public getFieldCoherence(): number {
    const recent = this.entries.filter(e => e.timestamp > Date.now() - SEVEN_DAYS_MS);
    return Math.min(1, recent.length / 50);
  }
}

export const usageTracker = new UsageTracker();
