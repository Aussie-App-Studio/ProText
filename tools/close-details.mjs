import http from 'http';

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

  await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = document.querySelector('mw-conversation-details button[aria-label*="Close" i], mw-conversation-details button[data-e2e-close-button], mw-conversation-details button[mat-icon-button]');
      if (closeBtn) closeBtn.click();
    })()`
  });
  console.log('Closed details panel');
  ws.close();
}

main().catch(console.error);
