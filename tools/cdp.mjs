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
  const version = await getJson('/json/version');
  const browserSession = cdpSession(version.webSocketDebuggerUrl);

  const targets = await getJson('/json/list');
  let extTarget = targets.find(t => t.url.includes('chrome://extensions'));

  if (!extTarget) {
    const createRes = await browserSession.send('Target.createTarget', { url: 'chrome://extensions' });
    const targetId = createRes.targetId;
    extTarget = { id: targetId, webSocketDebuggerUrl: `ws://localhost:9222/devtools/page/${targetId}` };
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log('Extensions session connecting to', extTarget.id);
  const extSession = cdpSession(extTarget.webSocketDebuggerUrl);

  console.log('Enabling runtime on extensions page...');
  await extSession.send('Runtime.enable');

  console.log('Reloading unpacked extension...');
  const res = await extSession.send('Runtime.evaluate', {
    expression: 'chrome.developerPrivate.reload("paljnoclmelfjhomcgemelpnpjkodneb", { failQuietly: true }); "RELOADED_OK"'
  });
  console.log('Reload eval result:', res);

  extSession.close();

  // Close extensions tab to keep things clean
  await browserSession.send('Target.closeTarget', { targetId: extTarget.id });

  // 2. Find Google Messages page (must be top-level page, not iframe)
  const currentTargets = await getJson('/json/list');
  const msgTarget = currentTargets.find(t => t.type === 'page' && t.url.includes('messages.google.com'));
  if (msgTarget) {
    console.log('Connecting to Messages page', msgTarget.id);
    const msgSession = cdpSession(msgTarget.webSocketDebuggerUrl);
    console.log('Reloading Messages tab...');
    await msgSession.send('Page.reload');
    msgSession.close();
  }

  browserSession.close();
  console.log('Extension reloaded & Messages page refreshed!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
