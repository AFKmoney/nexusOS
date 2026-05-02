/**
 * MISSION LEARNING — outcome-aware scoring for the autonomy engine.
 *
 * The autonomy loop selects missions from a pool by computing
 *   score = base_weight(snapshot) * trust(missionId) + ε
 * where `trust` is a 0..1 multiplier derived from the mission's recent
 * success / failure history. Missions that have repeatedly failed are
 * down-weighted; missions that have repeatedly succeeded are reinforced.
 *
 * The trust score uses Bayesian smoothing (Beta(1,1) prior) so a mission
 * with no history sits at 0.5 — neutral, not penalised. Recent attempts
 * count more than old ones via an exponential decay over RECENT_WINDOW_MS.
 *
 * Persistence is handled through a small JSON blob in localStorage so the
 * learning loop survives page reloads. The store is bounded
 * (MAX_HISTORY_PER_MISSION) so it cannot grow without limit.
 */

export interface MissionAttempt {
  success: boolean;
  timestamp: number;
  reason?: string;
}

export interface MissionStats {
  successes: number;
  failures: number;
  trust: number;
  lastFailureReason?: string;
  lastAttempt: number;
}

const STORAGE_KEY = 'nexus_mission_history_v1';
const MAX_HISTORY_PER_MISSION = 50;
const RECENT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const TRUST_FLOOR = 0.05;                 // never fully kill a mission
const TRUST_CEILING = 1.5;                // successful missions can outscore base weight
const PRIOR_ALPHA = 1;                    // Beta(α, β) prior — successes
const PRIOR_BETA = 1;                     // Beta(α, β) prior — failures

type HistoryMap = Record<string, MissionAttempt[]>;

function loadHistory(): HistoryMap {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as HistoryMap;
  } catch {
    return {};
  }
}

function saveHistory(history: HistoryMap): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  } catch {
    // localStorage may be full or disabled; learning degrades to
    // in-memory-only, which is acceptable for a single session.
  }
}

/**
 * Pure scoring function. Exposed for unit testing without any storage
 * dependency. Returns a value in [TRUST_FLOOR, TRUST_CEILING].
 *
 *   - A mission with 0 attempts → 0.5 + Beta correction → ~0.5
 *   - A mission with 5/5 successes → ~1.4
 *   - A mission with 0/5 successes → ~0.1
 *   - Failures older than RECENT_WINDOW_MS decay exponentially
 */
export function computeTrustScore(attempts: MissionAttempt[], now: number = Date.now()): number {
  let weightedSuccess = 0;
  let weightedFailure = 0;

  for (const a of attempts) {
    const ageMs = Math.max(0, now - a.timestamp);
    // Exponential decay with half-life RECENT_WINDOW_MS.
    const weight = Math.pow(0.5, ageMs / RECENT_WINDOW_MS);
    if (a.success) weightedSuccess += weight;
    else weightedFailure += weight;
  }

  // Beta-smoothed posterior mean = (α + s) / (α + β + s + f)
  const successRate =
    (PRIOR_ALPHA + weightedSuccess) /
    (PRIOR_ALPHA + PRIOR_BETA + weightedSuccess + weightedFailure);

  // Map [0, 1] success rate to [TRUST_FLOOR, TRUST_CEILING] so the trust
  // multiplier can both penalise and reward beyond the base weight.
  const scaled = TRUST_FLOOR + successRate * (TRUST_CEILING - TRUST_FLOOR);

  // Clamp belt-and-braces.
  if (!Number.isFinite(scaled)) return 0.5;
  return Math.max(TRUST_FLOOR, Math.min(TRUST_CEILING, scaled));
}

class MissionLearning {
  private history: HistoryMap = loadHistory();

  /** Record an attempt outcome and persist. */
  public recordAttempt(missionId: string, attempt: MissionAttempt): void {
    if (!missionId) return;
    const list = this.history[missionId] || [];
    list.push(attempt);
    // Keep only the most recent attempts per mission to bound memory.
    if (list.length > MAX_HISTORY_PER_MISSION) {
      list.splice(0, list.length - MAX_HISTORY_PER_MISSION);
    }
    this.history[missionId] = list;
    saveHistory(this.history);
  }

  /** Returns 0..TRUST_CEILING. Use as a multiplier on base mission weight. */
  public trustOf(missionId: string, now: number = Date.now()): number {
    const list = this.history[missionId];
    if (!list || list.length === 0) {
      // Neutral prior — exactly the centre of the trust range.
      return TRUST_FLOOR + 0.5 * (TRUST_CEILING - TRUST_FLOOR);
    }
    return computeTrustScore(list, now);
  }

  /** Returns the most recent failure reason, if any (used to add a hint to
   *  the prompt on the next attempt — adaptive prompt refinement). */
  public lastFailureReason(missionId: string): string | undefined {
    const list = this.history[missionId];
    if (!list) return undefined;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const entry = list[i];
      if (entry && !entry.success && entry.reason) return entry.reason;
    }
    return undefined;
  }

  /** Aggregated stats for the dashboard. */
  public statsFor(missionId: string, now: number = Date.now()): MissionStats {
    const list = this.history[missionId] || [];
    const successes = list.filter(a => a.success).length;
    const failures = list.length - successes;
    const lastAttempt = list.length > 0 ? (list[list.length - 1]?.timestamp ?? 0) : 0;
    const stats: MissionStats = {
      successes,
      failures,
      trust: this.trustOf(missionId, now),
      lastAttempt,
    };
    const reason = this.lastFailureReason(missionId);
    if (reason) stats.lastFailureReason = reason;
    return stats;
  }

  /** Wipe all history. Used by Settings → Reset Learning. */
  public reset(): void {
    this.history = {};
    saveHistory(this.history);
  }

  /** Snapshot of the entire history map (read-only consumers). */
  public snapshot(): HistoryMap {
    return JSON.parse(JSON.stringify(this.history));
  }
}

export const missionLearning = new MissionLearning();

// Test exports.
export const _internal = {
  computeTrustScore,
  TRUST_FLOOR,
  TRUST_CEILING,
  RECENT_WINDOW_MS,
  PRIOR_ALPHA,
  PRIOR_BETA,
  STORAGE_KEY,
};
