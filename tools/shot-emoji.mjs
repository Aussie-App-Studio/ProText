import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
const bar = page.locator('[data-mp-slot="emoji-bar"]');
const compose = page.locator('mws-message-compose');
await compose.screenshot({ path: process.argv[2] });
process.exit(0);
