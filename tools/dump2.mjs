import { chromium } from 'playwright';
import fs from 'node:fs';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
await page.locator('mws-conversation-list-item a[data-e2e-conversation]').first().click();
await page.waitForTimeout(3000);
const out = await page.evaluate(() => {
  const lines = [];
  const root = document.querySelector('mw-main-container') || document.body;
  const walk = (el, d) => {
    if (d > 16 || el.closest('mws-conversations-list')) return;
    const tag = el.tagName.toLowerCase();
    const attrs = [...el.attributes].filter(a => /^(data-|aria-label|role|placeholder|contenteditable|rows)/.test(a.name))
      .map(a => `${a.name}="${a.value.slice(0,30)}"`).join(' ');
    const interesting = tag.includes('-') || attrs || ['textarea','input','button','nav','header','main'].includes(tag);
    if (interesting) lines.push('  '.repeat(d) + tag + (attrs ? ' ' + attrs : ''));
    // collapse repeated message wrappers
    let seen = 0;
    for (const c of el.children) { if (/message-wrapper|mws-message/.test(c.tagName.toLowerCase()) && ++seen > 2) continue; walk(c, interesting ? d + 1 : d); }
  };
  walk(root, 0);
  return lines;
});
fs.writeFileSync(process.argv[2], out.join('\n'));
await page.screenshot({ path: process.argv[3] });
console.log(out.length);
process.exit(0);
