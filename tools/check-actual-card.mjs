import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const firstItem = page.locator('mws-conversation-list-item').first();
const box = await firstItem.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(600);

const cardInfo = await page.evaluate(() => {
  const sr = document.getElementById('messages-plus-root')?.shadowRoot;
  const card = sr?.querySelector('[style*="left:"]');
  if (!card) return 'no card with inline left';
  const r = card.getBoundingClientRect();
  const s = getComputedStyle(card);
  return {
    rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
    style: card.getAttribute('style'),
    pos: s.position,
    zIndex: s.zIndex
  };
});
console.log('Actual QuickPeek card info:', cardInfo);

await page.screenshot({ path: process.argv[2], clip: { x: 380, y: 100, width: 450, height: 500 } });
process.exit(0);
