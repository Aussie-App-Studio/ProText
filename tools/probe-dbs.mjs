import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const dbs = await page.evaluate(async () => {
  const list = await indexedDB.databases();
  return list.map(d => ({ name: d.name, version: d.version }));
});
console.log('IndexedDB databases on page:', dbs);
process.exit(0);
