import { MemoryEntry } from '../types';

const MEMORY_KEY = 'nexus_memory_v1';
const MAX_ENTRIES = 500; // Prevent localStorage bloat

// Inline uuid — no external dependency needed
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// Tokenize text into words
function getTokens(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[\W_]+/).filter(x => x.length > 2));
}

// Jaccard Similarity — good for short text relevance without external models
function jaccardSimilarity(textA: string, textB: string): number {
  const setA = getTokens(textA);
  const setB = getTokens(textB);
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

export class MemorySystem {
  private entries: MemoryEntry[] = [];

  constructor() {
    try {
      const saved = localStorage.getItem(MEMORY_KEY);
      if (saved) {
        this.entries = JSON.parse(saved);
      }
    } catch {
      this.entries = [];
    }
  }

  public save() {
    try {
      localStorage.setItem(MEMORY_KEY, JSON.stringify(this.entries));
    } catch {
      // localStorage full — prune and retry
      this.prune(Math.floor(this.entries.length * 0.7));
      try {
        localStorage.setItem(MEMORY_KEY, JSON.stringify(this.entries));
      } catch {
        // silently fail if still full
      }
    }
  }

  // Remove oldest entries down to `keepCount`
  private prune(keepCount: number) {
    this.entries = [...this.entries]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, keepCount);
  }

  public remember(content: string, tags: string[] = []) {
    const entry: MemoryEntry = {
      id: uuid(),
      timestamp: Date.now(),
      content,
      tags,
      embeddingVector: [],
    };
    this.entries.push(entry);

    // Auto-prune when too large
    if (this.entries.length > MAX_ENTRIES) {
      this.prune(MAX_ENTRIES);
    }

    this.save();
  }

  public recall(query: string, limit: number = 3): MemoryEntry[] {
    const now = Date.now();
    const ONE_DAY_MS = 86_400_000;

    return this.entries
      .map(entry => {
        const semantic = jaccardSimilarity(query, entry.content)
          + jaccardSimilarity(query, entry.tags.join(' ')) * 0.5;
        // Recency boost: entries from last 24h get up to +0.2
        const ageDays = (now - entry.timestamp) / ONE_DAY_MS;
        const recency = ageDays < 1 ? 0.2 * (1 - ageDays) : 0;
        return { ...entry, score: semantic + recency };
      })
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
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
}

export const memory = new MemorySystem();
