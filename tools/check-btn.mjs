import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const btnExists = await page.evaluate(() => {
  const host = document.querySelector('[data-mp-slot="settings-button"]');
  const btn = host?.shadowRoot?.querySelector('button');
  return { hasHost: !!host, hasBtn: !!btn, btnText: btn?.textContent };
});
console.log('Settings button host/shadow status:', btnExists);
process.exit(0);
