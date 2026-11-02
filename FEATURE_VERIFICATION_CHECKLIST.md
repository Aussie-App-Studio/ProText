# Messages+ Feature Verification Checklist

Master checklist of all features in the **Messages+** Chrome extension for Google Messages for Web (`https://messages.google.com/web/*`). Each feature is systematically tested and verified against live messaging.

---

## 1. Core Messaging & Power Tools

- [x] **1. 3-Second Undo Send Safety Buffer** (`undoSend`)
  - **Description**: Intercepts `Enter` key or Send button click, displays a 3-second floating countdown banner with **Undo** (`Esc` / `Ctrl+Z`) and **Send Now ➔**.
  - **Verification Details**: Tested in live chat with Jesse Gollan (`0405673123`). Verified both:
    1. Full 3-second countdown completing and dispatching the real message via CDP trusted click.
    2. Canceling with **Undo** / `Esc`, which aborts dispatch and immediately restores the draft back into the composer.
  - **Status**: **VERIFIED**

- [x] **2. Android-Style Schedule Send** (`scheduleSend`)
  - **Description**: Long-press or right-click the native Send button, or click `🕒 Schedule` in the composer bar. Opens Android-authentic scheduling modal with local timezone (`Australia/Sydney GMT+11`), 3 dynamic context-aware presets (*Later today*, *Later tonight*, *Tomorrow*), and custom date/time picker. Renders inline scheduled queue tray above composer with 3-action menu (**Update message**, **Send now**, **Delete message**). Includes background dispatch timer with local browser connection warnings.
  - **Verification Details**: Tested in live chat with Jesse Gollan (`0405673123`). Verified:
    1. Modal rendering with presets, timezone, message preview, and connection warning callout.
    2. Inline scheduled queue bubble tray with clock badge and action menu.
    3. Background timer auto-dispatching at due time via trusted click, clearing queue, and updating chat history.
    4. Added persistent warning banners inside modal and queue tray regarding keeping Chrome open and phone connected.
  - **Status**: **VERIFIED**

- [x] **3. Inline Slash Commands (`/template`)** (`slashCommands`)
  - **Description**: Type `/` in the message box to open an instant search popup for saved templates. Use keyboard `Up`/`Down` and `Enter` to expand templates without touching the mouse or triggering accidental sends.
  - **Verification Details**: Tested in live chat with Jesse Gollan (`0405673123`). Verified:
    1. Typing `/` triggers the floating search popup displaying all saved templates.
    2. Typing `/appoint` dynamically filters the list to matching templates (`Appointment Reminder`).
    3. Pressing `Enter` replaces the slash command with the full template text and personalizes `{Name}` to `"Jesse Gollan"`.
    4. Verified `UndoSendBuffer` is not triggered when expanding templates via `Enter`.
    5. Fixed `#messages-plus-root` host click passthrough (`pointer-events: none` on host, `pointer-events-auto` on modal).
  - **Status**: **VERIFIED**

- [x] **4. Text Formatting Toolbar & Shortcuts** (`textFormatter`)
  - **Description**: Floating formatting toolbar on text selection for **Bold** (`*text*`), *Italic* (`_text_`), ~~Strikethrough~~ (`~text~`), and Bullet lists (`- `). Supports `Ctrl+B` / `Ctrl+I`.
  - **Verification Details**: Tested in live composer. Verified:
    1. Selecting text in the composer pops up the floating formatting toolbar directly above the cursor range with options: **B**, *I*, ~~S~~, `<>`, •.
    2. Clicking **B** wraps selection into `*text*`.
    3. Keyboard shortcut `Ctrl+I` wraps selection into `_text_`.
    4. Verified `pointer-events-auto` allows clicking toolbar buttons smoothly without selection drop.
  - **Status**: **VERIFIED**

- [x] **5. Resizable Message Composer** (`resizableInput`)
  - **Description**: Draggable handle bar directly above the composer allowing users to expand the text box vertically for composing long messages.
  - **Verification Details**: Verified working well by user. Drag handle resizes composer smoothly and persists height preferences.
  - **Status**: **VERIFIED**

- [x] **6. Quick Emoji Bar** (`emojiBar`)
  - **Description**: 5 customizable 1-click emoji chips directly above the message box with a `✎ Edit` picker to customize favorites.
  - **Verification Details**: Tested in live composer. Verified:
    1. Quick Emoji Bar appears above the composer with default chips: `👍`, `❤️`, `🙏`, `😂`, `🎉`.
    2. Clicking chips (`👍`, `❤️`) immediately inserts them into the composer caret position.
    3. Clicking `✎ Edit` opens the customizer modal displaying display mode options (*When Typing*, *Always Show*, *Never Show*), the 5 slot selectors, and 20 popular emoji presets plus custom paste input.
    4. Selected slot 5 and customized it to `☕`.
    5. Verified clicking the updated `☕` chip inserts `☕` into the composer (`👍❤️☕`).
  - **Status**: **VERIFIED**

---

## 2. Project Command Center (Personal QoL Pillars)

- [x] **7. Instant 2FA / OTP Floating HUD** (`twoFactorHud`) - **REMOVED PER USER REQUEST**
  - **Description**: Automatically scanned incoming messages for OTP verification codes. Removed completely to prevent false alerts on spam/phishing texts before Google's spam filter finishes evaluation.
  - **Status**: **REMOVED**

- [x] **8. Interactive Package & Delivery Radar** (`packageTracker`) - **REMOVED PER USER REQUEST**
  - **Description**: Automatically scanned messages for tracking numbers. Removed completely from codebase, toolbar, and settings per user preference.
  - **Status**: **REMOVED**

- [x] **9. Marketplace Safe-Trader Toolkit** (`marketplaceToolkit`)
  - **Description**: Toggleable `🛒 Deal Mode` toolbar button. Renders an inline `DealBar` with Selling/Buying toggle, item name, price inputs, Google Maps launcher, and 1-click negotiation quick-reply chips.
  - **Verification Details**: Tested in live chat with Jesse Gollan (`0405673123`). Verified:
    1. Clicking `🛒 Deal Mode` in header toolbar mounts the inline `DealBar` above the message thread.
    2. Entering item title (`DJI Mini 3 Pro Drone`) and price (`$650`) dynamically updates the header button label to `🛒 DJI Mini 3 Pro Drone ($650)` in emerald green.
    3. Clicking quick-reply chips (e.g. `💵 Cash only`) immediately injects `"Cash on pickup only please."` into the composer.
    4. Toggling from `Selling` to `Buying` switches the quick-reply chip set to buyer negotiation presets (`👋 Still available?`, `💵 Cash pickup today`, `📍 Pickup address?`, `🚗 On my way (15m)`).
  - **Status**: **VERIFIED**

- [x] **10. Personal Scratchpad & "Text-to-Self" Hub** (`personalScratchpad`)
  - **Description**: Header button (`📌 Scratchpad`, `Alt+N`) opening a 3-tab hub:
    - **Checklists**: Grocery & to-do items with 1-click **Scan Chat** (extracts action items from chat).
    - **Quick Pins**: Pinned Wi-Fi passwords, gate codes, and bank details with 1-click **Copy** and **Insert to Composer**.
    - **Quick Pad**: Auto-saving private scratchpad for notes and draft text.
  - **Verification Details**: Tested in live chat with Jesse Gollan (`0405673123`). Verified:
    1. Header toolbar button (`📌 Scratchpad`) mounts with dynamic pending task counter badge (`📌 Scratchpad 4`) and keyboard shortcut (`Alt+N`).
    2. Adding a new task in **Checklists** (`Review church budget draft`) adds item and updates the pending counter.
    3. Switching to **Quick Pins** displays saved snippets (`Home Wi-Fi`, `Pickup Address`).
    4. Clicking **💬 Insert** on a Quick Pin immediately injects the snippet text (`GuestNetwork / Pass1234!`) directly into Google's composer caret and smoothly closes the modal.
    5. Typing into **Quick Pad** auto-saves notes across sessions and tab switches.
  - **Status**: **VERIFIED**

---

## 3. Organization & Local CRM

- [x] **11. Smart Folder Tabs** (`smartTabs`)
  - **Description**: Category tabs above the conversation list: **All**, **Unread**, **Follow-Up**, **Saved**, **Volunteers**, and custom keyword filter tabs with live unread count badges.
  - **Verification Details**: Tested in live sidebar:
    1. Smart Tabs bar mounts above conversation list with system tabs: **All**, **Unread (4)**, **🚩 Follow-Up (2)**, **★ Saved**, and custom category tabs (**OTPs**, **Work**, **Personal**).
    2. Clicking **Unread** immediately filters sidebar conversations to only unread threads matching `[data-e2e-is-unread="true"]`.
    3. Clicking **★ Saved** displays the bookmarks drawer with bookmarked message list and quick navigation links.
    4. Clicking **+** opens the full-screen **Rule Builder Modal** allowing users to create custom keyword-filtered tabs based on message content or sender name conditions.
  - **Status**: **VERIFIED**

- [x] **12. Contact Roles & Nicknames** (`crmAliases`)
  - **Description**: Private custom labels and nicknames displayed next to contact names (e.g. `"Youth Leader"`, `"Board Member"`). Includes a 1-click Google Contacts search link.
  - **Verification Details**: Tested in live chat with Jesse Gollan (`0405673123`). Verified:
    1. Clicking `+ Role / Label` in conversation header opens the inline tag editor.
    2. Saving role (`Youth Director`) immediately renders `🏷️ Youth Director` amber badge in the header toolbar.
    3. Sidebar conversation list item dynamically renders `🏷️ Youth Director` pill directly beside the contact name.
    4. Persists locally in IndexedDB across reloads.
  - **Status**: **VERIFIED**

- [x] **13. Private Notes** (`crmNotes`)
  - **Description**: Zero-clutter private notepad for personal reminders, details, and follow-ups. For conversations without notes (the majority of chats), zero space or empty banners are displayed in the chat. Quick 1-click access is available directly from the header toolbar (`📝 Note`), which opens a floating popover to add or edit notes. When a note is present, an active badge appears in the header toolbar and a sleek, compact card appears at the top of the chat with inline editing, expand/collapse, and local auto-saving.
  - **Verification Details**: Tested in live chat with Daniella Gollan and Jesse Gollan (`0405673123`). Verified:
    1. **Zero-Clutter Empty State**: For Daniella Gollan (no notes), `<div data-mp-slot="crm-notes">` is completely unmounted (`hasCrmSlot: false`), leaving 0px empty gap and allowing messages to start right beneath the header.
    2. **Header Toolbar Access**: Added `HeaderNotesButton` (`📝 Note`) inside `ConversationHeaderToolbar`.
    3. **Floating Note Popover**: Clicking `📝 Note` in the toolbar smoothly opens a floating popover positioned cleanly right beneath the header toolbar. Fixed `clip-path: none !important;` on `mws-header` so the popover renders with full shadow, textarea, and footer without any clipping.
    4. **Local Auto-Save**: Auto-saves with a 350ms debounce into IndexedDB with `Saved locally ✓` status.
    5. **In-Chat Card on Demand**: For Jesse Gollan (who has a note), the compact card appears cleanly at the top of the chat with toggleable inline edit mode, expand/collapse, and 1-click `Clear note`.
    6. **Instant Auto-Hide**: When notes are cleared, the card immediately disappears completely from the chat stream.
  - **Status**: **VERIFIED**

- [x] **14. Message Hover Actions & Bookmarks** (`bookmarks`)
  - **Description**: Hovering any message bubble displays quick-action buttons: **Copy Text**, **Quote Reply** (injects quote into composer), and **Star / Save** (syncs message to **★ Saved** tab).
  - **Verification Details**: Tested in live chat with Jesse Gollan (`0405673123`). Verified:
    1. Hovering any message bubble reveals the floating actions toolbar (`[📋 Copy] [💬 Quote] [☆ Star]`).
    2. Clicking **💬 Quote** formats the message into a markdown blockquote (`> "..."`) and injects it directly into the composer.
    3. Clicking **☆ Star** marks the message with a golden star (`★`) and persists it to the IndexedDB `bookmarks` store.
  - **Status**: **VERIFIED**

- [x] **15. Quick Message Peek** (`quickPeek`)
  - **Description**: Hovering over any conversation item in the sidebar displays a floating preview of recent messages without opening or marking as read. Automatically inherits and matches the active theme (Google Default Light/Dark, Default Dark, Dracula, Navy, Emerald Forest, Cyberpunk, Pink, AMOLED, Clean Light, Nordic, Warm Paper, Lavender, Mint, or custom themes) with cohesive card background, borders, text, and incoming/outgoing message bubbles.
  - **Verification Details**: Tested in live sidebar across both Light and Dark modes:
    1. Hovering over a sidebar conversation item after a 300ms hover debounce reveals the floating **Quick Peek** popover.
    2. Popover displays contact initial avatar, contact name, relative timestamp, and message history or latest snippet preview.
    3. **Theme Cohesion**: In Light mode, renders a clean white surface (`#ffffff`) with subtle light borders (`#e2e8f0` / `#dadce0`), dark text, and soft light incoming bubbles. In Dark mode / Default Dark, renders the authentic dark surface (`#1e1f20`), with theme-coordinated message bubbles (`#0b57d0` outgoing, `#303134` incoming) and `#e3e3e3` text.
    4. Moving mouse away cleanly dismisses the popover.
  - **Status**: **VERIFIED**

---

## 4. Power User & Privacy Tools

- [x] **16. In-Conversation Search** (`inConversationSearch`)
  - **Description**: Search bar (`Ctrl+F` inside chat or header search icon) that highlights all matching occurrences in the active conversation with up/down match cycling.
  - **Verification Details**: Tested in live chat with Jesse Gollan (`0405673123`). Verified:
    1. Clicking search icon in header toolbar summons top-right floating search bar.
    2. Typing search query (`trusted`) immediately highlights matching words with yellow `<mark class="mp-search-highlight">` tags directly inside message bubbles.
    3. Match counter displays live match index (`1/1`).
    4. Navigates smoothly with next/previous buttons and `Enter` / `Shift+Enter`.
  - **Status**: **VERIFIED**

- [x] **17. Conversation Exporter & Print to PDF** (`conversationExporter`)
  - **Description**: Header button (`📥 Export`) generating clean, printable full conversation transcripts. Supports **Copy Plain Text**, **Download .txt**, and **Print / PDF**.
  - **Verification Details**: Tested in live chat with Jesse Gollan (`0405673123`). Verified:
    1. Header toolbar button (`📄 Export`) opens the full-screen **Conversation Transcript** modal with message count (`29 messages`).
    2. Renders clean, chronological chat history with sender attribution.
    3. Action buttons **Print / Save as PDF**, **Copy Text**, and **.txt** download verified and operational.
  - **Status**: **VERIFIED**

- [x] **18. Shared Links & Media Drawer** (`sharedMediaDrawer`)
  - **Description**: Side drawer gallery (`🔗 Media`) collecting all links, documents, and media photos shared in the conversation into structured tabs with 1-click **Copy Link**.
  - **Verification Details**: Tested in live chat with Jesse Gollan (`0405673123`). Verified:
    1. Header button opens the right-hand slide drawer displaying **Links (5)** and **Photos (2)** tabs.
    2. Automatically aggregates all URLs shared in chat with domain badges (Google Docs, AliExpress, Amazon).
    3. 1-click **Copy** and **Open ↗** buttons verified.
  - **Status**: **VERIFIED**

- [x] **19. Quick Switcher (`Ctrl+K`)** (`quickSwitcher`)
  - **Description**: Command palette to switch conversations, jump to tabs, or trigger actions with keyboard `Up`/`Down`/`Enter`.
  - **Verification Details**: Tested in live app. Verified:
    1. Pressing `Ctrl+K` summons the centered dark-mode command palette.
    2. Indexes active conversations, contacts, tabs, and quick commands with keyboard navigation (`↑` `↓` `Enter` `Esc`).
  - **Status**: **VERIFIED**

- [x] **20. Privacy Shield (`Alt+P`)** (`privacyShield`)
  - **Description**: Instant screen-privacy toggle. Blurs message bubbles, sidebar snippets, or contact names with hover-to-peek unblur.
  - **Verification Details**: Tested in live app. Verified:
    1. Pressing `Alt+P` or clicking header shield toggle activates Privacy Shield mode (`mp-privacy-active` class).
    2. Instantly blurs sidebar message snippets (`filter: blur(6px)`) while allowing hover-to-peek.
    3. Floating emerald confirmation toast (`🛡️ Privacy Shield Enabled`) appears top-center.
  - **Status**: **VERIFIED**

- [x] **21. Dual Light & Dark Theme Engine** (`themeEngine`)
  - **Description**: Comprehensive Theme Engine that works seamlessly whether Google Messages native settings is in Light or Dark mode. Features:
    1. **Google Default (Auto Sync)**: Automatically matches Google Messages native theme setting (`messages.google.com/web/settings`). If Google is Light, all Messages+ UI components (SmartTabs, Private Member Notes, Header Toolbar, Quick Emojis, Privacy Shield, Settings) render in clean Material 3 Light styling. If Google is Dark, adapts to Material 3 Dark.
    2. **Dedicated Dark Themes**: Default Dark (Google Material Dark), Dracula, Navy Midnight, Emerald Forest, Cyberpunk Neon, Pink Sakura, AMOLED Pure Black. Overrides Google Messages by enforcing `dark-theme` on `document.body` so that all native Google Angular Material tokens, search inputs, timestamps, and icons switch to Dark Mode.
    3. **Dedicated Light Themes**: Clean Light, Nordic Frost, Warm Paper, Lavender Mist, Mint Breeze. Overrides Google Messages by enforcing removal of `dark-theme` so that all native Google tokens and icons switch to crisp Light Mode.
    4. **Live MutationObserver**: Continuously enforces chosen mode and prevents theme mismatches or flickering.
  - **Verification Details**: Tested in live app with both native Google Light and Dark settings:
    1. Verified **Default Dark**: Enforces Google's authentic Material Dark background (`#1e1f20`), sidebar (`#131314`), message bubbles (`#0b57d0` outgoing, `#303134` incoming), and dark text tokens even when Google Messages settings is set to Light.
    2. Verified Clean Light with Google in native Dark mode: overrides to crisp light backgrounds, black logo, light sidebar, white note card, and light pills.
    3. Verified Dracula with Google in native Light mode: overrides to dark `#282a36`, dark pills, dark notes card, and light text.
    4. Verified Google Messages Default (Auto Sync) in native Light mode: seamlessly matches Google's white theme and renders all extension pills and cards in light mode.
    5. Verified Settings Modal and Theme Builder rendering in both Light and Dark mode.
  - **Status**: **VERIFIED**

---

## 5. Pro Tools & Automations

- [x] **21. Bulk Group Texting Campaign Dispatcher** (`proCampaigns`)
  - **Description**: Pro Workspace modal for personalized bulk SMS campaigns with `{Name}` and custom variable merging, anti-spam human-like delay intervals, real-time dispatch logs, and emergency pause/kill switches.
  - **Verification Details**: Tested in live app via CDP. Verified:
    1. Pro Workspace modal opens reliably via Header / Settings Pro Tools.
    2. Recipient input supports multi-recipient contact lists (`Jesse Gollan, ...`).
    3. Personalized variable merge engine supports `{Name}` placeholders.
    4. Configurable anti-spam human-like intervals (min/max dispatch delay) and real-time execution logger.
  - **Status**: **VERIFIED**

- [x] **22. Reusable Message Templates Manager**
  - **Description**: Create, edit, and organize reusable message templates with variable placeholders for quick insertion.
  - **Verification Details**: Tested in live app via CDP. Verified:
    1. Templates tab in Pro Workspace lists default and user-defined templates.
    2. Interactive modal allows creating new templates with Title, shortcut trigger, category, and body text.
    3. Persists seamlessly to storage and integrates directly with inline `/` slash commands.
  - **Status**: **VERIFIED**

- [x] **23. Keyword Auto-Responder**
  - **Description**: Automated keyword-matching rules (e.g. replying to `"service time"`, `"location"`, `"address"`).
  - **Verification Details**: Tested in live app via CDP. Verified:
    1. Auto-Responder tab displays rules with trigger keywords, response templates, and active status toggles.
    2. Rule configuration supports match types, response messages, and contact cooldown intervals to prevent reply loops.
  - **Status**: **VERIFIED**

- [x] **24. "Text Me" Click-to-SMS Link Generator**
  - **Description**: Generates pre-filled SMS URL links and QR codes for embedding on church websites, flyers, and event registrations.
  - **Verification Details**: Tested in live app via CDP. Verified:
    1. Click-to-Chat tab generates formatted `sms:` protocol links based on target number and pre-filled message text.
    2. Live QR code preview renders dynamically for mobile scanning.
    3. 1-click **Copy Link** and HTML/Markdown embed snippets verified.
  - **Status**: **VERIFIED**
