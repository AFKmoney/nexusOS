// ═══════════════════════════════════════════════════════════════════
// EPISODIC MEMORY — Conversation history indexed for recall
//
// Every conversation turn (user message + AI response) is stored as
// an "episode" and indexed into the RAG vector store. This lets the
// AI recall past conversations via semantic search.
//
// Episodes persist in VFS at /system/.daemon/episodes.json and are
// also indexed in the RAG store for semantic retrieval.
// ═══════════════════════════════════════════════════════════════════

import { vfs, SYSTEM_VFS_APP_ID } from './fileSystem';
import { rag } from './rag';
import { kernelLog } from './log';
import { memory } from './memory';

const EPISODES_FILE = '/system/.daemon/episodes.json';
const MAX_EPISODES = 1000;

export interface Episode {
  id: string;
  timestamp: number;
  userMessage: string;
  aiResponse: string;
  mode: string;
  actions?: string[];
  summary?: string;
}

class EpisodicMemory {
  private episodes: Episode[] = [];
  private isLoaded = false;

  async load(): Promise<void> {
    if (this.isLoaded) return;
    this.isLoaded = true;
    try {
      const raw = vfs.readFile(EPISODES_FILE, SYSTEM_VFS_APP_ID);
      if (raw) {
        const parsed = JSON.parse(raw) as Episode[];
        if (Array.isArray(parsed)) {
          this.episodes = parsed;
        }
      }
    } catch (e: any) {
      kernelLog.warn('[EpisodicMemory] Load failed:', e?.message);
    }
  }

  private persist(): void {
    try {
      const dir = '/system/.daemon';
      if (!vfs.stat(dir)) {
        vfs.createDirRecursive(dir, SYSTEM_VFS_APP_ID);
      }
      const toStore = this.episodes.slice(-MAX_EPISODES);
      vfs.writeFile(EPISODES_FILE, JSON.stringify(toStore, null, 2), SYSTEM_VFS_APP_ID);
    } catch (e: any) {
      kernelLog.warn('[EpisodicMemory] Persist failed:', e?.message);
    }
  }

  async record(userMessage: string, aiResponse: string, mode: string = 'chat', actions?: string[]): Promise<Episode> {
    await this.load();

    const episode: Episode = {
      id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      userMessage,
      aiResponse,
      mode,
    };
    if (actions !== undefined) episode.actions = actions;

    this.episodes.push(episode);
    this.persist();

    // Index into RAG for semantic retrieval
    try {
      const docText = `User: ${userMessage}\n\nAI: ${aiResponse}`;
      await rag.indexDocument(`episode:${episode.id}`, docText);
    } catch (e: any) {
      kernelLog.warn('[EpisodicMemory] RAG indexing failed:', e?.message);
    }

    // Also store in general memory for keyword recall
    try {
      memory.remember(`Conversation: ${userMessage.slice(0, 200)}`, ['conversation', 'episode', mode]);
    } catch {}

    return episode;
  }

  async recall(query: string, maxResults: number = 5): Promise<string> {
    await this.load();
    try {
      const ragResult = await rag.query(query, maxResults);
      if (ragResult) return ragResult;
    } catch (e: any) {
      kernelLog.warn('[EpisodicMemory] RAG recall failed:', e?.message);
    }
    // Fallback: keyword search
    const lower = query.toLowerCase();
    const matching = this.episodes
      .filter(e => e.userMessage.toLowerCase().includes(lower) || e.aiResponse.toLowerCase().includes(lower))
      .slice(-maxResults);
    if (matching.length === 0) return '';
    return matching.map((e, i) =>
      `[${i + 1}] (${new Date(e.timestamp).toISOString()}, mode: ${e.mode})\nUser: ${e.userMessage.slice(0, 500)}\nAI: ${e.aiResponse.slice(0, 500)}`
    ).join('\n\n---\n\n');
  }

  getRecent(count: number = 5): Episode[] {
    return this.episodes.slice(-count);
  }

  getAll(): Episode[] {
    return [...this.episodes];
  }

  clear(): void {
    this.episodes = [];
    this.persist();
  }

  getContextString(maxEpisodes: number = 3): string {
    const recent = this.getRecent(maxEpisodes);
    if (recent.length === 0) return '';
    return recent.map(e =>
      `  [${new Date(e.timestamp).toLocaleTimeString()}] User: ${e.userMessage.slice(0, 200)} → AI: ${e.aiResponse.slice(0, 200)}`
    ).join('\n');
  }
}

export const episodicMemory = new EpisodicMemory();
