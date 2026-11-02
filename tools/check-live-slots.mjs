import { chromium } from 'playwright';

async function main() {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
  const slots = await page.evaluate(() => {
    return {
      url: window.location.href,
      slots: Array.from(document.querySelectorAll('[data-mp-slot]')).map(el => el.getAttribute('data-mp-slot')),
      accountSwitcher: !!document.querySelector('mw-branded-header mw-accountswitcher'),
      header: !!document.querySelector('mw-branded-header'),
      root: !!document.getElementById('messages-plus-root')
    };
  });
  console.log('Live page diagnostic:', slots);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
