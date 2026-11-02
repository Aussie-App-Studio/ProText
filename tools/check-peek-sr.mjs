import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const firstItem = page.locator('mws-conversation-list-item').first();
const box = await firstItem.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(600);

const shadowContent = await page.evaluate(() => {
  const root = document.getElementById('messages-plus-root');
  const sr = root?.shadowRoot;
  return {
    hasRoot: !!root,
    hasShadow: !!sr,
    innerHtml: sr?.innerHTML?.slice(0, 500),
    hasPeekDiv: !!sr?.querySelector('[style*="z-[2147483640]"]') || Array.from(sr?.querySelectorAll('div') || []).some(d => d.textContent.includes('Quick Peek'))
  };
});
console.log('Shadow DOM check:', shadowContent);
process.exit(0);
