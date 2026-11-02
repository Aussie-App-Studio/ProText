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
          expression: `(() => {
            const manager = document.querySelector('extensions-manager');
            const items = manager?.shadowRoot?.querySelector('cr-view-manager')?.querySelector('extensions-item-list')?.shadowRoot?.querySelectorAll('extensions-item');
            if (!items) return 'no items';
            return Array.from(items).map(i => ({
              id: i.getAttribute('id'),
              name: i.shadowRoot?.querySelector('#name')?.textContent,
              version: i.shadowRoot?.querySelector('#version')?.textContent
            }));
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = m => {
      const data = JSON.parse(m.data);
      console.log('Extensions:', JSON.stringify(data.result?.result?.value, null, 2));
      http.get('http://127.0.0.1:9222/json/close/' + tab.id);
      ws.close();
      process.exit(0);
    };
  });
});
req.end();
