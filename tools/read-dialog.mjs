import { chromium } from 'playwright';

async function main() {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
  const text = await page.evaluate(() => {
    const root = document.querySelector('#messages-plus-root');
    const dialog = root?.shadowRoot?.querySelector('[role="dialog"]');
    return dialog ? dialog.innerText : 'no dialog';
  });
  console.log('Dialog innerText:\n', text);
  await page.screenshot({ path: 'C:/Users/jesse/.gemini/antigravity/brain/7d8e50a8-6fad-4be4-93ec-92b6364eb9e9/shot_settings_google_contacts.png' });
  console.log('Saved shot_settings_google_contacts.png');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
