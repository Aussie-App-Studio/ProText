import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const errs = await page.evaluate(() => {
  return window.__mp_errors || 'no saved errors';
});
console.log('Errors:', errs);
process.exit(0);
