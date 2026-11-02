import { chromium } from 'playwright';

async function main() {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

  const rects = await page.evaluate(() => {
    const search = document.querySelector('[data-mp-slot="header-search"]');
    const notes = document.querySelector('[data-mp-slot="crm-notes"]');
    const header = document.querySelector('mw-conversation-header');
    return {
      searchRect: search?.getBoundingClientRect(),
      notesRect: notes?.getBoundingClientRect(),
      headerRect: header?.getBoundingClientRect()
    };
  });

  console.log(rects);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
