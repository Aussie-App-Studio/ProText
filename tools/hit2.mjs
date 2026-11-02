import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
console.log(await page.evaluate(() => {
  const host = document.querySelector('[data-mp-slot="resize-handle"]');
  const r = host.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
  const d = e => { const s = getComputedStyle(e), q = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}${e.getAttribute('data-mp-slot')||''} pos=${s.position} z=${s.zIndex} tr=${s.transform} pe=${s.pointerEvents} rect=${[q.x,q.y,q.width,q.height].map(Math.round)}`; };
  return JSON.stringify({ style: host.getAttribute('style'), host: d(host), stack: document.elementsFromPoint(x, y).slice(0,4).map(d), sib: d(host.nextElementSibling), kids: [...host.nextElementSibling.children].map(d) }, null, 1);
}));
process.exit(0);
