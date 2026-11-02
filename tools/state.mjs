import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
await page.reload(); await page.waitForSelector('[data-mp-slot="resize-handle"]'); await page.waitForTimeout(1500);
console.log(await page.evaluate(async () => {
  const db = await new Promise(r => { const q = indexedDB.open('messages-plus'); q.onsuccess = () => r(q.result); });
  const v = await new Promise(r => { const q = db.transaction('settings').objectStore('settings').get('inputMinHeight'); q.onsuccess = () => r(q.result); });
  const ed = [...document.querySelectorAll('mws-message-compose [contenteditable="true"]')].find(e => e.offsetParent);
  return JSON.stringify({ saved: v, css: document.getElementById('mp-resizable-input-css')?.textContent.trim(), edH: Math.round(ed.getBoundingClientRect().height), inline: ed.getAttribute('style') });
}));
process.exit(0);
