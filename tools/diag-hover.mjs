import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const diag = await page.evaluate(async () => {
  return new Promise((resolve) => {
    const handler = (e) => {
      document.removeEventListener('mouseover', handler);
      const item = e.target.closest('mws-conversation-list-item');
      resolve({
        targetTag: e.target.tagName,
        targetClass: e.target.className,
        hasItem: !!item,
        itemTag: item?.tagName
      });
    };
    document.addEventListener('mouseover', handler);
    // trigger hover programmatically
    const el = document.querySelector('mws-conversation-list-item a');
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  });
});
console.log('Mouseover event diagnosis:', diag);
process.exit(0);
