// ═══════════════════════════════════════════════════════════════
// NEXUS OS ACTION TOOL DEFINITIONS — Native Function-Calling Schema
// ═══════════════════════════════════════════════════════════════
//
// Maps every OS:: action exposed by `parseOsActions()` (in
// kernel/osManifest.ts) to a provider-agnostic `AITool` definition
// that the AI gateway ships to OpenAI/Anthropic/Google via their
// native function-calling APIs.
//
// Why this exists:
//   The legacy text-parsing path required the model to emit lines
//   like `OS::WRITE_FILE:/path:content` on their own line. That was
//   fragile: extra whitespace, missing colons, or wrong format meant
//   silent failure. Native function calling returns structured JSON
//   tool calls directly from the API, eliminating the regex layer.
//
// Usage:
//   const tools = getOsActionTools();
//   const { text, toolCalls } = await aiGateway.generateWithTools(
//     systemPrompt, userPrompt, tools,
//   );
//   const results = await toolForge.executeToolCalls(toolCalls);
//
// The names here are stable identifiers used by toolForge.executeToolCalls
// to map back to OS:: action lines. Don't rename them without updating
// the mapping table in toolForge.ts.

import { AITool } from '../services/aiProviders';

/**
 * Returns the full set of OS:: action tool definitions. Grouped by
 * category in the source for readability; the array order is stable
 * so prompts and tests can rely on it.
 *
 * Each tool's `name` maps 1:1 to a case in
 * `ToolForge.executeToolCalls()`. The argument names match the
 * OS:: action's positional args (e.g. `path`, `content`).
 */
export function getOsActionTools(): AITool[] {
  return [
    // ─── Filesystem ────────────────────────────────────────────
    {
      name: 'write_file',
      description: 'Write content to a file in the virtual filesystem',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'VFS path, e.g. /home/user/notes.txt' },
          content: { type: 'string', description: 'File content' },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'read_file',
      description: 'Read a file from the virtual filesystem',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'VFS path' },
        },
        required: ['path'],
      },
    },
    {
      name: 'delete_file',
      description: 'Move a file to the Recycle Bin',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'VFS path' },
        },
        required: ['path'],
      },
    },
    {
      name: 'list_dir',
      description: 'List files in a directory',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'VFS path' },
        },
        required: ['path'],
      },
    },
    {
      name: 'create_folder',
      description: 'Create a new folder',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'VFS path' },
        },
        required: ['path'],
      },
    },
    {
      name: 'search_files',
      description: 'Search for files by name across the VFS',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (matches file names and contents)' },
        },
        required: ['query'],
      },
    },

    // ─── Application Management ────────────────────────────────
    {
      name: 'open_app',
      description: 'Open an application',
      parameters: {
        type: 'object',
        properties: {
          appId: { type: 'string', description: 'App ID, e.g. hyperide, netrunner, settings' },
          data: { type: 'object', description: 'Optional data to pass to the app' },
        },
        required: ['appId'],
      },
    },
    {
      name: 'close_app',
      description: 'Close an application window',
      parameters: {
        type: 'object',
        properties: {
          appId: { type: 'string', description: 'App ID to close' },
        },
        required: ['appId'],
      },
    },

    // ─── System & Personalization ──────────────────────────────
    {
      name: 'notify',
      description: 'Show a system notification',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Notification title' },
          message: { type: 'string', description: 'Notification body text' },
        },
        required: ['title', 'message'],
      },
    },
    {
      name: 'set_wallpaper',
      description: 'Change the desktop wallpaper',
      parameters: {
        type: 'object',
        properties: {
          wallpaperId: { type: 'string', description: 'Wallpaper identifier from the wallpaper library' },
        },
        required: ['wallpaperId'],
      },
    },
    {
      name: 'set_theme',
      description: 'Change the theme preset',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Theme name like neo-emerald' },
        },
        required: ['name'],
      },
    },
    {
      name: 'set_accent',
      description: 'Change the accent color',
      parameters: {
        type: 'object',
        properties: {
          hex: { type: 'string', description: 'Hex color like #10b981' },
        },
        required: ['hex'],
      },
    },

    // ─── Memory & Autonomy ─────────────────────────────────────
    {
      name: 'remember',
      description: 'Store something in long-term memory',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'What to remember' },
        },
        required: ['content'],
      },
    },
    {
      name: 'spawn_agent',
      description: 'Spawn a sub-agent for a complex task',
      parameters: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'What the agent should accomplish' },
          role: {
            type: 'string',
            description: 'Agent role/specialization',
            enum: ['planner', 'coder', 'reviewer', 'tester', 'researcher', 'architect', 'debugger'],
          },
        },
        required: ['goal'],
      },
    },
    {
      name: 'add_goal',
      description: 'Add a goal to the AutoPilot queue for autonomous execution',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Goal description for the AutoPilot queue' },
          priority: {
            type: 'string',
            description: 'Execution priority',
            enum: ['low', 'normal', 'high', 'critical'],
          },
        },
        required: ['description'],
      },
    },

    // ─── Skill Forge (Self-Evolution) ──────────────────────────
    {
      name: 'forge_skill',
      description: 'Create or update an AI-authored skill (self-evolution)',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Skill name (alphanumeric + dash/underscore)' },
          description: { type: 'string', description: 'Human-readable summary of what the skill does' },
          code: { type: 'string', description: 'JavaScript code. Use ctx.vfs, ctx.memory, ctx.events, ctx.os, ctx.ai, ctx.fetch, ctx.log. Return a value at the end.' },
        },
        required: ['name', 'description', 'code'],
      },
    },
    {
      name: 'call_skill',
      description: 'Execute a previously forged skill',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Skill name (must already be forged)' },
          args: { type: 'object', description: 'Arguments passed as ctx.args' },
        },
        required: ['name'],
      },
    },

    // ─── App Builder & Code Execution ──────────────────────────
    {
      name: 'build_app',
      description: 'Generate a complete application from a description. Creates a full app filesystem (manifest, HTML, CSS, JS) and registers it.',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'What the app should do' },
          name: { type: 'string', description: 'Optional app name' },
        },
        required: ['description'],
      },
    },
    {
      name: 'execute_js',
      description: 'Execute JavaScript code in the OS sandbox',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'JavaScript code to execute' },
        },
        required: ['code'],
      },
    },

    // ─── Web & Browser ─────────────────────────────────────────
    {
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Web search query' },
        },
        required: ['query'],
      },
    },
    {
      name: 'browse_navigate',
      description: 'Navigate the browser to a URL',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to navigate to' },
        },
        required: ['url'],
      },
    },

    // ─── Clipboard & Screen ────────────────────────────────────
    {
      name: 'clipboard_copy',
      description: 'Copy text to the clipboard',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to copy to the clipboard' },
        },
        required: ['text'],
      },
    },
    {
      name: 'take_screenshot',
      description: 'Capture the screen and save to VFS',
      parameters: { type: 'object', properties: {} },
    },
  ];
}
