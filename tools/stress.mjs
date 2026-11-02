import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
const slots = () => page.evaluate(() => [...document.querySelectorAll('[data-mp-slot]')].map(e => e.getAttribute('data-mp-slot')).sort().join(','));
console.log('initial     ', await slots());
for (let i = 1; i <= 4; i++) {
  await page.locator('mws-conversation-list-item a[data-e2e-conversation]').nth(i).click();
  await page.waitForTimeout(1200);
  console.log('after chat', i, await slots());
}
await page.goto('https://messages.google.com/web/u/0/conversations'); // back to no-chat view
await page.waitForTimeout(2500);
console.log('no chat open', await slots());
await page.locator('mws-conversation-list-item a[data-e2e-conversation]').first().click();
await page.waitForTimeout(1500);
console.log('reopened    ', await slots());
process.exit(0);
