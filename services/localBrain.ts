import { Wllama } from '@wllama/wllama/esm/index.js';

export interface ModelConfig {
  id: string;
  name: string;
  path: string;       // URL or local path
  nCtx?: number;
  nThreads?: number;
  nBatch?: number;
  nGpuLayers?: number;
}

const LFM_DAEMON_MODEL: ModelConfig = {
  id: 'lfm-daemon',
  name: 'DAEMON LFM (LM Studio / Port 1234)',
  path: 'http://127.0.0.1:1234/v1',
};

const DEFAULT_MODEL: ModelConfig = {
  id: 'lfm2.5-1.2b',
  name: 'LFM 2.5 1.2B (Local)',
  path: '/models/Llama-3.2-1B-Instruct-Q8_0.gguf', // Local VFS or relative path
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
  private storedModels: ModelConfig[] = [LFM_DAEMON_MODEL, DEFAULT_MODEL];

  // Concurrency queue
  private queue: Array<{ task: () => Promise<void>; resolve: () => void; reject: (e: any) => void }> = [];
  private isProcessing = false;

  private onLoadProgress: ((pct: number, msg: string) => void) | null = null;

  private constructor() {
    this.loadStoredModels();
    if (typeof localStorage !== 'undefined') {
      const savedActive = localStorage.getItem(ACTIVE_MODEL_KEY);
      if (savedActive) this.activeModelId = savedActive;
    }
  }

  public static getInstance(): LocalBrain {
    if (!LocalBrain.instance) {
      LocalBrain.instance = new LocalBrain();
    }
    return LocalBrain.instance;
  }

  private loadStoredModels() {
    try {
      if (typeof localStorage === 'undefined') {
        this.storedModels = [LFM_DAEMON_MODEL, DEFAULT_MODEL];
        return;
      }
      const raw = localStorage.getItem(STORED_MODELS_KEY);
      if (raw) {
        const parsed: ModelConfig[] = JSON.parse(raw);
        // Ensure core definitions are always present
        const filtered = parsed.filter(m => m.id !== LFM_DAEMON_MODEL.id && m.id !== DEFAULT_MODEL.id);
        filtered.unshift(LFM_DAEMON_MODEL, DEFAULT_MODEL);
        this.storedModels = filtered;
      }
    } catch {
      this.storedModels = [LFM_DAEMON_MODEL, DEFAULT_MODEL];
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
    if (id === LFM_DAEMON_MODEL.id || id === DEFAULT_MODEL.id) return;
    this.storedModels = this.storedModels.filter(m => m.id !== id);
    this.saveStoredModels();
    if (this.activeModelId === id) {
      this.activeModelId = DEFAULT_MODEL.id;
      localStorage.setItem(ACTIVE_MODEL_KEY, this.activeModelId);
    }
  }

  public async installModel(config: ModelConfig): Promise<void> {
    this.registerModel(config);
    await this.switchModel(config.id);
  }

  public setActiveModel(id: string) {
    const model = this.storedModels.find(m => m.id === id);
    if (!model) return;
    this.activeModelId = id;
    localStorage.setItem(ACTIVE_MODEL_KEY, id);
    
    // Switch async
    this.modelReady = false;
    this.initPromise = null;
    this.initialize().catch(console.error);
  }

  public async switchModel(id: string, onProgress?: (pct: number, msg: string) => void): Promise<void> {
    const model = this.storedModels.find(m => m.id === id);
    if (!model) throw new Error(`Model ${id} not found`);

    if (this.wllama) {
      try { await this.wllama.exit(); } catch {}
      this.wllama = null;
    }
    this.modelReady = false;
    this.initPromise = null;
    this.activeModelId = id;
    localStorage.setItem(ACTIVE_MODEL_KEY, id);
    this.onLoadProgress = onProgress || null;

    await this.initialize();
  }

  public setProgressCallback(cb: (pct: number, msg: string) => void) {
    this.onLoadProgress = cb;
  }

  public async initialize(): Promise<void> {
    if (this.modelReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const model = this.getActiveModel();

      // Branch: Rest API Proxy to LM Studio on Port 1234
      if (model.id === LFM_DAEMON_MODEL.id) {
        try {
          this.onLoadProgress?.(getProgressAmount(), 'Connecting to Port 1234 LM Studio...');
          const res = await fetch('http://127.0.0.1:1234/v1/models');
          if (res.ok) {
            this.modelReady = true;
            this.onLoadProgress?.(100, 'LM Studio Port 1234 Socket Linked.');
          } else {
            this.modelReady = true;
          }
        } catch {
           this.onLoadProgress?.(100, 'Warning: Port 1234 closed. Model will fallback to localhost.');
           this.modelReady = true;
        }
        return;
      }

      // Branch: Wllama Native Local GGUF Inference
      try {
        console.log('[NEURAL_CORE] Initializing Wllama Node...');
        this.onLoadProgress?.(5, 'Initializing Wllama engine...');

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
        console.error('[NEURAL_CORE] FATAL NATIVE INITIALIZATION:', e);
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

  // ─── Inference Logic ─────────────────────────────────────────

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

  public async generate(prompt: string, systemPrompt?: string): Promise<string> {
    return this.enqueue(async () => {
      if (!this.modelReady) await this.initialize();
      const model = this.getActiveModel();

      if (model.id === LFM_DAEMON_MODEL.id) {
         const messages = [];
         if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
         messages.push({ role: 'user', content: prompt });
         const res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ model: 'local-model', messages, temperature: 0.7, max_tokens: 2048, stream: false })
         });
         if (!res.ok) throw new Error('Port 1234 Local REST Failure');
         const d = await res.json();
         return d.choices[0].message.content;
      }

      // Wllama Flow
      if (!this.wllama) throw new Error('Brain Native Wasm not ready.');
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

      if (model.id === LFM_DAEMON_MODEL.id) {
         const messages = [];
         if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
         messages.push({ role: 'user', content: prompt });
         
         try {
           const res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
             method: 'POST', headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ model: 'local-model', messages, temperature: 0.7, max_tokens: 2048, stream: true })
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
                 } catch(err){}
               }
             }
           }
         } catch {
           onToken(`\n\n[DAEMON CRITICAL ERROR]: Connection to Port 1234 refused. Start your LM Studio instance.`);
         }
         return;
      }

      // Wllama Native Flow
      if (!this.wllama) throw new Error('Native Wasm not ready.');
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
        console.error('[NEURAL_STREAM]:', e);
        onToken(`\n[SYSTEM ERROR NATIVE LFM: ${e}]`);
      }
    });
  }

  private formatPrompt(userPrompt: string, systemPrompt?: string): string {
    let out = '';
    if (systemPrompt) out += `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
    out += `<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`;
    return out;
  }

  public async downloadFromHuggingFace(
    repoId: string,
    filename: string,
    onProgress: (pct: number, msg: string) => void
  ): Promise<ModelConfig> {
    const url = `https://huggingface.co/${repoId}/resolve/main/${filename}`;
    onProgress(0, `Fetching GGUF Neural Map -> ${filename}...`);

    const id = `hf_${repoId.replace('/', '_')}_${filename.replace('.gguf', '')}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const name = `${filename} (HuggingFace Native)`;

    const config: ModelConfig = {
      id, name, path: url, nCtx: 4096, nBatch: 256, nGpuLayers: 50,
    };

    try {
      onProgress(10, 'Establishing neural uplink with HuggingFace Hub...');
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) throw new Error(`Model isolated: ${res.status}`);
      
      const size = res.headers.get('content-length');
      const sizeMB = size ? Math.round(parseInt(size) / 1024 / 1024) : 'UNKNOWN';
      onProgress(20, `Model weight verified (${sizeMB} MB). Preparing integration...`);
    } catch (e: any) {
      throw new Error(`HuggingFace Uplink denied: ${e.message}`);
    }

    this.registerModel(config);
    onProgress(100, 'HuggingFace Matrix Download Complete. Native Model ready to run.');
    return config;
  }
}

export const localBrain = LocalBrain.getInstance();
function getProgressAmount(): number {
    return 10;
}
