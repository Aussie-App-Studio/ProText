import { useSyncExternalStore } from 'react';
import { getSetting, setSetting } from '../db';

export const PROTEXT_FEEDBACK_URL = 'https://forms.gle/Wxa7cr21a7kYGQuM9';

export type FeatureCategory = 'composer' | 'organization' | 'contacts' | 'productivity' | 'privacy';

export interface FeatureCategoryMeta {
  id: FeatureCategory;
  name: string;
  shortName: string;
  icon: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  headerGradient: string;
  description: string;
}

export const FEATURE_CATEGORIES: FeatureCategoryMeta[] = [
  {
    id: 'composer',
    name: 'Messaging & Composer',
    shortName: 'Composer',
    icon: '💬',
    accentColor: '#3b82f6',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-600 dark:text-blue-400',
    headerGradient: 'from-blue-500/15 to-transparent',
    description: 'Sending safeguards, message scheduling, text formatting, and composer customization.'
  },
  {
    id: 'organization',
    name: 'Organization & Navigation',
    shortName: 'Navigation',
    icon: '📑',
    accentColor: '#8b5cf6',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-600 dark:text-purple-400',
    headerGradient: 'from-purple-500/15 to-transparent',
    description: 'Smart tab folders, instant search, fast previews, and spotlight switcher.'
  },
  {
    id: 'contacts',
    name: 'Contacts & Private CRM',
    shortName: 'Contacts',
    icon: '👤',
    accentColor: '#10b981',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    headerGradient: 'from-emerald-500/15 to-transparent',
    description: 'Private contact labels, ministry roles, member notes, and pastoral reminders.'
  },
  {
    id: 'productivity',
    name: 'Productivity & Media',
    shortName: 'Productivity',
    icon: '⚡',
    accentColor: '#f59e0b',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-600 dark:text-amber-400',
    headerGradient: 'from-amber-500/15 to-transparent',
    description: 'Personalized announcements, shared media browser, and transcript exporting.'
  },
  {
    id: 'privacy',
    name: 'Privacy & Security',
    shortName: 'Privacy',
    icon: '🛡️',
    accentColor: '#f43f5e',
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    badgeBorder: 'border-rose-500/30',
    badgeText: 'text-rose-600 dark:text-rose-400',
    headerGradient: 'from-rose-500/15 to-transparent',
    description: 'Protect confidential conversations in public spaces and open offices.'
  }
];

export interface FeatureDefinition {
  id: FeatureId;
  category: FeatureCategory;
  label: string;
  description: string;
  shortcut?: string;
}

export type FeatureId =
  | 'undoSend'
  | 'scheduleSend'
  | 'resizableInput'
  | 'emojiBar'
  | 'textFormatter'
  | 'slashCommands'
  | 'smartTabs'
  | 'quickSwitcher'
  | 'inConversationSearch'
  | 'quickPeek'
  | 'crmAliases'
  | 'crmNotes'
  | 'proCampaigns'
  | 'sharedMediaDrawer'
  | 'conversationExporter'
  | 'privacyShield';

/**
 * Registry of user-toggleable features grouped by category.
 */
export const FEATURES: readonly FeatureDefinition[] = [
  // Messaging & Composer
  {
    id: 'undoSend',
    category: 'composer',
    label: 'Undo Send Safety Buffer',
    description: 'A 3-second grace period with an "Undo" button before messages dispatch to catch accidental sends and typos.',
    shortcut: 'Esc / Ctrl+Z'
  },
  {
    id: 'scheduleSend',
    category: 'composer',
    label: 'Android-Style Schedule Send',
    description: 'Long-press the Send button or click the Schedule clock icon to schedule messages for Later Today, Tonight, Tomorrow, or a custom date & time.',
    shortcut: 'Long-press Send'
  },
  {
    id: 'resizableInput',
    category: 'composer',
    label: 'Resizable message box',
    description: 'Drag handles on the message box to make it taller or wider (great for ultrawide screens). Double-click to reset. Off = Google\'s normal behaviour.'
  },
  {
    id: 'emojiBar',
    category: 'composer',
    label: 'Quick emoji bar',
    description: 'A row of your 5 favourite emojis above the message box. Click one to insert it; ✎ to customise.'
  },
  {
    id: 'textFormatter',
    category: 'composer',
    label: 'Text Formatting Toolbar & Shortcuts',
    description: 'Format text with Bold (*), Italic (_), Strikethrough (~), and Bullet Lists with floating toolbar and Ctrl+B / Ctrl+I shortcuts.',
    shortcut: 'Ctrl+B / Ctrl+I'
  },
  {
    id: 'slashCommands',
    category: 'composer',
    label: 'Inline Slash Commands (/template)',
    description: 'Type / in the message box to instantly search and expand saved templates without lifting your hands from the keyboard.',
    shortcut: 'Type /'
  },

  // Organization & Navigation
  {
    id: 'smartTabs',
    category: 'organization',
    label: 'Smart Folder Tabs',
    description: 'Organise conversations into tabs (All, Unread, Follow-Up, Volunteers, Reminders) and automatically sort messages by keyword.'
  },
  {
    id: 'quickSwitcher',
    category: 'organization',
    label: 'Quick Switcher (Ctrl + K)',
    description: 'Press Ctrl+K (or Cmd+K) anywhere to instantly jump to any person, conversation, smart folder, or action.',
    shortcut: 'Ctrl + K'
  },
  {
    id: 'inConversationSearch',
    category: 'organization',
    label: 'In-Conversation Search',
    description: 'Search for words, numbers, or links inside the active chat with instant highlighting and navigation.'
  },
  {
    id: 'quickPeek',
    category: 'organization',
    label: 'Quick Message Preview',
    description: 'Hover over any chat in the list to peek at recent messages without clicking or opening the conversation.'
  },

  // Contacts & CRM
  {
    id: 'crmAliases',
    category: 'contacts',
    label: 'Contact Roles & Nicknames',
    description: 'Add private labels next to people\'s names (e.g. "Youth Leader", "Choir", "Board Member"). Only you can see them on this computer.'
  },
  {
    id: 'crmNotes',
    category: 'contacts',
    label: 'Private Notes',
    description: 'A private notepad for any conversation for personal notes, reminders, and details (saved only on this computer).'
  },

  // Productivity & Media
  {
    id: 'proCampaigns',
    category: 'productivity',
    label: 'Group Texting & Announcements',
    description: 'Send personalized group texts with safe sending pauses, save reusable message templates, set automatic replies, and create "Text Me" links.'
  },
  {
    id: 'sharedMediaDrawer',
    category: 'productivity',
    label: 'Shared Links & Media Drawer',
    description: 'Quickly browse all photos, links, and documents shared in the active conversation in one organized drawer.'
  },
  {
    id: 'conversationExporter',
    category: 'productivity',
    label: 'Conversation Export & Print to PDF',
    description: 'Print or export clean conversation transcripts to PDF, Text, or clipboard for record-keeping and pastoral documentation.'
  },

  // Privacy & Security
  {
    id: 'privacyShield',
    category: 'privacy',
    label: 'Privacy Shield (Screen Blur)',
    description: 'Blur chat messages and conversation previews until hovered to protect confidentiality in public spaces or open offices. Press Alt+P to toggle.',
    shortcut: 'Alt + P'
  }
] as const;

const KEY = 'features';
const KEY_INTRO = 'hasSeenSettingsIntro';
const KEY_PILL_VISIBLE = 'mPlusPillVisible';

type Flags = Partial<Record<FeatureId, boolean>>;
interface State {
  loaded: boolean;
  flags: Flags;
  settingsOpen: boolean;
  fullSettingsOpen: boolean;
  settingsIntroOpen: boolean;
  hasSeenSettingsIntro: boolean;
  mPlusPillVisible: boolean;
}

let state: State = {
  loaded: false,
  flags: {},
  settingsOpen: false,
  fullSettingsOpen: false,
  settingsIntroOpen: false,
  hasSeenSettingsIntro: false,
  mPlusPillVisible: true
};
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const snapshot = () => state;

// Listen to browser forward/back buttons for /web/settings/messages-plus
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const isMpSettings = window.location.pathname.includes('/settings/messages-plus');
    if (isMpSettings && !state.fullSettingsOpen) {
      set({ fullSettingsOpen: true, settingsOpen: false });
    } else if (!isMpSettings && state.fullSettingsOpen) {
      set({ fullSettingsOpen: false });
    }
  });
}

// Load persisted flags and settings access preferences once at startup.
Promise.all([
  getSetting<Flags>(KEY, {}),
  getSetting<boolean>(KEY_INTRO, false),
  getSetting<boolean>(KEY_PILL_VISIBLE, true)
]).then(([flags, hasSeenIntro, pillVisible]) => {
  const isMpSettings = typeof window !== 'undefined' && window.location.pathname.includes('/settings/messages-plus');
  set({
    loaded: true,
    flags: flags || {},
    hasSeenSettingsIntro: Boolean(hasSeenIntro),
    mPlusPillVisible: pillVisible !== false,
    fullSettingsOpen: isMpSettings
  });
});

export const useStore = () => useSyncExternalStore(subscribe, snapshot);

/** Features default to ON until the user switches them off. */
export function useFeature(id: FeatureId): boolean {
  return useStore().flags[id] ?? true;
}

export function setFeature(id: FeatureId, on: boolean) {
  const flags = { ...state.flags, [id]: on };
  set({ flags });
  setSetting(KEY, flags);
}

export const openSettings = () => set({ settingsOpen: true, settingsIntroOpen: false, fullSettingsOpen: false });
export const closeSettings = () => set({ settingsOpen: false });

export const openFullSettings = () => {
  set({ fullSettingsOpen: true, settingsOpen: false, settingsIntroOpen: false });
  try {
    if (!window.location.pathname.includes('/settings/messages-plus')) {
      window.history.pushState({ mpSettings: true }, '', '/web/settings/messages-plus');
    }
  } catch {}
};

export const closeFullSettings = () => {
  set({ fullSettingsOpen: false });
  try {
    if (window.location.pathname.includes('/settings/messages-plus')) {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.history.pushState(null, '', '/web/conversations');
      }
    }
  } catch {}
};

export const openSettingsIntro = () => set({ settingsIntroOpen: true });
export const closeSettingsIntro = () => set({ settingsIntroOpen: false });

export async function completeSettingsIntro(keepPillVisible: boolean) {
  set({
    hasSeenSettingsIntro: true,
    mPlusPillVisible: keepPillVisible,
    settingsIntroOpen: false,
    settingsOpen: true
  });
  await setSetting(KEY_INTRO, true);
  await setSetting(KEY_PILL_VISIBLE, keepPillVisible);
}

export async function setMPlusPillVisible(visible: boolean) {
  set({ mPlusPillVisible: visible });
  await setSetting(KEY_PILL_VISIBLE, visible);
}
