import http from 'http';
import fs from 'fs';

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
  const msgTarget = targets.find(t => t.url && t.url.includes('messages.google.com/web'));
  const ws = new WebSocket(msgTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  console.log('Hard reloading Messages tab...');
  await callCdp(ws, 'Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 3500));

  // Verify computed styles directly from the extension's loaded CSS
  const computed = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const topBar = document.querySelector('mw-branded-header');
      const startChatParent = document.querySelector('mw-fab-link')?.parentElement;
      const mainNav = document.querySelector('mw-main-nav');
      const convList = document.querySelector('mws-conversations-list');
      const convHeader = document.querySelector('mws-header, mw-conversation-header');
      const convBody = document.querySelector('mw-conversation-container');

      return {
        topBarBg: topBar ? window.getComputedStyle(topBar).backgroundColor : null,
        topBarBorder: topBar ? window.getComputedStyle(topBar).borderBottom : null,
        startChatParentBg: startChatParent ? window.getComputedStyle(startChatParent).backgroundColor : null,
        mainNavBg: mainNav ? window.getComputedStyle(mainNav).backgroundColor : null,
        convListBg: convList ? window.getComputedStyle(convList).backgroundColor : null,
        convHeaderBg: convHeader ? window.getComputedStyle(convHeader).backgroundColor : null,
        convBodyBg: convBody ? window.getComputedStyle(convBody).backgroundColor : null
      };
    })()`,
    returnByValue: true
  });

  console.log('Live Computed Verification:', JSON.stringify(computed.result?.value, null, 2));

  // Screenshot in conversation
  const shotInConv = await callCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('store_assets/shot_verified_topbar_and_sidebar.png', Buffer.from(shotInConv.data, 'base64'));
  console.log('Saved store_assets/shot_verified_topbar_and_sidebar.png');

  // Navigate to landing (no conversation)
  await callCdp(ws, 'Page.navigate', { url: 'https://messages.google.com/web/conversations' });
  await new Promise(r => setTimeout(r, 2500));

  const shotLanding = await callCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('store_assets/shot_verified_landing_final.png', Buffer.from(shotLanding.data, 'base64'));
  console.log('Saved store_assets/shot_verified_landing_final.png');

  ws.close();
}

main().catch(console.error);
