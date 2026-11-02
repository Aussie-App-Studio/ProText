import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const info = await page.evaluate(() => {
  const fab = document.querySelector('mw-fab-link');
  const nav = document.querySelector('mw-main-nav');
  const banner = document.querySelector('mw-banner');
  const list = document.querySelector('mws-conversations-list');
  return {
    fabParent: fab?.parentElement?.tagName,
    fabBox: fab ? fab.getBoundingClientRect() : null,
    navChildren: nav ? Array.from(nav.children).map(c => ({ tag: c.tagName, cls: c.className })) : []
  };
});
console.log(JSON.stringify(info, null, 2));
process.exit(0);
