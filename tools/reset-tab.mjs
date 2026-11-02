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
            const tabsHost = document.querySelector('[data-mp-slot="smart-tabs"]');
            const allBtn = tabsHost?.shadowRoot?.querySelector('button');
            allBtn?.click();
          })()`
        }
      }));
      setTimeout(() => { ws.close(); process.exit(0); }, 300);
    };
  });
});
