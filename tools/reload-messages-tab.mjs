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
  if (!msgTarget) {
    console.error('Messages target not found');
    return;
  }
  const ws = new WebSocket(msgTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  // Clear any stuck campaigns in indexedDB first
  await callCdp(ws, 'Runtime.evaluate', {
    expression: `(async () => {
      const req = indexedDB.open('messages-plus');
      return new Promise((resolve) => {
        req.onsuccess = () => {
          const db = req.result;
          if (db.objectStoreNames.contains('campaigns')) {
            const tx = db.transaction('campaigns', 'readwrite');
            const store = tx.objectStore('campaigns');
            const clearReq = store.clear();
            clearReq.onsuccess = () => resolve('cleared campaigns');
          } else {
            resolve('no campaigns store');
          }
        };
      });
    })()`,
    awaitPromise: true
  });

  console.log('Reloading Google Messages tab...');
  await callCdp(ws, 'Page.reload', {});
  ws.close();
}

main().catch(console.error);
