// ═══════════════════════════════════════════════════════════════════
// RAG KERNEL MODULE — Retrieval-augmented generation
//
// Indexes documents (VFS files, code, web pages, PDFs) into a vector
// store backed by IndexedDB. At query time, retrieves the most
// relevant chunks and injects them into the AI's context window.
//
// This is what lets the AI "know" about:
//   - The entire codebase in the VFS
//   - Documents the user has imported
//   - Web pages the user has visited
//   - Previous conversations
//
// Embeddings are generated via the active AI provider's embedding
// endpoint (OpenAI text-embedding-3-small, etc.) or via a local
// hash-based fallback when no provider is configured.
// ═══════════════════════════════════════════════════════════════════

import { vfs, SYSTEM_VFS_APP_ID } from './fileSystem';
import { kernelLog } from './log';
import { aiGateway } from '../services/aiProviders';

export interface RagDocument {
  id: string;
  source: string;      // file path or URL
  content: string;     // full text
  chunks: RagChunk[];  // content split into embeddable pieces
  indexedAt: number;
}

export interface RagChunk {
  id: string;
  docId: string;
  text: string;
  embedding: number[];
  startChar: number;
}

interface VectorRecord {
  id: string;
  docId: string;
  text: string;
  embedding: number[];
  source: string;
}

const CHUNK_SIZE = 500;       // characters per chunk
const CHUNK_OVERLAP = 50;     // overlap between chunks for context continuity
const MAX_RESULTS = 8;

class RagModule {
  private vectors: VectorRecord[] = [];
  private documents = new Map<string, RagDocument>();
  private isInitialized = false;

  /**
   * Initialize the RAG store. Loads any persisted vectors from
   * IndexedDB. Called once at boot.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const stored = localStorage.getItem('nexusos_rag_vectors');
      if (stored) {
        this.vectors = JSON.parse(stored);
        kernelLog.info(`[RAG] Loaded ${this.vectors.length} vectors from storage`);
      }
    } catch (e: any) {
      kernelLog.warn('[RAG] Failed to load vectors:', e.message);
    }
  }

  /**
   * Index a document. Splits it into chunks, generates embeddings,
   * and stores them in the vector store.
   */
  async indexDocument(source: string, content: string): Promise<RagDocument> {
    await this.init();

    // Remove any existing document with the same source
    await this.removeDocument(source);

    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const chunks = this.chunkText(content, docId, source);

    // Generate embeddings for each chunk
    for (const chunk of chunks) {
      chunk.embedding = await this.generateEmbedding(chunk.text);
      this.vectors.push({
        id: chunk.id,
        docId,
        text: chunk.text,
        embedding: chunk.embedding,
        source,
      });
    }

    const doc: RagDocument = {
      id: docId,
      source,
      content,
      chunks,
      indexedAt: Date.now(),
    };
    this.documents.set(docId, doc);
    this.persist();

    kernelLog.info(`[RAG] Indexed ${source}: ${chunks.length} chunks`);
    return doc;
  }

  /**
   * Index a file from the VFS.
   */
  async indexVfsFile(path: string): Promise<RagDocument | null> {
    const content = vfs.readFile(path, SYSTEM_VFS_APP_ID);
    if (!content) return null;
    return this.indexDocument(path, content);
  }

  /**
   * Index all code files in a VFS directory (recursive).
   */
  async indexVfsDirectory(dirPath: string): Promise<number> {
    const files = this.walkVfs(dirPath);
    let count = 0;
    for (const file of files) {
      try {
        await this.indexVfsFile(file);
        count++;
      } catch (e: any) {
        kernelLog.warn(`[RAG] Failed to index ${file}:`, e.message);
      }
    }
    kernelLog.info(`[RAG] Indexed ${count} files from ${dirPath}`);
    return count;
  }

  private walkVfs(dir: string): string[] {
    const results: string[] = [];
    const entries = vfs.listDir(dir, SYSTEM_VFS_APP_ID) || [];
    for (const entry of entries) {
      const fullPath = `${dir}/${entry}`;
      const stat = vfs.stat(fullPath);
      if (!stat) continue;
      if (stat.type === 'directory') {
        results.push(...this.walkVfs(fullPath));
      } else {
        // Only index text files
        const ext = entry.split('.').pop()?.toLowerCase();
        if (['ts', 'tsx', 'js', 'jsx', 'json', 'md', 'txt', 'py', 'sh', 'css', 'html'].includes(ext || '')) {
          results.push(fullPath);
        }
      }
    }
    return results;
  }

  /**
   * Query the RAG store for the most relevant chunks. Returns text
   * that can be injected into the AI's context window.
   */
  async query(question: string, maxResults = MAX_RESULTS): Promise<string> {
    await this.init();
    if (this.vectors.length === 0) return '';

    const queryEmbedding = await this.generateEmbedding(question);
    const scored = this.vectors.map(v => ({
      vector: v,
      score: this.cosineSimilarity(queryEmbedding, v.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, maxResults);

    if (top.length === 0 || top[0]!.score < 0.1) return '';

    return top.map((s, i) =>
      `[${i + 1}] (score: ${s.score.toFixed(2)}, source: ${s.vector.source})\n${s.vector.text}`
    ).join('\n\n---\n\n');
  }

  /**
   * Remove a document and its chunks from the store.
   */
  async removeDocument(source: string): Promise<void> {
    this.vectors = this.vectors.filter(v => v.source !== source);
    for (const [id, doc] of this.documents) {
      if (doc.source === source) {
        this.documents.delete(id);
        break;
      }
    }
    this.persist();
  }

  /**
   * Get all indexed document sources.
   */
  getIndexedSources(): string[] {
    return Array.from(new Set(this.vectors.map(v => v.source)));
  }

  /**
   * Clear the entire RAG store.
   */
  clear(): void {
    this.vectors = [];
    this.documents.clear();
    this.persist();
  }

  // ─── Internal helpers ──────────────────────────────────────────

  private chunkText(text: string, docId: string, source: string): RagChunk[] {
    const chunks: RagChunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      const chunkText = text.slice(start, end);

      chunks.push({
        id: `${docId}-chunk-${chunkIndex}`,
        docId,
        text: chunkText,
        embedding: [],
        startChar: start,
      });

      start = end - CHUNK_OVERLAP;
      if (start >= text.length) break;
      chunkIndex++;
    }

    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Try the active AI provider's embedding endpoint
    try {
      const provider = aiGateway.getActiveProvider();
      if (!provider || !provider.apiKey) return this.hashEmbedding(text);

      // OpenAI embeddings
      if (provider.id === 'openai') {
        const resp = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
          body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
          signal: AbortSignal.timeout(10000),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.data?.[0]?.embedding) return data.data[0].embedding as number[];
        }
      }

      // Mistral embeddings
      if (provider.id === 'mistral') {
        const resp = await fetch('https://api.mistral.ai/v1/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
          body: JSON.stringify({ model: 'mistral-embed', input: text.slice(0, 8000) }),
          signal: AbortSignal.timeout(10000),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.data?.[0]?.embedding) return data.data[0].embedding as number[];
        }
      }

      // NVIDIA embeddings
      if (provider.id === 'nvidia') {
        const resp = await fetch('https://integrate.api.nvidia.com/v1/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
          body: JSON.stringify({ model: 'nvidia/nv-embed-v1', input: [text.slice(0, 8000)], input_type: 'query' }),
          signal: AbortSignal.timeout(10000),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.data?.[0]?.embedding) return data.data[0].embedding as number[];
        }
      }

      // Google embeddings
      if (provider.id === 'google') {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${provider.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text: text.slice(0, 8000) }] } }),
          signal: AbortSignal.timeout(10000),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.embedding?.values) return data.embedding.values as number[];
        }
      }
    } catch (e: any) {
      kernelLog.warn('[RAG] Embedding API failed, using fallback:', e.message);
    }

    // Fallback: hash-based pseudo-embedding (deterministic but low quality)
    return this.hashEmbedding(text);
  }

  /**
   * Generate a 128-dimensional pseudo-embedding from text using
   * character-level hashing. Not as good as real embeddings but
   * gives deterministic vectors that work with cosine similarity
   * for exact-match retrieval.
   */
  private hashEmbedding(text: string): number[] {
    const dim = 128;
    const vec = new Array(dim).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
      }
      const idx = Math.abs(hash) % dim;
      vec[idx] += 1;
    }
    // Normalize
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / mag);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
      magA += a[i]! * a[i]!;
      magB += b[i]! * b[i]!;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? dot / denom : 0;
  }

  private persist(): void {
    try {
      // Cap storage at ~5000 vectors to avoid localStorage quota
      const toStore = this.vectors.slice(-5000);
      localStorage.setItem('nexusos_rag_vectors', JSON.stringify(toStore));
    } catch (e: any) {
      kernelLog.warn('[RAG] Failed to persist vectors:', e.message);
    }
  }
}

export const rag = new RagModule();
