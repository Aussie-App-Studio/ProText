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
              // Navigate to errors page if not already there
              const errorPage = manager.shadowRoot.querySelector('extensions-error-page');
              if (errorPage) {
                const items = Array.from(errorPage.shadowRoot.querySelectorAll('.error-item, .section'));
                return items.map(i => i.innerText || i.textContent);
              }
              const itemList = manager.shadowRoot.querySelector('extensions-item-list');
              const item = itemList.shadowRoot.querySelector('extensions-item#paljnoclmelfjhomcgemelpnpjkodneb');
              const errorsBtn = item.shadowRoot.querySelector('#errors-button');
              if (errorsBtn) {
                errorsBtn.click();
                return 'Clicked errors button';
              }
              return 'No errors button';
            })()
          `,
          returnByValue: true
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
