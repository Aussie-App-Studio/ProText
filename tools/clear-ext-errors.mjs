import { chromium } from 'playwright';

async function main() {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = b.contexts()[0];
  const page = await ctx.newPage();
  await page.goto('chrome://extensions');
  await page.waitForTimeout(500);
  const cleared = await page.evaluate(async () => {
    const list = await chrome.developerPrivate.getExtensionsInfo();
    const me = list.find(e => e.name === 'Messages+');
    if (me && me.runtimeErrors && me.runtimeErrors.length > 0) {
      await chrome.developerPrivate.deleteExtensionErrors({ extensionId: me.id });
      return 'Cleared errors: ' + me.runtimeErrors.length;
    }
    return 'No runtime errors found';
  });
  console.log(cleared);
  await page.close();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
