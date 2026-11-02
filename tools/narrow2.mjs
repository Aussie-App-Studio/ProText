import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const ctx = b.contexts()[0];
const ext = await ctx.newPage(); await ext.goto('chrome://extensions');
await ext.evaluate(async () => { const l = await chrome.developerPrivate.getExtensionsInfo(); await chrome.developerPrivate.reload(l.find(e => e.name === 'Messages+').id, { failQuietly: true }); });
await ext.close();
const page = ctx.pages().find(p => p.url().includes('messages.google.com'));
await page.reload(); await page.waitForSelector('mws-message-compose', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
for (const w of [1600, 960, 700]) {
  await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const h = document.querySelector('[data-mp-slot="dbg-composer"]'), c = document.querySelector('mws-message-compose'), box = c.querySelector('textarea, [contenteditable]');
    const a = h.getBoundingClientRect(), z = c.getBoundingClientRect(), t = box.getBoundingClientRect();
    return { chip: [Math.round(a.top), Math.round(a.bottom)], compose: [Math.round(z.top), Math.round(z.bottom)], input: [Math.round(t.top), Math.round(t.bottom)], overlap: a.bottom > t.top && a.top < t.bottom };
  });
  console.log(w, JSON.stringify(r));
}
await page.setViewportSize({ width: 960, height: 900 });
await page.screenshot({ path: process.argv[2], clip: { x: 0, y: 600, width: 960, height: 300 } });
process.exit(0);
