import { chromium } from 'playwright';

const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
await page.evaluate(() => {
  const root = document.getElementById('messages-plus-root');
  const btns = Array.from(root?.shadowRoot?.querySelectorAll('button') || []);
  const closeBtn = btns.find(b => b.textContent?.trim() === '✕');
  closeBtn?.click();
});
process.exit(0);
