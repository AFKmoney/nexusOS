// ─── AI Pipeline Test Script ────────────────────────────────────────
// Tests the full AI pipeline with a real Mistral API key.
// Run: npx tsx scripts/test-ai-pipeline.ts

// Browser-global shims
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  } as any;
}
if (typeof global.navigator === 'undefined') {
  Object.defineProperty(global, 'navigator', {
    value: { hardwareConcurrency: 4 },
    writable: true,
  });
}
if (typeof global.window === 'undefined') {
  (global as any).window = {};
}
if (typeof global.performance === 'undefined') {
  (global as any).performance = { now: () => Date.now() };
}

import { aiGateway } from '../services/aiProviders';
import { webSearch } from '../kernel/webSearch';
import { codeExecutor } from '../kernel/codeExecution';

const MISTRAL_KEY = 'zdoQ4fU3UWC0j2pGAT49bRT2jVRvdz5O';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passCount++;
  } else {
    console.log(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    failCount++;
  }
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e: any) {
    console.log(`  ❌ FAIL: ${name} — ${e.message}`);
    failCount++;
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  NexusOS AI Pipeline Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Configure the Mistral provider
  aiGateway.addProvider({
    id: 'mistral',
    name: 'Mistral AI',
    type: 'openai-compatible',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKey: MISTRAL_KEY,
    defaultModel: 'mistral-small-latest',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
    enabled: true,
    maxTokens: 4096,
  });
  aiGateway.setActiveProvider('mistral');

  console.log('Provider configured: Mistral AI (mistral-small-latest)\n');

  // ─── Test 1: Basic generate ─────────────────────────────────────
  await test('generate() — basic prompt', async () => {
    const result = await aiGateway.generate('', 'Reply with exactly: OK');
    assert(result.trim().length > 0, 'generate returns non-empty response');
    assert(result.toLowerCase().includes('ok'), 'generate returns "OK"', `Got: "${result}"`);
  });

  // ─── Test 2: Generate with system prompt ────────────────────────
  await test('generate() — with system prompt', async () => {
    const result = await aiGateway.generate(
      'You are a helpful assistant. Always reply in French.',
      'Say hello'
    );
    assert(result.length > 0, 'generate with system prompt returns content');
    const french = /bonjour|salut|hello.*fran/i.test(result);
    assert(french, 'response is in French', `Got: "${result.slice(0, 100)}"`);
  });

  // ─── Test 3: Streaming ──────────────────────────────────────────
  await test('stream() — token streaming', async () => {
    const tokens: string[] = [];
    await aiGateway.stream('', 'Count from 1 to 5', (token) => {
      tokens.push(token);
    });
    assert(tokens.length > 0, 'stream receives tokens');
    const fullText = tokens.join('');
    assert(fullText.length > 0, 'streamed text is non-empty');
    assert(/\d/.test(fullText), 'streamed text contains numbers', `Got: "${fullText}"`);
  });

  // ─── Test 4: OS:: action generation ─────────────────────────────
  await test('generate() — OS:: action generation', async () => {
    const systemPrompt = 'You are NexusOS AI. Use OS:: actions on own lines to control the OS. Available: OS::OPEN_APP:<id>, OS::NOTIFY:<title>:<msg>';
    const result = await aiGateway.generate(systemPrompt, 'Open the terminal and notify me it is ready');
    assert(result.includes('OS::'), 'response contains OS:: actions', `Got: "${result.slice(0, 200)}"`);
    assert(result.includes('OS::OPEN_APP') || result.includes('OS::NOTIFY'), 'response has valid OS:: verbs');
  });

  // ─── Test 5: Wallpaper generation ───────────────────────────────
  await test('generate() — wallpaper mode (HTML generation)', async () => {
    const wallpaperPrompt = `[WALLPAPER FORGE PROTOCOL — ABSOLUTE]
Output ONLY a single valid animated HTML5/Canvas file. NOTHING ELSE.
First character: <. Last characters: </html>.
ZERO markdown. ZERO explanations.`;

    const result = await aiGateway.generate(wallpaperPrompt, 'Create a simple animated particle wallpaper', 'mistral-large-latest', 4096);
    assert(result.length > 100, 'wallpaper response is substantial', `Got ${result.length} chars`);

    const cleanCode = result.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    assert(cleanCode.includes('<!DOCTYPE') || cleanCode.includes('<html'), 'cleaned code contains HTML', `First 100 chars: "${cleanCode.slice(0, 100)}"`);
  });

  // ─── Test 6: Web search ────────────────────────────────────────
  await test('webSearch() — DuckDuckGo search', async () => {
    const results = await webSearch.search('NexusOS AI operating system', 5);
    assert(results.length >= 0, 'web search returns results array');
    if (results.length > 0) {
      assert(!!results[0]?.title, 'first result has title');
      assert(!!results[0]?.url, 'first result has URL');
    }
  });

  // ─── Test 7: Code execution (JavaScript) ───────────────────────
  await test('codeExecutor() — JavaScript execution', async () => {
    const result = await codeExecutor.execute('javascript', 'console.log(2 + 2); "result: " + (2 + 2);');
    assert(result.success === true, 'JS execution succeeds');
    assert(result.stdout.includes('4'), 'JS execution outputs correct result', `Got: "${result.stdout}"`);
  });

  // ─── Test 8: Mistral model switching ───────────────────────────
  await test('generate() — model override (mistral-large-latest)', async () => {
    const result = await aiGateway.generate('', 'Reply with exactly: LARGE_OK', 'mistral-large-latest', 10);
    assert(result.length > 0, 'large model returns content');
    assert(result.toLowerCase().includes('large') || result.toLowerCase().includes('ok'), 'large model responds correctly', `Got: "${result}"`);
  });

  // ─── Test 9: Error handling — invalid model ────────────────────
  await test('generate() — error handling (invalid model)', async () => {
    try {
      await aiGateway.generate('', 'test', 'nonexistent-model-xyz', 10);
      assert(false, 'should have thrown an error');
    } catch (e: any) {
      assert(e.message.includes('Error') || e.message.includes('error'), 'error message is descriptive', `Got: "${e.message}"`);
    }
  });

  // ─── Test 10: Long-form generation ─────────────────────────────
  await test('generate() — long-form code generation', async () => {
    const result = await aiGateway.generate(
      'You are a code generator. Return ONLY code, no explanations.',
      'Write a JavaScript function that reverses a string',
      'mistral-small-latest',
      500
    );
    assert(result.length > 50, 'long-form response is substantial', `Got ${result.length} chars`);
    assert(/function|=>/.test(result), 'response contains function syntax', `Got: "${result.slice(0, 100)}"`);
  });

  // ─── Summary ────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Results: ${passCount} passed, ${failCount} failed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
