import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const info = await page.evaluate(() => {
  const header = document.querySelector('.main-nav-header') || document.querySelector('mw-main-nav > div');
  return {
    tag: header?.tagName,
    cls: header?.className,
    children: header ? Array.from(header.children).map(c => ({ tag: c.tagName, cls: c.className, text: c.textContent?.trim().slice(0, 30) })) : []
  };
});
console.log(JSON.stringify(info, null, 2));
process.exit(0);
