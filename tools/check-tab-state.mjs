import { chromium } from 'playwright';

async function main() {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
  console.log('Page URL:', page.url());
  const activeTab = await page.evaluate(() => {
    const slot = document.querySelector('[data-mp-slot="smart-tabs"]');
    const btn = slot?.shadowRoot?.querySelector('button.bg-blue-600');
    return btn ? btn.textContent.trim() : 'no active tab';
  });
  console.log('Active tab:', activeTab);

  // Click "All" tab to reset to all conversations
  await page.evaluate(() => {
    const slot = document.querySelector('[data-mp-slot="smart-tabs"]');
    const allBtn = slot?.shadowRoot?.querySelector('button');
    if (allBtn) allBtn.click();
  });
  console.log('Reset tab to All');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
