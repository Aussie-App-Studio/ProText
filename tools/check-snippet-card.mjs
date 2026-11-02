import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

// Hover over 4th conversation item (Daniella Gollan)
const item = page.locator('mws-conversation-list-item').nth(3);
const box = await item.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(600);

await page.screenshot({ path: process.argv[2], clip: { x: 380, y: box.y - 50, width: 450, height: 350 } });
process.exit(0);
