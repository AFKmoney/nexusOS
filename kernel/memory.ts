import { MemoryEntry, MemoryCategory } from '../types';

const MEMORY_KEY = 'nexus_memory_v2';
const MAX_ENTRIES = 200; // Reduced from 500 — quality over quantity
const MAX_CONTENT_LEN = 200; // Hard cap per entry (was unlimited)

// Inline uuid
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// Fast tokenizer for matching
function getTokens(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[\W_]+/).filter(x => x.length > 2));
}

// Jaccard similarity (efficient for short texts)
function jaccardSimilarity(a: string, b: string): number {
  const setA = getTokens(a);
  const setB = getTokens(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach(x => { if (setB.has(x)) intersection++; });
  return intersection / (setA.size + setB.size - intersection);
}

export class MemorySystem {
  private entries: MemoryEntry[] = [];
  private _tokenBudget: number = 400; // Max tokens for memory context

  constructor() {
    try {
      const saved = localStorage.getItem(MEMORY_KEY);
      if (saved) {
        this.entries = JSON.parse(saved).map((e: any) => ({
          ...e,
          category: e.category || 'episodic',
          importance: e.importance ?? 0.5,
          // Retroactively truncate overly long entries
          content: (e.content || '').slice(0, MAX_CONTENT_LEN)
        }));
      }
    } catch {
      this.entries = [];
    }
  }

  public save() {
    try {
      localStorage.setItem(MEMORY_KEY, JSON.stringify(this.entries));
    } catch {
      this.prune(Math.floor(this.entries.length * 0.5));
      try { localStorage.setItem(MEMORY_KEY, JSON.stringify(this.entries)); } catch {}
    }
  }

  private prune(keepCount: number) {
    // Keep highest importance first, then recency
    this.entries = [...this.entries]
      .sort((a, b) => {
        const impDiff = (b.importance || 0.5) - (a.importance || 0.5);
        if (Math.abs(impDiff) > 0.1) return impDiff;
        return b.timestamp - a.timestamp;
      })
      .slice(0, keepCount);
  }

  // ═══ DEDUPLICATION — Prevent near-duplicate entries ═══════
  private isDuplicate(content: string): boolean {
    return this.entries.some(e => jaccardSimilarity(e.content, content) > 0.7);
  }

  // ═══ CONSOLIDATION — Merge old episodic into summaries ════
  private consolidate() {
    const episodic = this.entries.filter(e => e.category === 'episodic');
    if (episodic.length > 100) {
      // Remove oldest 50% of episodic entries
      episodic.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = new Set(episodic.slice(0, Math.floor(episodic.length * 0.5)).map(e => e.id));
      this.entries = this.entries.filter(e => !toRemove.has(e.id));

      // Add a consolidation summary
      this.entries.push({
        id: uuid(),
        timestamp: Date.now(),
        content: `[Consolidated ${toRemove.size} episodic entries]`,
        tags: ['system', 'consolidation'],
        embeddingVector: [],
        category: 'semantic',
        importance: 0.3
      });
    } else {
      this.prune(MAX_ENTRIES - 20);
    }
  }

  // ═══ REMEMBER — With dedup + length cap ═══════════════════
  public remember(content: string, tags: string[] = [], category: MemoryCategory = 'episodic', importance: number = 0.5) {
    const truncated = content.slice(0, MAX_CONTENT_LEN);
    
    // Skip near-duplicates
    if (this.isDuplicate(truncated)) return;

    this.entries.push({
      id: uuid(),
      timestamp: Date.now(),
      content: truncated,
      tags,
      embeddingVector: [],
      category,
      importance: Math.min(1, Math.max(0, importance))
    });

    if (this.entries.length > MAX_ENTRIES) {
      this.consolidate();
    }
    this.save();
  }

  // ═══ RECALL — Token-budgeted retrieval ════════════════════
  public recall(query: string, tokenBudget?: number): MemoryEntry[] {
    const budget = tokenBudget || this._tokenBudget;
    const now = Date.now();
    const ONE_WEEK = 604_800_000;

    const scored = this.entries.map(entry => {
      const entryTokens = getTokens(entry.content);
      const tagTokens = getTokens(entry.tags.join(' '));
      const queryTokens = getTokens(query);

      // Semantic match
      let semanticScore = 0;
      queryTokens.forEach(token => {
        if (entryTokens.has(token)) semanticScore += 1.0;
        if (tagTokens.has(token)) semanticScore += 1.5;
      });

      // Temporal decay (7-day window)
      const ageDays = (now - entry.timestamp) / ONE_WEEK * 7;
      const recency = Math.max(0, 1 - (ageDays / 7));

      // Combined score
      const importance = entry.importance || 0.5;
      const score = (semanticScore * 0.7 + recency * 0.3) * (1.0 + importance);

      return { ...entry, score };
    })
    .filter(e => e.score && e.score > 0.1)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

    // Token-budgeted selection
    const result: MemoryEntry[] = [];
    let tokensUsed = 0;
    for (const entry of scored) {
      const entryTokens = Math.ceil(entry.content.length / 4);
      if (tokensUsed + entryTokens > budget) break;
      result.push(entry);
      tokensUsed += entryTokens;
    }
    return result;
  }

  public getRecent(limit: number = 5): MemoryEntry[] {
    return [...this.entries]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  public findByTag(tag: string): MemoryEntry[] {
    const lower = tag.toLowerCase();
    return this.entries.filter(e =>
      e.tags.some(t => t.toLowerCase().includes(lower))
    );
  }

  public forget(id: string) {
    this.entries = this.entries.filter(e => e.id !== id);
    this.save();
  }

  public clear() {
    this.entries = [];
    this.save();
  }

  public retrieveRaw(): MemoryEntry[] {
    return this.entries;
  }

  public count(): number {
    return this.entries.length;
  }

  // ═══ STATS — For Settings/Dashboard ═══════════════════════
  public getStats(): { count: number; categories: Record<string, number>; totalChars: number } {
    const categories: Record<string, number> = {};
    let totalChars = 0;
    for (const e of this.entries) {
      const cat = e.category || 'episodic';
      categories[cat] = (categories[cat] || 0) + 1;
      totalChars += e.content.length;
    }
    return { count: this.entries.length, categories, totalChars };
  }
}

export const memory = new MemorySystem();