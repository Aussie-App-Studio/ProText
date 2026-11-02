import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
const ed = page.locator('mws-message-compose [contenteditable="true"]:visible').first();
await ed.click();
await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
for (let i = 1; i <= 14; i++) { await page.keyboard.type('line ' + i); if (i < 14) await page.keyboard.press('Shift+Enter'); }
await page.waitForTimeout(500);
const info = await page.evaluate(() => {
  const ed = [...document.querySelectorAll('mws-message-compose [contenteditable="true"]')].find(e => e.offsetParent);
  const out = [];
  for (let e = ed, n = 0; e && n < 6; e = e.parentElement, n++) {
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    out.push({ tag: e.tagName.toLowerCase(), h: Math.round(r.height), maxH: s.maxHeight, overflowY: s.overflowY, pos: s.position, inline: e.getAttribute('style') });
  }
  return { out, scrollH: ed.scrollHeight, clientH: ed.clientHeight };
});
console.log(JSON.stringify(info, null, 1));
await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
process.exit(0);
