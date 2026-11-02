import { chromium } from 'playwright';

async function main() {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
  const res = await page.evaluate(() => {
    const slot = document.querySelector('[data-mp-slot="settings-button"]');
    if (!slot) return { error: 'no slot' };
    const rect = slot.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const topEl = document.elementFromPoint(x, y);
    return {
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      topEl: topEl ? { tag: topEl.tagName, id: topEl.id, className: topEl.className } : null
    };
  });
  console.log(res);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
