import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const stores = await page.evaluate(async () => {
  const dbs = await indexedDB.databases();
  const dbInfo = dbs.find(d => d.name.includes('IndexedDbStorage'));
  if (!dbInfo) return 'No IndexedDbStorage found';
  
  return new Promise((resolve) => {
    const req = indexedDB.open(dbInfo.name);
    req.onsuccess = () => {
      const db = req.result;
      const storeNames = Array.from(db.objectStoreNames);
      resolve({ dbName: dbInfo.name, storeNames });
    };
    req.onerror = () => resolve('error opening');
  });
});
console.log('IndexedDbStorage stores:', stores);
process.exit(0);
