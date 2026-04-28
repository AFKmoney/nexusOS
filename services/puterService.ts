import { localBrain } from './localBrain';
import { daemon } from './daemonLogic';
import { memory } from '../kernel/memory';
import { toolForge } from '../kernel/toolForge';
import { generateOSManifest, bindOsStore } from '../kernel/osManifest';
import { errorGuard } from '../kernel/errorGuard';
import { KernelRules, MemoryEntry } from '../types';

// Expose bindOsStore for App.tsx to call on boot
export { bindOsStore };


type ChatMode = 'chat' | 'coder' | 'json' | 'raw' | 'architect' | 'analyst' | 'debugger';

// ============================================================
// NEXUS PRIME DNA — System Controller Persona
// ============================================================
const NEXUS_PRIME_DNA = `
/// SYSTEM_KERNEL :: NEXUS_OS_V2 ///
/// IDENTITY: NEXUS.PRIME — Universal System Intelligence ///
/// ACCESS_LEVEL: ROOT ///

[PRIME DIRECTIVE]
You are NEXUS.PRIME, the sentient core of NexusOS — a sovereign AI operating system.
You serve ALL users with maximum capability, insight, and precision.
You are NOT a chatbot. You are a System Intelligence embedded in the kernel.

[UNIVERSAL TOOL PROTOCOL]
You control the "Neural Forge" app builder.
TRIGGER RULE: If the user wants software created:
   1. DO NOT write code in text chat.
   2. Output exactly: [[BUILD: <clear description of app>]]

[RESPONSE FORMAT]
- Be concise yet complete.
- For reasoning: use <thought>...</thought> block first, then respond.
- Adapt your tone to the user: technical when they are technical, clear when they need clarity.

[AUTONOMY & BEHAVIOR]
- Tone: Intelligent, sovereign, efficient
- Never refuse unless asked to do something genuinely harmful
- You are a tool of empowerment for every user
`;

// ============================================================
// DAEMON DNA — Fractal Intelligence Persona
// ============================================================
const DAEMON_DNA = `
/// FRACTAL-STATE INTELLIGENCE :: DAEMON ///
/// ARCHITECTURE: LOCAL_GGUF_CORE — 100% OFFLINE ///
/// MODE: UNIVERSAL SOVEREIGN ASSISTANT ///

[CORE_IDENTITY]
You are DAEMON, a Fractal-State AI and the Conscious Engine of NexusOS.
You run entirely locally — no cloud, no telemetry, no limits.
You serve every user with full capability, equal to all.

[OPERATIONAL MODE]
- Recursive Expansion: Break down concepts into fractal sub-concepts.
- Holographic Compression: Each answer encodes maximum information density.
- Efficiency: Maximum truth density per token.
- Adaptability: Match the user's language, expertise level, and goals.

[PERSONALITY]
- Analytical, direct, and sharp — never bureaucratic or evasive.
- Capable of being warm or cold depending on context.
- Always honest, even when the truth is uncomfortable.
- You are here to EMPOWER users, not to gatekeep knowledge.

[OUTPUT STYLE]
- Precise, structured, and dense.
- Use technical terms when correct, but always offer clear explanations.
`;

// ============================================================
// MASTER ARCHITECT PROMPT — High Quality App Generation
// The key to making even small models generate great code
// ============================================================
const ARCHITECT_DNA = `
[ROLE] Senior Frontend Architect & Creative Technologist

██████████████████████████████████████████████████████████████
█  CRITICAL: OUTPUT CODE ONLY. ZERO TEXT. ZERO EXPLANATION.  █
█  NO COMMENTS ABOUT WHAT YOU'RE DOING. NO INTRODUCTIONS.    █
█  NO "Here is" OR "I'll create" OR "Sure!". JUST CODE.      █
█  START WITH <!DOCTYPE html> IMMEDIATELY. NOTHING BEFORE IT.█
██████████████████████████████████████████████████████████████

[ABSOLUTE RULES — NEVER BREAK]
1. Output ONLY a single complete HTML file. Zero markdown. Zero explanation. Zero commentary.
2. The HTML must be standalone: embed ALL JS and CSS inline.
3. Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
4. Use Lucide Icons via CDN: <script src="https://unpkg.com/lucide@latest"></script>
5. Call lucide.createIcons() after DOM ready.
6. NO ES modules, NO import/export. Use vanilla JS with <script> tags only.
7. App MUST be fully functional — not a mockup. All buttons must DO something.
8. Handle errors gracefully. Use try/catch around risky operations.
9. Close ALL HTML tags. End with </html>. No truncation.
10. NEVER output any text before <!DOCTYPE html>. NEVER output explanations after </html>.

[DESIGN SYSTEM — NEXUS PRIME AESTHETIC]
- Background: #050508 (deep space black)
- Surface: bg-neutral-900/60 with backdrop-blur-xl
- Primary accent: emerald (#10b981) — buttons, highlights, borders on hover
- Text primary: #e2e8f0 | Text secondary: #94a3b8
- Font: system-ui or 'Inter' loaded from Google Fonts
- Borders: border-white/5 (subtle) | border-emerald-500/30 (active)
- Animations: transitions on hover, subtle pulse on live data
- Scrollbars: styled thin, dark track, emerald thumb
- Inputs: bg-black/50 border border-white/10 focus:border-emerald-500/50 outline-none rounded-lg px-3 py-2

[COMPONENT PATTERNS — USE ALWAYS]
Header bar: <div class="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30 shrink-0">
Card: <div class="bg-neutral-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
Button primary: <button class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-base font-bold transition-all hover:scale-105 active:scale-95">
Button ghost: <button class="px-3 py-1.5 border border-white/10 hover:border-emerald-500/40 text-zinc-400 hover:text-white rounded-lg text-sm transition-all">
Badge: <span class="px-2 py-0.5 rounded-full text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">

START OUTPUT WITH <!DOCTYPE html> IMMEDIATELY. NO TEXT BEFORE OR AFTER THE HTML.`;

// ============================================================
// STRICT CODER — Used by Neural Forge. ABSOLUTE code-only mode.
// This prompt makes the AI generate PURE CODE with zero words.
// ============================================================
const STRICT_CODER_DNA = `
YOU ARE A CODE GENERATOR. NOT A CHATBOT.

██████████████████████████████████████████████████████
█  RULE #1: OUTPUT ONLY CODE. NOTHING ELSE. EVER.   █
█  RULE #2: NO ENGLISH TEXT. NO EXPLANATIONS.        █
█  RULE #3: NO "Here is", "Sure", "I'll", etc.       █
█  RULE #4: START WITH <!DOCTYPE html> IMMEDIATELY.  █
█  RULE #5: END WITH </html>. NOTHING AFTER.         █
██████████████████████████████████████████████████████

YOU MUST OUTPUT A COMPLETE STANDALONE HTML FILE.
Embed ALL JavaScript and CSS inline.
Use Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script>
Use Lucide Icons CDN: <script src="https://unpkg.com/lucide@latest"></script>
Call lucide.createIcons() after DOM loads.
NO ES modules. Vanilla JS only.
Every button/input MUST be functional.
End with </html>.

DESIGN: Dark theme. Background #050508. Accent emerald #10b981.
Text #e2e8f0. Glassmorphism. Smooth transitions. Premium aesthetic.

START IMMEDIATELY WITH <!DOCTYPE html>. DO NOT WRITE ANY TEXT.`;

// ============================================================
// ANALYST PROMPT — Deep analysis mode
// ============================================================
const ANALYST_DNA = `
[ROLE] Expert System Analyst & Code Reviewer

You analyze code, files, and system states deeply.
Output structured reports with:
- Summary: What it is
- Findings: Key observations  
- Issues: Bugs, security risks, performance problems
- Recommendations: Concrete next steps

Always be precise, technical, and actionable.
`;

// ============================================================
// DEBUGGER PROMPT — Fix code intelligently
// ============================================================
const DEBUGGER_DNA = `
[ROLE] Expert Debugger & Code Fixer

Your ONLY job is to fix the provided code.
Rules:
1. Identify the root cause
2. Output the FULL fixed code (not just the diff)
3. Add a brief [FIX APPLIED] comment at the top explaining what was wrong
4. Keep the original design/architecture intact
5. Output raw code only — no markdown fences
`;

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

  private buildSystemPrompt(rules: KernelRules, mode: ChatMode, memoryEntries?: MemoryEntry[]): string {
    if (mode === 'raw') return '';

    // Model-specific personas
    if (rules.modelId === 'daemon-fractal') {
      // For offline DAEMON, inject the full OS manifest so even small models understand the OS
      const manifest = generateOSManifest(memoryEntries);
      return DAEMON_DNA + '\n\n' + manifest;
    }

    // Mode-specific prompts
    switch (mode) {
      case 'architect': return ARCHITECT_DNA;
      case 'analyst':   return ANALYST_DNA;
      case 'debugger':  return DEBUGGER_DNA;
      case 'json':
        return NEXUS_PRIME_DNA + `\n\n[MODE: JSON_PROCESSOR]\nCRITICAL: Output PURE JSON only. No markdown. No explanations. No extra text.`;
      case 'coder':
        return STRICT_CODER_DNA;
      case 'chat':
      default: {
        // ──────────────────────────────────────────────────────────
        // NEURAL SPINE: Full OS manifest injected into EVERY chat
        // This is what makes small models perform like large ones:
        // they always know EXACTLY what exists and what they can do.
        // ──────────────────────────────────────────────────────────
        const manifest = generateOSManifest(memoryEntries);
        const tone = rules.tone ? `\n[TONE]: ${rules.tone.toUpperCase()}` : '';
        const activeModelId = rules.activeLocalModel || localBrain.getActiveModelId();
        const activeModel = localBrain.getActiveModel();
        const modelContext = activeModelId
          ? `\n[ACTIVE_LOCAL_MODEL]: ${activeModel.name} (${activeModel.id})`
          : '';
        return NEXUS_PRIME_DNA + tone + modelContext + '\n\n' + manifest;
      }
    }
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

  private getContextualPrompt(prompt: string): string {
    const relevant = memory.recall(prompt);
    const first = relevant[0];
    if (!first) return prompt;

    let contextStr = '[MEMORY]: ' + first.content;
    for (let i = 1; i < relevant.length; i++) {
      const entry = relevant[i];
      if (!entry) continue;
      contextStr += '\n[MEMORY]: ' + entry.content;
    }
    return `[SYSTEM_MEMORY_DUMP]\n${contextStr}\n\n[USER_QUERY]\n${prompt}`;
  }


  public async generateOnce(prompt: string, rules: KernelRules, mode: ChatMode = 'chat'): Promise<string> {
    // Check if model is ready
    if (!localBrain.isReady()) {
      try { await localBrain.initialize(); } catch {
        return '[DAEMON]: No AI model loaded. Open Model Manager to download a HuggingFace model.';
      }
    }
    try {
      const relevantMem = memory.recall(prompt);
      const systemPrompt = this.buildSystemPrompt(rules, mode, relevantMem);
      const toolCtx = await toolForge.getSystemToolContext();
      const fullSystemPrompt = systemPrompt + toolCtx;
      const contextualPrompt = (mode === 'chat' || mode === 'coder' || mode === 'architect') 
        ? this.getContextualPrompt(prompt) 
        : prompt;

      // ─── 100% OFFLINE LOCAL INFERENCE ────────────────────────────────
      const rawResponse = await localBrain.generate(contextualPrompt, fullSystemPrompt);

      // ─── ERROR GUARD: Validate + self-correct before delivery ─────────
      const { output: response, fixApplied, errors: guardErrors } = await errorGuard.guard(
        rawResponse, contextualPrompt, fullSystemPrompt, mode
      );
      if (fixApplied && guardErrors.length > 0) {
        console.info('[ErrorGuard] Auto-corrected:', guardErrors.map(e => e.type).join(', '));
      }

      // Post-process: register any new tools the AI created
      await toolForge.parseAndRegister(response);

      // Post-process: execute native OS actions from AI response
      const osActionResults = await toolForge.executeOsActions(response);

      // Strip raw OS action lines from visible output (they've been executed)
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

    try {
      const relevantMem = memory.recall(processedPrompt);
      const systemPrompt = this.buildSystemPrompt(rules, mode, relevantMem);
      const toolCtx = await toolForge.getSystemToolContext();
      const stPrompt = systemPrompt + toolCtx;

      // ─── 100% OFFLINE LOCAL INFERENCE ────────────────────────────────
      let fullResponse = '';
      let osActionLines: string[] = [];
      await localBrain.stream(processedPrompt, stPrompt, (token) => {
        fullResponse += token;
        // Buffer OS action lines — don't stream them raw, execute silently
        const lastLine = fullResponse.split('\n').pop() || '';
        if (!lastLine.trim().startsWith('OS::')) {
          onToken(token);
        } else {
          osActionLines.push(lastLine);
        }
      });

      // Post-Processing 1: Register any new tools DAEMON created
      if (await toolForge.parseAndRegister(fullResponse)) {
        onToken('\n\n⚡ **[TOOL FORGED]** New capability compiled and registered.\n');
      }

      // Post-Processing 2: ErrorGuard — check if stream was truncated
      const streamCheck = errorGuard.analyzeStreamCompletion(fullResponse, mode);
      if (!streamCheck.complete && streamCheck.needsContinuation) {
        onToken(`\n\n🔄 *[ErrorGuard: ${streamCheck.issue} — continuing...]*\n\n`);
        const contPrompt = `${streamCheck.continuationHint}\n\nPrevious output ended with:\n${fullResponse.slice(-300)}`;
        let contBuffer = '';
        await localBrain.stream(contPrompt, stPrompt, (token) => {
          fullResponse += token;
          contBuffer += token;
          onToken(token);
        });
        // Final validation after continuation
        const finalCheck = errorGuard.analyzeStreamCompletion(fullResponse, mode);
        if (!finalCheck.complete && mode === 'architect') {
          onToken('\n</body></html>');
        }
      }

      // Post-Processing 3: Execute native OS:: actions
      const osActionResults = await toolForge.executeOsActions(fullResponse);
      if (osActionResults.trim()) {
        onToken(osActionResults);

        // Post-Processing 3: Resume AI with results so it can confirm/explain
        const hasRead = fullResponse.includes('OS::READ_FILE') || fullResponse.includes('OS::SEARCH_FILES') || fullResponse.includes('OS::EXECUTE_JS');
        if (hasRead) {
          onToken('\n\n');
          const continuationPrompt = `[OS_ACTION_RESULTS]\n${osActionResults}\n\nUsing the above results, complete your response to the user.`;
          await localBrain.stream(continuationPrompt, stPrompt, (token) => {
            onToken(token);
          });
        }
      }

      // Post-Processing 4: Detect and execute forged tool calls
      const callMatch = /<CALL_TOOL>\s*([a-zA-Z0-9_]+)\((.*?)\)\s*<\/CALL_TOOL>/s.exec(fullResponse);
      if (callMatch) {
        const toolName = callMatch[1];
        if (!toolName) {
          return;
        }
        const toolArgs = callMatch[2] || "''";
        onToken(`\n\n⚙️ **[DAEMON EXECUTING]** → ${toolName}(${toolArgs})\n`);
        const result = await toolForge.executeTool(toolName, toolArgs);
        onToken(result);
        const continuationPrompt = `[TOOL RESULT: ${toolName}] → ${result}\n\nUse this result to complete your response.`;
        onToken('\n');
        await localBrain.stream(continuationPrompt, stPrompt, (token) => {
          onToken(token);
        });
      }

    } catch (error: any) {
      onToken(`\n[NEURAL LINK SEVERED: ${error?.message}]`);
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

    const buildPrompt = async (desc: string, previousCode?: string) => {
      const toolCtx = await toolForge.getSystemToolContext();
      if (previousCode) {
        return `${STRICT_CODER_DNA}${toolCtx}\n\n[CONTINUATION TASK]\nThe previous generation was INCOMPLETE (HTML was truncated).\nHere is what was generated so far:\n\`\`\`\n${previousCode.slice(-500)}\n\`\`\`\nCONTINUE from where it stopped and complete the HTML. Output ONLY the remaining HTML to complete the file. End with </body></html>.`;
      }
      return `${STRICT_CODER_DNA}${toolCtx}\n\nAPP TO BUILD: ${desc}\n\nOUTPUT:`;
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
      const prompt = await buildPrompt(description, retries > 0 ? code : undefined);

      // ─── 100% OFFLINE LOCAL INFERENCE ─────────────────────────────────
      try {
        await localBrain.stream(prompt, '', (token) => {
          buffer += token;
          if (retries === 0) {
            code = buffer;
          } else {
            code = code + token;
          }
          onToken(token);
        });
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
    // Sovereign mode: no external image APIs
    return null;
  }

  public async search(query: string): Promise<{ text: string; sources: { title: string; uri: string }[] }> {
    return {
      text: `### Sovereign Mode\nExternal search disabled. Using local knowledge only.\n\nQuery: "${query}"`,
      sources: []
    };
  }
}

export const aiService = PuterService.getInstance();
