import http from 'http';

http.get('http://localhost:9222/json/list', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const msg = targets.find(t => t.type === 'page' && t.url.includes('messages.google.com'));
    const ws = new WebSocket(msg.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const slots = Array.from(document.querySelectorAll('[data-mp-slot]')).map(el => el.getAttribute('data-mp-slot'));
            const header = document.querySelector('mw-branded-header');
            const accountSwitcher = document.querySelector('mw-accountswitcher');
            return {
              slots,
              hasHeader: !!header,
              accountSwitcher: !!accountSwitcher,
              headerChildren: header ? Array.from(header.children).map(c => c.tagName.toLowerCase()) : []
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
