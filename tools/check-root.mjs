import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const rootInfo = await page.evaluate(() => {
  const root = document.getElementById('messages-plus-root');
  const sr = root?.shadowRoot;
  return {
    innerHtml: sr?.innerHTML?.slice(0, 300)
  };
});
console.log('Root info:', rootInfo);
process.exit(0);
