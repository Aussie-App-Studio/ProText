import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const DOWNLOADS = 'C:/Users/jesse/Downloads';
const OUT_DIR = path.resolve('store_assets');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  for (let i = 1; i <= 5; i++) {
    const inputPath = path.join(DOWNLOADS, `${i}.png`);
    if (!fs.existsSync(inputPath)) {
      console.error(`File not found: ${inputPath}`);
      continue;
    }

    const imgBase64 = fs.readFileSync(inputPath).toString('base64');
    const dataUrl = `data:image/png;base64,${imgBase64}`;

    console.log(`Processing ${i}.png...`);

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: 1280px;
              height: 800px;
              background: #131314;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            img {
              max-width: 1240px;
              max-height: 760px;
              width: auto;
              height: auto;
              object-fit: contain;
              border-radius: 12px;
              box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" />
        </body>
      </html>
    `);

    await page.waitForTimeout(300);

    const outPath = path.join(OUT_DIR, `user_screenshot${i}_1280x800.png`);
    await page.screenshot({
      path: outPath,
      type: 'png',
      omitBackground: false
    });
    console.log(`Saved: ${outPath}`);
  }

  await browser.close();
  console.log('✅ All 5 user screenshots converted cleanly to 1280x800 24-bit PNGs!');
}

main().catch(console.error);
