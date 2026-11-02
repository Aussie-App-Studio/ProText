import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const sample = await page.evaluate(async () => {
  const dbs = await indexedDB.databases();
  const dbInfo = dbs.find(d => d.name.includes('IndexedDbStorage'));
  return new Promise((resolve) => {
    const req = indexedDB.open(dbInfo.name);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('objectstore', 'readonly');
      const store = tx.objectStore('objectstore');
      const keyReq = store.getAllKeys(null, 15);
      keyReq.onsuccess = () => {
        resolve({ sampleKeys: keyReq.result });
      };
      keyReq.onerror = () => resolve('error getting keys');
    };
  });
});
console.log('Sample keys in objectstore:', sample);
process.exit(0);
