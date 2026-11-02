import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
for (const p of b.contexts()[0].pages()) console.log(p.url());
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
if (page) {
  console.log('badge:', await page.evaluate(() => !!document.getElementById('messages-plus-root')));
  await page.screenshot({ path: process.argv[2] });
}
process.exit(0);
