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

  // Click start chat
  await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('a[href*="/web/conversations/new"], mw-fab-link a');
      if (btn) btn.click();
    })()`
  });

  await new Promise(r => setTimeout(r, 800));

  // Type "Jesse Gollan"
  const searchResults = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(async () => {
      const input = document.querySelector('input.contact-chip-input, input[data-e2e-contact-input], mws-contact-chips-input input');
      if (!input) return 'no input';
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) setter.call(input, 'Jesse Gollan');
      else input.value = 'Jesse Gollan';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 1000));

      const rows = Array.from(document.querySelectorAll('mw-contact-row, [data-e2e-contact-row], mws-contact-list-item')).map(r => {
        return {
          name: r.querySelector('.name, [data-e2e-contact-name]')?.textContent?.trim(),
          number: r.querySelector('.info-number, .phone-number, .details')?.textContent?.trim(),
          text: r.textContent?.trim()
        };
      });
      return rows;
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Search Results for Jesse Gollan:', JSON.stringify(searchResults.result?.value, null, 2));

  // Click cancel or navigate back to conversations
  await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const first = document.querySelector('mws-conversation-list-item');
      if (first) first.querySelector('a')?.click();
    })()`
  });

  ws.close();
}

main().catch(console.error);
