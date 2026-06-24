const http = require('http');
const { exec, spawn } = require('child_process');
const crypto = require('crypto');
// Using the ws package that is already in node_modules from puppeteer
let WebSocket;
try {
  WebSocket = require('ws');
} catch (e) {
  console.warn('[DAEMON] "ws" module not found directly. Background websocket disabled.');
}

// DAEMON BRIDGE SERVER — Host Side
// Provides real host machine services, background execution, and websocket push to the UI.

const PORT = 3001;
const BIND_HOST = '127.0.0.1';
const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'null', // Electron file:// loads
]);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Same-origin / Electron renderer
  return ALLOWED_ORIGINS.has(origin);
};

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin) && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'OK', message: 'DAEMON BRIDGE ALIVE', websocket: !!WebSocket }));
    return;
  }

  res.writeHead(404);
  res.end();
});

if (WebSocket) {
  const wss = new WebSocket.Server({
    server,
    verifyClient: (info, done) => {
      const origin = info.origin || info.req.headers.origin;
      if (!isAllowedOrigin(origin)) {
        console.warn('[DAEMON] WS rejected from origin:', origin);
        return done(false, 403, 'Forbidden origin');
      }
      done(true);
    },
    maxPayload: 1024 * 1024, // 1 MB max message
  });
  console.log('[DAEMON] WebSocket Server Initialized.');

  wss.on('connection', (ws) => {
    console.log('[DAEMON] UI Client Connected via WebSocket');

    ws.on('message', (message) => {
      try {
        if (message.length > 1024 * 1024) {
          ws.send(JSON.stringify({ type: 'ERROR', error: 'payload too large' }));
          return;
        }
        const payload = JSON.parse(message);
        if (!payload || typeof payload !== 'object') return;

        if (payload.type === 'EXEC_COMMAND') {
          const { command, id } = payload;
          if (typeof command !== 'string' || command.length === 0 || command.length > 4096) {
            ws.send(JSON.stringify({ type: 'EXEC_RESULT', id, success: false, error: 'invalid command' }));
            return;
          }
          console.log(`[DAEMON] Executing Background Command: ${command}`);

          exec(command, { maxBuffer: 1024 * 1024 * 10, timeout: 60_000 }, (error, stdout, stderr) => {
            ws.send(JSON.stringify({
              type: 'EXEC_RESULT',
              id,
              success: !error,
              stdout,
              stderr,
              error: error ? error.message : null
            }));
          });
        }

      } catch (e) {
        console.error('[DAEMON] WebSocket Message Error:', e);
      }
    });

    ws.on('close', () => {
      console.log('[DAEMON] UI Client Disconnected');
    });
  });
}

server.listen(PORT, BIND_HOST, () => {
  console.log(`[DAEMON] Bridge Server listening on ${BIND_HOST}:${PORT} (loopback only)`);
});
