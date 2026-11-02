import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
console.log(await page.evaluate(() => {
  const host = document.querySelector('[data-mp-slot="resize-handle"]');
  const r = host.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
  const els = document.elementsFromPoint(x, y).slice(0, 5).map(e => { const s = getComputedStyle(e), q = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}[${[...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name).join(',')}] pos=${s.position} z=${s.zIndex} rect=${[q.x,q.y,q.width,q.height].map(Math.round)}`; });
  const parent = host.parentElement; const ps = [...parent.children].map(c => c.tagName.toLowerCase() + (c.getAttribute('data-mp-slot')||'') + ':' + Math.round(c.getBoundingClientRect().top) + '/' + Math.round(c.getBoundingClientRect().height));
  return JSON.stringify({ els, parent: parent.tagName, ps }, null, 1);
}));
process.exit(0);
