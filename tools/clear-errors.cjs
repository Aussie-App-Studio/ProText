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
              const errorPage = manager && manager.shadowRoot.querySelector('extensions-error-page');
              if (!errorPage) return 'No error page';
              const btns = Array.from(errorPage.shadowRoot.querySelectorAll('cr-button, button'));
              const clearBtn = btns.find(b => (b.textContent || '').toLowerCase().includes('clear') || b.id.includes('clear'));
              if (clearBtn) {
                clearBtn.click();
                return 'Clicked: ' + clearBtn.textContent.trim();
              }
              return btns.map(b => ({ id: b.id, text: b.textContent.trim() }));
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
