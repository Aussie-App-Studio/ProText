import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const info = await page.evaluate(() => {
  const msg = document.querySelector('mws-message-wrapper');
  const actions = msg?.querySelector('mws-message-actions');
  return {
    actionsHtml: actions?.innerHTML?.slice(0, 300),
    actionsClass: actions?.className,
    msgCore: msg?.querySelector('[data-e2e-message-wrapper-core]')?.getAttribute('data-e2e-message-id')
  };
});
console.log('Message actions info:', info);
process.exit(0);
