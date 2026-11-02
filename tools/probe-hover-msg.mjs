import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const msg = page.locator('mws-message-wrapper').first();
await msg.hover();
await page.waitForTimeout(400);

const info = await page.evaluate(() => {
  const msg = document.querySelector('mws-message-wrapper');
  const actions = msg?.querySelector('mws-message-actions');
  return {
    actionsHtml: actions?.innerHTML?.slice(0, 400),
    buttons: actions ? Array.from(actions.querySelectorAll('button')).map(b => b.getAttribute('aria-label') || b.textContent) : []
  };
});
console.log('Hovered message actions:', info);
process.exit(0);
