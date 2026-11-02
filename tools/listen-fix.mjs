import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

page.on('console', msg => console.log('[page console]', msg.type(), msg.text()));
page.on('pageerror', err => console.log('[page error]', err.message));

await page.reload();
await page.waitForTimeout(3000);

const slots = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[data-mp-slot]')).map(s => s.getAttribute('data-mp-slot'));
});
console.log('Mounted slots after snapshot fix:', slots);
process.exit(0);
