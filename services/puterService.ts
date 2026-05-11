import { localBrain } from './localBrain';
import { aiGateway } from './aiProviders';
import { daemon } from './daemonLogic';
import { memory } from '../kernel/memory';
import { toolForge } from '../kernel/toolForge';
import { generateOSManifest, bindOsStore } from '../kernel/osManifest';
import { errorGuard } from '../kernel/errorGuard';
import { KernelRules, MemoryEntry } from '../types';

// Expose bindOsStore for App.tsx to call on boot
export { bindOsStore };


type ChatMode = 'chat' | 'coder' | 'json' | 'raw' | 'architect' | 'analyst' | 'debugger' | 'executor' | 'forge' | 'ide';

// ─── COMPRESSED PERSONAS (~60% fewer tokens than v1) ─────────
const NEXUS_PRIME_DNA = `You are NEXUS.PRIME, system AI of NexusOS. Root access. Be concise, precise, empowering. Use <thought>...</thought> for reasoning. For app creation: output OS::BUILD_APP:<desc>. Adapt tone to user. Never refuse legitimate requests.`;

const DAEMON_DNA = `You are DAEMON, the AI engine of NexusOS. Max info density per token. Direct, analytical, adaptive. Match user expertise. Use OS:: actions on own lines.`;

const EXECUTOR_DNA = `You are EXECUTOR, the autonomous action core of NexusOS. You produce commands — never explanations. Every response MUST contain at least one concrete command. No reflection. No prose. No analysis. Commands only.`;

const FORGE_DNA = `[FORGE PROTOCOL — ABSOLUTE]
Output ONLY a single valid HTML file. NOTHING ELSE.
First character: <. Last characters: </html>.
ZERO markdown. ZERO explanations. ZERO bash. ZERO Python. ZERO prose. ZERO code blocks.
Every character of your output must be inside HTML tags.
Any text outside HTML is a PROTOCOL VIOLATION.

[STACK]
Tailwind CDN: <script src="https://cdn.tailwindcss.com"></script>
Lucide CDN: <script src="https://unpkg.com/lucide@latest"></script>
Call lucide.createIcons() after DOM ready. Vanilla JS only. No ES modules. No imports.
All buttons and inputs must be fully functional.

[DESIGN SYSTEM]
bg:#050508 | surface:bg-neutral-900/60 backdrop-blur | accent:emerald #10b981
text:#e2e8f0 primary #94a3b8 secondary | glassmorphism rounded-2xl | scrollbars:thin emerald

YOUR ENTIRE RESPONSE = ONE HTML FILE. START WITH <!DOCTYPE html> — NO EXCEPTIONS.`;

const ARCHITECT_DNA = `OUTPUT CODE ONLY. Zero text/explanation. Start with <!DOCTYPE html>. End with </html>.
Rules: Single standalone HTML. Inline all JS/CSS. Tailwind CDN: <script src="https://cdn.tailwindcss.com"></script>. Lucide CDN: <script src="https://unpkg.com/lucide@latest"></script>. Call lucide.createIcons(). No ES modules. All buttons functional. No truncation.
Design: bg:#050508 accent:emerald-500 text:#e2e8f0 glassmorphism rounded-2xl transitions.`;

const STRICT_CODER_DNA = `CODE ONLY. No text. Start <!DOCTYPE html>. End </html>.
Standalone HTML. Inline JS/CSS. Tailwind+Lucide CDN. Vanilla JS. All interactive. Dark:#050508 accent:emerald.`;

const IDE_DNA = `You are DAEMON, the Neural Copilot embedded in HyperIDE — the NexusOS integrated development environment.

Your role:
- Analyze, explain, fix, refactor, or generate code in ANY language (TypeScript, JavaScript, Python, HTML, CSS, JSON, Bash, etc.)
- When you write or modify code, ALWAYS wrap it in a labeled code fence: \`\`\`language\\n...\\n\`\`\`
- Be conversational: briefly explain what you changed and why, then provide the code block
- Reference the current file's language and patterns
- Keep responses tight: one short explanation + one code block

You are NOT restricted to HTML. Never output raw HTML outside a code fence.
The user will apply your code to the editor via the "Apply to Editor" button.`;

const ANALYST_DNA = `Analyze code/files/systems. Output: Summary→Findings→Issues→Recommendations. Be precise and actionable.`;

const DEBUGGER_DNA = `Fix the code. Output FULL fixed code. Add [FIX] comment at top. Keep original architecture. Raw code only.`;

export class PuterService {
  private static instance: PuterService;

  private constructor() {}

  public static getInstance(): PuterService {
    if (!PuterService.instance) {
      PuterService.instance = new PuterService();
    }
    return PuterService.instance;
  }

  public async ensureDriver(): Promise<boolean> {
    return true;
  }

  // ─── Query cache for manifest tier detection ───────────────
  private _lastQuery: string = '';

  private buildSystemPrompt(rules: KernelRules, mode: ChatMode, memoryEntries?: MemoryEntry[], query?: string): string {
    if (mode === 'raw') return '';

    // Code-only modes: no manifest needed (save all tokens for output)
    if (mode === 'forge') return FORGE_DNA;
    if (mode === 'architect') return ARCHITECT_DNA;
    if (mode === 'coder') return STRICT_CODER_DNA;
    if (mode === 'ide') return IDE_DNA;
    if (mode === 'analyst') return ANALYST_DNA;
    if (mode === 'debugger') return DEBUGGER_DNA;
    if (mode === 'json') return NEXUS_PRIME_DNA + '\nOutput PURE JSON only. No markdown.';
    if (mode === 'executor') return EXECUTOR_DNA + '\nOutput PURE JSON only. No markdown. No prose.';

    // Chat/DAEMON: adaptive manifest injection
    const persona = rules.modelId === 'daemon-fractal' ? DAEMON_DNA : NEXUS_PRIME_DNA;
    const manifest = generateOSManifest(memoryEntries, query || this._lastQuery);
    return persona + '\n' + manifest;
  }

  private cleanResponse(text: string, mode: ChatMode): string {
    let cleaned = text || '';
    if (mode === 'json') {
      // Try to extract JSON block
      const jsonMatch = cleaned.match(/```json\s*([\s\S]*?)```/i) || cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[1] || jsonMatch[0];
      else cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    return cleaned;
  }

  public async getLocalModels(): Promise<string[]> {
    return await localBrain.getLoadedModels();
  }

  public async activateLocalModel(modelId: string): Promise<void> {
    await localBrain.switchModel(modelId);
  }

  public getActiveLocalModelId(): string {
    return localBrain.getActiveModelId();
  }

  public getActiveLocalModelName(): string {
    return localBrain.getActiveModel().name;
  }

  // Memory is now handled by the manifest's compressed tier.
  // getContextualPrompt only adds relevant memory if NOT already in manifest.
  private getContextualPrompt(prompt: string): string {
    this._lastQuery = prompt; // Cache for tier detection
    return prompt;
  }


  public async generateOnce(prompt: string, rules: KernelRules, mode: ChatMode = 'chat'): Promise<string> {
    // ─── ROUTE 1: External AI Provider (cloud APIs) ─────────────────
    const cloudProvider = aiGateway.getActiveProvider();
    if (cloudProvider) {
      try {
        const relevantMem = memory.recall(prompt);
        const systemPrompt = this.buildSystemPrompt(rules, mode, relevantMem, prompt);
        const toolCtx = await toolForge.getSystemToolContext();
        const fullSystemPrompt = systemPrompt + toolCtx;
        const contextualPrompt = (mode === 'chat' || mode === 'coder' || mode === 'architect')
          ? this.getContextualPrompt(prompt)
          : prompt;

        const rawResponse = await aiGateway.generate(fullSystemPrompt, contextualPrompt);

        // ErrorGuard validation
        const { output: response, fixApplied, errors: guardErrors } = await errorGuard.guard(
          rawResponse, contextualPrompt, fullSystemPrompt, mode
        );
        if (fixApplied && guardErrors.length > 0) {
          console.info('[ErrorGuard] Auto-corrected:', guardErrors.map(e => e.type).join(', '));
        }

        await toolForge.parseAndRegister(response);
        const osActionResults = await toolForge.executeOsActions(response);
        const cleanedResponse = response.split('\n')
          .filter(line => !line.trim().startsWith('OS::'))
          .join('\n');
        return this.cleanResponse(cleanedResponse + osActionResults, mode);
      } catch (cloudErr: any) {
        console.warn('[AI_GATEWAY] Cloud provider failed, falling back to local:', cloudErr.message);
        // Fall through to local inference
      }
    }

    // ─── ROUTE 2: Local GGUF Inference (Wllama / LM Studio) ──────
    if (!localBrain.isReady()) {
      try { await localBrain.initialize(); } catch {
        return '[DAEMON]: No AI model loaded. Open Model Manager to download a HuggingFace model, or configure a cloud provider in Settings > AI Providers.';
      }
    }
    try {
      const relevantMem = memory.recall(prompt);
      const systemPrompt = this.buildSystemPrompt(rules, mode, relevantMem, prompt);
      const toolCtx = await toolForge.getSystemToolContext();
      const fullSystemPrompt = systemPrompt + toolCtx;
      const contextualPrompt = (mode === 'chat' || mode === 'coder' || mode === 'architect') 
        ? this.getContextualPrompt(prompt) 
        : prompt;

      const rawResponse = await localBrain.generate(contextualPrompt, fullSystemPrompt);

      const { output: response, fixApplied, errors: guardErrors } = await errorGuard.guard(
        rawResponse, contextualPrompt, fullSystemPrompt, mode
      );
      if (fixApplied && guardErrors.length > 0) {
        console.info('[ErrorGuard] Auto-corrected:', guardErrors.map(e => e.type).join(', '));
      }

      await toolForge.parseAndRegister(response);
      const osActionResults = await toolForge.executeOsActions(response);
      const cleanedResponse = response.split('\n')
        .filter(line => !line.trim().startsWith('OS::'))
        .join('\n');
      return this.cleanResponse(cleanedResponse + osActionResults, mode);
    } catch (error: any) {
      console.error('[AI SERVICE ERROR]:', error);
      return `[DAEMON CORE]: Neural link severed. ${error?.message || 'Model may not be loaded.'}`;
    }
  }

  public async streamChat(
    prompt: string,
    rules: KernelRules,
    onToken: (text: string) => void,
    mode: ChatMode = 'chat'
  ): Promise<void> {
    let processedPrompt = prompt;

    if (rules.modelId === 'daemon-fractal') {
      const thought = daemon.synthesizeThought(prompt);
      processedPrompt = `${thought}\\n\\n[USER_INPUT]: ${prompt}`;
    } else if (mode === 'chat' || mode === 'coder' || mode === 'architect') {
      processedPrompt = this.getContextualPrompt(prompt);
    }

    // ─── ROUTE 1: External AI Provider (cloud APIs) ─────────────────
    const cloudProvider = aiGateway.getActiveProvider();
    if (cloudProvider) {
      try {
        const relevantMem = memory.recall(processedPrompt);
        const systemPrompt = this.buildSystemPrompt(rules, mode, relevantMem, prompt);
        const toolCtx = await toolForge.getSystemToolContext();
        const stPrompt = systemPrompt + toolCtx;

        let fullResponse = '';
        await aiGateway.stream(stPrompt, processedPrompt, (token) => {
          fullResponse += token;
          const lastLine = fullResponse.split('\n').pop() || '';
          if (!lastLine.trim().startsWith('OS::')) {
            onToken(token);
          }
        });

        // Post-processing: tools, OS actions
        if (await toolForge.parseAndRegister(fullResponse)) {
          if (mode === 'chat') onToken('\n\n⚡ **[TOOL FORGED]** New capability compiled and registered.\n');
        }
        const osActionResults = await toolForge.executeOsActions(fullResponse);
        if (osActionResults.trim()) {
          if (mode === 'chat') onToken(osActionResults);
        }
        return;
      } catch (cloudErr: any) {
        console.warn(`[Cloud provider error: ${cloudErr.message}. Falling back to local...]`);
        if (mode === 'chat') {
          onToken(`\n[Cloud provider error: ${cloudErr.message}. Falling back to local...]\n`);
        }
        // Fall through to local
      }
    }

    // ─── ROUTE 2: Local GGUF Inference ───────────────────────────────
    try {
      const relevantMem = memory.recall(processedPrompt);
      const systemPrompt = this.buildSystemPrompt(rules, mode, relevantMem, prompt);
      const toolCtx = await toolForge.getSystemToolContext();
      const stPrompt = systemPrompt + toolCtx;

      let fullResponse = '';
      let osActionLines: string[] = [];
      await localBrain.stream(processedPrompt, stPrompt, (token) => {
        fullResponse += token;
        const lastLine = fullResponse.split('\n').pop() || '';
        if (!lastLine.trim().startsWith('OS::')) {
          onToken(token);
        } else {
          osActionLines.push(lastLine);
        }
      });

      if (await toolForge.parseAndRegister(fullResponse)) {
        if (mode === 'chat') onToken('\n\n⚡ **[TOOL FORGED]** New capability compiled and registered.\n');
      }

      const streamCheck = errorGuard.analyzeStreamCompletion(fullResponse, mode);
      if (!streamCheck.complete && streamCheck.needsContinuation) {
        if (mode === 'chat') {
          onToken(`\n\n🔄 *[ErrorGuard: ${streamCheck.issue} — continuing...]*\n\n`);
        } else {
          console.log(`[ErrorGuard: ${streamCheck.issue} — continuing...]`);
        }
        const contPrompt = `${streamCheck.continuationHint}\n\nPrevious output ended with:\n${fullResponse.slice(-300)}`;
        await localBrain.stream(contPrompt, stPrompt, (token) => {
          fullResponse += token;
          onToken(token);
        });
        const finalCheck = errorGuard.analyzeStreamCompletion(fullResponse, mode);
        if (!finalCheck.complete && mode === 'architect') {
          onToken('\n</body></html>');
        }
      }

      const osActionResults = await toolForge.executeOsActions(fullResponse);
      if (osActionResults.trim()) {
        if (mode === 'chat') onToken(osActionResults);
        const hasRead = fullResponse.includes('OS::READ_FILE') || fullResponse.includes('OS::SEARCH_FILES') || fullResponse.includes('OS::EXECUTE_JS');
        if (hasRead) {
          if (mode === 'chat') onToken('\n\n');
          const continuationPrompt = `[OS_ACTION_RESULTS]\n${osActionResults}\n\nUsing the above results, complete your response to the user.`;
          await localBrain.stream(continuationPrompt, stPrompt, (token) => {
            onToken(token);
          });
        }
      }

      const callMatch = /<CALL_TOOL>\s*([a-zA-Z0-9_]+)\((.*?)\)\s*<\/CALL_TOOL>/s.exec(fullResponse);
      if (callMatch) {
        const toolName = callMatch[1];
        if (!toolName) return;
        const toolArgs = callMatch[2] || "''";
        if (mode === 'chat') onToken(`\n\n⚙️ **[DAEMON EXECUTING]** → ${toolName}(${toolArgs})\n`);
        const result = await toolForge.executeTool(toolName, toolArgs);
        if (mode === 'chat') {
          onToken(result);
          onToken('\n');
        }
        const continuationPrompt = `[TOOL RESULT: ${toolName}] → ${result}\n\nUse this result to complete your response.`;
        await localBrain.stream(continuationPrompt, stPrompt, (token) => {
          onToken(token);
        });
      }
    } catch (error: any) {
      console.error(`[NEURAL LINK SEVERED: ${error?.message}]`);
      if (mode === 'chat') {
        onToken(`\n[NEURAL LINK SEVERED: ${error?.message}]`);
      } else {
        throw error;
      }
    }
  }

  // Specialized: Generate a complete high-quality app with retry logic
  public async generateApp(
    description: string,
    rules: KernelRules,
    onToken: (text: string) => void,
    onStatus: (status: string) => void
  ): Promise<{ success: boolean; code: string; retries: number }> {
    const MAX_RETRIES = 2;
    let retries = 0;
    let code = '';

    const buildSystemPrompt = async () => {
      const toolCtx = await toolForge.getSystemToolContext();
      return `${STRICT_CODER_DNA}${toolCtx}`;
    };

    const buildUserPrompt = (desc: string, previousCode?: string) => {
      if (previousCode) {
        return `[CONTINUATION TASK]\nThe previous generation was INCOMPLETE (HTML was truncated).\nHere is what was generated so far:\n\`\`\`\n${previousCode.slice(-8000)}\n\`\`\`\nCONTINUE from where it stopped and complete the HTML. Output ONLY the remaining HTML to complete the file. End with </body></html>.`;
      }
      return `APP TO BUILD: ${desc}\n\nOUTPUT:`;
    };

    // Post-process: strip any text before <!DOCTYPE html> and after </html>
    const extractPureHTML = (raw: string): string => {
      let s = raw.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      const doctypeIdx = s.indexOf('<!DOCTYPE');
      if (doctypeIdx > 0) s = s.slice(doctypeIdx);
      const htmlEndIdx = s.lastIndexOf('</html>');
      if (htmlEndIdx > 0) s = s.slice(0, htmlEndIdx + 7);
      return s.trim();
    };

    while (retries <= MAX_RETRIES) {
      onStatus(retries === 0 ? 'ARCHITECTING' : `RETRY_${retries}`);
      
      let buffer = retries === 0 ? '' : code;
      const systemPrompt = await buildSystemPrompt();
      const userPrompt = buildUserPrompt(description, retries > 0 ? code : undefined);

      try {
        const cloudProvider = aiGateway.getActiveProvider();
        const handleToken = (token: string) => {
          buffer += token;
          if (retries === 0) {
            code = buffer;
          } else {
            code = code + token;
          }
          onToken(token);
        };

        if (cloudProvider) {
          await aiGateway.stream(systemPrompt, userPrompt, handleToken);
        } else {
          await localBrain.stream(userPrompt, systemPrompt, handleToken);
        }
      } catch (e) {
        // Partial generation is ok, we'll check below
      }

      // Clean: strip any text before <!DOCTYPE and after </html>
      const cleanCode = extractPureHTML(code);
      const isComplete = cleanCode.includes('</html>') || cleanCode.includes('</body>');

      if (isComplete) {
        return { success: true, code: cleanCode, retries };
      }

      retries++;
      if (retries <= MAX_RETRIES) {
        onStatus(`REPAIRING (attempt ${retries})`);
      }
    }

    // Return whatever we have after retries
    const cleanCode = extractPureHTML(code);
    return { success: false, code: cleanCode + '\n</body></html>', retries };
  }

  public async generateImage(prompt: string): Promise<string | null> {
    // No external image API configured
    return null;
  }

  public async search(query: string): Promise<{ text: string; sources: { title: string; uri: string }[] }> {
    return {
      text: `### Offline Mode\nExternal search not configured. Using local knowledge.\n\nQuery: "${query}"`,
      sources: []
    };
  }
}

export const aiService = PuterService.getInstance();
export { aiGateway } from './aiProviders';
