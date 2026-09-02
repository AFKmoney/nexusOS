// MCP Bridge test — validates the JSON-RPC client lifecycle
// (initialize → tools/list → tools/call), both `application/json` and
// `text/event-stream` response parsing, server management, and the
// namespaced tool routing through toolForge.executeToolCalls.

import test from 'node:test';
import assert from 'node:assert';

if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null, setItem: () => {}, removeItem: () => {},
    clear: () => {}, length: 0, key: () => null,
  } as any;
}
if (typeof global.window === 'undefined') (global as any).window = {};

import { mcpBridge } from '../mcpBridge.ts';

// A fake JSON-RPC MCP server.
const fakeServer = {
  url: 'https://mcp.test/mcp',
  name: 'Fake',
  handlers: {
    initialize: () => ({
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'FakeServer', version: '1.0' },
      capabilities: { tools: {} },
    }),
    'tools/list': () => ({
      tools: [
        { name: 'read_file', description: 'Read a file', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'path' } }, required: ['path'] } },
        { name: 'search', description: 'Search', inputSchema: { type: 'object', properties: { q: { type: 'string' }, n: { type: 'number' } } } },
      ],
    }),
    'tools/call': (params: any) => ({
      content: [{ type: 'text', text: `file-content-of-${params.arguments.path}` }],
      isError: false,
    }),
  },
  seen: [] as string[],
  methodOf: (body: any) => body.method,
};

async function fakeFetch(url: string, init: any): Promise<any> {
  const body = JSON.parse(init.body as string);
  fakeServer.seen.push(body.method);
  const result = (fakeServer.handlers as any)[body.method]?.(body.params) ?? {};
  const payload = JSON.stringify({ jsonrpc: '2.0', id: body.id, result });
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    text: async () => payload,
  };
}

test('namespaces and parses mcp tool names (round-trips a uuid server id)', () => {
  const serverId = 'd27ea843-1ab5-49fa-8e10-0439555546ab';
  const namespaced = mcpBridge.namespaceToolName(serverId, 'read_file');
  assert.strictEqual(namespaced, 'mcp_d27ea843-1ab5-49fa-8e10-0439555546ab__read_file');
  const parsed = mcpBridge.parseNamespacedTool(namespaced);
  assert.ok(parsed);
  assert.strictEqual(parsed!.serverId, serverId);
  assert.strictEqual(parsed!.toolName, 'read_file');
  assert.strictEqual(mcpBridge.parseNamespacedTool('read_file'), null);
});

test('connect runs initialize → tools/list and discovers tools', async () => {
  (global as any).fetch = fakeFetch;
  fakeServer.seen = [];
  const cfg = mcpBridge.addServer({ name: 'Fake', url: fakeServer.url, headers: {}, enabled: true });
  const conn = await mcpBridge.connect(cfg.id);
  assert.strictEqual(conn.ready, true);
  assert.strictEqual(conn.serverInfo!.name, 'FakeServer');
  assert.strictEqual(conn.tools.length, 2);
  assert.ok(fakeServer.seen.includes('initialize'));
  const defs = mcpBridge.getToolDefinitions();
  assert.ok(defs.some(d => d.name === `mcp_${cfg.id}__read_file`), `expected namespaced tool, got ${defs.map(d=>d.name)}`);
});

test('callTool invokes the tool and formats content', async () => {
  mcpBridge.listConfigs().forEach(c => mcpBridge.removeServer(c.id));
  (global as any).fetch = fakeFetch;
  fakeServer.seen = [];
  const cfg = mcpBridge.addServer({ name: 'Fake', url: fakeServer.url, headers: {}, enabled: true });
  await mcpBridge.connect(cfg.id);
  const out = await mcpBridge.callTool(cfg.id, 'read_file', { path: '/tmp/x.txt' });
  assert.match(out, /Fake/, `got: ${out}`);
  assert.match(out, /file-content-of-\/tmp\/x\.txt/, `got: ${out}`);
  assert.ok(fakeServer.seen.includes('tools/call'));
});

test('handles text/event-stream SSE responses', async () => {
  mcpBridge.listConfigs().forEach(c => mcpBridge.removeServer(c.id));
  const sseFetch = async (url: string, init: any) => {
    const body = JSON.parse(init.body as string);
    const result = (fakeServer.handlers as any)[body.method]?.(body.params) ?? {};
    const evt = `event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: body.id, result })}\n\n`;
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'text/event-stream' },
      text: async () => evt,
    };
  };
  (global as any).fetch = sseFetch;
  const cfg = mcpBridge.addServer({ name: 'Fake', url: fakeServer.url, headers: {}, enabled: true });
  const conn = await mcpBridge.connect(cfg.id);
  assert.strictEqual(conn.ready, true);
});

test('add / enable / remove server lifecycle', () => {
  mcpBridge.listConfigs().forEach(c => mcpBridge.removeServer(c.id));
  const added = mcpBridge.addServer({ name: 'X', url: 'https://x/mcp', headers: {}, enabled: true });
  assert.ok(added.id);
  assert.strictEqual(mcpBridge.isConnected(added.id), false);
  assert.strictEqual(mcpBridge.setEnabled(added.id, false), true);
  assert.strictEqual(mcpBridge.setEnabled('nope', true), false);
  assert.strictEqual(mcpBridge.removeServer(added.id), true);
  assert.strictEqual(mcpBridge.removeServer(added.id), false);
});

test('executeToolCalls routes mcp_* to the bridge and reports missing servers gracefully', async () => {
  mcpBridge.listConfigs().forEach(c => mcpBridge.removeServer(c.id));
  (global as any).fetch = fakeFetch;
  fakeServer.seen = [];
  const { toolForge } = await import('../toolForge.ts');
  const cfg = mcpBridge.addServer({ name: 'Fake', url: fakeServer.url, headers: {}, enabled: true });
  await mcpBridge.connect(cfg.id);
  const namespaced = `mcp_${cfg.id}__read_file`;
  const res = await toolForge.executeToolCalls([
    { id: '1', name: namespaced, arguments: { path: '/a.txt' } } as any,
    { id: '2', name: 'mcp_nonexistent_read_file', arguments: {} } as any,
  ]);
  assert.match(res, /file-content-of-\/a\.txt/, `got: ${res}`);
  assert.match(res, /⚠/, `missing server should return a warning: ${res}`);
});
