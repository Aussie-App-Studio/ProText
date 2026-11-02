import http from 'http';

http.get('http://localhost:9222/json/list', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const msg = targets.find(t => t.type === 'page' && t.url.includes('messages.google.com'));
    if (!msg) process.exit(0);
    const ws = new WebSocket(msg.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const ed = document.querySelector('mws-message-compose div[contenteditable="true"]');
            if (ed) {
              ed.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('delete', false, null);
            }
          })()`
        }
      }));
      setTimeout(() => { ws.close(); process.exit(0); }, 300);
    };
  });
});
