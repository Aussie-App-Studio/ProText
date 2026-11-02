import { chromium } from 'playwright';

async function main() {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

  const testToolbar = await page.evaluate(() => {
    // Remove individual slots if any
    const slots = document.querySelectorAll('[data-mp-slot^="header-"]');
    const slotIds = Array.from(slots).map(s => s.getAttribute('data-mp-slot'));
    return { slotIds };
  });

  console.log('Existing header slots:', testToolbar);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
