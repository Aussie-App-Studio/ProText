import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const ctx = b.contexts()[0];
console.log('service workers:', ctx.serviceWorkers().map(w => w.url()));
const page = ctx.pages().find(p => p.url().includes('messages.google.com'));
await page.reload(); await page.waitForTimeout(5000);
console.log('badge:', await page.evaluate(() => !!document.getElementById('messages-plus-root')));
