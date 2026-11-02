import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const info = await page.evaluate(() => {
  const list = document.querySelector('mws-conversations-list');
  const parent = list?.parentElement;
  return {
    parentTag: parent?.tagName,
    parentClass: parent?.className,
    prevSib: list?.previousElementSibling?.tagName
  };
});
console.log(JSON.stringify(info, null, 2));
process.exit(0);
