
import { Wllama } from '@wllama/wllama';

export interface ModelConfig {
  id: string;
  name: string;
  path: string;       // URL or local path
  nCtx?: number;
  nThreads?: number;
  nBatch?: number;
  nGpuLayers?: number;
}

const DEFAULT_MODEL: ModelConfig = {
  id: 'lfm2.5-1.2b',
  name: 'LFM2.5-1.2B Q8 (Default)',
  path: typeof window !== 'undefined'
    ? `${window.location.origin}/models/LFM2.5-1.2B-Instruct-Q8_0.gguf`
    : '/models/LFM2.5-1.2B-Instruct-Q8_0.gguf',
  nCtx: 4096,
  nBatch: 256,
  nGpuLayers: 100,
};

const STORED_MODELS_KEY = 'nexus_models_v1';
const ACTIVE_MODEL_KEY  = 'nexus_active_model_v1';

export class LocalBrain {
  private static instance: LocalBrain;
  private wllama: Wllama | null = null;
  private modelReady = false;
  private initPromise: Promise<void> | null = null;
  private activeModelId = DEFAULT_MODEL.id;
  private storedModels: ModelConfig[] = [DEFAULT_MODEL];

  // Concurrency queue — one inference at a time
  private queue: Array<{ task: () => Promise<void>; resolve: () => void; reject: (e: any) => void }> = [];
  private isProcessing = false;

  // Progress callbacks  
  private onLoadProgress: ((pct: number, msg: string) => void) | null = null;

  private constructor() {
    this.loadStoredModels();
    const savedActive = localStorage.getItem(ACTIVE_MODEL_KEY);
    if (savedActive) this.activeModelId = savedActive;
  }

  public static getInstance(): LocalBrain {
    if (!LocalBrain.instance) {
      LocalBrain.instance = new LocalBrain();
    }
    return LocalBrain.instance;
  }

  // ─── Model Management ──────────────────────────────────────

  private loadStoredModels() {
    try {
      const raw = localStorage.getItem(STORED_MODELS_KEY);
      if (raw) {
        const parsed: ModelConfig[] = JSON.parse(raw);
        // Always keep default model first
        const withoutDefault = parsed.filter(m => m.id !== DEFAULT_MODEL.id);
        this.storedModels = [DEFAULT_MODEL, ...withoutDefault];
      }
    } catch {
      this.storedModels = [DEFAULT_MODEL];
    }
  }

  private saveStoredModels() {
    localStorage.setItem(STORED_MODELS_KEY, JSON.stringify(this.storedModels));
  }

  public getStoredModels(): ModelConfig[] {
    return this.storedModels;
  }

  public async getLoadedModels(): Promise<string[]> {
    return this.storedModels.map(m => m.name);
  }

  public getActiveModelId(): string {
    return this.activeModelId;
  }

  public getActiveModel(): ModelConfig {
    return this.storedModels.find(m => m.id === this.activeModelId) || DEFAULT_MODEL;
  }

  public registerModel(config: ModelConfig) {
    const existing = this.storedModels.findIndex(m => m.id === config.id);
    if (existing >= 0) {
      this.storedModels[existing] = config;
    } else {
      this.storedModels.push(config);
    }
    this.saveStoredModels();
  }

  public removeModel(id: string) {
    if (id === DEFAULT_MODEL.id) return; // Can't remove default
    this.storedModels = this.storedModels.filter(m => m.id !== id);
    this.saveStoredModels();
    if (this.activeModelId === id) {
      this.activeModelId = DEFAULT_MODEL.id;
      localStorage.setItem(ACTIVE_MODEL_KEY, this.activeModelId);
    }
  }

  /** Download + register + activate a model from HuggingFace or any URL */
  public async installModel(config: ModelConfig): Promise<void> {
    this.registerModel(config);
    await this.switchModel(config.id);
  }

  /** Mark a model as active (if already downloaded/registered) */
  public setActiveModel(id: string) {
    const model = this.storedModels.find(m => m.id === id);
    if (!model) return;
    this.activeModelId = id;
    localStorage.setItem(ACTIVE_MODEL_KEY, id);
    // Reinitialize with new model asynchronously
    this.modelReady = false;
    this.initPromise = null;
    this.initialize().catch(console.error);
  }

  public async switchModel(id: string, onProgress?: (pct: number, msg: string) => void): Promise<void> {
    const model = this.storedModels.find(m => m.id === id);
    if (!model) throw new Error(`Model ${id} not found`);

    // Unload current
    if (this.wllama) {
      try { await this.wllama.exit(); } catch {}
      this.wllama = null;
    }
    this.modelReady = false;
    this.initPromise = null;
    this.activeModelId = id;
    localStorage.setItem(ACTIVE_MODEL_KEY, id);
    this.onLoadProgress = onProgress || null;

    // Load the new model
    await this.initialize();
  }

  // ─── Initialization ─────────────────────────────────────────

  public setProgressCallback(cb: (pct: number, msg: string) => void) {
    this.onLoadProgress = cb;
  }

  public async initialize(): Promise<void> {
    if (this.modelReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const model = this.getActiveModel();
      try {
        console.log('[NEURAL_CORE] Initializing Wllama...');
        this.onLoadProgress?.(5, 'Initializing engine...');

        this.wllama = new Wllama({
          'single-thread/wllama.wasm': '/wllama/wllama-single.wasm',
          'multi-thread/wllama.wasm':  '/wllama/wllama-multi.wasm',
        }, {
          logger: {
            debug: () => {},
            log:   (...a) => { console.log('[WLLAMA]', ...a); },
            warn:  (...a) => console.warn('[WLLAMA_WARN]', ...a),
            error: (...a) => console.error('[WLLAMA_ERR]', ...a),
          }
        });

        this.onLoadProgress?.(10, `Loading model: ${model.name}...`);
        console.log(`[NEURAL_CORE] Loading: ${model.path}`);

        // @ts-ignore
        await this.wllama.loadModelFromUrl(model.path, {
          // @ts-ignore
          n_ctx:      model.nCtx       ?? 4096,
          // @ts-ignore
          n_threads:  model.nThreads   ?? (navigator.hardwareConcurrency ? Math.ceil(navigator.hardwareConcurrency / 2) : 4),
          // @ts-ignore
          n_batch:    model.nBatch     ?? 256,
          // @ts-ignore
          n_gpu_layers: model.nGpuLayers ?? 100,
          // @ts-ignore
          onProgress: (pct: number) => {
            this.onLoadProgress?.(10 + Math.floor(pct * 85), `Loading weights: ${Math.floor(pct * 100)}%`);
          }
        });

        this.modelReady = true;
        this.onLoadProgress?.(100, 'Neural core ready.');
        console.log('[NEURAL_CORE] Model ready.');
      } catch (e) {
        console.error('[NEURAL_CORE] FATAL:', e);
        this.modelReady = false;
        this.initPromise = null;
        throw e;
      }
    })();

    return this.initPromise;
  }

  public isReady(): boolean {
    return this.modelReady;
  }

  // ─── Queue ─────────────────────────────────────────────────

  private async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task: async () => {
          try { resolve(await task()); } catch(e) { reject(e); }
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

  // ─── Inference ─────────────────────────────────────────────

  public async generate(prompt: string, systemPrompt?: string): Promise<string> {
    return this.enqueue(async () => {
      if (!this.modelReady) await this.initialize();
      if (!this.wllama) throw new Error('Brain not ready.');
      const formatted = this.formatPrompt(prompt, systemPrompt);
      // @ts-ignore
      return await this.wllama.createCompletion(formatted, {
        // @ts-ignore
        n_predict: 2048,
        temp:  0.7,
        top_k: 40,
        top_p: 0.9,
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
      if (!this.wllama) throw new Error('Brain not ready.');

      const formatted = this.formatPrompt(prompt, systemPrompt);
      const decoder = new TextDecoder();

      try {
        // @ts-ignore
        const completion = await this.wllama.createCompletion(formatted, {
          // @ts-ignore
          n_predict: 2048,   // Reverted: n_predict + prompt cannot exceed n_ctx (4096), Wasm crashes otherwise!
          temp:  0.7,
          top_k: 40,
          top_p: 0.9,
          stream: true,
        });

        for await (const chunk of completion) {
          const text = decoder.decode(chunk.piece, { stream: true });
          onToken(text);
        }
      } catch (e) {
        console.error('[NEURAL_STREAM]:', e);
        onToken(`\n[SYSTEM ERROR: ${e}]`);
      }
    });
  }

  private formatPrompt(userPrompt: string, systemPrompt?: string): string {
    // ChatML format (Llama3 / Qwen / most modern GGUF models)
    let out = '';
    if (systemPrompt) out += `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
    out += `<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`;
    return out;
  }

  // Download a model from HuggingFace and register it
  public async downloadFromHuggingFace(
    repoId: string,
    filename: string,
    onProgress: (pct: number, msg: string) => void
  ): Promise<ModelConfig> {
    const url = `https://huggingface.co/${repoId}/resolve/main/${filename}`;

    onProgress(0, `Fetching ${filename}...`);

    // We store the URL directly — wllama can load from URLs
    const id = `hf_${repoId.replace('/', '_')}_${filename.replace('.gguf', '')}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const name = `${filename} (HuggingFace)`;

    const config: ModelConfig = {
      id,
      name,
      path: url,
      nCtx: 4096,
      nBatch: 256,
      nGpuLayers: 50,
    };

    // Verify the URL is accessible
    try {
      onProgress(10, 'Verifying model availability...');
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) throw new Error(`Model not found: ${res.status}`);
      
      const size = res.headers.get('content-length');
      const sizeMB = size ? Math.round(parseInt(size) / 1024 / 1024) : '?';
      onProgress(20, `Model verified. Size: ${sizeMB}MB. Registering...`);
    } catch (e: any) {
      throw new Error(`Cannot access model: ${e.message}`);
    }

    this.registerModel(config);
    onProgress(100, 'Model registered. Switch to it in Settings → Neural Core.');

    return config;
  }
}

export const localBrain = LocalBrain.getInstance();
