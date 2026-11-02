import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const vars = await page.evaluate(() => {
  const s = getComputedStyle(document.documentElement);
  const bodyStyle = getComputedStyle(document.body);
  const out = [];
  for (let i = 0; i < document.styleSheets.length; i++) {
    try {
      const sheet = document.styleSheets[i];
      for (let j = 0; j < sheet.cssRules.length; j++) {
        const rule = sheet.cssRules[j];
        if (rule.selectorText === ':root' || rule.selectorText === 'body' || rule.selectorText?.includes('dark-theme')) {
          const text = rule.cssText;
          const matches = text.match(/--[\w-]+:\s*[^;]+/g);
          if (matches) out.push(...matches.slice(0, 15));
        }
      }
    } catch {}
  }
  return {
    sampleVars: out.slice(0, 20),
    bodyBg: bodyStyle.backgroundColor,
    bodyColor: bodyStyle.color
  };
});
console.log('Theme variables in Google Messages:', vars);
process.exit(0);
