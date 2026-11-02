const http = require('http');

http.get('http://127.0.0.1:9222/json/list', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const list = JSON.parse(data);
    const msgTab = list.find(t => t.type === 'page' && t.url.includes('messages.google.com'));
    if (!msgTab) { console.log('Messages tab not found'); process.exit(0); }
    const ws = new WebSocket(msgTab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              (() => {
                const root = document.getElementById('messages-plus-root');
                const slots = Array.from(document.querySelectorAll('[data-mp-slot]')).map(s => s.getAttribute('data-mp-slot'));
                return {
                  rootExists: !!root,
                  slotsMounted: slots,
                  hasProButton: !!document.querySelector('[data-mp-slot="pro-button"]'),
                  hasSmartTabs: !!document.querySelector('[data-mp-slot="smart-tabs"]'),
                  hasSettingsButton: !!document.querySelector('[data-mp-slot="settings-button"]'),
                  url: location.href
                };
              })()
            `,
            returnByValue: true
          }
        }));
      }, 500);
    };
    ws.onmessage = msg => {
      const parsed = JSON.parse(msg.data);
      if (parsed.id === 2) {
        console.log('DOM check:', JSON.stringify(parsed.result?.result?.value, null, 2));
        ws.close();
        process.exit(0);
      }
    };
    setTimeout(() => {
      console.log('Timeout');
      process.exit(1);
    }, 4000);
  });
});
