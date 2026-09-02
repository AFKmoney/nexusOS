// Vite dev-server plugin: same-origin AI proxy.
//
// Problem: the browser can't call most OpenAI-compatible AI providers
// (Z.AI, OpenAI, Groq, Mistral, …) directly because those APIs return no
// CORS headers, so the browser blocks the response. The public corsproxy.io
// fallback is unreliable (403s). This plugin mounts a same-origin
// `/api/ai-proxy` route inside the Vite dev server that forwards the request
// server-side (no CORS in Node) and streams the response back to the browser.
//
// The browser posts the FULL target url + headers + body; the server signs
// the request with the provider API key and forwards it. The key never
// leaves the server / is never embedded in client bundles for the
// server-side-key path, but here we accept the key from the client (the app
// already stores it client-side in localStorage) and just use the proxy to
// defeat CORS.
//
// In production (Electron build) the electron main process has its own
// `ai-proxy` IPC handler, so this plugin is dev-only.

import type { Plugin } from 'vite';

interface ProxyBody {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export function aiProxyPlugin(): Plugin {
  return {
    name: 'nexusos-ai-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ai-proxy', async (req, res) => {
        // Only handle POST; reject everything else.
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        // Read the full request body.
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const raw = Buffer.concat(chunks).toString('utf8');

        let parsed: ProxyBody;
        try {
          parsed = JSON.parse(raw);
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }

        const targetUrl = parsed.url;
        if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing or invalid "url" in body' }));
          return;
        }

        try {
          const upstream = await fetch(targetUrl, {
            method: parsed.method || 'POST',
            headers: parsed.headers || { 'Content-Type': 'application/json' },
            ...(parsed.body ? { body: parsed.body } : {}),
          });

          res.statusCode = upstream.status;
          // Pass through content-type so SSE streams are handled correctly.
          const ct = upstream.headers.get('content-type');
          if (ct) res.setHeader('Content-Type', ct);

          if (upstream.body) {
            const reader = upstream.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
        } catch (err: any) {
          console.error('[ai-proxy] upstream error:', err?.message);
          res.statusCode = 502;
          res.end(JSON.stringify({ error: { message: err?.message || 'Upstream fetch failed' } }));
        }
      });
    },
  };
}
