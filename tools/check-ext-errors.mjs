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
        }, 8000);
      });
    },
    close() {
      ws.close();
    }
  };
}

async function run() {
  const version = await getJson('/json/version');
  const browserSession = cdpSession(version.webSocketDebuggerUrl);

  const createRes = await browserSession.send('Target.createTarget', { url: 'chrome://extensions' });
  const targetId = createRes.targetId;
  const extSession = cdpSession(`ws://localhost:9222/devtools/page/${targetId}`);

  await extSession.send('Runtime.enable');
  const info = await extSession.send('Runtime.evaluate', {
    expression: `new Promise(resolve => {
      chrome.developerPrivate.getExtensionsInfo(list => {
        const ext = list.find(e => e.id === 'paljnoclmelfjhomcgemelpnpjkodneb');
        resolve({
          enabled: ext?.state,
          installWarnings: ext?.installWarnings,
          runtimeErrors: ext?.runtimeErrors,
          manifestErrors: ext?.manifestErrors
        });
      });
    })`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Extension info:', JSON.stringify(info, null, 2));

  await browserSession.send('Target.closeTarget', { targetId });
  extSession.close();
  browserSession.close();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
