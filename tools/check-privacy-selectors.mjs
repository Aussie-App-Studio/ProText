import { chromium } from 'playwright';

async function main() {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

  const info = await page.evaluate(() => {
    const snippets = document.querySelectorAll('[data-e2e-conversation-snippet]');
    const messages = document.querySelectorAll('[data-e2e-text-message-content], mws-message-part-content');
    const names = document.querySelectorAll('[data-e2e-conversation-name]');
    const avatars = document.querySelectorAll('mws-conversation-list-item mw-contact-avatar, mws-conversation-list-item .avatar');

    return {
      snippetCount: snippets.length,
      sampleSnippet: snippets[0]?.textContent?.slice(0, 50),
      messageCount: messages.length,
      sampleMessage: messages[0]?.textContent?.slice(0, 50),
      nameCount: names.length,
      sampleName: names[0]?.textContent?.slice(0, 50),
      avatarCount: avatars.length
    };
  });

  console.log('DOM check for privacy selectors:', JSON.stringify(info, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
