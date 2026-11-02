import { chromium } from 'playwright';

const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const info = await page.evaluate(() => {
  const slots = Array.from(document.querySelectorAll('[data-mp-slot]')).map(s => s.getAttribute('data-mp-slot'));
  return {
    url: location.href,
    slots,
    proButton: !!document.querySelector('[data-mp-slot="pro-button"]'),
    settingsButton: !!document.querySelector('[data-mp-slot="settings-button"]'),
    smartTabs: !!document.querySelector('[data-mp-slot="smart-tabs"]'),
  };
});

console.log('Live status:', JSON.stringify(info, null, 2));
process.exit(0);
