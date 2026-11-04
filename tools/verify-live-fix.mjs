import http from 'http';
import fs from 'fs';

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
  
  // Reload extension background target if available, or just reload the messages tab
  const msgTarget = targets.find(t => t.url && t.url.includes('messages.google.com/web'));
  if (!msgTarget) {
    console.error('Messages target not found');
    return;
  }

  const ws = new WebSocket(msgTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  console.log('Navigating and hard reloading messages tab to load updated dist/content.js...');
  await callCdp(ws, 'Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 4000));

  // Test 1: Landing state (no conversation highlighted)
  await callCdp(ws, 'Page.navigate', { url: 'https://messages.google.com/web/conversations' });
  await new Promise(r => setTimeout(r, 3000));

  const landingVerification = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const landing = document.querySelector('mw-main-landing');
      const styleTag = document.getElementById('mp-theme-override-css');
      return {
        styleTagFound: !!styleTag,
        landingFound: !!landing,
        landingBg: landing ? window.getComputedStyle(landing).backgroundColor : null,
        landingColor: landing ? window.getComputedStyle(landing).color : null
      };
    })()`,
    returnByValue: true
  });
  console.log('--- Test 1: Landing State ---');
  console.log(JSON.stringify(landingVerification.result?.value, null, 2));

  const shotLanding = await callCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('store_assets/shot_verified_landing.png', Buffer.from(shotLanding.data, 'base64'));
  console.log('Saved store_assets/shot_verified_landing.png');

  // Test 2: Start chat view
  console.log('Navigating to new conversation view...');
  await callCdp(ws, 'Page.navigate', { url: 'https://messages.google.com/web/conversations/new' });
  await new Promise(r => setTimeout(r, 3000));

  // Type contact into input and press Enter
  await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const input = document.querySelector('input[data-e2e-contact-input]');
      if (input) {
        input.focus();
        input.value = '+61400000000';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const newConvVerification = await callCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const subHeader = document.querySelector('mw-new-conversation-sub-header');
      const chip = document.querySelector('mat-chip-option, mat-chip-row, .mat-mdc-chip, .contact-chip');
      const chipLabel = chip?.querySelector('.mdc-evolution-chip__text-label, .mat-mdc-chip-action-label, span');
      const input = document.querySelector('input[data-e2e-contact-input]');
      const container = document.querySelector('mw-new-conversation-container');
      const contactRow = document.querySelector('mw-contact-row');

      return {
        containerBg: container ? window.getComputedStyle(container).backgroundColor : null,
        subHeaderBg: subHeader ? window.getComputedStyle(subHeader).backgroundColor : null,
        subHeaderBorder: subHeader ? window.getComputedStyle(subHeader).borderBottom : null,
        chipBg: chip ? window.getComputedStyle(chip).backgroundColor : null,
        chipBorder: chip ? window.getComputedStyle(chip).borderColor : null,
        chipTextColor: chipLabel ? window.getComputedStyle(chipLabel).color : null,
        inputBg: input ? window.getComputedStyle(input).backgroundColor : null,
        inputColor: input ? window.getComputedStyle(input).color : null,
        contactRowNameColor: contactRow?.querySelector('.name, span') ? window.getComputedStyle(contactRow.querySelector('.name, span')).color : null
      };
    })()`,
    returnByValue: true
  });
  console.log('--- Test 2: Start Chat Topbar & Chips ---');
  console.log(JSON.stringify(newConvVerification.result?.value, null, 2));

  const shotNewConv = await callCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('store_assets/shot_verified_start_chat.png', Buffer.from(shotNewConv.data, 'base64'));
  console.log('Saved store_assets/shot_verified_start_chat.png');

  ws.close();
}

main().catch(console.error);
