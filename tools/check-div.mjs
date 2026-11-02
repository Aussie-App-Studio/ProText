import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const childrenInfo = await page.evaluate(() => {
  const root = document.getElementById('messages-plus-root');
  const sr = root?.shadowRoot;
  const div = sr?.querySelector('div');
  return {
    childrenTags: sr ? Array.from(sr.children).map(c => c.tagName) : [],
    divHtml: div?.innerHTML?.slice(0, 500)
  };
});
console.log('Children info:', childrenInfo);
process.exit(0);
