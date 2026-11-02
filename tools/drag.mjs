import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
const info = () => page.evaluate(() => {
  const host = document.querySelector('[data-mp-slot="resize-handle"]');
  const r = host.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
  const top = document.elementFromPoint(x, y);
  const ed = [...document.querySelectorAll('mws-message-compose [contenteditable="true"]')].find(e => e.offsetParent);
  return { x, y, top: top && top.tagName + (top.getAttribute('data-mp-slot') || ''), edH: Math.round(ed.getBoundingClientRect().height), css: document.getElementById('mp-resizable-input-css')?.textContent.replace(/\s+/g, ' ') };
});
let i = await info(); console.log(JSON.stringify(i));
await page.mouse.move(i.x, i.y); await page.mouse.down(); await page.mouse.move(i.x, i.y - 80, { steps: 8 }); await page.mouse.up();
await page.waitForTimeout(300);
i = await info(); console.log(JSON.stringify(i));
process.exit(0);
