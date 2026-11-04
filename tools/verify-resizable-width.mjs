import http from 'http';
import fs from 'fs';

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:9222${path}`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function cdpSession(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();

  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  const ready = new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  return {
    async send(method, params = {}) {
      await ready;
      const id = msgId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
        setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            reject(new Error(`Timeout on ${method}`));
          }
        }, 6000);
      });
    },
    close() {
      ws.close();
    }
  };
}

async function main() {
  const targets = await getJson('/json/list');
  const msgTarget = targets.find(t => t.id === 'DDDA122C71D1B47AD52BB66D72A9DEBA');
  const session = cdpSession(msgTarget.webSocketDebuggerUrl);
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  // Select conversation
  await session.send('Runtime.evaluate', {
    expression: `(() => {
      let comp = document.querySelector('mws-message-compose');
      if (!comp) {
        const items = Array.from(document.querySelectorAll('mws-conversation-list-item'));
        const martin = items.find(i => i.innerText.includes('Martin Park'));
        if (martin) martin.querySelector('a')?.click();
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Set wide screen viewport (1920x900)
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 500));

  // 1. Initial State
  const initial = await session.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const slot = document.querySelector('[data-mp-slot="resize-handle"]');
      const sr = slot?.shadowRoot;
      const cc = document.querySelector('.compose-container');
      const ib = document.querySelector('.input-box');
      return {
        hasSlot: !!slot,
        topHandle: !!sr?.querySelector('.cursor-ns-resize'),
        sideHandles: sr?.querySelectorAll('.cursor-ew-resize').length,
        initialCCWidth: Math.round(cc?.getBoundingClientRect().width || 0),
        initialIBWidth: Math.round(ib?.getBoundingClientRect().width || 0)
      };
    })()`
  });
  console.log('Initial State:', JSON.stringify(initial.result?.value, null, 2));

  // 2. Simulate Dragging right handle +200px
  await session.send('Runtime.evaluate', {
    expression: `(() => {
      const slot = document.querySelector('[data-mp-slot="resize-handle"]');
      const sr = slot?.shadowRoot;
      const rightHandle = sr?.querySelectorAll('.cursor-ew-resize')[1];
      if (!rightHandle) return;
      const r = rightHandle.getBoundingClientRect();
      const x = r.x + r.width / 2;
      const y = r.y + r.height / 2;
      rightHandle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }));
      rightHandle.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x + 200, clientY: y }));
      rightHandle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x + 200, clientY: y }));
    })()`
  });

  await new Promise(r => setTimeout(r, 500));

  const afterDrag = await session.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const cc = document.querySelector('.compose-container');
      const ib = document.querySelector('.input-box');
      const styleTag = document.getElementById('mp-resizable-input-css');
      return {
        css: styleTag?.textContent?.trim(),
        ccWidth: Math.round(cc?.getBoundingClientRect().width || 0),
        ibWidth: Math.round(ib?.getBoundingClientRect().width || 0)
      };
    })()`
  });
  console.log('After Drag (+200px):', JSON.stringify(afterDrag.result?.value, null, 2));

  // Screenshot wide composer
  const shot = await session.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('tools/resizable-wide-verified.png', Buffer.from(shot.data, 'base64'));

  // 3. Double-Click Reset
  await session.send('Runtime.evaluate', {
    expression: `(() => {
      const slot = document.querySelector('[data-mp-slot="resize-handle"]');
      const sr = slot?.shadowRoot;
      const rightHandle = sr?.querySelectorAll('.cursor-ew-resize')[1];
      rightHandle?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    })()`
  });

  await new Promise(r => setTimeout(r, 500));

  const afterReset = await session.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const cc = document.querySelector('.compose-container');
      const ib = document.querySelector('.input-box');
      const styleTag = document.getElementById('mp-resizable-input-css');
      return {
        css: styleTag?.textContent?.trim(),
        ccWidth: Math.round(cc?.getBoundingClientRect().width || 0),
        ibWidth: Math.round(ib?.getBoundingClientRect().width || 0)
      };
    })()`
  });
  console.log('After Reset (double-click):', JSON.stringify(afterReset.result?.value, null, 2));

  await session.send('Emulation.clearDeviceMetricsOverride');
  session.close();
  console.log('Verification completed successfully!');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
