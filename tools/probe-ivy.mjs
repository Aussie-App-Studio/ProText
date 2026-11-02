import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const ctxInfo = await page.evaluate(() => {
  const itemEl = document.querySelector('mws-conversation-list-item');
  const ctx = itemEl ? (itemEl)['__ngContext__'] : null;
  if (!ctx) return 'No context';
  
  // Angular Ivy LView / context array
  const entries = [];
  if (Array.isArray(ctx)) {
    for (let i = 0; i < ctx.length; i++) {
      const val = ctx[i];
      if (val && typeof val === 'object') {
        const keys = Object.keys(val);
        entries.push({ index: i, type: val.constructor?.name, keys: keys.slice(0, 10) });
      }
    }
  }
  return { isArray: Array.isArray(ctx), len: ctx?.length, entries: entries.slice(0, 10) };
});
console.log('Ivy context entries:', JSON.stringify(ctxInfo, null, 2));
process.exit(0);
