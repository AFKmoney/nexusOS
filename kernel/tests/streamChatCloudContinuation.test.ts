// Bug regression test: streamChat cloud path (ROUTE 1) must continue the
// conversation after executing OS:: read/search/exec actions, so the model
// can answer the user in natural language using the action results.
//
// ROOT BUG: ROUTE 1 returned the raw OS-action results to the user and
// returned immediately, so cloud-provider users (Z.AI, OpenAI, …) never got
// a natural-language follow-up when the model emitted OS::READ_FILE etc.
// ROUTE 2 (local) already did this continuation correctly.

import test, { describe, before, after } from 'node:test';
import assert from 'node:assert';

if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null, setItem: () => {}, removeItem: () => {},
    clear: () => {}, length: 0, key: () => null,
  } as any;
}
if (typeof global.window === 'undefined') (global as any).window = {};

import { aiGateway } from '../../services/aiProviders.ts';
import { toolForge } from '../../kernel/toolForge.ts';
import { memory } from '../../kernel/memory.ts';
import { aiService } from '../../services/puterService.ts';

// ─── Mocks ──────────────────────────────────────────────────────
// We stub the methods streamChat actually calls. The test only cares about
// call counts and whether the continuation prompt includes the results.

let streamCalls = 0;
const streamArgs: { systemPrompt: string; userPrompt: string }[] = [];

const MOCK_PROVIDER = {
  id: 'mock-cloud', name: 'Mock Cloud', type: 'openai-compatible',
  baseUrl: 'https://mock.invalid/v1', apiKey: 'k', defaultModel: 'm',
  models: ['m'], enabled: true, maxTokens: 4096,
};

// First response emulates a model that emits an OS:: read action and asks
// nothing further (this is the exact bug-trigger condition).
const FIRST_RESPONSE = 'OS::LIST_DIR:/home/user';

// Save originals at import time (before any mocking). These singletons are
// shared across the whole suite. We apply the mocks ONLY inside beforeAll
// (so they're active solely while this file's tests run) and restore them
// in afterAll — otherwise the mocked executeOsActions leaks into later
// files like skillForgePipeline which call the real implementation.
const _orig = {
  getActiveProvider: (aiGateway as any).getActiveProvider.bind(aiGateway),
  stream: (aiGateway as any).stream.bind(aiGateway),
  getSystemToolContext: (toolForge as any).getSystemToolContext.bind(toolForge),
  parseAndRegister: (toolForge as any).parseAndRegister.bind(toolForge),
  executeOsActions: (toolForge as any).executeOsActions.bind(toolForge),
  ensureLoadedAsync: (toolForge as any).ensureLoadedAsync?.bind(toolForge),
  recall: (memory as any).recall.bind(memory),
};

// NOTE: the mock hooks live INSIDE a describe() so node:test scopes them to
// this file's tests only. Under the shared-process runTests harness, a
// top-level before()/after() would leak the mocks (e.g. a stubbed
// memory.recall) into every other test file in the same run.
describe('streamChat cloud continuation', () => {
before(() => {
  (aiGateway as any).getActiveProvider = () => MOCK_PROVIDER;
  (aiGateway as any).stream = async (
    systemPrompt: string, userPrompt: string, onToken: (t: string) => void,
  ) => {
    streamCalls++;
    streamArgs.push({ systemPrompt, userPrompt });
    const text = streamCalls === 1 ? FIRST_RESPONSE : 'You have 2 files: notes.txt, todo.md';
    onToken(text);
  };

  (toolForge as any).getSystemToolContext = async () => '';
  (toolForge as any).parseAndRegister = async () => false;
  (toolForge as any).executeOsActions = async (text: string) => {
    if (text.includes('LIST_DIR')) {
      return '[OS::LIST_DIR] → /home/user:\nnotes.txt, todo.md';
    }
    return '';
  };
  (toolForge as any).ensureLoadedAsync = async () => {};
  (memory as any).recall = () => [];
});

after(() => {
  (aiGateway as any).getActiveProvider = _orig.getActiveProvider;
  (aiGateway as any).stream = _orig.stream;
  (toolForge as any).getSystemToolContext = _orig.getSystemToolContext;
  (toolForge as any).parseAndRegister = _orig.parseAndRegister;
  (toolForge as any).executeOsActions = _orig.executeOsActions;
  if (_orig.ensureLoadedAsync) (toolForge as any).ensureLoadedAsync = _orig.ensureLoadedAsync;
  (memory as any).recall = _orig.recall;
});

// ─── Test ───────────────────────────────────────────────────────

test('streamChat cloud path continues after a read-type OS:: action', async () => {
  streamCalls = 0;
  streamArgs.length = 0;

  const tokens: string[] = [];
  await aiService.streamChat(
    'list my files',
    { modelId: 'gpt-4o' } as any,
    (t: string) => { tokens.push(t); },
    'chat',
  );

  // The bug: ROUTE 1 returned early after executeOsActions, so the model
  // was never given the file list to answer with. Fixed behaviour must
  // make a SECOND aiGateway.stream call whose prompt contains the results.
  assert.ok(
    streamCalls >= 2,
    `expected cloud path to continue with a 2nd stream call, got ${streamCalls}`,
  );

  const continuation = streamArgs[1];
  assert.ok(
    continuation && continuation.userPrompt.includes('notes.txt'),
    'continuation prompt should include the OS action results (notes.txt)',
  );
});
});
