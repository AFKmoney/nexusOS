// Shared types, catalog data, and helpers for the Model Manager
// sub-components. Extracted from the original 598-line ModelManager.tsx.

import type { ModelConfig } from '../../services/localBrain';

export type DownloadState = 'idle' | 'downloading' | 'done' | 'error';

export interface DownloadStatus {
  pct: number;
  msg: string;
  state: DownloadState;
}

export type CatalogModel = {
  repoId: string;
  filename: string;
  name: string;
  size: string;
  author: string;
  tags: string[];
  rating: number;
  description: string;
};

// Hand-curated catalog of recommended small models that fit comfortably
// in the in-browser Wasm runtime. Users can still add any Hugging Face
// repo via the "Custom HF" tab.
export const FEATURED_MODELS: CatalogModel[] = [
  {
    repoId: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    filename: 'Llama-3.2-1B-Instruct-Q8_0.gguf',
    name: 'Llama 3.2 1B Instruct',
    size: '1.3 GB',
    author: 'Meta',
    tags: ['instruct', 'fast', 'chat'],
    rating: 4.5,
    description: 'Ultra-fast Meta model. Best for real-time responses.',
  },
  {
    repoId: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF',
    filename: 'qwen2.5-1.5b-instruct-q8_0.gguf',
    name: 'Qwen 2.5 1.5B Instruct',
    size: '1.7 GB',
    author: 'Alibaba',
    tags: ['instruct', 'multilingual', 'code'],
    rating: 4.7,
    description: 'Excellent multilingual & code model. Very capable for its size.',
  },
  {
    repoId: 'bartowski/Phi-3.5-mini-instruct-GGUF',
    filename: 'Phi-3.5-mini-instruct-Q4_K_M.gguf',
    name: 'Phi 3.5 Mini Instruct',
    size: '2.2 GB',
    author: 'Microsoft',
    tags: ['instruct', 'reasoning', 'code'],
    rating: 4.6,
    description: "Microsoft's reasoning powerhouse. Great at coding tasks.",
  },
  {
    repoId: 'bartowski/gemma-2-2b-it-GGUF',
    filename: 'gemma-2-2b-it-Q4_K_M.gguf',
    name: 'Gemma 2 2B Instruct',
    size: '1.6 GB',
    author: 'Google',
    tags: ['instruct', 'chat', 'safety'],
    rating: 4.4,
    description: "Google's safety-focused model. Clean, helpful responses.",
  },
  {
    repoId: 'bartowski/SmolLM2-1.7B-Instruct-GGUF',
    filename: 'SmolLM2-1.7B-Instruct-Q8_0.gguf',
    name: 'SmolLM2 1.7B Instruct',
    size: '1.8 GB',
    author: 'HuggingFace',
    tags: ['instruct', 'lightweight', 'fast'],
    rating: 4.3,
    description: "HuggingFace's own optimized small LM.",
  },
  {
    repoId: 'bartowski/Mistral-7B-Instruct-v0.3-GGUF',
    filename: 'Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
    name: 'Mistral 7B Instruct v0.3',
    size: '4.1 GB',
    author: 'Mistral AI',
    tags: ['instruct', 'powerful', 'code'],
    rating: 4.8,
    description: 'The gold standard 7B. Best quality for code generation.',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────
export function normalizeModelKey(value: string): string {
  return value.toLowerCase().replace(/\\/g, '/');
}

export function isSameCatalogModel(model: ModelConfig, entry: CatalogModel): boolean {
  const pathMatch = normalizeModelKey(model.path).includes(normalizeModelKey(entry.repoId));
  const nameMatch = normalizeModelKey(model.name).includes(normalizeModelKey(entry.name));
  return pathMatch || nameMatch;
}

export function sizeLabelForModel(model: CatalogModel): string {
  return model.size;
}

export function formatCtx(model: ModelConfig): number {
  return model.nCtx || 4096;
}

export function formatGpuLayers(model: ModelConfig): number {
  return model.nGpuLayers || 50;
}
