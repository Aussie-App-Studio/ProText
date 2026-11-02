# Privacy Policy for ProText for Google Messages™

**Last Updated:** November 2, 2026  
**Developer:** Aussie App Studio  
**Feedback & Inquiries:** [Feedback & Bug Report Form](https://forms.gle/Wxa7cr21a7kYGQuM9)

---

## 🔒 Summary: 100% Local & Private by Design

ProText for Google Messages™ ("ProText") is built with a strict **local-first, privacy-by-design** architecture:
- **No External Servers:** ProText does **not** transmit your messages, contacts, notes, themes, or personal data to any external server, cloud database, or third party.
- **No Analytics or Trackers:** There are no analytics libraries, advertising trackers, tracking pixels, or telemetry beacons embedded in ProText.
- **No Data Selling:** We do not sell, rent, monetize, or trade your personal information under any circumstances.

---

## 1. What Data ProText Interacts With

All data handled by ProText is stored and processed **exclusively within your local browser**:

| Data Type | How It Is Used | Storage Location |
| :--- | :--- | :--- |
| **Settings & Preferences** | Saves active themes, emoji bars, toggle states, and custom rules | Local Browser Storage (`IndexedDB`) |
| **Custom Themes** | Saves user-designed CSS color palettes and backgrounds | Local Browser Storage (`IndexedDB`) |
| **Contact Notes & Tags** | Stores private CRM notes, nicknames, and follow-up labels | Local Browser Storage (`IndexedDB`) |
| **Message Templates** | Saves quick-response text snippets and templates | Local Browser Storage (`IndexedDB`) |
| **Undo Send Buffer** | Temporarily delays message dispatch by 3 seconds in memory | Temporary Browser Memory (`RAM`) |

---

## 2. Chrome Extension Permissions Declared

ProText complies strictly with the Google Chrome Web Store **Minimum Permissions Policy**:

- **`storage`**: Used solely to persist your local theme preferences, custom folder rules, templates, and contact notes inside your browser via standard Web Storage and IndexedDB.
- **Host Permissions (`https://messages.google.com/web/*`)**: Used solely to inject the ProText user interface (theme engine, folder tabs, settings menu, and undo-send safety bar) into Google Messages for Web. ProText cannot run on or interact with any other website.

---

## 3. Data Retention and Deletion

Because all data resides strictly on your local computer:
- **Exporting Data:** You can export a complete JSON backup of your settings, notes, templates, and themes at any time from **ProText Settings $\rightarrow$ Data Backup & Sync**.
- **Deleting Data:** You can wipe all ProText data at any time by clearing site data for `messages.google.com` in your browser settings, or by simply removing the ProText extension from `chrome://extensions/`.

---

## 4. Third-Party Services

ProText does not integrate with any third-party tracking, advertising, or cloud analytics services. The only external link provided within the extension is an optional, user-initiated Google Form for submitting feedback and bug reports.

---

## 5. Contact & Support

If you have questions, feedback, or concerns regarding your privacy:
- **Bug Reports & Feature Requests:** [Google Form](https://forms.gle/Wxa7cr21a7kYGQuM9)
- **GitHub Repository:** [https://github.com/Aussie-App-Studio/ProText](https://github.com/Aussie-App-Studio/ProText)
