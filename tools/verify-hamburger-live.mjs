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

  console.log('Reloading Messages tab...');
  await callCdp(ws, 'Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 3500));

  // Open drawer
  await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[aria-label*="menu" i], button[aria-label*="drawer" i], mw-branded-header button');
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Inspect the items in the nav drawer
  const res = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const item = document.querySelector('.mp-nav-drawer-item');
      return {
        found: !!item,
        text: item ? item.textContent?.trim() : null,
        iconSvgFill: item?.querySelector('svg') ? window.getComputedStyle(item.querySelector('svg')).fill : null,
        iconSvgColor: item?.querySelector('svg') ? window.getComputedStyle(item.querySelector('svg')).color : null
      };
    })()`,
    returnByValue: true
  });

  console.log('Nav drawer verification:', JSON.stringify(res.result?.value, null, 2));

  // Capture screenshot of the drawer
  const shot = await callCdp(ws, 'Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: 0,
      y: 0,
      width: 380,
      height: 480,
      scale: 1
    }
  });
  fs.writeFileSync('store_assets/shot_hamburger_verified.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved store_assets/shot_hamburger_verified.png');

  // Close drawer
  await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const backdrop = document.querySelector('.mat-drawer-backdrop, .cdk-overlay-backdrop');
      if (backdrop) backdrop.click();
      else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    })()`
  });

  ws.close();
}

main().catch(console.error);
