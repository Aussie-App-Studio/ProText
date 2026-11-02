const http = require('http');

http.get('http://127.0.0.1:9222/json/list', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const list = JSON.parse(data);
    const extTab = list.find(t => t.url.includes('chrome://extensions'));
    if (!extTab) { console.log('ext tab not found'); return; }
    const ws = new WebSocket(extTab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (() => {
              const manager = document.querySelector('extensions-manager');
              const itemList = manager && manager.shadowRoot.querySelector('extensions-item-list');
              const item = itemList && itemList.shadowRoot.querySelector('extensions-item#paljnoclmelfjhomcgemelpnpjkodneb');
              const reloadBtn = item && item.shadowRoot.querySelector('#dev-reload-button');
              if (reloadBtn) {
                reloadBtn.click();
                return 'Reloaded extension successfully!';
              }
              return 'Reload button not found';
            })()
          `
        }
      }));
    };
    ws.onmessage = msg => {
      console.log('Result:', JSON.parse(msg.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
