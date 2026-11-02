import http from 'http';

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
    if (ws.readyState === 1) resolve();
    else {
      ws.onopen = resolve;
      ws.onerror = reject;
    }
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
        }, 5000);
      });
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
    console.log('No messages page found');
    return;
  }

  const session = cdpSession(msgTarget.webSocketDebuggerUrl);
  await session.send('Runtime.enable');

  const evalRes = await session.send('Runtime.evaluate', {
    expression: `
      (() => {
        const root = document.getElementById('messages-plus-root');
        const slots = Array.from(document.querySelectorAll('[data-mp-slot]')).map(s => s.getAttribute('data-mp-slot'));
        return {
          root: !!root,
          slots: slots,
          url: location.href,
          title: document.title
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Page state:', JSON.stringify(evalRes.result?.value, null, 2));
  session.close();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
