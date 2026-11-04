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

  const res = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(async () => {
      const btns = Array.from(document.querySelectorAll('mw-conversation-header button, mws-header button')).map(b => ({
        label: b.getAttribute('aria-label') || b.title || b.innerText,
        html: b.outerHTML.slice(0, 80)
      }));

      // Click the 3-dots button (which is the last button or has "more options" label)
      const moreBtn = document.querySelector('mw-conversation-header button[aria-label*="options" i], mw-conversation-header button[aria-label*="more" i], [data-e2e-conversation-options-button]');
      if (moreBtn) moreBtn.click();
      else {
        // try last button in header
        const all = document.querySelectorAll('mw-conversation-header button');
        all[all.length - 1]?.click();
      }

      await new Promise(r => setTimeout(r, 600));

      const menuItems = Array.from(document.querySelectorAll('.mat-mdc-menu-item, [role="menuitem"], div[role="menu"] *')).map(el => el.textContent?.trim()).filter(Boolean);

      // Click "Details"
      const details = Array.from(document.querySelectorAll('button[role="menuitem"], .mat-mdc-menu-item')).find(el => el.textContent?.includes('Details'));
      if (details) details.click();

      await new Promise(r => setTimeout(r, 800));

      const panelText = document.querySelector('mw-conversation-details, [data-e2e-conversation-details], .details-container')?.innerText;

      return { btns, menuItems, panelText };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Result:', JSON.stringify(res.result?.value, null, 2));
  ws.close();
}

main().catch(console.error);
