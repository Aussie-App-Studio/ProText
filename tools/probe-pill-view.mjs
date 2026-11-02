import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

await page.evaluate(() => {
  const list = document.querySelector('mws-conversations-list');
  const d = document.createElement('div');
  d.id = 'test-unread-pill';
  d.style.cssText = 'padding: 8px 16px; display: flex; gap: 8px; align-items: center;';
  
  const b1 = document.createElement('button');
  b1.textContent = 'All';
  b1.style.cssText = 'padding: 6px 14px; border-radius: 9999px; background: #3b82f6; color: white; font-size: 13px; font-weight: 600; border: none; cursor: pointer;';
  
  const b2 = document.createElement('button');
  b2.textContent = 'Unread (1)';
  b2.style.cssText = 'padding: 6px 14px; border-radius: 9999px; background: rgba(255,255,255,0.08); color: #9ca3af; font-size: 13px; font-weight: 500; border: 1px solid rgba(255,255,255,0.12); cursor: pointer;';
  
  d.appendChild(b1);
  d.appendChild(b2);
  list.before(d);
});
await page.screenshot({ path: process.argv[2], clip: { x: 0, y: 50, width: 420, height: 250 } });
await page.evaluate(() => document.getElementById('test-unread-pill')?.remove());
process.exit(0);
