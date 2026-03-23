
import { MemoryEntry } from '../types';

const MEMORY_KEY = 'nexus_memory_v1';

// REAL working version: Tokenize text into words
function getTokens(text: string): Set<string> {
  // Split by non-word characters, convert to lowercase, filter out short words
  return new Set(text.toLowerCase().split(/[\W_]+/).filter(x => x.length > 2));
}

// REAL working version: Jaccard Similarity (Intersection over Union)
// Good for comparing short text relevance without external models
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
    const saved = localStorage.getItem(MEMORY_KEY);
    if (saved) {
      this.entries = JSON.parse(saved);
    }
  }

  public save() {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(this.entries));
  }

  public remember(content: string, tags: string[] = []) {
    const entry: MemoryEntry = {
      id: uuid(),
      timestamp: Date.now(),
      content,
      tags,
      embeddingVector: [] // Deprecated in favor of Jaccard for local-only
    };
    this.entries.push(entry);
    this.save();
  }

  public recall(query: string, limit: number = 3): MemoryEntry[] {
    return this.entries
      .map(entry => ({
        ...entry,
        // Score based on word overlap + recency boost
        score: jaccardSimilarity(query, entry.content) + (jaccardSimilarity(query, entry.tags.join(' ')) * 0.5)
      }))
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  public getRecent(limit: number = 5): MemoryEntry[] {
    return [...this.entries]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  public retrieveRaw(): MemoryEntry[] {
    return this.entries;
  }
}

export const memory = new MemorySystem();
