import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const info = await page.evaluate(() => {
  const header = document.querySelector('mw-branded-header');
  const account = document.querySelector('mw-accountswitcher');
  const slots = Array.from(document.querySelectorAll('[data-mp-slot]')).map(s => s.getAttribute('data-mp-slot'));
  return {
    headerChildren: header ? Array.from(header.children).map(c => c.tagName) : [],
    hasAccount: !!account,
    slots
  };
});
console.log('Header inspect:', info);
process.exit(0);
