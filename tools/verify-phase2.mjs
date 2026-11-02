import http from 'http';
import fs from 'fs';
import path from 'path';

function getJson(p) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:9222${p}`, res => {
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
        }, 10000);
      });
    },
    async eval(expr) {
      const res = await this.send('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result?.value;
    },
    async screenshot(filepath) {
      const res = await this.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'));
    },
    close() {
      ws.close();
    }
  };
}

async function main() {
  const targets = await getJson('/json/list');
  const msgTarget = targets.find(t => t.type === 'page' && t.url.includes('messages.google.com'));
  if (!msgTarget) {
    console.error('Google Messages page not found in targets!');
    process.exit(1);
  }

  const session = cdpSession(msgTarget.webSocketDebuggerUrl);
  await session.send('Runtime.enable');
  await session.send('Page.enable');

  console.log('Connected to Google Messages target!');

  // Wait for conversation list to be loaded
  console.log('Waiting for conversations list...');
  for (let i = 0; i < 20; i++) {
    const hasItems = await session.eval(`document.querySelectorAll('mws-conversation-list-item').length > 0`);
    if (hasItems) break;
    await new Promise(r => setTimeout(r, 1000));
  }

  // Open first conversation if none open
  const hasOpenChat = await session.eval(`!!document.querySelector('mws-messages-list')`);
  if (!hasOpenChat) {
    console.log('Opening first conversation (Juhan Klooster)...');
    await session.eval(`(() => {
      const first = document.querySelector('mws-conversation-list-item a');
      if (first) first.click();
    })()`);
    await new Promise(r => setTimeout(r, 2000));
  }

  // 1. Check mounted slots
  const slots = await session.eval(`
    [...document.querySelectorAll('[data-mp-slot]')].map(s => s.getAttribute('data-mp-slot'))
  `);
  console.log('Mounted Slots:', slots);

  // 2. Check Smart Tabs
  const tabsInfo = await session.eval(`(() => {
    const slot = document.querySelector('[data-mp-slot="smart-tabs"]');
    if (!slot || !slot.shadowRoot) return null;
    const buttons = [...slot.shadowRoot.querySelectorAll('[data-testid="smart-tabs-bar"] button')];
    return buttons.map(b => b.textContent?.trim());
  })()`);
  console.log('Smart Tabs:', tabsInfo);

  // 3. Check CRM Alias in header and sidebar
  const aliasInfo = await session.eval(`(() => {
    const slot = document.querySelector('[data-mp-slot="header-alias"]');
    const headerBadge = slot?.shadowRoot?.querySelector('button')?.textContent?.trim();
    const sidebarBadge = document.querySelector('.mp-alias-badge')?.textContent?.trim();
    return { headerBadge, sidebarBadge };
  })()`);
  console.log('CRM Alias Info:', aliasInfo);

  // 4. Check CRM Notes panel
  const notesInfo = await session.eval(`(() => {
    const slot = document.querySelector('[data-mp-slot="crm-notes"]');
    if (!slot || !slot.shadowRoot) return null;
    const rect = slot.getBoundingClientRect();
    const text = slot.shadowRoot.textContent?.trim().slice(0, 120);
    return { top: rect.top, height: rect.height, text };
  })()`);
  console.log('CRM Notes Info:', notesInfo);

  // Screenshot Phase 2 overview
  const shot4 = path.resolve('C:/Users/jesse/.gemini/antigravity/brain/7d8e50a8-6fad-4be4-93ec-92b6364eb9e9/shot4_final.png');
  await session.screenshot(shot4);
  console.log('Overview screenshot saved to:', shot4);

  // 5. Test opening Rule Builder modal
  console.log('Testing Rule Builder Modal (+ button)...');
  await session.eval(`(() => {
    const slot = document.querySelector('[data-mp-slot="smart-tabs"]');
    if (!slot || !slot.shadowRoot) return;
    const addBtn = slot.shadowRoot.querySelector('button[title="Add new Smart Tab"]');
    if (addBtn) addBtn.click();
  })()`);
  await new Promise(r => setTimeout(r, 600));

  const modalHeading = await session.eval(`(() => {
    const slot = document.querySelector('[data-mp-slot="smart-tabs"]');
    return slot?.shadowRoot?.querySelector('[data-testid="rule-builder-modal"] h3')?.textContent?.trim();
  })()`);
  console.log('Rule Builder Modal Heading:', modalHeading);

  const shot5 = path.resolve('C:/Users/jesse/.gemini/antigravity/brain/7d8e50a8-6fad-4be4-93ec-92b6364eb9e9/shot5_rule_builder_final.png');
  await session.screenshot(shot5);
  console.log('Rule Builder screenshot saved to:', shot5);

  // Close modal
  await session.eval(`(() => {
    const slot = document.querySelector('[data-mp-slot="smart-tabs"]');
    const closeBtn = slot?.shadowRoot?.querySelector('[data-testid="rule-builder-modal"] button');
    if (closeBtn) closeBtn.click();
  })()`);

  session.close();
  console.log('Phase 2 verification successfully finished!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
