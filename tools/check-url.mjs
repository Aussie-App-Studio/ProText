import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
console.log('Current page URL:', page.url());
console.log('Root element exists?', await page.evaluate(() => !!document.getElementById('messages-plus-root')));
console.log('Header exists?', await page.evaluate(() => !!document.querySelector('mw-branded-header')));
process.exit(0);
