import { chromium } from 'playwright';

const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const state = await page.evaluate(() => {
  const ed = document.querySelector('mws-message-compose [contenteditable="true"]');
  return {
    activeElement: document.activeElement?.tagName,
    activeElementClass: document.activeElement?.className,
    isEdFocused: document.activeElement === ed,
    text: ed?.textContent,
    textTrimLength: (ed?.textContent || '').trim().length
  };
});
console.log('Composer state:', JSON.stringify(state, null, 2));
process.exit(0);
