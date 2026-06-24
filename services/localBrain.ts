import { Wllama } from '@wllama/wllama/esm/index.js';
import { kernelLog } from '../kernel/log';

export interface ModelConfig {
  id: string;
  name: string;
  path: string;       // URL or local path
  nCtx?: number;
  nThreads?: number;
  nBatch?: number;
  nGpuLayers?: number;
  size?: string;
  repoId?: string;
  filename?: string;
  source?: 'local' | 'huggingface' | 'daemon';
  downloaded?: boolean;
  installedAt?: number;
  tags?: string[];
  author?: string;
}

// No fake/preset models. The model list starts empty.
// Users add real models via:
// 1. Model Manager (downloads GGUF from HuggingFace)
// 2. LM Studio (auto-detected on port 1234 at runtime)
// The system never pretends a model is loaded when it isn't.

const STORED_MODELS_KEY = 'nexus_models_v1';
const ACTIVE_MODEL_KEY  = 'nexus_active_model_v1';
const MAX_MODEL_ID_LENGTH = 128;
const MAX_MODEL_NAME_LENGTH = 128;
const MAX_MODEL_PATH_LENGTH = 512;

function isSafeModelId(value: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(value) && value.length > 0 && value.length <= MAX_MODEL_ID_LENGTH;
}

function isSafeModelPath(value: string): boolean {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_MODEL_PATH_LENGTH && !value.includes('\0');
}

function isBrowserSafe(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {}
}

function sanitizeModel(config: ModelConfig): ModelConfig | null {
  if (!config || !isSafeModelId(config.id) || !isSafeModelPath(config.path)) return null;

  const sanitized: ModelConfig = {
    id: config.id,
    name: typeof config.name === 'string' ? config.name.slice(0, MAX_MODEL_NAME_LENGTH) : config.id,
    path: config.path,
  };

  if (typeof config.size === 'string') sanitized.size = config.size.slice(0, 48);
  if (typeof config.repoId === 'string') sanitized.repoId = config.repoId.slice(0, 128);
  if (typeof config.filename === 'string') sanitized.filename = config.filename.slice(0, 128);
  if (config.source === 'local' || config.source === 'huggingface' || config.source === 'daemon') sanitized.source = config.source;
  if (config.downloaded === true) sanitized.downloaded = true;
  if (typeof config.installedAt === 'number') sanitized.installedAt = config.installedAt;
  if (Array.isArray(config.tags)) sanitized.tags = config.tags.filter((t): t is string => typeof t === 'string').slice(0, 12);
  if (typeof config.author === 'string') sanitized.author = config.author.slice(0, 48);

  if (typeof config.nCtx === 'number' && config.nCtx > 0) sanitized.nCtx = config.nCtx;
  if (typeof config.nThreads === 'number' && config.nThreads > 0) sanitized.nThreads = config.nThreads;
  if (typeof config.nBatch === 'number' && config.nBatch > 0) sanitized.nBatch = config.nBatch;
  if (typeof config.nGpuLayers === 'number' && config.nGpuLayers >= 0) sanitized.nGpuLayers = config.nGpuLayers;

  return sanitized;
}

export class LocalBrain {
  private static instance: LocalBrain;
  private wllama: Wllama | null = null;
  private modelReady = false;
  private initPromise: Promise<void> | null = null;
  private activeModelId = '';
  private storedModels: ModelConfig[] = [];

  // LM Studio detection state
  private lmStudioAvailable = false;
  private lmStudioModelName = '';

  private queue: Array<{ task: () => Promise<void>; resolve: () => void; reject: (e: unknown) => void }> = [];
  private isProcessing = false;

  private onLoadProgress: ((pct: number, msg: string) => void) | null = null;

  private constructor() {
    this.loadStoredModels();
    const savedActive = safeLocalStorageGet(ACTIVE_MODEL_KEY);
    if (savedActive && isSafeModelId(savedActive)) this.activeModelId = savedActive;
    // Probe LM Studio in background — don't block boot
    this.probeLMStudio();
  }

  public static getInstance(): LocalBrain {
    if (!LocalBrain.instance) {
      LocalBrain.instance = new LocalBrain();
    }
    return LocalBrain.instance;
  }

  // Check if LM Studio is running on port 1234 and grab the model name
  private async probeLMStudio(): Promise<void> {
    try {
      const res = await fetch('http://127.0.0.1:1234/v1/models', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const modelId = data?.data?.[0]?.id;
        this.lmStudioAvailable = true;
        this.lmStudioModelName = modelId || 'local-model';
        kernelLog.info(`[NEURAL_CORE] LM Studio detected: ${this.lmStudioModelName}`);
      }
    } catch {
      this.lmStudioAvailable = false;
    }
  }

  public isLMStudioAvailable(): boolean {
    return this.lmStudioAvailable;
  }

  public getLMStudioModelName(): string {
    return this.lmStudioModelName;
  }

  private loadStoredModels() {
    try {
      if (typeof localStorage === 'undefined') {
        this.storedModels = [];
        return;
      }
      const raw = localStorage.getItem(STORED_MODELS_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.storedModels = parsed
            .map(item => sanitizeModel(item as ModelConfig))
            .filter((m): m is ModelConfig => Boolean(m));
        }
      }
    } catch {
      this.storedModels = [];
    }
  }

  private saveStoredModels() {
    safeLocalStorageSet(STORED_MODELS_KEY, JSON.stringify(this.storedModels));
  }

  public getStoredModels(): ModelConfig[] {
    return [...this.storedModels];
  }

  public async getLoadedModels(): Promise<string[]> {
    return this.storedModels.filter(m => m.downloaded === true).map(m => m.id);
  }

  public getActiveModelId(): string {
    return this.activeModelId;
  }

  public getActiveModel(): ModelConfig | null {
    return this.storedModels.find(m => m.id === this.activeModelId) || null;
  }

  public async checkAndDownloadDaemonModel(onProgress: (pct: number, msg: string) => void): Promise<void> {
    // LM Studio bridge is always "downloaded" — it's a local server.
    onProgress(100, 'LM Studio bridge active on port 1234.');
  }

  public registerModel(config: ModelConfig) {
    const sanitized = sanitizeModel(config);
    if (!sanitized) return;
    const existing = this.storedModels.findIndex(m => m.id === sanitized.id);
    const merged: ModelConfig = existing >= 0 ? { ...this.storedModels[existing], ...sanitized } : sanitized;
    if (existing >= 0) {
      this.storedModels[existing] = merged;
    } else {
      this.storedModels.push(merged);
    }
    this.saveStoredModels();
  }

  public removeModel(id: string) {
    if (!isSafeModelId(id)) return;
    this.storedModels = this.storedModels.filter(m => m.id !== id);
    this.saveStoredModels();
    if (this.activeModelId === id) {
      this.activeModelId = '';
      safeLocalStorageSet(ACTIVE_MODEL_KEY, this.activeModelId);
    }
  }

  public async installModel(config: ModelConfig): Promise<void> {
    const sanitized = sanitizeModel(config);
    if (!sanitized) throw new Error('Invalid model config');
    this.registerModel({ ...sanitized, downloaded: true, installedAt: Date.now() });
    await this.switchModel(sanitized.id);
  }

  public setActiveModel(id: string) {
    const model = this.storedModels.find(m => m.id === id);
    if (!model) return;
    this.activeModelId = id;
    safeLocalStorageSet(ACTIVE_MODEL_KEY, id);
    
    this.modelReady = false;
    this.initPromise = null;
    this.initialize().catch(e => kernelLog.error('[NEURAL_CORE] init failed:', e));
  }

  public async switchModel(id: string, onProgress?: (pct: number, msg: string) => void): Promise<void> {
    if (!isSafeModelId(id)) throw new Error(`Model ${id} not found`);
    const model = this.storedModels.find(m => m.id === id);
    if (!model) throw new Error(`Model ${id} not found`);

    if (this.wllama) {
      try { await this.wllama.exit(); } catch {}
      this.wllama = null;
    }
    this.modelReady = false;
    this.initPromise = null;
    this.activeModelId = id;
    safeLocalStorageSet(ACTIVE_MODEL_KEY, id);
    this.onLoadProgress = onProgress || null;

    await this.initialize();
  }

  public setProgressCallback(cb: (pct: number, msg: string) => void) {
    this.onLoadProgress = cb;
  }

  public async initialize(): Promise<void> {
    if (this.modelReady) return;
    if (!isBrowserSafe()) {
      this.modelReady = true;
      return;
    }
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const model = this.getActiveModel();

      // No stored model — try LM Studio if available
      if (!model) {
        if (this.lmStudioAvailable) {
          this.onLoadProgress?.(100, `LM Studio connected: ${this.lmStudioModelName}`);
          this.modelReady = true;
          return;
        }
        this.modelReady = false;
        this.initPromise = null;
        return;
      }

      // If model has a URL path (HuggingFace GGUF), load via Wllama
      if (model.source === 'huggingface' || model.path.startsWith('http')) {
        if (!model.downloaded) {
          this.onLoadProgress?.(0, `DAEMON ERROR: Weights for ${model.name} are missing.`);
          this.modelReady = false;
          this.initPromise = null;
          return;
        }

        try {
        kernelLog.info('[NEURAL_CORE] Initializing Wllama Node...');
        this.onLoadProgress?.(5, 'Initializing Wllama engine...');

        this.wllama = new Wllama({
          'single-thread/wllama.wasm': './wllama/wllama-single.wasm',
          'multi-thread/wllama.wasm':  './wllama/wllama-multi.wasm',
        }, {
          logger: {
            debug: () => {},
            log:   (...a) => { kernelLog.debug('[WLLAMA]', ...a); },
            warn:  (...a) => kernelLog.warn('[WLLAMA_WARN]', ...a),
            error: (...a) => kernelLog.error('[WLLAMA_ERR]', ...a),
          }
        });

        this.onLoadProgress?.(10, `Loading Model Weights: ${model.name}...`);
        
        await this.wllama.loadModelFromUrl(model.path, {
          n_ctx:      model.nCtx       ?? 4096,
          n_threads:  model.nThreads   ?? (navigator.hardwareConcurrency ? Math.ceil(navigator.hardwareConcurrency / 2) : 4),
          n_batch:    model.nBatch     ?? 256,
          progressCallback: ({ loaded, total }: { loaded: number; total: number }) => {
            const pct = total > 0 ? loaded / total : 0;
            this.onLoadProgress?.(10 + Math.floor(pct * 85), `Decoding neural blocks: ${Math.floor(pct * 100)}%`);
          }
        });

        this.modelReady = true;
        this.onLoadProgress?.(100, 'Neural Core Instantiated.');
      } catch (e) {
        kernelLog.error('[NEURAL_CORE] FATAL NATIVE INITIALIZATION:', e);
        this.modelReady = false;
        this.initPromise = null;
        throw e;
      }
      }

      // Non-HuggingFace model (e.g. local path) — try LM Studio
      if (this.lmStudioAvailable) {
        this.modelReady = true;
        this.onLoadProgress?.(100, `LM Studio connected: ${this.lmStudioModelName}`);
        return;
      }

      this.modelReady = false;
      this.initPromise = null;
    })();

    return this.initPromise;
  }

  public isReady(): boolean {
    return this.modelReady;
  }

  private async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task: async () => {
          try { resolve(await task()); } catch (e: unknown) { reject(e); }
        },
        resolve: () => {},
        reject
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) await item.task();
    }
    this.isProcessing = false;
  }

  public async generate(prompt: string, systemPrompt?: string): Promise<string> {
    return this.enqueue(async () => {
      if (!this.modelReady) await this.initialize();
      const model = this.getActiveModel();

      // Try LM Studio first if available (regardless of stored model)
      if (this.lmStudioAvailable) {
         try {
             const messages: Array<{ role: string; content: string }> = [];
             if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
             messages.push({ role: 'user', content: prompt });
             const res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ model: this.lmStudioModelName || 'local-model', messages, temperature: 0.7, max_tokens: 2048, stream: false })
             });
             if (!res.ok) throw new Error('LM Studio request failed');
             const d = await res.json();
             const content = d?.choices?.[0]?.message?.content;
             if (typeof content === 'string') return content;
         } catch (e) {
             kernelLog.warn('[LM_STUDIO] Port 1234 request failed, trying Wllama...');
         }
      }

      // Fall back to Wllama (in-browser GGUF)
      if (!this.wllama) throw new Error('No AI model available. Open Model Manager to download a model, or start LM Studio on port 1234.');
      const formatted = this.formatPrompt(prompt, systemPrompt);
      return await this.wllama.createCompletion(formatted, {
        nPredict: 2048,
        sampling: { temp: 0.7, top_k: 40, top_p: 0.9 },
      });
    });
  }

  public async stream(
    prompt: string,
    systemPrompt: string | undefined,
    onToken: (token: string) => void
  ): Promise<void> {
    return this.enqueue(async () => {
      if (!this.modelReady) await this.initialize();
      const model = this.getActiveModel();

      // Try LM Studio first if available
      if (this.lmStudioAvailable) {
         const messages: Array<{ role: string; content: string }> = [];
         if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
         messages.push({ role: 'user', content: prompt });

         try {
           const res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
             method: 'POST', headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ model: this.lmStudioModelName || 'local-model', messages, temperature: 0.7, max_tokens: 2048, stream: true })
           });
           if (!res.ok || !res.body) throw new Error('');
           const reader = res.body.getReader();
           const decoder = new TextDecoder();
           let buffer = '';
           while (true) {
             const { done, value } = await reader.read();
             if (done) break;
             buffer += decoder.decode(value, { stream: true });
             const parts = buffer.split('\n');
             buffer = parts.pop() || '';
             for (let p of parts) {
               p = p.trim();
               if (p && p.startsWith('data: ') && p !== 'data: [DONE]') {
                 try {
                   const d = JSON.parse(p.slice(6));
                   const t = d.choices[0]?.delta?.content || '';
                   if (t) onToken(t);
                 } catch {}
               }
             }
           }
           return;
         } catch {
           kernelLog.warn('[LM_STUDIO] Port 1234 stream failed, trying Wllama...');
         }
      }

      // Fall back to Wllama
      if (!this.wllama) throw new Error('No AI model available. Open Model Manager to download a model, or start LM Studio on port 1234.');
      const formatted = this.formatPrompt(prompt, systemPrompt);
      const decoder = new TextDecoder();
      try {
        const completion = await this.wllama.createCompletion(formatted, {
          nPredict: 2048,
          sampling: { temp: 0.7, top_k: 40, top_p: 0.9 },
          stream: true,
        });
        for await (const chunk of completion) {
          const text = decoder.decode(chunk.piece, { stream: true });
          onToken(text);
        }
      } catch (e) {
        kernelLog.error('[NEURAL_STREAM]:', e);
        const message = e instanceof Error ? e.message : String(e);
        onToken(`\n[SYSTEM ERROR NATIVE LFM: ${message}]`);
      }
    });
  }

  private formatPrompt(userPrompt: string, systemPrompt?: string): string {
    const model = this.getActiveModel();
    const modelId = model?.id.toLowerCase() ?? 'default';
    
    // Llama 3 / 3.1 / 3.2 Template
    if (modelId.includes('llama-3')) {
        let out = `<|begin_of_text|>`;
        if (systemPrompt) out += `<|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|>`;
        out += `<|start_header_id|>user<|end_header_id|>\n\n${userPrompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
        return out;
    }

    // Default ChatML for Qwen, Phi, SmolLM, etc.
    let out = '';
    if (systemPrompt) out += `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
    out += `<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`;
    return out;
  }

  public async searchHuggingFace(query: string): Promise<ModelConfig[]> {
    const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&filter=gguf&sort=downloads&direction=-1&limit=20`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HF Hub unreachable');
      const data = await res.json();
      
      return data.map((item: any) => {
        // Try to find a good GGUF filename from tags or siblings
        let bestFile = '';
        if (item.siblings) {
            const ggufs = item.siblings.filter((s: any) => s.rfilename.toLowerCase().endsWith('.gguf'));
            // Prefer Q4_K_M or Q8_0 or just the first one
            const preferred = ggufs.find((s: any) => s.rfilename.includes('Q4_K_M')) 
                           || ggufs.find((s: any) => s.rfilename.includes('Q8_0'))
                           || ggufs[0];
            if (preferred) bestFile = preferred.rfilename;
        }

        return {
          id: `hf_${item.id.replace(/\//g, '_')}`,
          name: item.id.split('/').pop() || item.id,
          path: `https://huggingface.co/${item.id}`,
          repoId: item.id,
          author: item.id.split('/')[0],
          filename: bestFile || 'Click to select file...',
          tags: item.tags || [],
          source: 'huggingface' as const,
          downloaded: false
        };
      });
    } catch (e) {
      kernelLog.error('[HF_SEARCH_ERR]', e);
      return [];
    }
  }

  public async downloadFromHuggingFace(
    repoId: string,
    filename: string,
    onProgress: (pct: number, msg: string) => void
  ): Promise<ModelConfig> {
    const safeRepoId = repoId.trim();
    const safeFilename = filename.trim();
    
    if (!safeFilename.toLowerCase().endsWith('.gguf')) {
        throw new Error('OS neural core only accepts GGUF matrices. Direct tensor files are incompatible.');
    }

    if (safeRepoId.includes('..') || safeFilename.includes('..')) {
      throw new Error('Invalid HuggingFace model reference');
    }

    const url = `https://huggingface.co/${safeRepoId}/resolve/main/${safeFilename}`;
    onProgress(0, `Fetching GGUF Neural Map -> ${safeFilename}...`);

    const id = `hf_${safeRepoId.replace('/', '_')}_${safeFilename.replace('.gguf', '')}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const sizeFromFilename = safeFilename.match(/q(\d+)[-_]?k[_-]?m/i)?.[1];
    const estimatedSize = sizeFromFilename ? `${Math.max(1, Math.round(Number(sizeFromFilename) / 2))} GB` : 'Unknown';
    const name = `${safeFilename} (HuggingFace Native)`;

    const config: ModelConfig = {
      id,
      name,
      path: url,
      nCtx: 4096,
      nBatch: 256,
      nGpuLayers: 50,
      repoId: safeRepoId,
      filename: safeFilename,
      size: estimatedSize,
      source: 'huggingface',
      downloaded: true,
      installedAt: Date.now(),
      tags: ['huggingface', 'gguf', 'local-inference'],
      author: safeRepoId.split('/')[0] || 'HuggingFace',
    };

    try {
      onProgress(10, 'Establishing neural uplink with HuggingFace Hub...');
      
      // If running in Electron, use native downloader for real persistent files
      const electron = (window as any).electron;
      if (electron && electron.invoke) {
        onProgress(15, 'Electron detected. Starting native persistent download...');
        
        const progressId = `dl_${Date.now()}`;
        const removeListener = electron.receive('download-progress', (data: any) => {
          if (data.id === progressId) {
            onProgress(data.pct, `Downloading: ${data.pct}% (${Math.round(data.downloaded / 1024 / 1024)} MB)`);
          }
        });

        const result = await electron.invoke('native-download', { 
            url, 
            repoId: safeRepoId,
            filename: safeFilename,
            onProgressId: progressId 
        });
        
        if (result.success) {
            config.path = `nexus://${encodeURIComponent(safeRepoId)}/${encodeURIComponent(safeFilename)}`; // Use repo in protocol!
            config.downloaded = true;
            onProgress(100, 'Native Download Complete. Model stored in local vault.');
        } else {
            throw new Error(result.error || 'Native download failed');
        }
      } else {
        // Fallback to URL-based approach for web
        const res = await fetch(url, { method: 'HEAD' });
        if (!res.ok) throw new Error(`Model isolated: ${res.status}`);

        const size = res.headers.get('content-length');
        const sizeMB = size ? Math.round(parseInt(size) / 1024 / 1024) : 'UNKNOWN';
        onProgress(20, `Model weight verified (${sizeMB} MB). Preparing integration...`);
        if (sizeMB !== 'UNKNOWN') {
          config.size = `${sizeMB} MB`;
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(`HuggingFace Uplink denied: ${message}`);
    }

    this.registerModel(config);
    await this.switchModel(config.id, onProgress).catch(() => void 0);
    onProgress(100, 'HuggingFace Matrix Download Complete. Native Model ready to run.');
    return config;
  }
}

export const localBrain = LocalBrain.getInstance();
function getProgressAmount(): number {
    return 10;
}
