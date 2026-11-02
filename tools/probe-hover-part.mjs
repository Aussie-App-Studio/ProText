import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const part = page.locator('mws-text-message-part').first();
await part.hover();
await page.waitForTimeout(400);

const buttons = await page.evaluate(() => {
  const allBtns = Array.from(document.querySelectorAll('mws-message-wrapper button'));
  return allBtns.map(b => ({
    aria: b.getAttribute('aria-label'),
    tag: b.tagName,
    parent: b.parentElement?.tagName
  }));
});
console.log('Buttons inside message wrapper on hover:', buttons);
process.exit(0);
