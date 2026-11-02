import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
await page.setViewportSize({ width: 960, height: 900 });
await page.waitForTimeout(1200);
const info = await page.evaluate(() => {
  const host = document.querySelector('[data-mp-slot="dbg-composer"]');
  const compose = document.querySelector('mws-message-compose');
  const d = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return `${e.tagName.toLowerCase()} pos=${s.position} disp=${s.display} top=${Math.round(r.top)} h=${Math.round(r.height)} z=${s.zIndex}`; };
  const chain = []; for (let e = host; e && e.tagName !== 'BODY'; e = e.parentElement) chain.push(d(e));
  return { host: d(host), compose: d(compose), prev: host.previousElementSibling && d(host.previousElementSibling), chain };
});
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: process.argv[2], clip: { x: 0, y: 500, width: 960, height: 400 } });
process.exit(0);
