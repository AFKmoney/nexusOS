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

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
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
  const wss = new WebSocket.Server({ server });
  console.log('[DAEMON] WebSocket Server Initialized.');

  wss.on('connection', (ws) => {
    console.log('[DAEMON] UI Client Connected via WebSocket');
    
    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message);
        
        if (payload.type === 'EXEC_COMMAND') {
          const { command, id } = payload;
          console.log(`[DAEMON] Executing Background Command: ${command}`);
          
          exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
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

server.listen(PORT, () => {
  console.log(`[DAEMON] Bridge Server listening on port ${PORT}`);
});
