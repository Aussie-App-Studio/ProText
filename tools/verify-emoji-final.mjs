import { chromium } from 'playwright';

const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

await page.waitForTimeout(2500);

// 1. Unfocused state check
const unfocused = await page.evaluate(() => {
  const slot = document.querySelector('[data-mp-slot="emoji-bar"]');
  const bar = slot?.shadowRoot?.querySelector('[data-testid="emoji-bar"]');
  return {
    slotExists: !!slot,
    barRendered: !!bar
  };
});
console.log('1. Unfocused state:', unfocused);

// 2. Focus composer
await page.evaluate(() => {
  const ed = document.querySelector('mws-message-compose [contenteditable="true"]');
  ed?.focus();
});
await page.waitForTimeout(600);

// 3. Focused state and alignment check
const focused = await page.evaluate(() => {
  const slot = document.querySelector('[data-mp-slot="emoji-bar"]');
  const bar = slot?.shadowRoot?.querySelector('[data-testid="emoji-bar"]');
  const ed = document.querySelector('mws-message-compose [contenteditable="true"]');
  const firstEmojiBtn = bar?.querySelector('button');

  const edRect = ed?.getBoundingClientRect();
  const barRect = bar?.getBoundingClientRect();
  const firstEmojiRect = firstEmojiBtn?.getBoundingClientRect();

  return {
    barVisible: !!bar,
    edLeft: edRect?.left,
    barLeft: barRect?.left,
    firstEmojiLeft: firstEmojiRect?.left,
    alignmentDiff: firstEmojiRect && edRect ? Math.round(firstEmojiRect.left - edRect.left) : null
  };
});
console.log('2. Focused & Alignment check:', focused);

// Take screenshot with emojis visible
await page.screenshot({ path: 'C:/Users/jesse/.gemini/antigravity/brain/7d8e50a8-6fad-4be4-93ec-92b6364eb9e9/shot_emojis_focused_aligned.png' });

// 4. Test clicking Edit on emoji bar
await page.evaluate(() => {
  const slot = document.querySelector('[data-mp-slot="emoji-bar"]');
  const btns = Array.from(slot?.shadowRoot?.querySelectorAll('button') || []);
  const editBtn = btns.find(b => b.textContent.includes('Edit'));
  editBtn?.click();
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'C:/Users/jesse/.gemini/antigravity/brain/7d8e50a8-6fad-4be4-93ec-92b6364eb9e9/shot_emoji_customizer_bar.png' });

// Close customizer
await page.evaluate(() => {
  const slot = document.querySelector('[data-mp-slot="emoji-bar"]');
  const btns = Array.from(slot?.shadowRoot?.querySelectorAll('button') || []);
  const editBtn = btns.find(b => b.textContent.includes('Edit'));
  editBtn?.click();
});
await page.waitForTimeout(300);

// 5. Open Settings (M+) to check Settings Customizer
await page.evaluate(() => {
  const btn = document.querySelector('[data-mp-slot="settings-button"]')?.shadowRoot?.querySelector('button');
  btn?.click();
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'C:/Users/jesse/.gemini/antigravity/brain/7d8e50a8-6fad-4be4-93ec-92b6364eb9e9/shot_settings_emojis.png' });

// Close settings
await page.evaluate(() => {
  const root = document.getElementById('messages-plus-root');
  const closeBtn = root?.shadowRoot?.querySelector('button[aria-label="Close"]');
  closeBtn?.click();
});

console.log('Verification completed successfully!');
process.exit(0);
