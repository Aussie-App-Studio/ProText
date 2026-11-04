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

  // 1. Check IndexedDB campaigns and logs
  const dbData = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(async () => {
      const req = indexedDB.open('messages-plus');
      return new Promise((resolve) => {
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['campaigns', 'campaignLogs'], 'readonly');
          const campStore = tx.objectStore('campaigns');
          const logStore = tx.objectStore('campaignLogs');
          const getAllCamp = campStore.getAll();
          const getAllLogs = logStore.getAll();
          let camps, logs;
          getAllCamp.onsuccess = () => {
            camps = getAllCamp.result;
            if (logs) resolve({ camps, logs });
          };
          getAllLogs.onsuccess = () => {
            logs = getAllLogs.result;
            if (camps) resolve({ camps, logs });
          };
        };
      });
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  const camps = dbData.result?.value?.camps || [];
  const logs = dbData.result?.value?.logs || [];
  console.log('Total campaigns:', camps.length);
  console.log('Latest campaign:', JSON.stringify(camps[camps.length - 1], null, 2));
  console.log('Recent logs:', JSON.stringify(logs.slice(-5), null, 2));

  // 2. Take screenshot of current page
  const shot = await callCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  if (shot && shot.data) {
    fs.writeFileSync('store_assets/shot_bulk_send_result.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved store_assets/shot_bulk_send_result.png');
  }

  // 3. Also check current open thread message bubbles
  const messagesInfo = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const header = document.querySelector('header')?.innerText?.replace(/\\n/g, ' ') || '';
      const bubbles = Array.from(document.querySelectorAll('mws-message-wrapper, [data-e2e-message-text-content]'))
        .slice(-6)
        .map(b => b.innerText?.replace(/\\n/g, ' '));
      return { header, bubbles };
    })()`,
    returnByValue: true
  });
  console.log('Current conversation info:', JSON.stringify(messagesInfo.result?.value, null, 2));

  ws.close();
}

main().catch(console.error);
