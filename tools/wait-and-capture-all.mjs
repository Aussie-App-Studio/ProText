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
  const msgTarget = targets.find(t => t.url && t.url.includes('messages.google.com/web/conversations'));
  const ws = new WebSocket(msgTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  await callCdp(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('Waiting for Angular conversations list to load...');
  for (let i = 0; i < 25; i++) {
    const check = await callCdp(ws, 'Runtime.evaluate', {
      expression: `!!document.querySelector('mws-conversations-list')`,
      returnByValue: true
    });
    if (check.result.value) {
      console.log('Angular loaded at iteration', i);
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  await new Promise(r => setTimeout(r, 1500));

  // Shot 1: Real Conversation View with Smart Tabs and ProText Pill
  const s1 = await callCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('store_assets/screenshot1_smart_tabs_live.png', Buffer.from(s1.data, 'base64'));
  console.log('Saved screenshot1_smart_tabs_live.png');

  // Shot 5: Privacy Shield (Screen Blur) toggled on
  console.log('Toggling Privacy Shield...');
  await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Privacy'));
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));
  const s5 = await callCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('store_assets/screenshot5_privacy_shield.png', Buffer.from(s5.data, 'base64'));
  console.log('Saved screenshot5_privacy_shield.png');

  // Toggle privacy shield off
  await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Privacy'));
      if (btn) btn.click();
    })()`
  });

  await callCdp(ws, 'Emulation.clearDeviceMetricsOverride');
  ws.close();
}

main().catch(console.error);
