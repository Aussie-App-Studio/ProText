import { chromium } from 'playwright';

async function main() {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

  const info = await page.evaluate(() => {
    const el = document.querySelector('[data-mp-slot="conversation-header-toolbar"]');
    const buttons = el?.shadowRoot ? Array.from(el.shadowRoot.querySelectorAll('button')).map(b => b.textContent.trim()) : [];
    return {
      rect: el?.getBoundingClientRect(),
      buttons
    };
  });

  console.log(JSON.stringify(info, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
