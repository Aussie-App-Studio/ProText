import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const firstItem = page.locator('mws-conversation-list-item').first();
const box = await firstItem.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(600);

const peekInfo = await page.evaluate(() => {
  const sr = document.getElementById('messages-plus-root')?.shadowRoot;
  const peekEl = Array.from(sr?.querySelectorAll('div') || []).find(d => d.textContent?.includes('Quick Peek'));
  if (!peekEl) return null;
  const r = peekEl.getBoundingClientRect();
  return {
    rect: { x: r.x, y: r.y, width: r.width, height: r.height },
    text: peekEl.innerText
  };
});
console.log('Peek element info:', peekInfo);

await page.screenshot({ path: process.argv[2], clip: { x: 300, y: 150, width: 450, height: 450 } });
process.exit(0);
