import http from 'http';
import fs from 'fs';

function httpGet(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let d = ''; res.on('data', c => d += c);
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

  // Auto-dismiss any unexpected dialog
  ws.addEventListener('message', async (e) => {
    try {
      const d = JSON.parse(e.data);
      if (d.method === 'Page.javascriptDialogOpening') {
        console.log('Dialog opening:', d.params.message);
        await callCdp(ws, 'Page.handleJavaScriptDialog', { accept: true });
      }
    } catch {}
  });
  await callCdp(ws, 'Page.enable', {});

  // 1. Open Pro Workspace Modal if not open
  const openModal = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const root = document.getElementById('messages-plus-root')?.shadowRoot;
      const modal = root?.querySelector('div[role="dialog"]');
      if (modal) return 'modal already open';

      const slot = document.querySelector('[data-mp-slot="pro-button"]');
      if (!slot) return 'no pro slot found';
      const btn = slot.shadowRoot?.querySelector('button');
      if (!btn) return 'no button in pro slot';
      btn.click();
      return 'clicked pro button';
    })()`,
    returnByValue: true
  });
  console.log('Open Modal Status:', openModal.result?.value);

  // Wait for modal to render
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 200));
    const hasTextareas = await callCdp(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const root = document.getElementById('messages-plus-root')?.shadowRoot;
        return (root?.querySelectorAll('textarea')?.length || 0) >= 2;
      })()`
    });
    if (hasTextareas.result?.value) break;
  }

  // 2. Populate Audience and Message
  const initResult = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const root = document.getElementById('messages-plus-root')?.shadowRoot;
      if (!root) return { error: 'no shadow root' };

      const textareas = root.querySelectorAll('textarea');
      if (textareas.length < 2) return { error: 'less than 2 textareas', count: textareas.length };
      const audienceTextarea = textareas[0];
      const messageTextarea = textareas[1];

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const msgText = 'Text ' + timeStr;

      const taSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      
      // Fill audience
      const audience = 'Jesse Gollan, 0405673123\\nDaniella Gollan, 0438183664';
      if (taSetter) taSetter.call(audienceTextarea, audience);
      else audienceTextarea.value = audience;
      audienceTextarea.dispatchEvent(new Event('input', { bubbles: true }));

      // Fill message with current time
      if (taSetter) taSetter.call(messageTextarea, msgText);
      else messageTextarea.value = msgText;
      messageTextarea.dispatchEvent(new Event('input', { bubbles: true }));

      // Set delays: 5 to 6 sec
      const numInputs = root.querySelectorAll('input[type="number"]');
      const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (numInputs[0]) {
        if (inputSetter) inputSetter.call(numInputs[0], '5');
        else numInputs[0].value = '5';
        numInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (numInputs[1]) {
        if (inputSetter) inputSetter.call(numInputs[1], '6');
        else numInputs[1].value = '6';
        numInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      }

      return {
        audience: audienceTextarea.value,
        message: messageTextarea.value,
        timeStr
      };
    })()`,
    returnByValue: true
  });

  console.log('Prepared Campaign:', JSON.stringify(initResult.result?.value, null, 2));

  await new Promise(r => setTimeout(r, 600));

  // 3. Click "📢 Send to Group (2)" launch button
  const clickResult = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const root = document.getElementById('messages-plus-root')?.shadowRoot;
      const sendBtn = Array.from(root.querySelectorAll('button')).find(b => b.innerText?.trim().startsWith('📢 Send to Group ('));
      if (!sendBtn) return 'Send button not found';
      if (sendBtn.disabled) return 'Send button is disabled: ' + sendBtn.innerText.trim();
      sendBtn.click();
      return 'Clicked ' + sendBtn.innerText.trim();
    })()`,
    returnByValue: true
  });

  console.log('Launch Click:', clickResult.result?.value);

  // 4. Monitor campaign execution
  let completed = false;
  let lastStatus = '';
  for (let i = 0; i < 45; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const check = await callCdp(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const root = document.getElementById('messages-plus-root')?.shadowRoot;
        if (!root) return null;
        
        // Check live console elements
        const card = root.querySelector('.rounded-2xl');
        const text = card ? card.innerText : '';
        const logs = Array.from(root.querySelectorAll('.space-y-2 > div, table tbody tr')).map(d => d.innerText.replace(/\\n/g, ' '));
        
        return {
          cardText: text ? text.split('\\n').slice(0, 5).join(' | ') : null,
          logs
        };
      })()`,
      returnByValue: true
    });

    const val = check.result?.value;
    if (val && val.cardText) {
      if (val.cardText !== lastStatus) {
        console.log(`[T+${i}s] Status: ${val.cardText}`);
        lastStatus = val.cardText;
      }
    }

    // Check if campaign finished in indexedDB
    const checkIdb = await callCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        const req = indexedDB.open('messages-plus');
        return new Promise((resolve) => {
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('campaigns', 'readonly');
            const store = tx.objectStore('campaigns');
            const reqAll = store.getAll();
            reqAll.onsuccess = () => {
              const camps = reqAll.result || [];
              const latest = camps[camps.length - 1];
              resolve(latest ? { id: latest.id, status: latest.status, sent: latest.sent, failed: latest.failed, total: latest.total } : null);
            };
          };
        });
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const campState = checkIdb.result?.value;
    if (campState && campState.total === 2) {
      console.log(`[T+${i}s] Campaign DB state: status=${campState.status}, sent=${campState.sent}/${campState.total}, failed=${campState.failed}`);
      if (campState.status === 'completed' || (campState.sent + campState.failed) >= 2) {
        completed = true;
        break;
      }
    }
  }

  await new Promise(r => setTimeout(r, 1500));

  // 5. Capture screenshot of live results
  const shot = await callCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('store_assets/shot_bulk_send_result.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved store_assets/shot_bulk_send_result.png');

  // 6. Verify campaign log from IndexedDB
  const idbCheck = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(async () => {
      const req = indexedDB.open('messages-plus');
      return new Promise((resolve) => {
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['campaigns', 'campaignLogs'], 'readonly');
          const campStore = tx.objectStore('campaigns');
          const logStore = tx.objectStore('campaignLogs');
          const getAllCamp = campStore.getAll();
          const getAllLogs = logStore.getAll();
          let camps, logs;
          getAllCamp.onsuccess = () => {
            camps = getAllCamp.result;
            if (logs) resolve({ camps, logs });
          };
          getAllLogs.onsuccess = () => {
            logs = getAllLogs.result;
            if (camps) resolve({ camps, logs });
          };
        };
      });
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  const idbData = idbCheck.result?.value;
  const latestCamp = idbData?.camps?.[idbData.camps.length - 1];
  const recentLogs = idbData?.logs?.slice(-2);
  console.log('IndexedDB Campaign Record:\n', JSON.stringify({ latestCamp, recentLogs }, null, 2));

  ws.close();
}

main().catch(console.error);
