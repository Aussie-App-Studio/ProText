# ProText for Google Messages™ 💬⚡

> **Themes, Smart Folders, Undo Send, and Productivity Power Tools for Google Messages for Web.**

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-ProText-blue?logo=googlechrome&logoColor=white)](https://github.com/Aussie-App-Studio/ProText)
[![Privacy Friendly](https://img.shields.io/badge/Privacy-100%25_Local-emerald?logo=shield&logoColor=white)](PRIVACY.md)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

ProText elevates [Google Messages for Web](https://messages.google.com/web) into a modern, feature-packed messaging workspace. Built with a strict **local-first, privacy-by-design** architecture, ProText runs entirely in your browser with **zero external servers, zero telemetry, and zero ads**.

---

## ✨ Features

### 🎨 Material Theme Engine & Builder
- **12+ Handcrafted Themes:** Dracula, AMOLED Pure Black, Navy Midnight, Emerald Forest, Cyberpunk Neon, Pink Sakura, Clean Light, Nordic Frost, Warm Paper, Lavender Mist, and Mint Breeze.
- **Custom Theme Builder:** Design and live-preview your own custom accent colors, background hues, and bubble gradients.
- **Automatic Theme Sync:** Seamlessly matches your system light or dark mode preferences.

### 📁 Smart Folder Tabs
- Organize chats into dedicated tabs: **Unread**, **Follow-Up**, **Work**, **Personal**, and custom smart filters.
- Real-time unread count badges on every tab.
- Automatically categorizes incoming threads based on contacts and message content.

### ⏱️ Undo Send Safety Buffer
- **3-Second Safety Delay:** Gives you a quick grace window to cancel accidental sends or fix typos before the message leaves your device.
- Visual countdown bar with an instant **Undo** button (or press `Esc` / `Ctrl+Z`).
- Strict recipient guard ensures messages are never dispatched to the wrong contact.

### 👤 Contact CRM Notes & Aliases
- Add private pastoral or client notes to any conversation.
- Set custom contact nicknames or business roles without altering your Google Contacts.
- Flag contacts for urgent follow-up.
- **Google Contacts Sync:** 1-click export formatted for native import into Google Contacts.

### 🛡️ Privacy Shield (Screen Blur)
- Blur message bubbles, contact names, and photo previews when working in public spaces or open offices.
- Quick toggle hotkey: `Alt + P`.
- Smooth hover-to-reveal preview.

### ⚡ Power Tools & Productivity
- **Quick Reaction Emoji Bar:** 5 customizable quick-emojis directly above the input box.
- **Quick Switcher Palette (`Alt + K`):** Jump instantly to any conversation, smart tab, or tool with fuzzy search.
- **Shared Media & Links Drawer:** Browse all photos, links, and documents shared in the active conversation in one organized drawer.
- **Conversation Exporter:** Print or export clean transcripts to PDF, Text, or clipboard.
- **Complete Data Backup & Restore:** Export all your themes, notes, and preferences to a portable `.json` file.

---

## 🔒 100% Private & Local-First

- **Zero Remote Servers:** All themes, folders, notes, and settings are saved locally in your browser's `IndexedDB`.
- **Zero Telemetry or Trackers:** No analytics, tracking pixels, or third-party cookies.
- **Minimum Permissions:** Requests only `storage` permission—no network access to external domains.
- Read our full [Privacy Policy](PRIVACY.md).

---

## 🛠️ Local Installation & Development

### Run Unpacked in Google Chrome:
1. Clone this repository:
   ```bash
   git clone https://github.com/Aussie-App-Studio/ProText.git
   cd ProText
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the production extension:
   ```bash
   npm run build
   ```
4. Open Chrome and navigate to `chrome://extensions/`.
5. Enable **Developer mode** (toggle in the top-right corner).
6. Click **Load unpacked** and select the `dist/` folder.
7. Open [https://messages.google.com/web](https://messages.google.com/web) to start using ProText!

---

## 📂 Project Architecture

```text
├── public/
│   ├── manifest.json       # Manifest V3 (MV3) configuration
│   └── icons/              # Extension icons (16, 32, 48, 128px)
├── src/
│   ├── background/         # Minimal service worker
│   ├── content/            # Injected content scripts & React UI
│   │   ├── features/       # Themes, SmartTabs, UndoSend, PrivacyShield, QuickEmoji
│   │   ├── settings/       # Quick Modal, Full Material Settings page, and Store
│   │   ├── ui/             # Reusable UI icons and components
│   │   ├── db.ts           # Sandboxed IndexedDB storage layer
│   │   └── Slot.tsx        # Shadow DOM portal injection engine
│   └── types/
├── docs/                   # GitHub Pages hosted Privacy Policy
├── PRIVACY.md              # Chrome Web Store compliant privacy statement
├── vite.config.ts          # Vite build pipeline
└── package.json
```

---

## 💬 Feedback & Bug Reports

Encountered an issue or have a feature idea?  
Submit via our [Feedback & Bug Report Form](https://forms.gle/Wxa7cr21a7kYGQuM9).

---

## 📄 License

Distributed under the GNU General Public License v3.0 (GPL-3.0). See [LICENSE](LICENSE) for details.

*Google Messages is a trademark of Google LLC. ProText is an independent open-source project and is not affiliated with or endorsed by Google LLC.*
