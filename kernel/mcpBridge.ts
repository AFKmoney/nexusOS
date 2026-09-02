// ═══════════════════════════════════════════════════════════════════
// MCP BRIDGE — Model Context Protocol client for NexusOS
// ═══════════════════════════════════════════════════════════════════
// Lets the DAEMON AI reach any MCP server's tools as if they were
// native function-calling tools. This is what pushes NexusOS past
// wrappers: the model isn't limited to built-ins — you point it at a
// filesystem, git, PostgreSQL, browser or any other MCP server and it
// drives them directly.
//
// TRANSPORT: Streamable HTTP (the modern MCP transport, also known as
// "HTTP with SSE"). A single POST is made per JSON-RPC request; the
// server may reply with `application/json` (single JSON-RPC response)
// OR `text/event-stream` (SSE events, each carrying a JSON-RPC
// response). Both are parsed here. `initialize` -> `tools/list` ->
// `tools/call` is the MCP lifecycle used.
//
// SECURITY: every server URL/user is user-configured in Settings and
// persisted to localStorage. Tool invocations are routed through the
// same Governance/policy layer as any OS:: action (see puterService).
//
// PROTOCOL VERSION: we send the latest MCP spec version and read the
// version the server returns. Servers that reject an unknown version
// still accept an `initialize` with a spec-compliant payload.
// ═══════════════════════════════════════════════════════════════════

import { kernelLog } from './log';
import { uuid } from '../utils/uuid';

const STORAGE_KEY = 'nexus_mcp_servers_v1';
const DEFAULT_PROTOCOL = '2024-11-05'; // MCP spec version we offer

export interface McpServerConfig {
  id: string;
  name: string;
  url: string;
  headers: Record<string, string>;
  enabled: boolean;
  addedAt: number;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, { type?: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
}

export interface McpConnection {
  config: McpServerConfig;
  serverInfo?: { name: string; version: string };
  tools: McpToolDefinition[];
  ready: boolean;
  error?: string;
}

const JSONRPC_VERSION = '2.0';

// ─── Helper: fetch + parse JSON-RPC over streamable-HTTP ------------
async function rpcRequest(
  config: McpServerConfig,
  method: string,
  params: unknown,
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...(config.headers || {}),
    ...(config.headers?.['Authorization'] ? {} : {}),
  };

  const res = await fetch(config.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: JSONRPC_VERSION,
      id: uuid(),
      method,
      params,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`MCP ${method} failed: HTTP ${res.status} ${res.statusText}`);
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const raw = await res.text();

  // Parse SSE (text/event-stream): collect the `data:` payload(s).
  if (contentType.includes('text/event-stream') || raw.trim().startsWith('event:') || raw.includes('\ndata:')) {
    let jsonText = '';
    for (const line of raw.split('\n')) {
      if (line.startsWith('data:')) {
        jsonText += line.slice(5).trim();
      }
    }
    if (!jsonText) throw new Error(`MCP ${method}: empty SSE stream (no data events)`);
    return JSON.parse(jsonText);
  }

  // Single JSON-RPC response.
  return JSON.parse(raw);
}

function unwrapRpc(payload: any): any {
  if (payload && typeof payload === 'object' && 'jsonrpc' in payload) {
    if (payload.error) {
      throw new Error(payload.error.message || 'MCP RPC error');
    }
    return payload.result;
  }
  return payload;
}

function toolToAIToolShape(t: McpToolDefinition): {
  name: string;
  description: string;
  parameters: { type: 'object'; properties: Record<string, { type: string; description: string; enum?: string[] }>; required?: string[] };
} {
  const properties: Record<string, { type: string; description: string; enum?: string[] }> = {};
  for (const [k, v] of Object.entries(t.inputSchema?.properties || {})) {
    properties[k] = {
      type: typeof v.type === 'string' ? v.type : 'string',
      description: typeof v.description === 'string' ? v.description : k,
      ...(Array.isArray(v.enum) ? { enum: v.enum } : {}),
    };
  }
  return {
    name: t.name,
    description: t.description || t.name,
    parameters: {
      type: 'object',
      properties,
      required: Array.isArray(t.inputSchema?.required) ? t.inputSchema.required : [],
    },
  };
}

// ─── Client class --------------------------------------------------
class McpBridge {
  private connections = new Map<string, McpConnection>();

  constructor() {
    // Load persisted server configs (lazily, browser-safe).
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          for (const cfg of JSON.parse(raw) as McpServerConfig[]) {
            if (cfg && cfg.id) {
              this.connections.set(cfg.id, { config: cfg, tools: [], ready: false });
            }
          }
        }
      } catch {
        // ignore — fresh start
      }
    }
  }

  private persist() {
    try {
      const configs = Array.from(this.connections.values()).map(c => c.config);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    } catch (e) {
      kernelLog.warn('[MCP] Persist failed:', e);
    }
  }

  /**
   * Tool name namespaced to a server, e.g. `mcp_<serverId>__<toolName>`.
   * Uses a double-underscore delimiter so a server id that itself contains
   * dashes (a UUID) round-trips cleanly.
   */
  namespaceToolName(serverId: string, toolName: string): string {
    return `mcp_${serverId.replace(/[^a-zA-Z0-9_-]/g, '')}__${toolName}`;
  }

  parseNamespacedTool(name: string): { serverId: string; toolName: string } | null {
    if (!name.startsWith('mcp_')) return null;
    const rest = name.slice(4);
    const sep = rest.indexOf('__');
    if (sep <= 0) return null;
    return {
      serverId: rest.slice(0, sep),
      toolName: rest.slice(sep + 2),
    };
  }

  listConfigs(): McpServerConfig[] {
    return Array.from(this.connections.values()).map(c => c.config);
  }

  getConnection(serverId: string): McpConnection | undefined {
    return this.connections.get(serverId);
  }

  isConnected(serverId: string): boolean {
    return this.connections.get(serverId)?.ready ?? false;
  }

  /** Initialize + connect to a server and discover its tools. */
  async connect(serverId: string): Promise<McpConnection> {
    const conn = this.connections.get(serverId);
    if (!conn) throw new Error(`MCP server ${serverId} not found`);
    const cfg = conn.config;

    // 1) initialize
    const initResult = unwrapRpc(await rpcRequest(cfg, 'initialize', {
      protocolVersion: DEFAULT_PROTOCOL,
      capabilities: { tools: { listChanged: false } },
      clientInfo: { name: 'nexusos', version: '2.0' },
    }));

    conn.serverInfo = initResult?.serverInfo
      ? { name: initResult.serverInfo.name || cfg.name, version: initResult.serverInfo.version || '' }
      : { name: cfg.name, version: '' };

    // 2) initialized notification (fire-and-forget)
    try {
      await rpcRequest(cfg, 'notifications/initialized', {});
    } catch (e) {
      // non-fatal — some servers don't ACK notifications
      kernelLog.info(`[MCP] initialized notification unacked for ${cfg.name}: ${(e as Error).message}`);
    }

    // 3) tools/list
    const listResult = unwrapRpc(await rpcRequest(cfg, 'tools/list', {}));
    const toolsRaw: McpToolDefinition[] = Array.isArray(listResult?.tools) ? listResult.tools : [];
    conn.tools = toolsRaw;
    conn.ready = true;
    delete conn.error;

    kernelLog.info(`[MCP] Connected to ${cfg.name} — ${conn.tools.length} tool(s)`);
    return conn;
  }

  /** Call a tool on a connected server. */
  async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<string> {
    const conn = this.connections.get(serverId);
    if (!conn) throw new Error(`MCP server ${serverId} not found`);
    if (!conn.ready) await this.connect(serverId);

    const result = unwrapRpc(await rpcRequest(conn.config, 'tools/call', {
      name: toolName,
      arguments: args || {},
    }));

    const content = Array.isArray(result?.content) ? result.content : [];
    const textParts: string[] = [];
    for (const item of content) {
      if (item?.type === 'text') textParts.push(item.text as string);
      else if (item?.type === 'resource') textParts.push(`[resource] ${item.resource?.uri || ''}`);
      else if (item?.type === 'image') textParts.push(`[image (${item.data?.length || 0} bytes, ${item.mimeType}) — see screenshot/original]`);
      else textParts.push(JSON.stringify(item));
    }

    const header = `[MCP ${conn.config.name} → ${toolName}] ${result?.isError ? 'ERROR' : 'OK'}`;
    const body = (textParts.length ? textParts.join('\n') : JSON.stringify(result, null, 2)) || '(no content)';
    return `${header}\n${body}`;
  }

  /** All connected servers' tools flattened into AITool[] for function-calling. */
  getToolDefinitions(): { name: string; description: string; parameters: { type: 'object'; properties: Record<string, { type: string; description: string; enum?: string[] }>; required?: string[] } }[] {
    const out: ReturnType<McpBridge['getToolDefinitions']> = [];
    for (const conn of this.connections.values()) {
      if (!conn.config.enabled) continue;
      for (const t of conn.tools) {
        const shaped = toolToAIToolShape(t);
        out.push({
          ...shaped,
          name: this.namespaceToolName(conn.config.id, t.name),
          description: `[MCP:${conn.config.name}] ${shaped.description}`,
        });
      }
    }
    return out;
  }

  /** Compact context block describing available MCP servers/tools for the system prompt. */
  getSystemContext(): string {
    const enabled = Array.from(this.connections.values()).filter(c => c.config.enabled);
    if (enabled.length === 0) return '';
    let ctx = '\n\n[MCP SERVERS — external tools reachable via native function-calling]\n';
    for (const conn of enabled) {
      ctx += `  • ${conn.config.name} (${conn.ready ? 'connected' : 'not connected'}): ${conn.tools.length ? conn.tools.map(t => t.name).slice(0, 12).join(', ') : 'no tools discovered'}\n`;
    }
    return ctx;
  }

  // ─── Server management ──────────────────────────────────────────
  addServer(config: Omit<McpServerConfig, 'id' | 'addedAt'>): McpServerConfig {
    const cfg: McpServerConfig = {
      ...config,
      id: uuid(),
      addedAt: Date.now(),
      enabled: config.enabled !== false,
    };
    this.connections.set(cfg.id, { config: cfg, tools: [], ready: false });
    this.persist();
    return cfg;
  }

  removeServer(serverId: string): boolean {
    const ok = this.connections.delete(serverId);
    if (ok) this.persist();
    return ok;
  }

  setEnabled(serverId: string, enabled: boolean): boolean {
    const conn = this.connections.get(serverId);
    if (!conn) return false;
    conn.config.enabled = enabled;
    this.persist();
    return true;
  }

  updateServerConfig(serverId: string, patch: Partial<Omit<McpServerConfig, 'id' | 'addedAt'>>): boolean {
    const conn = this.connections.get(serverId);
    if (!conn) return false;
    conn.config = { ...conn.config, ...patch };
    conn.ready = false; // force re-init on next call
    this.persist();
    return true;
  }

  /** Seed well-known demo MCP servers on a fresh install (disabled by default). */
  seedDefaults() {
    if (this.connections.size > 0) return;
    const defaults: Array<Omit<McpServerConfig, 'id' | 'addedAt'>> = [
      {
        name: 'Sample (echo tools)',
        url: 'https://mcp.example.com/mcp',
        headers: {},
        enabled: false,
      },
    ];
    for (const d of defaults) this.addServer(d);
  }
}

export const mcpBridge = new McpBridge();
// Seed defaults lazily (browser-safe).
if (typeof localStorage !== 'undefined') {
  mcpBridge.seedDefaults();
}
