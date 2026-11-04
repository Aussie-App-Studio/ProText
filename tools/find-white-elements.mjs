import http from 'http';

function httpGet(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
  });
}

function callCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      } catch (e) {}
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const targets = await httpGet('http://127.0.0.1:9222/json');
  const msgTarget = targets.find(t => t.url && t.url.includes('messages.google.com/web'));
  const ws = new WebSocket(msgTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  const res = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const mainContainer = document.querySelector('mw-main-container, .main-container');
      const all = Array.from(document.querySelectorAll('*'));
      const whiteEls = all.filter(el => {
        const bg = window.getComputedStyle(el).backgroundColor;
        const rect = el.getBoundingClientRect();
        return rect.width > 200 && rect.height > 100 && (bg === 'rgb(255, 255, 255)' || bg === '#ffffff' || bg === 'white');
      }).map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id,
        className: el.className,
        rect: { w: el.clientWidth, h: el.clientHeight },
        bg: window.getComputedStyle(el).backgroundColor
      }));

      // Also inspect all direct children of mw-main-container
      const containerChildren = Array.from(mainContainer?.children || []).map(c => ({
        tag: c.tagName.toLowerCase(),
        class: c.className,
        bg: window.getComputedStyle(c).backgroundColor
      }));

      return {
        url: location.href,
        mainContainer: mainContainer ? { tag: mainContainer.tagName, class: mainContainer.className, bg: window.getComputedStyle(mainContainer).backgroundColor } : null,
        containerChildren,
        whiteEls
      };
    })()`,
    returnByValue: true
  });

  console.log('White elements and container children:');
  console.log(JSON.stringify(res.result?.value, null, 2));

  ws.close();
}

main().catch(console.error);
