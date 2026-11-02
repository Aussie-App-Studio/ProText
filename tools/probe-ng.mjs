import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const ngInfo = await page.evaluate(() => {
  const win = window;
  const listEl = document.querySelector('mws-conversations-list');
  const itemEl = document.querySelector('mws-conversation-list-item');
  
  return {
    hasNg: !!win.ng,
    ngKeys: win.ng ? Object.keys(win.ng) : [],
    itemKeys: itemEl ? Object.keys(itemEl) : [],
    winKeys: Object.keys(win).filter(k => /angular|bugle|tachyon|message/i.test(k))
  };
});
console.log('Angular / window inspect:', ngInfo);
process.exit(0);
