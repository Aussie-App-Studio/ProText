import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

async function generateIcons() {
  const iconsDir = path.join(process.cwd(), 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Modern, high-impact SVG design for ProText:
  // - Vibrant blue-to-cyan gradient rounded-squircle base
  // - Clean chat bubble tail
  // - Crisp, modern bold "P" with dynamic speed slash / pro badge
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1d4ed8" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Base Chat Bubble -->
  <path d="M 120 44 
           L 392 44 
           A 76 76 0 0 1 468 120 
           L 468 336 
           A 76 76 0 0 1 392 412 
           L 200 412 
           L 96 484 
           L 96 392 
           A 76 76 0 0 1 44 320 
           L 44 120 
           A 76 76 0 0 1 120 44 Z" 
        fill="url(#bgGrad)" 
        filter="url(#shadow)" />

  <!-- Inner Soft Glow -->
  <path d="M 120 48 
           L 392 48 
           A 72 72 0 0 1 464 120 
           L 464 336 
           A 72 72 0 0 1 392 408 
           L 196 408 
           L 100 476 
           L 100 388 
           A 72 72 0 0 1 48 316 
           L 48 120 
           A 72 72 0 0 1 120 48 Z" 
        fill="none" 
        stroke="rgba(255, 255, 255, 0.22)" 
        stroke-width="8" />

  <!-- Stylized Bold "P" -->
  <!-- Vertical Stem -->
  <rect x="156" y="132" width="58" height="236" rx="29" fill="#ffffff" />
  
  <!-- "P" Upper Loop -->
  <path d="M 185 132 
           L 292 132 
           A 68 68 0 0 1 360 200 
           L 360 208 
           A 68 68 0 0 1 292 276 
           L 185 276 
           Z" 
        fill="#ffffff" />

  <!-- Inner Loop Cutout -->
  <path d="M 214 182 
           L 286 182 
           A 22 22 0 0 1 308 204 
           A 22 22 0 0 1 286 226 
           L 214 226 
           Z" 
        fill="#1e40af" />

  <!-- Dynamic Spark / Star Accent in Top-Right representing Power / Pro -->
  <path d="M 390 100 
           Q 390 135 425 135 
           Q 390 135 390 170 
           Q 390 135 355 135 
           Q 390 135 390 100 Z" 
        fill="#38bdf8" />
  <circle cx="390" cy="135" r="7" fill="#ffffff" />
</svg>
`;

  // Write SVG file
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svg.trim());
  console.log('Saved icon.svg');

  // Use Playwright to render pixel-perfect PNGs for all standard extension icon sizes
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  ${svg}
</body>
</html>
`;
  await page.setContent(html);

  const sizes = [16, 32, 48, 128];
  for (const s of sizes) {
    await page.setViewportSize({ width: s, height: s });
    const imgEl = page.locator('svg');
    await imgEl.evaluate((el, size) => {
      el.setAttribute('width', size);
      el.setAttribute('height', size);
    }, s);
    const dest = path.join(iconsDir, `icon${s}.png`);
    await page.screenshot({ path: dest, omitBackground: true });
    console.log(`Generated icon${s}.png (${s}x${s})`);
  }

  await browser.close();
  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
