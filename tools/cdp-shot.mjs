import http from 'http';
import fs from 'fs';

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:9222${path}`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  const targets = await getJson('/json/list');
  const target = targets.find(t => t.type === 'page' && t.url.includes('messages.google.com'));
  if (!target) {
    console.error('No messages page found');
    process.exit(1);
  }

  const outPath = process.argv[2] || 'screenshot.png';
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Page.captureScreenshot', params: { format: 'png' } }));
  };

  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id === 2) {
      if (msg.result && msg.result.data) {
        fs.writeFileSync(outPath, Buffer.from(msg.result.data, 'base64'));
        console.log(`Saved screenshot to ${outPath}`);
      } else {
        console.error('Failed to capture:', msg);
      }
      ws.close();
      process.exit(0);
    }
  };

  setTimeout(() => {
    console.error('Timeout');
    ws.close();
    process.exit(1);
  }, 5000);
}

main().catch(console.error);
