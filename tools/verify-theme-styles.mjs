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

  const check = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const subHeader = document.querySelector('mw-new-conversation-sub-header');
      const chip = document.querySelector('.mat-mdc-chip, mat-chip-option');
      const input = document.querySelector('input[data-e2e-contact-input]');
      const contactRow = document.querySelector('mw-contact-row');

      return {
        subHeaderBg: subHeader ? window.getComputedStyle(subHeader).backgroundColor : null,
        subHeaderBorder: subHeader ? window.getComputedStyle(subHeader).borderBottom : null,
        chipBg: chip ? window.getComputedStyle(chip).backgroundColor : null,
        chipColor: chip ? window.getComputedStyle(chip).color : null,
        chipTextSpanColor: chip?.querySelector('.mdc-evolution-chip__text-label') ? window.getComputedStyle(chip.querySelector('.mdc-evolution-chip__text-label')).color : null,
        inputBg: input ? window.getComputedStyle(input).backgroundColor : null,
        inputColor: input ? window.getComputedStyle(input).color : null,
        contactRowNameColor: contactRow?.querySelector('span') ? window.getComputedStyle(contactRow.querySelector('span')).color : null
      };
    })()`,
    returnByValue: true
  });

  console.log('Verification check:', JSON.stringify(check.result?.value, null, 2));
  ws.close();
}

main().catch(console.error);
