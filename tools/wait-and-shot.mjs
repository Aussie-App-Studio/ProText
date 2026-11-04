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

  // Poll until app is rendered (not splash)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const check = await callCdp(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const item = document.querySelector('mws-conversation-list-item');
        return !!item && item.offsetHeight > 20;
      })()`
    });
    console.log(`Poll ${i}: conversations ready = ${check.result?.value}`);
    if (check.result?.value) break;
  }

  await new Promise(r => setTimeout(r, 1000));

  const shot = await callCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('store_assets/shot_verified_default_dark.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved real store_assets/shot_verified_default_dark.png');

  ws.close();
}

main().catch(console.error);
