import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const info = await page.evaluate(() => {
  const fab = document.querySelector('mw-fab-link');
  const a = fab?.querySelector('a');
  return {
    fabHtml: fab?.outerHTML?.slice(0, 300),
    aClass: a?.className,
    aStyle: a?.getAttribute('style'),
    computed: fab ? {
      display: getComputedStyle(fab).display,
      flex: getComputedStyle(fab).flex,
      width: getComputedStyle(fab).width
    } : null
  };
});
console.log(JSON.stringify(info, null, 2));
process.exit(0);
