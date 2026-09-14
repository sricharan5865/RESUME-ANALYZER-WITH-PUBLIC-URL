const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.FIGMA_BRIDGE_PORT || 3055;

let latestExportedDesign = null;
let designHistory = [];
const connectedClients = new Set();

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // 1. Web Dashboard served at root URL (http://localhost:3055)
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderWebDashboard());
    return;
  }

  // 2. Health / Status endpoint
  if (req.method === 'GET' && url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      connectedFigmaPlugins: connectedClients.size,
      hasExportedDesign: !!latestExportedDesign,
      historyCount: designHistory.length,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 3. Antigravity sends design generation request to Figma
  if (req.method === 'POST' && url.pathname === '/api/request-design') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const message = {
          type: 'GENERATE_DESIGN',
          id: 'req_' + Date.now(),
          timestamp: new Date().toISOString(),
          data: payload
        };

        let sentCount = 0;
        connectedClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
            sentCount++;
          }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: sentCount > 0 
            ? `Design request sent to ${sentCount} active Figma plugin(s).`
            : `Design request queued (0 Figma plugins currently connected).`,
          sentToPlugins: sentCount,
          requestId: message.id
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload', details: err.message }));
      }
    });
    return;
  }

  // 4. Antigravity retrieves latest exported design & React code from Figma
  if (req.method === 'GET' && url.pathname === '/api/last-exported') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: latestExportedDesign,
      timestamp: latestExportedDesign ? latestExportedDesign.timestamp : null
    }));
    return;
  }

  // 5. Antigravity retrieves all design history
  if (req.method === 'GET' && url.pathname === '/api/designs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      count: designHistory.length,
      history: designHistory
    }));
    return;
  }

  // 6. Save generated React code into the project's client components directory
  if (req.method === 'POST' && url.pathname === '/api/save-component') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const code = payload.code || (latestExportedDesign && latestExportedDesign.reactCode);
        const filename = payload.filename || 'GeneratedFigmaComponent.jsx';

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No code provided to save' }));
          return;
        }

        const targetDir = path.resolve(__dirname, '../client/src/components');
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const targetPath = path.join(targetDir, filename);
        fs.writeFileSync(targetPath, code, 'utf-8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Saved React component to ${targetPath}`,
          path: targetPath
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save component', details: err.message }));
      }
    });
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  connectedClients.add(ws);
  console.log(`[Figma Bridge] Figma plugin connected! Active plugins: ${connectedClients.size}`);

  ws.send(JSON.stringify({
    type: 'CONNECTION_ACK',
    message: 'Connected to Antigravity Figma Bridge',
    time: new Date().toISOString()
  }));

  ws.on('message', (messageRaw) => {
    try {
      const msg = JSON.parse(messageRaw.toString());
      console.log(`[Figma Bridge] Received from Figma: ${msg.type}`);

      if (msg.type === 'DESIGN_CREATED' || msg.type === 'DESIGN_EXPORTED') {
        latestExportedDesign = {
          ...msg.payload,
          timestamp: new Date().toISOString()
        };
        designHistory.push(latestExportedDesign);
        console.log(`[Figma Bridge] Stored new design "${latestExportedDesign.name || 'Layout'}" exported from Figma canvas.`);
      }
    } catch (err) {
      console.error('[Figma Bridge] Failed to parse message from Figma:', err.message);
    }
  });

  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log(`[Figma Bridge] Figma plugin disconnected. Active plugins: ${connectedClients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[Figma Bridge] WebSocket error:', err.message);
  });
});

function renderWebDashboard() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Antigravity <-> Figma Bridge Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0b0f19; color: #f3f4f6; padding: 28px; line-height: 1.5; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #1f2937; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .badge { background: linear-gradient(135deg, #6366f1, #a855f7); color: white; font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 12px; }
    .title { font-size: 20px; font-weight: 700; }
    .status-pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; background: #111827; border: 1px solid #374151; color: #9ca3af; }
    .status-pill.online { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); color: #34d399; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; }
    .card-title { font-size: 14px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }
    .btn-row { display: flex; flex-wrap: wrap; gap: 10px; }
    button { background: #6366f1; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; }
    button:hover { background: #4f46e5; }
    button.secondary { background: #1f2937; border: 1px solid #374151; color: #e5e7eb; }
    button.secondary:hover { background: #374151; }
    pre { background: #030712; border: 1px solid #1f2937; border-radius: 8px; padding: 14px; font-family: monospace; font-size: 12px; color: #a5b4fc; overflow-x: auto; max-height: 280px; }
    .guide-step { display: flex; gap: 12px; margin-bottom: 12px; }
    .step-num { background: #374151; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; flex-shrink: 0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <span class="badge">AGY</span>
      <h1 class="title">Antigravity ↔ Figma Live Bridge</h1>
    </div>
    <div id="statusPill" class="status-pill online">
      <span class="dot"></span>
      <span id="statusText">Bridge Server Online</span>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Dispatch Design Request to Figma</div>
      <p style="color: #9ca3af; font-size: 13px; margin-bottom: 16px;">
        Click any preset to command connected Figma plugins to draw the UI layout directly on the canvas in real-time.
      </p>
      <div class="btn-row">
        <button onclick="sendDesign('card')">📇 Candidate Card</button>
        <button onclick="sendDesign('dashboard')">📊 Full Recruiter Dashboard</button>
        <button onclick="sendDesign('table')">📋 Candidate Data Table</button>
        <button onclick="sendDesign('modal')">🗓️ Interview Schedule Modal</button>
      </div>
      <div id="dispatchLog" style="margin-top: 14px; font-size: 12px; color: #34d399;"></div>
    </div>

    <div class="card">
      <div class="card-title">How to Connect Inside Figma</div>
      <div class="guide-step">
        <div class="step-num">1</div>
        <div style="font-size: 13px; color: #d1d5db;">Open any Figma design file or create a new blank canvas.</div>
      </div>
      <div class="guide-step">
        <div class="step-num">2</div>
        <div style="font-size: 13px; color: #d1d5db;">Click <strong>Plugins -> Development -> Import plugin from manifest...</strong></div>
      </div>
      <div class="guide-step">
        <div class="step-num">3</div>
        <div style="font-size: 13px; color: #d1d5db;">Select <code>figma-bridge/plugin/manifest.json</code> and click <strong>Run</strong>.</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <div class="card-title" style="margin-bottom: 0;">Latest Exported Design from Figma (Live AST & React Code)</div>
      <button class="secondary" onclick="fetchLatestExport()">🔄 Refresh Export</button>
    </div>
    <pre id="codeView">// Waiting for design export from Figma...
// Select any frame in Figma and click "Export Selection to Antigravity (React)"</pre>
  </div>

  <script>
    async function sendDesign(type) {
      const log = document.getElementById('dispatchLog');
      log.textContent = 'Sending request to Figma...';
      try {
        const res = await fetch('/api/request-design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type })
        });
        const data = await res.json();
        log.textContent = '✨ ' + (data.message || 'Dispatched successfully');
      } catch (err) {
        log.textContent = '❌ Failed: ' + err.message;
      }
    }

    async function fetchLatestExport() {
      try {
        const res = await fetch('/api/last-exported');
        const data = await res.json();
        if (data.data && data.data.reactCode) {
          document.getElementById('codeView').textContent = data.data.reactCode;
        } else if (data.data) {
          document.getElementById('codeView').textContent = JSON.stringify(data.data, null, 2);
        } else {
          document.getElementById('codeView').textContent = '// No export received yet. Select a frame in Figma and click Export.';
        }
      } catch (err) {
        console.error(err);
      }
    }

    setInterval(fetchLatestExport, 4000);
  </script>
</body>
</html>`;
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Figma Bridge] Port ${PORT} is already in use by another process.`);
  } else {
    console.error('[Figma Bridge] Server error:', err);
  }
});

process.on('uncaughtException', (err) => {
  console.error('[Figma Bridge] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Figma Bridge] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Periodic heartbeat keepalive
setInterval(() => {}, 1000 * 60 * 60);

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Antigravity <-> Figma Bridge running on http://localhost:${PORT}`);
  console.log(`   - Web Dashboard: http://localhost:${PORT}`);
  console.log(`   - WebSocket: ws://localhost:${PORT}`);
  console.log(`   - Status API: http://localhost:${PORT}/api/status`);
  console.log(`   - Request Design API: POST http://localhost:${PORT}/api/request-design`);
  console.log(`   - Get Exported Design: GET http://localhost:${PORT}/api/last-exported`);
  console.log(`====================================================`);
});
