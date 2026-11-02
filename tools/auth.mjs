import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('https://messages.google.com/web/authentication');
await page.waitForTimeout(4000);
console.log(page.url(), '| badge:', await page.evaluate(() => !!document.getElementById('messages-plus-root')));
await page.screenshot({ path: process.argv[2] });
process.exit(0);
