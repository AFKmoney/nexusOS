import { MemoryEntry, MemoryCategory } from '../types';

const MEMORY_KEY = 'nexus_memory_v1';
const MAX_ENTRIES = 500;

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
        const legacy = JSON.parse(saved);
        this.entries = legacy.map((e: any) => ({
          ...e,
          category: e.category || 'episodic',
          importance: e.importance !== undefined ? e.importance : 0.5
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
      this.prune(Math.floor(this.entries.length * 0.7));
      try {
        localStorage.setItem(MEMORY_KEY, JSON.stringify(this.entries));
      } catch {
      }
    }
  }

  private prune(keepCount: number) {
    this.entries = [...this.entries]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, keepCount);
  }

  private consolidate() {
    const episodic = this.entries.filter(e => e.category === 'episodic');
    if (episodic.length > 200) {
      episodic.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = episodic.slice(0, 100);
      const removeIds = new Set(toRemove.map(e => e.id));

      this.entries = this.entries.filter(e => !removeIds.has(e.id));

      this.remember(
        `Consolidated past episodic events. (${toRemove.length} events archived)`,
        ['system', 'archive', 'consolidation'],
        'semantic',
        0.8
      );
    } else {
      this.prune(MAX_ENTRIES - 50);
    }
  }

  public remember(content: string, tags: string[] = [], category: MemoryCategory = 'episodic', importance: number = 0.5) {
    const entry: MemoryEntry = {
      id: uuid(),
      timestamp: Date.now(),
      content,
      tags,
      embeddingVector: [],
      category,
      importance
    };
    this.entries.push(entry);

    if (this.entries.length > MAX_ENTRIES) {
      this.consolidate();
    }

    this.save();
  }

  public recall(query: string, limit: number = 3): MemoryEntry[] {
    const now = Date.now();
    const queryTokens = getTokens(query);
    const ONE_DAY_MS = 86_400_000;

    return this.entries
      .map(entry => {
        // 🔷 TORUS RECALL: Explore overlapping manifolds
        const entryTokens = getTokens(entry.content);
        const tagTokens = getTokens(entry.tags.join(' '));
        
        // Semantic density: intersection of query and entry
        let semanticScore = 0;
        queryTokens.forEach(token => {
            if (entryTokens.has(token)) semanticScore += 1.0;
            if (tagTokens.has(token)) semanticScore += 1.5; // Tags carry more weight
        });

        // Temporal folding: recency vs importance
        const ageDays = (now - entry.timestamp) / ONE_DAY_MS;
        const recency = Math.max(0, 1 - (ageDays / 7)); // High weight for the last 7 days
        
        // Final triad score: (Relevance + Recency) * Structural Importance
        const importance = entry.importance || 0.5;
        const score = (semanticScore * 0.7 + recency * 0.3) * (1.0 + importance);

        return { ...entry, score };
      })
      .filter(e => e.score && e.score > 0.1)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
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