import http from 'http';

const req = http.request('http://127.0.0.1:9222/json/new?chrome://extensions', { method: 'PUT' }, res => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tab = JSON.parse(d);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `new Promise(resolve => {
            setTimeout(() => {
              const manager = document.querySelector('extensions-manager');
              chrome.developerPrivate.getExtensionsInfo().then(info => {
                resolve(info.map(i => ({ id: i.id, name: i.name, path: i.path, enabled: i.state === 'ENABLED' })));
              });
            }, 500);
          })`,
          awaitPromise: true,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = m => {
      const data = JSON.parse(m.data);
      console.log('Extensions info:', JSON.stringify(data.result?.result?.value, null, 2));
      http.get('http://127.0.0.1:9222/json/close/' + tab.id);
      ws.close();
      process.exit(0);
    };
  });
});
req.end();
