import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const info = await page.evaluate(() => {
  const header = document.querySelector('mw-conversation-header');
  const title = document.querySelector('[data-e2e-header-title]');
  const list = document.querySelector('mws-messages-list');
  return {
    hasHeader: !!header,
    hasTitle: !!title,
    titleText: title?.textContent?.trim(),
    hasList: !!list,
    headerParent: header?.parentElement?.tagName
  };
});
console.log('Conversation view info:', info);
process.exit(0);
