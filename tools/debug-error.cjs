const http = require('http');

http.get('http://127.0.0.1:9222/json/list', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const list = JSON.parse(data);
    const page = list.find(t => t.type === 'page' && t.url.includes('messages.google.com'));
    if (!page) { console.log('No page found'); return; }

    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Page.reload' }));
    };

    ws.onmessage = msg => {
      const obj = JSON.parse(msg.data);
      if (obj.method === 'Runtime.exceptionThrown') {
        const details = obj.params.exceptionDetails;
        console.log('EXCEPTION:', details.text, details.exception?.description || '');
        if (details.stackTrace) {
          console.log('STACK:\n' + details.stackTrace.callFrames.map(f => `  at ${f.functionName} (${f.url}:${f.lineNumber}:${f.columnNumber})`).join('\n'));
        }
      }
      if (obj.method === 'Runtime.consoleAPICalled' && obj.params.type === 'error') {
        console.log('CONSOLE ERROR:', obj.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
      }
    };

    setTimeout(() => {
      console.log('Done listening');
      ws.close();
      process.exit(0);
    }, 6000);
  });
});
