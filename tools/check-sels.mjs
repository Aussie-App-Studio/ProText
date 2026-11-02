import http from 'http';

http.get('http://localhost:9222/json/list', res => {
  let d = ''; res.on('data', c => d += c); res.on('end', () => {
    const targets = JSON.parse(d);
    const msg = targets.find(t => t.type === 'page' && t.url.includes('messages.google.com'));
    const ws = new WebSocket(msg.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const sels = {
              appShell: 'mw-app',
              header: 'mw-branded-header',
              accountSwitcher: 'mw-branded-header mw-accountswitcher',
              sidebar: 'mw-main-nav[data-e2e-conversation-list]',
              conversationsList: 'mws-conversations-list',
              compose: 'mws-message-compose',
              headerTitle: '[data-e2e-header-title]'
            };
            const res = {};
            for (const [k, v] of Object.entries(sels)) {
              res[k] = !!document.querySelector(v);
            }
            return {
              url: location.href,
              res
            };
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = e => {
      console.log(JSON.stringify(JSON.parse(e.data).result, null, 2));
      ws.close();
      process.exit(0);
    };
  });
});
