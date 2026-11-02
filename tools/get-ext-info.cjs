const http = require('http');
http.get('http://127.0.0.1:9222/json/list', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const list = JSON.parse(data);
    const extTab = list.find(t => t.url.includes('chrome://extensions'));
    const ws = new WebSocket(extTab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (() => {
              const manager = document.querySelector('extensions-manager');
              const itemList = manager.shadowRoot.querySelector('extensions-item-list');
              const items = Array.from(itemList.shadowRoot.querySelectorAll('extensions-item'));
              return items.map(item => {
                const path = item.shadowRoot.querySelector('#load-path');
                const errors = item.shadowRoot.querySelector('#errors-button');
                return {
                  name: item.shadowRoot.querySelector('#name')?.textContent,
                  id: item.id,
                  path: path ? path.textContent : null,
                  hasErrors: !!errors
                };
              });
            })()
          `,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = msg => {
      console.log('Extensions:', JSON.stringify(JSON.parse(msg.data).result?.result?.value, null, 2));
      ws.close();
      process.exit(0);
    };
  });
});
