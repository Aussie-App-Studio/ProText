import http from 'http';

function httpGet(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', c => d += c);
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
  const extTarget = targets.find(t => t.url && t.url.includes('chrome://extensions'));
  if (!extTarget) {
    console.error('chrome://extensions target not found');
    return;
  }

  const ws = new WebSocket(extTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  // Click reload button for ProText / Messages+
  const reloadResult = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const manager = document.querySelector('extensions-manager');
      if (!manager) return { error: 'no manager' };
      const itemList = manager.shadowRoot?.querySelector('extensions-item-list');
      const items = itemList?.shadowRoot?.querySelectorAll('extensions-item');
      if (!items) return { error: 'no items' };

      const found = [];
      for (const item of items) {
        const name = item.shadowRoot?.querySelector('#name')?.textContent;
        const reloadBtn = item.shadowRoot?.querySelector('#dev-reload-button');
        found.push({ name, hasReload: !!reloadBtn });
        if (name && (name.includes('ProText') || name.includes('Messages+') || name.includes('Messages Plus'))) {
          if (reloadBtn) {
            reloadBtn.click();
            return { reloaded: true, name };
          }
        }
      }
      return { reloaded: false, found };
    })()`,
    returnByValue: true
  });

  console.log('Reload Result:', JSON.stringify(reloadResult.result?.value, null, 2));
  ws.close();
}

main().catch(console.error);
