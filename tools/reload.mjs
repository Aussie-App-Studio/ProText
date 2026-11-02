// Reloads the unpacked extension via chrome://extensions, then reloads the Messages tab.
// Usage: node tools/reload.mjs [screenshotPath]
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const ctx = b.contexts()[0];
const ext = await ctx.newPage();
await ext.goto('chrome://extensions');
const res = await ext.evaluate(async () => {
  const list = await chrome.developerPrivate.getExtensionsInfo();
  const me = list.find(e => e.name === 'Messages+');
  if (!me) return 'not found: ' + list.map(e => e.name).join(',');
  await chrome.developerPrivate.reload(me.id, { failQuietly: true });
  return 'reloaded ' + me.id;
});
console.log(res);
await ext.close();
const page = ctx.pages().find(p => p.url().includes('messages.google.com'));
await page.reload();
await page.waitForSelector('mws-conversation-list-item', { timeout: 20000 }).catch(() => console.log('list not found'));
await page.waitForTimeout(1500);
console.log('slots:', await page.evaluate(() => [...document.querySelectorAll('[data-mp-slot]')].map(e => e.getAttribute('data-mp-slot'))));
if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
process.exit(0);
