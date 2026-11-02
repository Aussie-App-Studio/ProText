// Central map of DOM hooks for Google Messages for Web, verified against the live page (Oct 2026).
// We use structural custom elements and data-e2e-* attributes only, never obfuscated class names.
// If Google changes the markup, this is the only file that should need editing.
export const SEL = {
  appShell: 'mw-app',
  header: 'mw-branded-header',
  accountSwitcher: 'mw-branded-header mw-accountswitcher',
  mainContainer: 'mw-main-container',

  // Sidebar
  sidebar: 'mw-main-nav[data-e2e-conversation-list]',
  startChatButton: 'a[data-e2e-start-button]',
  conversationsList: 'mws-conversations-list',
  conversationListbox: 'mws-conversations-list [role="listbox"]',
  conversationItem: 'mws-conversation-list-item',
  conversationLink: 'a[data-e2e-conversation]', // data-e2e-is-unread="true|false", href=/web/u/0/conversations/<id>
  conversationName: '[data-e2e-conversation-name]',
  conversationSnippet: '[data-e2e-conversation-snippet]',

  // Open conversation
  conversationContainer: 'mw-conversation-container',
  conversationHeader: 'mw-conversation-header',
  headerTitle: '[data-e2e-header-title]',
  messagesList: 'mws-messages-list',
  messagesContent: '[data-e2e-messages-list-content]',
  messageWrapper: 'mws-message-wrapper',
  messageCore: '[data-e2e-message-wrapper-core]', // data-e2e-message-id, data-e2e-message-outgoing="true|false"
  messageText: '[data-e2e-text-message-content]',

  // Composer
  compose: 'mws-message-compose',
  composeContainer: 'mws-message-compose .compose-container',
  textarea: 'mws-message-compose textarea[data-e2e-message-input-box]',
  editable: 'mws-message-compose [contenteditable="true"][data-e2e-message-input-box]',
  sendButton: 'button[data-e2e-send-text-button], mws-message-compose button.send-button'
} as const;

export const attr = {
  unread: 'data-e2e-is-unread',
  messageId: 'data-e2e-message-id',
  outgoing: 'data-e2e-message-outgoing'
} as const;
