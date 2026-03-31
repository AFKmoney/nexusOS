import { MemoryEntry, MemoryCategory } from '../types';

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
        const legacy = JSON.parse(saved);
        // Upgrade legacy entries to V2 schema
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

  // Memory Consolidation: condense old episodic memories
  private consolidate() {
    const episodic = this.entries.filter(e => e.category === 'episodic');
    if (episodic.length > 200) {
       // Sort by oldest first
       episodic.sort((a, b) => a.timestamp - b.timestamp);
       const toRemove = episodic.slice(0, 100);
       const removeIds = new Set(toRemove.map(e => e.id));
       
       this.entries = this.entries.filter(e => !removeIds.has(e.id));
       
       // Create a summarized semantic memory
       this.remember(
          `Consolidated past episodic events. (${toRemove.length} events archived)`, 
          ['system', 'archive', 'consolidation'], 
          'semantic', 
          0.8
       );
    } else {
       this.prune(MAX_ENTRIES - 50); // Fallback to normal prune
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

    // Auto-prune/consolidate when too large
    if (this.entries.length > MAX_ENTRIES) {
      this.consolidate();
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
        
        let multiplier = 1.0;
        if (entry.category === 'system') multiplier = 1.5;
        if (entry.category === 'semantic') multiplier = 1.2;
        
        const importance = entry.importance || 0.5;

        return { ...entry, score: (semantic + recency) * multiplier * (0.8 + importance * 0.4) };
      })
      .filter(e => e.score && e.score > 0)
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
