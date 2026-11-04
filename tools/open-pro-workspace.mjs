import http from 'http';
import fs from 'fs';

function httpGet(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
  });
}

function callCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      } catch (e) {}
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const targets = await httpGet('http://127.0.0.1:9222/json');
  const msgTarget = targets.find(t => t.url && t.url.includes('messages.google.com/web'));
  const ws = new WebSocket(msgTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  const res = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const slot = document.querySelector('[data-mp-slot="pro-button"]');
      if (!slot) return 'no slot';
      const btn = slot.shadowRoot?.querySelector('button');
      if (!btn) return 'no button in shadow';
      btn.click();
      return 'clicked';
    })()`,
    returnByValue: true
  });
  console.log('Click result:', res.result?.value);

  await new Promise(r => setTimeout(r, 600));

  const shot = await callCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('store_assets/shot_pro_workspace_modal.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved store_assets/shot_pro_workspace_modal.png');

  ws.close();
}

main().catch(console.error);
