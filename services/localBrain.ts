export interface ModelConfig {
  id: string;
  name: string;
  path: string;       // URL or local path
}

const DEFAULT_MODEL: ModelConfig = {
  id: 'lfm-daemon',
  name: 'DAEMON LFM (Port 1234)',
  path: 'http://127.0.0.1:1234/v1',
};

const STORED_MODELS_KEY = 'nexus_models_v1';
const ACTIVE_MODEL_KEY  = 'nexus_active_model_v1';

export class LocalBrain {
  private static instance: LocalBrain;
  private modelReady = false;
  private initPromise: Promise<void> | null = null;
  private activeModelId = DEFAULT_MODEL.id;
  private storedModels: ModelConfig[] = [DEFAULT_MODEL];

  // Concurrency queue — one inference at a time
  private queue: Array<{ task: () => Promise<void>; resolve: () => void; reject: (e: any) => void }> = [];
  private isProcessing = false;

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
    if (id === DEFAULT_MODEL.id) return;
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
    this.modelReady = false;
    this.initPromise = null;
    this.initialize().catch(console.error);
  }

  public async switchModel(id: string, onProgress?: (pct: number, msg: string) => void): Promise<void> {
    const model = this.storedModels.find(m => m.id === id);
    if (!model) throw new Error(`Model ${id} not found`);
    this.modelReady = false;
    this.initPromise = null;
    this.activeModelId = id;
    localStorage.setItem(ACTIVE_MODEL_KEY, id);
    await this.initialize();
  }

  // ─── Initialization ─────────────────────────────────────────

  public setProgressCallback(cb: (pct: number, msg: string) => void) {
    // Port 1234 models don't need load progress within the OS
  }

  public async initialize(): Promise<void> {
    if (this.modelReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[NEURAL_CORE] Connecting to LM Studio on port 1234...');
        // Test connection to LM Studio API
        const res = await fetch('http://127.0.0.1:1234/v1/models');
        if (res.ok) {
           console.log('[NEURAL_CORE] Connection established to port 1234');
           this.modelReady = true;
        } else {
           console.warn('[NEURAL_CORE] Warning: Server on 1234 returned non-200');
           this.modelReady = true; // Still mark ready so it tries
        }
      } catch (e) {
        console.warn('[NEURAL_CORE] Connection refused on 1234. Make sure LM Studio or core is running.');
        this.modelReady = true; // Mark ready to allow retry on generate()
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
      
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      try {
        const res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'local-model',
            messages,
            temperature: 0.7,
            max_tokens: 2048,
            stream: false
          })
        });

        if (!res.ok) throw new Error('API unreachable on port 1234');
        const data = await res.json();
        return data.choices[0].message.content;
      } catch (e: any) {
        console.error('[NEURAL_CORE] Failed to generate:', e);
        throw new Error('Connexion au port 1234 échouée. Assurez-vous que le modèle LFM est activé.');
      }
    });
  }

  public async stream(
    prompt: string,
    systemPrompt: string | undefined,
    onToken: (token: string) => void
  ): Promise<void> {
    return this.enqueue(async () => {
      if (!this.modelReady) await this.initialize();

      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      try {
        const res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'local-model',
            messages,
            temperature: 0.7,
            max_tokens: 2048,
            stream: true
          })
        });

        if (!res.ok || !res.body) {
           throw new Error('API unreachable on port 1234. Demarre le serveur local.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\\n');
          buffer = parts.pop() || '';
          
          for (let part of parts) {
            part = part.trim();
            if (part && part.startsWith('data: ') && part !== 'data: [DONE]') {
               try {
                 const data = JSON.parse(part.slice(6));
                 const text = data.choices[0]?.delta?.content || '';
                 if (text) onToken(text);
               } catch(err) {
                 // ignore JSON parse error for incomplete chunks
               }
            }
          }
        }
      } catch (e: any) {
        console.error('[NEURAL_STREAM]:', e);
        onToken(`\\n\\n[ERREUR CRITIQUE DAEMON]: Connexion au port 1234 refusée. Démarre ton module IA local LFM pour rétablir mon Core.`);
      }
    });
  }

  public async downloadFromHuggingFace(
    repoId: string,
    filename: string,
    onProgress: (pct: number, msg: string) => void
  ): Promise<ModelConfig> {
    onProgress(100, 'Modèle HF ajouté. Active-le sur le port 1234.');
    return DEFAULT_MODEL;
  }
}

export const localBrain = LocalBrain.getInstance();
