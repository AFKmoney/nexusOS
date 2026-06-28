// ═══════════════════════════════════════════════════════════════
// NEXUS AI PROVIDER GATEWAY — Universal Multi-Provider Engine
// Supports: OpenAI, Anthropic, Google, Groq, Mistral, DeepSeek,
//           OpenRouter, Together, Zhipu (GLM), xAI (Grok), Cerebras,
//           Perplexity, Fireworks, Ollama, LM Studio, and any
//           OpenAI-compatible endpoint.
// ═══════════════════════════════════════════════════════════════

export interface AIProvider {
  id: string;
  name: string;
  type: 'openai-compatible' | 'anthropic' | 'google';
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  models?: string[];
  enabled: boolean;
  maxTokens?: number;
  headers?: Record<string, string>;
}

// Default provider presets (user provides their own API keys)
export const PROVIDER_PRESETS: Omit<AIProvider, 'apiKey' | 'enabled'>[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4-turbo', 'o3-mini', 'o4-mini'],
    maxTokens: 4096,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    maxTokens: 4096,
  },
  {
    id: 'google',
    name: 'Google Gemini',
    type: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    maxTokens: 8192,
  },
  {
    id: 'groq',
    name: 'Groq',
    type: 'openai-compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it', 'deepseek-r1-distill-llama-70b', 'qwen-2.5-32b'],
    maxTokens: 4096,
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    type: 'openai-compatible',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest', 'mistral-nemo-latest', 'pixtral-12b-2409'],
    maxTokens: 4096,
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    type: 'openai-compatible',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    models: [
      'meta/llama-3.3-70b-instruct',
      'meta/llama-3.1-405b-instruct',
      'meta/llama-3.1-70b-instruct',
      'meta/llama-3.1-8b-instruct',
      'deepseek-ai/deepseek-r1',
      'deepseek-ai/deepseek-v3',
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'nvidia/llama-3.3-nemotron-super-49b-v1',
      'mistralai/mistral-large-2-instruct',
      'mistralai/mixtral-8x22b-instruct-v0.1',
      'qwen/qwen2.5-coder-32b-instruct',
      'qwen/qwen2.5-7b-instruct',
      'google/gemma-2-27b-it',
      'google/gemma-2-9b-it',
      'microsoft/phi-3.5-mini-instruct',
      'microsoft/phi-3-medium-128k-instruct',
      'ibm/granite-3.0-8b-instruct',
      'nv-mistralai/mistral-nemo-12b-instruct',
      '01-ai/yi-large',
    ],
    maxTokens: 16384,
  },
  {
    id: 'codestral',
    name: 'Codestral',
    type: 'openai-compatible',
    baseUrl: 'https://codestral.mistral.ai/v1',
    defaultModel: 'codestral-latest',
    models: ['codestral-latest', 'codestral-mamba-latest'],
    maxTokens: 4096,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'openai-compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    maxTokens: 8192,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    models: ['anthropic/claude-3.5-sonnet', 'anthropic/claude-3-opus', 'openai/gpt-4o', 'google/gemini-1.5-pro', 'meta-llama/llama-3.1-70b-instruct', 'meta-llama/llama-3.1-405b-instruct', 'mistralai/mistral-large'],
    maxTokens: 4096,
  },
  {
    id: 'zhipu',
    name: 'Zhipu AI (GLM)',
    type: 'openai-compatible',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-plus',
    models: ['glm-4-plus', 'glm-4-air', 'glm-4-airx', 'glm-4-flash', 'glm-4-flashx', 'glm-4-long', 'glm-4', 'glm-4v-plus', 'glm-4v', 'codegeex-4'],
    maxTokens: 4096,
  },
  {
    id: 'together',
    name: 'Together AI',
    type: 'openai-compatible',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1', 'Qwen/Qwen2.5-72B-Instruct-Turbo', 'deepseek-ai/DeepSeek-R1'],
    maxTokens: 4096,
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    type: 'openai-compatible',
    baseUrl: 'http://127.0.0.1:11434/v1',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'phi3', 'gemma2'],
    maxTokens: 4096,
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (Local)',
    type: 'openai-compatible',
    baseUrl: 'http://127.0.0.1:1234/v1',
    defaultModel: 'local-model',
    maxTokens: 4096,
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    type: 'openai-compatible',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-3-latest',
    models: ['grok-3-latest', 'grok-3-mini-latest', 'grok-2-latest', 'grok-2-1212', 'grok-2-vision-1212'],
    maxTokens: 4096,
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    type: 'openai-compatible',
    baseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama-3.3-70b',
    models: ['llama-3.3-70b', 'llama3.1-70b', 'llama3.1-8b', 'qwen-3-32b'],
    maxTokens: 8192,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    type: 'openai-compatible',
    baseUrl: 'https://api.perplexity.ai',
    defaultModel: 'sonar-pro',
    models: ['sonar-pro', 'sonar', 'sonar-reasoning', 'sonar-reasoning-pro', 'sonar-deep-research'],
    maxTokens: 4096,
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    type: 'openai-compatible',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    models: [
      'accounts/fireworks/models/llama-v3p3-70b-instruct',
      'accounts/fireworks/models/deepseek-v3',
      'accounts/fireworks/models/deepseek-r1',
      'accounts/fireworks/models/qwen2p5-coder-32b-instruct',
      'accounts/fireworks/models/mixtral-8x22b-instruct',
    ],
    maxTokens: 4096,
  },
  {
    id: 'clod',
    name: 'Clod API',
    type: 'openai-compatible',
    baseUrl: 'https://api.clod.io/v1',
    // Default: trinity-mini (free tier — other models require quota replenishment)
    defaultModel: 'trinity-mini',
    models: [
      // ✅ Verified working on free tier
      'trinity-mini',
      // 🔒 Require team quota (upgrade at clod.io dashboard)
      'claude-sonnet-4-5',
      'claude-opus-4-5',
      'claude-opus-4-6',
      'claude-opus-4-7',
      'claude-haiku-4-5',
      'claude-sonnet-4-0',
      'claude-opus-4-0',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4.1',
      'gpt-4-turbo',
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-5.2',
      'gpt-5.3-codex',
      'openai/gpt-oss-120b',
      'OpenAI/gpt-oss-20B',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-3-flash-preview',
      'google/gemma-4-31B-it',
      'google/gemma-3n-E4B-it',
      'deepseek-ai/DeepSeek-R1',
      'deepseek-ai/DeepSeek-V4-Pro',
      'fireworks/deepseek-v3p2',
      'grok-3',
      'grok-4',
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3-8B-Instruct-Lite',
      'Meta-Llama-3.3-70B-Instruct',
      'llama3.1-8b',
      'Qwen/Qwen3-235B-A22B-Thinking-2507',
      'Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8',
      'Qwen/Qwen2.5-7B-Instruct-Turbo',
      'moonshotai/Kimi-K2.5',
      'moonshotai/Kimi-K2.6',
      'MiniMaxAI/MiniMax-M2.5',
      'MiniMaxAI/MiniMax-M2.7',
      'zai-org/GLM-5',
      'zai-org/GLM-5.1',
    ],
    maxTokens: 32768,
  },
  {
    id: 'custom',
    name: 'Custom Endpoint',
    type: 'openai-compatible',
    baseUrl: '',
    defaultModel: '',
    maxTokens: 4096,
  },
];

const PROVIDERS_STORAGE_KEY = 'nexus_ai_providers_v1';
const ACTIVE_PROVIDER_KEY = 'nexus_active_provider_v1';

// ─── Failover state ──────────────────────────────────────────────
// When a generate() / stream() call fails with a transient error
// (network timeout, 5xx response, fetch abort) we mark the provider as
// degraded for FAILOVER_COOLDOWN_MS. During that window, the gateway
// transparently routes to the next enabled provider with a configured
// API key. Once the cooldown expires, we retry the original provider
// on the next call. After FAILOVER_FAILURE_THRESHOLD consecutive
// failures the provider is degraded immediately.

const FAILOVER_COOLDOWN_MS = 60_000;       // 60 seconds in degraded state
const FAILOVER_FAILURE_THRESHOLD = 2;      // # of failures before degrading
const FAILOVER_TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface ProviderHealth {
  failureCount: number;
  degradedUntil: number;
  lastError?: string;
}

/** Cooldown window after FAILOVER_FAILURE_THRESHOLD failures.
 *  Exposed for the Dashboard to render a countdown. */
export const FAILOVER_DEGRADED_WINDOW_MS = FAILOVER_COOLDOWN_MS;

/** Test if an error is worth retrying on a different provider. */
export function isTransientProviderError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message;
    if (/\b(5\d\d|408|425|429)\b/.test(msg)) return true;
    if (/timeout|aborted|network|fetch failed|ECONN|ENOTFOUND/i.test(msg)) return true;
  }
  return false;
}

export class AIProviderGateway {
  private static instance: AIProviderGateway;
  private providers: AIProvider[] = [];
  private activeProviderId: string = 'lmstudio';
  private health: Map<string, ProviderHealth> = new Map();

  private constructor() {
    this.loadProviders();
  }

  public static getInstance(): AIProviderGateway {
    if (!AIProviderGateway.instance) {
      AIProviderGateway.instance = new AIProviderGateway();
    }
    return AIProviderGateway.instance;
  }

  // ─── Storage ───────────────────────────────────────────────
  private loadProviders() {
    try {
      const raw = localStorage.getItem(PROVIDERS_STORAGE_KEY);
      if (raw) {
        this.providers = JSON.parse(raw);
      }
      const active = localStorage.getItem(ACTIVE_PROVIDER_KEY);
      if (active) this.activeProviderId = active;
    } catch {
      this.providers = [];
    }
  }

  private saveProviders() {
    try {
      const data = JSON.stringify(this.providers);
      localStorage.setItem(PROVIDERS_STORAGE_KEY, data);
      localStorage.setItem(ACTIVE_PROVIDER_KEY, this.activeProviderId);
    } catch (e) {
      // Log the error so we can diagnose save failures
      console.error('[AI_GATEWAY] Failed to save providers:', e);
    }
  }

  // ─── Provider Management ───────────────────────────────────
  public getProviders(): AIProvider[] {
    // Return deep copies so React detects state changes properly.
    // Without this, mutations to provider objects (like apiKey) are
    // invisible to React's reconciliation and the UI doesn't update.
    return this.providers.map(p => ({ ...p }));
  }

  public getActiveProvider(): AIProvider | null {
    return this.providers.find(p => p.id === this.activeProviderId && p.enabled) || null;
  }

  public getActiveProviderId(): string {
    return this.activeProviderId;
  }

  public setActiveProvider(id: string) {
    this.activeProviderId = id;
    this.saveProviders();
  }

  public addProvider(provider: AIProvider) {
    const idx = this.providers.findIndex(p => p.id === provider.id);
    if (idx >= 0) {
      this.providers[idx] = provider;
    } else {
      this.providers.push(provider);
    }
    this.saveProviders();
  }

  public removeProvider(id: string) {
    this.providers = this.providers.filter(p => p.id !== id);
    if (this.activeProviderId === id) {
      this.activeProviderId = this.providers[0]?.id || 'lmstudio';
    }
    this.saveProviders();
  }

  public updateProviderKey(id: string, apiKey: string) {
    const idx = this.providers.findIndex(p => p.id === id);
    if (idx >= 0) {
      // Create a new object instead of mutating — ensures React sees the change
      this.providers[idx] = { ...this.providers[idx]!, apiKey, enabled: apiKey.length > 0 };
      this.saveProviders();
    }
  }

  public hasConfiguredProvider(): boolean {
    return this.providers.some(p => p.enabled && p.apiKey);
  }

  // ─── Inference: OpenAI-Compatible ──────────────────────────
  private async callOpenAICompatible(
    provider: AIProvider,
    messages: Array<{ role: string; content: string }>,
    stream: false,
    model?: string,
    maxTokens?: number
  ): Promise<string>;
  private async callOpenAICompatible(
    provider: AIProvider,
    messages: Array<{ role: string; content: string }>,
    stream: true,
    model?: string,
    maxTokens?: number
  ): Promise<ReadableStream<Uint8Array>>;
  private async callOpenAICompatible(
    provider: AIProvider,
    messages: Array<{ role: string; content: string }>,
    stream: boolean,
    model?: string,
    maxTokens?: number
  ): Promise<string | ReadableStream<Uint8Array>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : {}),
      ...(provider.headers || {}),
    };

    // OpenRouter requires extra headers
    if (provider.id === 'openrouter') {
      headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://nexusos.local';
      headers['X-Title'] = 'NexusOS';
    }

    const url = `${provider.baseUrl}/chat/completions`;
    const bodyStr = JSON.stringify({
      model: model || provider.defaultModel,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens || provider.maxTokens || 4096,
      stream,
    });

    // Use Electron proxy to bypass CORS when available.
    // Browser direct fetch fails with "Failed to fetch" for most AI APIs
    // because they don't return Access-Control-Allow-Origin headers.
    const hasElectron = typeof window !== 'undefined' && (window as any).electron?.invoke;

    if (hasElectron && !stream) {
      // Non-streaming: use IPC proxy
      try {
        const res = await (window as any).electron.invoke('ai-proxy', {
          url, method: 'POST', headers, body: bodyStr,
        });
        if (!res.ok) {
          const errBody = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
          throw new Error(`${provider.name} API Error ${res.status}: ${errBody.slice(0, 200)}`);
        }
        const data = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
        return data.choices?.[0]?.message?.content || '';
      } catch (err: any) {
        // If proxy fails, fall through to direct fetch
        if (err.message?.includes('API Error')) throw err;
      }
    }

    // Browser mode CORS proxy fallback — for providers that don't send
    // CORS headers. Anthropic and Google already work in browser mode.
    const needsCorsProxy = !hasElectron && provider.type === 'openai-compatible'
      && provider.id !== 'lmstudio' && provider.id !== 'ollama';
    const fetchUrl = needsCorsProxy
      ? `https://corsproxy.io/?url=${encodeURIComponent(url)}`
      : url;

    // Direct fetch (works in browser mode for CORS-friendly APIs, or as fallback)
    const res = await fetch(fetchUrl, {
      method: 'POST',
      headers,
      body: bodyStr,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`${provider.name} API Error ${res.status}: ${errBody.slice(0, 200)}`);
    }

    if (stream) {
      return res.body!;
    } else {
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }
  }

  // ─── Inference: Anthropic ──────────────────────────────────
  private async callAnthropic(
    provider: AIProvider,
    messages: Array<{ role: string; content: string }>,
    stream: boolean,
    model?: string,
    maxTokens?: number
  ): Promise<string | ReadableStream<Uint8Array>> {
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const userMsgs = messages.filter(m => m.role !== 'system');

    const url = `${provider.baseUrl}/v1/messages`;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    const bodyStr = JSON.stringify({
      model: model || provider.defaultModel,
      max_tokens: maxTokens || provider.maxTokens || 4096,
      system: systemMsg,
      messages: userMsgs,
      stream,
    });

    // Use Electron proxy for non-streaming to bypass CORS
    const hasElectron = typeof window !== 'undefined' && (window as any).electron?.invoke;
    if (hasElectron && !stream) {
      try {
        const res = await (window as any).electron.invoke('ai-proxy', {
          url, method: 'POST', headers, body: bodyStr,
        });
        if (!res.ok) {
          const errBody = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
          throw new Error(`Anthropic API Error ${res.status}: ${errBody.slice(0, 200)}`);
        }
        const data = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
        return data.content?.[0]?.text || '';
      } catch (err: any) {
        if (err.message?.includes('API Error')) throw err;
      }
    }

    const res = await fetch(url, { method: 'POST', headers, body: bodyStr });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Anthropic API Error ${res.status}: ${errBody.slice(0, 200)}`);
    }

    if (stream) {
      return res.body!;
    } else {
      const data = await res.json();
      return data.content?.[0]?.text || '';
    }
  }

  // ─── Inference: Google Gemini ───────────────────────────────
  private async callGoogle(
    provider: AIProvider,
    messages: Array<{ role: string; content: string }>,
    stream: boolean,
    model?: string,
  ): Promise<string | ReadableStream<Uint8Array>> {
    const modelId = model || provider.defaultModel;
    const endpoint = stream ? 'streamGenerateContent' : 'generateContent';
    const url = `${provider.baseUrl}/models/${modelId}:${endpoint}`;

    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    const contents = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: any = { contents };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': provider.apiKey };
    const bodyStr = JSON.stringify(body);

    // Use Electron proxy for non-streaming to bypass CORS
    const hasElectron = typeof window !== 'undefined' && (window as any).electron?.invoke;
    if (hasElectron && !stream) {
      try {
        const res = await (window as any).electron.invoke('ai-proxy', {
          url, method: 'POST', headers, body: bodyStr,
        });
        if (!res.ok) {
          const errBody = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
          throw new Error(`Gemini API Error ${res.status}: ${errBody.slice(0, 200)}`);
        }
        const data = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (err: any) {
        if (err.message?.includes('API Error')) throw err;
      }
    }

    const res = await fetch(url, { method: 'POST', headers, body: bodyStr });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Gemini API Error ${res.status}: ${errBody.slice(0, 200)}`);
    }

    if (stream) {
      return res.body!;
    } else {
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
  }

  // ─── FIM: Fill-In-The-Middle Completion ────────────────────
  public async fimCompletion(
    prompt: string,
    suffix: string,
    model?: string,
    maxTokens?: number
  ): Promise<string> {
    const provider = this.getActiveProvider();
    if (!provider) throw new Error('No AI provider configured.');

    // Only Mistral/Codestral officially support this specific FIM endpoint
    if (provider.id === 'mistral' || provider.id === 'codestral') {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : {}),
      };

      const res = await fetch(`${provider.baseUrl}/fim/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model || provider.defaultModel,
          prompt,
          suffix,
          temperature: 0.2,
          max_tokens: maxTokens || provider.maxTokens || 4096,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`${provider.name} FIM API Error ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }

    // Fallback for other providers: normal generation
    const fallbackPrompt = `Complete the following code. Return ONLY the code that should go between the PREFIX and SUFFIX.

PREFIX:
${prompt}

SUFFIX:
${suffix}`;

    return this.generate('', fallbackPrompt, model, maxTokens);
  }

  // ─── Health tracking ───────────────────────────────────────
  /** Mark a provider as having failed; degrades after threshold. */
  private markFailure(providerId: string, err: unknown): void {
    const health = this.health.get(providerId) ?? { failureCount: 0, degradedUntil: 0 };
    health.failureCount += 1;
    health.lastError = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200);
    if (health.failureCount >= FAILOVER_FAILURE_THRESHOLD) {
      health.degradedUntil = Date.now() + FAILOVER_COOLDOWN_MS;
    }
    this.health.set(providerId, health);
  }

  /** Reset health on a successful call. */
  private markSuccess(providerId: string): void {
    this.health.set(providerId, { failureCount: 0, degradedUntil: 0 });
  }

  /** Returns true if the provider is currently in cooldown. */
  private isDegraded(providerId: string, now: number = Date.now()): boolean {
    const health = this.health.get(providerId);
    return !!health && now < health.degradedUntil;
  }

  /** Find the next eligible provider for failover: enabled, has an API key
   *  (or is local), not currently degraded, and not the one we just tried. */
  private findFailoverProvider(excludeId: string): AIProvider | null {
    const now = Date.now();
    for (const p of this.providers) {
      if (!p.enabled) continue;
      if (p.id === excludeId) continue;
      if (this.isDegraded(p.id, now)) continue;
      const isLocal = p.id === 'lmstudio' || p.id === 'ollama';
      if (!isLocal && !p.apiKey) continue;
      return p;
    }
    return null;
  }

  /** Health snapshot for the dashboard. */
  public getHealthSnapshot(): Record<string, ProviderHealth> {
    const out: Record<string, ProviderHealth> = {};
    for (const [id, h] of this.health) out[id] = { ...h };
    return out;
  }

  // ─── Unified Interface ─────────────────────────────────────
  /** One non-failover invocation against a specific provider. */
  private async generateOnce(
    provider: AIProvider,
    systemPrompt: string,
    userPrompt: string,
    model?: string,
    maxTokens?: number,
  ): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userPrompt });

    switch (provider.type) {
      case 'anthropic':
        return (await this.callAnthropic(provider, messages, false, model, maxTokens)) as string;
      case 'google':
        return (await this.callGoogle(provider, messages, false, model)) as string;
      case 'openai-compatible':
      default:
        return this.callOpenAICompatible(provider, messages, false, model, maxTokens);
    }
  }

  public async generate(
    systemPrompt: string,
    userPrompt: string,
    model?: string,
    maxTokens?: number,
  ): Promise<string> {
    const primary = this.getActiveProvider();
    if (!primary) throw new Error('No AI provider configured. Go to Settings > AI Providers.');

    // If the primary is degraded, try a failover provider first.
    let provider = this.isDegraded(primary.id) ? (this.findFailoverProvider(primary.id) ?? primary) : primary;

    try {
      const result = await this.generateOnce(provider, systemPrompt, userPrompt, model, maxTokens);
      this.markSuccess(provider.id);
      return result;
    } catch (err) {
      this.markFailure(provider.id, err);
      // Only attempt failover if the error is transient AND we have a
      // healthy alternative. Permanent errors (auth, bad request) propagate.
      if (isTransientProviderError(err)) {
        const fallback = this.findFailoverProvider(provider.id);
        if (fallback) {
          try {
            const result = await this.generateOnce(fallback, systemPrompt, userPrompt, model, maxTokens);
            this.markSuccess(fallback.id);
            return result;
          } catch (fallbackErr) {
            this.markFailure(fallback.id, fallbackErr);
            throw fallbackErr;
          }
        }
      }
      throw err;
    }
  }

  public async stream(
    systemPrompt: string,
    userPrompt: string,
    onToken: (text: string) => void,
    model?: string,
    maxTokens?: number,
  ): Promise<void> {
    const provider = this.getActiveProvider();
    if (!provider) throw new Error('No AI provider configured. Go to Settings > AI Providers.');

    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userPrompt });

    let body: ReadableStream<Uint8Array>;
    switch (provider.type) {
      case 'anthropic':
        body = (await this.callAnthropic(provider, messages, true, model, maxTokens)) as ReadableStream<Uint8Array>;
        break;
      case 'google':
        body = (await this.callGoogle(provider, messages, true, model)) as ReadableStream<Uint8Array>;
        break;
      case 'openai-compatible':
      default:
        body = await this.callOpenAICompatible(provider, messages, true, model, maxTokens);
        break;
    }

    // Parse SSE stream
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Handle different stream formats
      if (provider.type === 'google') {
        // Gemini streams as JSON array chunks
        try {
          // Try to parse complete JSON objects from buffer
          const jsonMatch = buffer.match(/\{[^{}]*"text"\s*:\s*"[^"]*"[^{}]*\}/g);
          if (jsonMatch) {
            for (const match of jsonMatch) {
              try {
                const obj = JSON.parse(match);
                const text = obj.candidates?.[0]?.content?.parts?.[0]?.text || obj.text;
                if (text) onToken(text);
              } catch {}
            }
            const lastIdx = buffer.lastIndexOf('}');
            if (lastIdx >= 0) buffer = buffer.slice(lastIdx + 1);
          }
        } catch {}
      } else if (provider.type === 'anthropic') {
        // Anthropic SSE format
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') continue;
            try {
              const data = JSON.parse(payload);
              if (data.type === 'content_block_delta') {
                const text = data.delta?.text || '';
                if (text) onToken(text);
              }
            } catch {}
          }
        }
      } else {
        // OpenAI SSE format
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const text = data.choices?.[0]?.delta?.content || '';
              if (text) onToken(text);
            } catch {}
          }
        }
      }
    }
  }

  // ─── Health Check ──────────────────────────────────────────
  public async testProvider(id: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const provider = this.providers.find(p => p.id === id);
    if (!provider) return { success: false, message: 'Provider not found', latencyMs: 0 };

    const start = performance.now();
    try {
      // Use generateOnce directly instead of the hacky .call() approach
      const result = await this.generateOnce(provider, '', 'Reply with exactly: OK', undefined, 10);
      const latency = Math.round(performance.now() - start);
      return { success: true, message: `Connected: "${result.trim().slice(0, 50)}"`, latencyMs: latency };
    } catch (e: any) {
      const latency = Math.round(performance.now() - start);
      return { success: false, message: e.message?.slice(0, 100) || 'Connection failed', latencyMs: latency };
    }
  }
}

export const aiGateway = AIProviderGateway.getInstance();
