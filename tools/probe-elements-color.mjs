import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('messages.google.com'));

const colors = await page.evaluate(() => {
  const q = s => {
    const el = document.querySelector(s);
    if (!el) return null;
    const st = getComputedStyle(el);
    return { bg: st.backgroundColor, color: st.color };
  };
  return {
    header: q('mw-branded-header'),
    mainNav: q('mw-main-nav'),
    convList: q('mws-conversations-list'),
    convItem: q('mws-conversation-list-item'),
    convContainer: q('mw-conversation-container'),
    convHeader: q('mw-conversation-header'),
    messagesList: q('mws-messages-list'),
    compose: q('mws-message-compose'),
    outgoingMsg: q('[data-e2e-message-outgoing="true"] mws-message-part-content'),
    incomingMsg: q('[data-e2e-message-outgoing="false"] mws-message-part-content')
  };
});
console.log('Key UI elements colors:', colors);
process.exit(0);
