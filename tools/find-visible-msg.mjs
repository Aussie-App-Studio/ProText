import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

// Find a visible message on screen
const visibleMsgBox = await page.evaluate(() => {
  const wrappers = Array.from(document.querySelectorAll('mws-message-wrapper'));
  for (const w of wrappers.reverse()) {
    const r = w.getBoundingClientRect();
    if (r.top > 100 && r.bottom < window.innerHeight - 150 && r.height > 20) {
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }
  }
  return null;
});
console.log('Visible message on screen:', visibleMsgBox);
process.exit(0);
