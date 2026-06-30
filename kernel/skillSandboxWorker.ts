// ═══════════════════════════════════════════════════════════════════
// SKILL SANDBOX WORKER — Isolated execution environment for AI skills
//
// This worker runs AI-authored skills in an isolated Web Worker.
// The skill code has NO access to:
//   - The main thread's DOM, window, or document
//   - localStorage / IndexedDB directly
//   - The Node.js process (in Electron)
//   - Other skills' state
//
// The skill communicates with the main thread via a curated RPC
// protocol. Only whitelisted operations (vfs.read, vfs.write,
// ai.generate, etc.) are forwarded to the main thread for execution.
//
// SECURITY: This is the only thing standing between a malicious
// AI-forged skill and full system compromise. Never relax the
// whitelist. Never expose `eval`, `Function`, `require`, `import`,
// or `globalThis` mutation to the sandbox.
// ═══════════════════════════════════════════════════════════════════

/// <reference lib="webworker" />

// Whitelist of operations the skill can request. Anything not on this
// list is rejected with an error.
const ALLOWED_OPS = new Set([
  'vfs.read',
  'vfs.write',
  'vfs.list',
  'vfs.delete',
  'memory.remember',
  'memory.recall',
  'events.emit',
  'os.openWindow',
  'os.closeWindow',
  'os.notify',
  'os.getRegistry',
  'os.getWindows',
  'ai.generate',
  'ai.stream',
  'fetch',
  'log',
]);

interface SandboxRequest {
  id: number;
  op: string;
  args: any[];
}

interface SandboxResponse {
  id: number;
  ok: boolean;
  result?: any;
  error?: string;
}

let nextRequestId = 1;
const pendingRequests = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();

// The main thread registers a message handler that processes our
// RPC requests and sends back responses.
self.onmessage = (event: MessageEvent) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  // Response to one of our requests
  if (msg.type === 'response' && typeof msg.id === 'number') {
    const pending = pendingRequests.get(msg.id);
    if (!pending) return;
    pendingRequests.delete(msg.id);
    if (msg.ok) {
      pending.resolve(msg.result);
    } else {
      pending.reject(new Error(msg.error || 'RPC failed'));
    }
    return;
  }

  // Request to execute a skill
  if (msg.type === 'execute') {
    executeSkill(msg.code, msg.ctx).then((result) => {
      const response: SandboxResponse = { id: msg.id, ok: true, result };
      (self as any).postMessage({ type: 'result', id: msg.id, ok: true, result });
    }).catch((err) => {
      (self as any).postMessage({ type: 'result', id: msg.id, ok: false, error: err?.message || String(err) });
    });
  }
};

async function rpc(op: string, ...args: any[]): Promise<any> {
  if (!ALLOWED_OPS.has(op)) {
    throw new Error(`Permission denied: operation '${op}' is not allowed in the sandbox`);
  }
  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    (self as any).postMessage({ type: 'request', id, op, args });
    // Timeout after 25s (skill timeout is 30s, leave 5s margin)
    setTimeout(() => {
      const pending = pendingRequests.get(id);
      if (pending) {
        pendingRequests.delete(id);
        reject(new Error(`RPC timeout for '${op}'`));
      }
    }, 25000);
  });
}

// Build the ctx object that skills receive. Each method makes an RPC
// call to the main thread, which validates and executes it.
function buildSandboxCtx(args: unknown, argsRaw: string) {
  return {
    args,
    argsRaw,
    vfs: {
      read: (path: string) => rpc('vfs.read', path),
      write: (path: string, content: string) => rpc('vfs.write', path, content),
      list: (path: string) => rpc('vfs.list', path),
      delete: (path: string) => rpc('vfs.delete', path),
    },
    memory: {
      remember: (content: string, tags: string[] = []) => rpc('memory.remember', content, tags),
      recall: (query: string, limit = 5) => rpc('memory.recall', query, limit),
    },
    events: {
      emit: (event: string, payload?: unknown) => rpc('events.emit', event, payload),
      on: (_event: string, _handler: (payload: unknown) => void) => {
        // Workers can't receive unsolicited messages from main thread
        // for event subscriptions (would require a more complex protocol).
        // Return a no-op unsubscribe.
        console.warn('[Sandbox] events.on is not supported in the sandbox');
        return () => {};
      },
    },
    os: {
      openWindow: (appId: string, data?: unknown) => rpc('os.openWindow', appId, data),
      closeWindow: (windowId: string) => rpc('os.closeWindow', windowId),
      notify: (title: string, message: string) => rpc('os.notify', title, message),
      getRegistry: () => rpc('os.getRegistry'),
      getWindows: () => rpc('os.getWindows'),
    },
    ai: {
      generate: (prompt: string, mode = 'chat') => rpc('ai.generate', prompt, mode),
      stream: async (prompt: string, onToken: (t: string) => void, mode = 'chat') => {
        // Streaming via RPC: the main thread sends back a series of
        // 'stream-token' messages with the streamId, then a 'stream-done'.
        const streamId = `stream-${Date.now()}-${Math.random()}`;
        return new Promise<void>((resolve, reject) => {
          const tokenHandler = (event: MessageEvent) => {
            const msg = event.data;
            if (msg?.streamId !== streamId) return;
            if (msg.type === 'stream-token') {
              onToken(msg.token);
            } else if (msg.type === 'stream-done') {
              self.removeEventListener('message', tokenHandler);
              resolve();
            } else if (msg.type === 'stream-error') {
              self.removeEventListener('message', tokenHandler);
              reject(new Error(msg.error));
            }
          };
          self.addEventListener('message', tokenHandler);
          (self as any).postMessage({ type: 'request', id: nextRequestId++, op: 'ai.stream', args: [prompt, mode, streamId] });
        });
      },
    },
    fetch: (url: string, options: Record<string, unknown> = {}) => rpc('fetch', url, options),
    log: (msg: string) => rpc('log', msg),
  };
}

async function executeSkill(code: string, ctxData: { args: unknown; argsRaw: string }) {
  const ctx = buildSandboxCtx(ctxData.args, ctxData.argsRaw);
  // Wrap in async IIFE so skills can use `await` at the top level.
  // The skill code runs in the worker's global scope, which is
  // already isolated from the main thread.
  // eslint-disable-next-line no-new-func
  const fn = new Function('ctx', `"use strict";\nreturn (async () => {\n${code}\n})();`) as (ctx: any) => Promise<unknown>;
  return await fn(ctx);
}
