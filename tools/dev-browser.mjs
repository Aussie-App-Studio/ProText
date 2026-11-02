// Dev harness: launches Chrome with the built extension loaded and a persistent profile
// (so you only scan the Google Messages QR code once).
// Usage: node tools/dev-browser.mjs
import { chromium } from 'playwright';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const ext = path.join(root, 'dist');
const profile = path.join(root, '.dev-profile');

const ctx = await chromium.launchPersistentContext(profile, {
  headless: false,
  viewport: null,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--remote-debugging-port=9222']
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
page.on('console', m => console.log('[page]', m.text()));
await page.goto('https://messages.google.com/web/');
console.log('Browser ready. CDP on http://localhost:9222. Press Ctrl+C to quit.');
await new Promise(() => {});

