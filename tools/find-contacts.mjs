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

  // Check contacts or conversations in DOM and IndexedDB
  const info = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(async () => {
      const items = Array.from(document.querySelectorAll('mws-conversation-list-item')).map(el => {
        const name = el.querySelector('[data-e2e-conversation-name], .name')?.textContent?.trim();
        const snippet = el.querySelector('[data-e2e-conversation-snippet], .snippet')?.textContent?.trim();
        return { name, snippet };
      });

      // Also check contacts store in messages-plus if any
      let storedContacts = [];
      try {
        const req = indexedDB.open('messages-plus');
        storedContacts = await new Promise((resolve) => {
          req.onsuccess = () => {
            const db = req.result;
            if (db.objectStoreNames.contains('contacts')) {
              const tx = db.transaction('contacts', 'readonly');
              const store = tx.objectStore('contacts');
              const getAllReq = store.getAll();
              getAllReq.onsuccess = () => resolve(getAllReq.result);
              getAllReq.onerror = () => resolve([]);
            } else {
              resolve([]);
            }
          };
          req.onerror = () => resolve([]);
        });
      } catch(e) {}

      return { items, storedContacts };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Result:', JSON.stringify(info.result?.value, null, 2));
  ws.close();
}

main().catch(console.error);
