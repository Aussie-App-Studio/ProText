import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const list = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('mws-conversation-list-item a[data-e2e-conversation]'));
  return links.map(l => ({
    name: l.querySelector('[data-e2e-conversation-name]')?.textContent?.trim(),
    unread: l.getAttribute('data-e2e-is-unread'),
    pinned: l.getAttribute('data-e2e-is-pinned'),
    href: l.getAttribute('href')
  }));
});
console.log('Total conversation items rendered:', list.length);
console.log('Sample conversation attributes:', list.slice(0, 5));
console.log('Any unread?', list.filter(l => l.unread === 'true'));
process.exit(0);
