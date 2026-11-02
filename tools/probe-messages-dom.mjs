import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const msgs = await page.evaluate(() => {
  const wrappers = Array.from(document.querySelectorAll('mws-message-wrapper'));
  return wrappers.map(w => {
    const core = w.querySelector('[data-e2e-message-wrapper-core]');
    const textEl = w.querySelector('[data-e2e-text-message-content]');
    const timeEl = w.querySelector('mws-relative-timestamp');
    return {
      id: core?.getAttribute('data-e2e-message-id'),
      outgoing: core?.getAttribute('data-e2e-message-outgoing') === 'true',
      text: textEl?.textContent?.trim(),
      time: timeEl?.textContent?.trim()
    };
  }).filter(m => m.text);
});
console.log('Currently open conversation messages count:', msgs.length);
console.log('Sample messages:', msgs.slice(-5));
process.exit(0);
