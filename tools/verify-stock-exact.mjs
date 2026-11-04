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

  // Set selectedTheme to default_dark
  await callCdp(ws, 'Runtime.evaluate', {
    expression: `(async () => {
      const req = indexedDB.open('messages-plus');
      return new Promise((resolve) => {
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('settings', 'readwrite');
          const store = tx.objectStore('settings');
          store.put('default_dark', 'selectedTheme');
          tx.oncomplete = () => {
            location.reload();
            resolve(true);
          };
        };
      });
    })()`,
    awaitPromise: true
  });

  // Wait for page to reload
  let loaded = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 800));
    const check = await callCdp(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const nav = document.querySelector('mw-main-nav');
        return nav && nav.offsetHeight > 100;
      })()`
    });
    if (check.result?.value) {
      loaded = true;
      break;
    }
  }

  console.log('Page loaded with default_dark:', loaded);
  await new Promise(r => setTimeout(r, 1500));

  // Inspect computed styles
  const styles = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const topBar = document.querySelector('mw-branded-header');
      const mainNav = document.querySelector('mw-main-nav');
      const convList = document.querySelector('mws-conversations-list');
      const convBody = document.querySelector('mw-conversation-container');
      const convHeader = document.querySelector('mw-conversation-header, mws-header');
      const startChatParent = document.querySelector('mw-fab-link')?.parentElement;

      return {
        topBarBg: topBar ? window.getComputedStyle(topBar).backgroundColor : null,
        topBarBorder: topBar ? window.getComputedStyle(topBar).borderBottom : null,
        mainNavBg: mainNav ? window.getComputedStyle(mainNav).backgroundColor : null,
        mainNavBorder: mainNav ? window.getComputedStyle(mainNav).borderRight : null,
        convListBg: convList ? window.getComputedStyle(convList).backgroundColor : null,
        convBodyBg: convBody ? window.getComputedStyle(convBody).backgroundColor : null,
        convHeaderBorder: convHeader ? window.getComputedStyle(convHeader).borderBottom : null,
        startChatParentBg: startChatParent ? window.getComputedStyle(startChatParent).backgroundColor : null
      };
    })()`,
    returnByValue: true
  });

  console.log('Computed styles with default_dark:', JSON.stringify(styles.result?.value, null, 2));

  // Capture screenshot with default_dark
  const shotDark = await callCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('store_assets/shot_verified_stock_dark.png', Buffer.from(shotDark.data, 'base64'));
  console.log('Saved store_assets/shot_verified_stock_dark.png');

  // Now set selectedTheme to 'default' (Google Default Auto / pure stock)
  await callCdp(ws, 'Runtime.evaluate', {
    expression: `(async () => {
      const req = indexedDB.open('messages-plus');
      return new Promise((resolve) => {
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('settings', 'readwrite');
          const store = tx.objectStore('settings');
          store.put('default', 'selectedTheme');
          tx.oncomplete = () => {
            location.reload();
            resolve(true);
          };
        };
      });
    })()`,
    awaitPromise: true
  });

  // Wait for reload
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 800));
    const check = await callCdp(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const nav = document.querySelector('mw-main-nav');
        return nav && nav.offsetHeight > 100;
      })()`
    });
    if (check.result?.value) break;
  }

  await new Promise(r => setTimeout(r, 1500));

  // Capture pure stock (Google Default Auto)
  const shotStock = await callCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('store_assets/shot_verified_stock_auto.png', Buffer.from(shotStock.data, 'base64'));
  console.log('Saved store_assets/shot_verified_stock_auto.png');

  ws.close();
}

main().catch(console.error);
