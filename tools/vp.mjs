import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
console.log(await page.evaluate(() => JSON.stringify({ iw: innerWidth, ih: innerHeight, dpr: devicePixelRatio, h: document.querySelector('[data-mp-slot="resize-handle"]').getBoundingClientRect().y })));
await page.screenshot({ path: process.argv[2] });
process.exit(0);
