import { chromium } from 'playwright';
import fs from 'node:fs';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));
await page.screenshot({ path: process.argv[2] });
// Compact structural dump: custom elements + key attributes, no message text (privacy).
const out = await page.evaluate(() => {
  const lines = [];
  const walk = (el, d) => {
    if (d > 14) return;
    const tag = el.tagName.toLowerCase();
    const attrs = [...el.attributes].filter(a => /^(data-|aria-label|role|placeholder|href|type|contenteditable)/.test(a.name) && a.name !== 'data-e2e-text')
      .map(a => `${a.name}="${a.name === 'href' ? a.value.replace(/\d{6,}/g,'#') : a.value.slice(0,40)}"`).join(' ');
    const interesting = tag.includes('-') || attrs || ['textarea','input','button','a','nav','header','main'].includes(tag);
    if (interesting) lines.push('  '.repeat(d) + tag + (el.id ? '#' + el.id : '') + (attrs ? ' ' + attrs : ''));
    for (const c of el.children) walk(c, interesting ? d + 1 : d);
  };
  walk(document.body, 0);
  return lines;
});
fs.writeFileSync(process.argv[3], out.join('\n'));
console.log(out.length, 'lines');
process.exit(0);
