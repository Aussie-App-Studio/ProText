import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ContactRecipient } from './pro/parser';

export interface CachedMessage {
  id: string;
  text: string;
  outgoing: boolean;
  time?: string;
}

export interface CachedThread {
  conversationId: string;
  name: string;
  updatedAt: number;
  messages: CachedMessage[];
}

export interface Bookmark {
  id: string;
  conversationId?: string;
  contactName?: string;
  text: string;
  outgoing: boolean;
  savedAt: number;
}

export interface LocalAlias {
  conversationId: string; // ID or normalized phone
  alias: string;
  updatedAt: number;
}

export interface LocalNote {
  conversationId: string;
  notes: string;
  updatedAt: number;
}

export interface SmartRule {
  id: string;
  field: 'message_contains' | 'sender_contains';
  value: string;
}

export interface SmartTab {
  id: string;
  name: string;
  isSystem?: boolean;
  rules: SmartRule[];
  order: number;
}

// Pro Tier: Campaign, Templates & Automation interfaces
export interface Campaign {
  id: string;
  name: string;
  templateId?: string;
  templateText: string;
  total: number;
  sent: number;
  failed: number;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  minDelay: number;
  maxDelay: number;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
}

export interface CampaignLog {
  id: string;
  campaignId: string;
  name: string;
  phone: string;
  vars?: Record<string, string>;
  text: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  timestamp: number;
}

export interface MessageTemplate {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

export interface AutoRule {
  id: string;
  name: string;
  keywords: string[];
  replyText: string;
  active: boolean;
  createdAt: number;
}

export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  contacts: ContactRecipient[];
  updatedAt: number;
}

export interface LocalFollowUp {
  conversationId: string;
  flagged: boolean;
  reminderLabel?: string;
  note?: string;
  updatedAt: number;
}

export interface StoredContact {
  phoneKey: string;
  phone: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  conversationId?: string;
  source?: 'manual' | 'planning-center' | 'csv' | 'google-contacts';
  notes?: string;
  updatedAt: number;
}

export interface ScheduledMessage {
  id: string;
  conversationId: string;
  contactName: string;
  text: string;
  scheduledFor: number;
  createdAt: number;
  status: 'scheduled' | 'sent' | 'cancelled';
}

export function toPhoneKey(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length > 9 ? digits.slice(-9) : digits;
}

export const DEFAULT_CONTACT_GROUPS: ContactGroup[] = [
  {
    id: 'grp-worship',
    name: 'Worship Team',
    description: 'Sunday service musicians and vocalists',
    contacts: [
      { id: 'c1', name: 'David Singer', phone: '+15551234567', vars: { Name: 'David', Role: 'Vocalist' } },
      { id: 'c2', name: 'Hannah Keys', phone: '+15552345678', vars: { Name: 'Hannah', Role: 'Keyboard' } },
      { id: 'c3', name: 'Marcus Drum', phone: '+15553456789', vars: { Name: 'Marcus', Role: 'Drums' } }
    ],
    updatedAt: Date.now()
  },
  {
    id: 'grp-volunteers',
    name: 'Sunday Volunteers',
    description: 'Greeters, ushers, and setup team',
    contacts: [
      { id: 'c4', name: 'Sarah Miller', phone: '+15554567890', vars: { Name: 'Sarah', Role: 'Greeter' } },
      { id: 'c5', name: 'John Peterson', phone: '+15555678901', vars: { Name: 'John', Role: 'Usher' } },
      { id: 'c6', name: 'Grace Chen', phone: '+15556789012', vars: { Name: 'Grace', Role: 'Setup' } }
    ],
    updatedAt: Date.now()
  },
  {
    id: 'grp-youth',
    name: 'Youth Ministry Leaders',
    description: 'Friday youth night team',
    contacts: [
      { id: 'c7', name: 'Caleb Evans', phone: '+15557890123', vars: { Name: 'Caleb', Role: 'Youth Leader' } },
      { id: 'c8', name: 'Rachel Adams', phone: '+15558901234', vars: { Name: 'Rachel', Role: 'Youth Leader' } }
    ],
    updatedAt: Date.now()
  }
];

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-1',
    title: 'Sunday Gathering Reminder',
    body: 'Hi {Name}, we look forward to seeing you this Sunday at 10:00 AM! Please let us know if you need anything or have any prayer requests.',
    updatedAt: Date.now()
  },
  {
    id: 'tpl-2',
    title: 'Volunteer & Serving Check-In',
    body: 'Hi {Name}, thank you so much for serving this week! Please let us know if you are still good to help or if you need someone to step in for you.',
    updatedAt: Date.now()
  },
  {
    id: 'tpl-3',
    title: 'Caring & Prayer Follow-Up',
    body: 'Hi {Name}, just checking in to see how you are doing this week. We are keeping you in our thoughts and prayers!',
    updatedAt: Date.now()
  }
];

export const DEFAULT_SMART_TABS: SmartTab[] = [
  { id: 'all', name: 'All', isSystem: true, rules: [], order: 0 },
  { id: 'unread', name: 'Unread', isSystem: true, rules: [], order: 1 },
  { id: 'needs_followup', name: '🚩 Follow-Up', isSystem: true, rules: [], order: 2 },
  {
    id: 'volunteers',
    name: 'Volunteers',
    rules: [
      { id: 'r1', field: 'message_contains', value: 'volunteer' },
      { id: 'r2', field: 'message_contains', value: 'roster' },
      { id: 'r3', field: 'message_contains', value: 'serve' },
      { id: 'r4', field: 'message_contains', value: 'team' }
    ],
    order: 4
  },
  {
    id: 'prayer',
    name: 'Prayer & Care',
    rules: [
      { id: 'r5', field: 'message_contains', value: 'pray' },
      { id: 'r6', field: 'message_contains', value: 'hospital' },
      { id: 'r7', field: 'message_contains', value: 'family' },
      { id: 'r8', field: 'message_contains', value: 'help' }
    ],
    order: 5
  },
  {
    id: 'reminders',
    name: 'Reminders & Codes',
    rules: [
      { id: 'r9', field: 'message_contains', value: 'reminder' },
      { id: 'r10', field: 'message_contains', value: 'code' },
      { id: 'r11', field: 'message_contains', value: 'verification' }
    ],
    order: 6
  }
];

interface MPSchema extends DBSchema {
  settings: { key: string; value: unknown };
  threads: { key: string; value: CachedThread };
  bookmarks: { key: string; value: Bookmark };
  aliases: { key: string; value: LocalAlias };
  notes: { key: string; value: LocalNote };
  smartTabs: { key: string; value: SmartTab };
  campaigns: { key: string; value: Campaign };
  campaignLogs: { key: string; value: CampaignLog; indexes: { byCampaignId: string } };
  templates: { key: string; value: MessageTemplate };
  autoRules: { key: string; value: AutoRule };
  contactGroups: { key: string; value: ContactGroup };
  followUps: { key: string; value: LocalFollowUp };
  contacts: { key: string; value: StoredContact };
  scheduledMessages: { key: string; value: ScheduledMessage };
}

const DB_NAME = 'messages-plus';
const DB_VERSION = 8;
let dbp: Promise<IDBPDatabase<MPSchema>> | null = null;

export function getDB() {
  return (dbp ??= openDB<MPSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('settings');
      }
      if (oldVersion < 2) {
        db.createObjectStore('threads', { keyPath: 'conversationId' });
        db.createObjectStore('bookmarks', { keyPath: 'id' });
      }
      if (oldVersion < 3) {
        db.createObjectStore('aliases', { keyPath: 'conversationId' });
        db.createObjectStore('notes', { keyPath: 'conversationId' });
        const tabsStore = db.createObjectStore('smartTabs', { keyPath: 'id' });
        for (const t of DEFAULT_SMART_TABS) {
          tabsStore.put(t);
        }
      }
      if (oldVersion < 4) {
        db.createObjectStore('campaigns', { keyPath: 'id' });
        const logsStore = db.createObjectStore('campaignLogs', { keyPath: 'id' });
        logsStore.createIndex('byCampaignId', 'campaignId');
        const tplStore = db.createObjectStore('templates', { keyPath: 'id' });
        for (const tpl of DEFAULT_TEMPLATES) {
          tplStore.put(tpl);
        }
        db.createObjectStore('autoRules', { keyPath: 'id' });
      }
      if (oldVersion < 5) {
        const grpStore = db.createObjectStore('contactGroups', { keyPath: 'id' });
        for (const grp of DEFAULT_CONTACT_GROUPS) {
          grpStore.put(grp);
        }
      }
      if (oldVersion < 6) {
        db.createObjectStore('followUps', { keyPath: 'conversationId' });
      }
      if (oldVersion < 7) {
        db.createObjectStore('contacts', { keyPath: 'phoneKey' });
      }
      if (oldVersion < 8) {
        db.createObjectStore('scheduledMessages', { keyPath: 'id' });
      }
    }
  }));
}

// Settings
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const v = await (await getDB()).get('settings', key);
  return (v === undefined ? fallback : v) as T;
}

export async function setSetting(key: string, value: unknown) {
  await (await getDB()).put('settings', value, key);
}

// Thread history caching (for Quick Peek)
export async function saveThreadHistory(conversationId: string, name: string, messages: CachedMessage[]) {
  if (!conversationId) return;
  const db = await getDB();
  await db.put('threads', {
    conversationId,
    name,
    updatedAt: Date.now(),
    messages: messages.slice(-20)
  });
}

export async function getThreadHistory(conversationId: string): Promise<CachedThread | undefined> {
  if (!conversationId) return undefined;
  const db = await getDB();
  return db.get('threads', conversationId);
}

// Bookmarks
export async function saveBookmark(b: Bookmark) {
  const db = await getDB();
  await db.put('bookmarks', b);
}

export async function removeBookmark(id: string) {
  const db = await getDB();
  await db.delete('bookmarks', id);
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const db = await getDB();
  return db.getAll('bookmarks');
}

export async function isBookmarked(id: string): Promise<boolean> {
  const db = await getDB();
  const res = await db.get('bookmarks', id);
  return !!res;
}

// CRM Aliases
export async function saveAlias(conversationId: string, alias: string) {
  const db = await getDB();
  if (!alias.trim()) {
    await db.delete('aliases', conversationId);
  } else {
    await db.put('aliases', {
      conversationId,
      alias: alias.trim(),
      updatedAt: Date.now()
    });
  }
}

export async function getAlias(conversationId: string): Promise<string | undefined> {
  const db = await getDB();
  const rec = await db.get('aliases', conversationId);
  return rec?.alias;
}

export async function getAllAliases(): Promise<Record<string, string>> {
  const db = await getDB();
  const list = await db.getAll('aliases');
  const map: Record<string, string> = {};
  list.forEach(a => {
    map[a.conversationId] = a.alias;
  });
  return map;
}

// CRM Notes
export async function saveNote(conversationId: string, notes: string) {
  const db = await getDB();
  await db.put('notes', {
    conversationId,
    notes,
    updatedAt: Date.now()
  });
}

export async function getNote(conversationId: string): Promise<string> {
  const db = await getDB();
  const rec = await db.get('notes', conversationId);
  return rec?.notes || '';
}

// Smart Tabs
export async function getSmartTabs(): Promise<SmartTab[]> {
  const db = await getDB();
  const tabs = await db.getAll('smartTabs');
  if (!tabs || tabs.length === 0) {
    for (const t of DEFAULT_SMART_TABS) {
      await db.put('smartTabs', t);
    }
    return DEFAULT_SMART_TABS;
  }
  // Ensure needs_followup system tab exists for existing users
  if (!tabs.some(t => t.id === 'needs_followup')) {
    const followUpTab: SmartTab = { id: 'needs_followup', name: '🚩 Follow-Up', isSystem: true, rules: [], order: 2 };
    await db.put('smartTabs', followUpTab);
    tabs.push(followUpTab);
  }
  return tabs.sort((a, b) => a.order - b.order);
}

export async function saveSmartTab(tab: SmartTab) {
  const db = await getDB();
  await db.put('smartTabs', tab);
}

export async function deleteSmartTab(id: string) {
  const db = await getDB();
  await db.delete('smartTabs', id);
}

// Campaigns CRUD
export async function getCampaigns(): Promise<Campaign[]> {
  const db = await getDB();
  const list = await db.getAll('campaigns');
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getCampaign(id: string): Promise<Campaign | undefined> {
  const db = await getDB();
  return db.get('campaigns', id);
}

export async function saveCampaign(campaign: Campaign) {
  const db = await getDB();
  await db.put('campaigns', campaign);
}

export async function deleteCampaign(id: string) {
  const db = await getDB();
  await db.delete('campaigns', id);
  // Also clean up logs for this campaign
  const tx = db.transaction('campaignLogs', 'readwrite');
  const index = tx.store.index('byCampaignId');
  let cursor = await index.openCursor(id);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// Campaign Logs CRUD
export async function getCampaignLogs(campaignId: string): Promise<CampaignLog[]> {
  const db = await getDB();
  const logs = await db.getAllFromIndex('campaignLogs', 'byCampaignId', campaignId);
  return logs.sort((a, b) => a.timestamp - b.timestamp);
}

export async function saveCampaignLog(log: CampaignLog) {
  const db = await getDB();
  await db.put('campaignLogs', log);
}

// Templates CRUD
export async function getTemplates(): Promise<MessageTemplate[]> {
  const db = await getDB();
  const list = await db.getAll('templates');
  if (!list || list.length === 0) {
    for (const t of DEFAULT_TEMPLATES) {
      await db.put('templates', t);
    }
    return DEFAULT_TEMPLATES;
  }
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveTemplate(tpl: MessageTemplate) {
  const db = await getDB();
  await db.put('templates', tpl);
}

export async function deleteTemplate(id: string) {
  const db = await getDB();
  await db.delete('templates', id);
}

// Auto-Responder Rules CRUD
export async function getAutoRules(): Promise<AutoRule[]> {
  const db = await getDB();
  return db.getAll('autoRules');
}

export async function saveAutoRule(rule: AutoRule) {
  const db = await getDB();
  await db.put('autoRules', rule);
}

export async function deleteAutoRule(id: string) {
  const db = await getDB();
  await db.delete('autoRules', id);
}

// Contact Groups CRUD
export async function getContactGroups(): Promise<ContactGroup[]> {
  const db = await getDB();
  const list = await db.getAll('contactGroups');
  if (!list || list.length === 0) {
    for (const g of DEFAULT_CONTACT_GROUPS) {
      await db.put('contactGroups', g);
    }
    return DEFAULT_CONTACT_GROUPS;
  }
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveContactGroup(group: ContactGroup) {
  const db = await getDB();
  await db.put('contactGroups', group);
}

export async function deleteContactGroup(id: string) {
  const db = await getDB();
  await db.delete('contactGroups', id);
}

// Follow-Up Flags CRUD
export async function getFollowUps(): Promise<Record<string, LocalFollowUp>> {
  const db = await getDB();
  const list = await db.getAll('followUps');
  const map: Record<string, LocalFollowUp> = {};
  list.forEach(f => {
    if (f.flagged) map[f.conversationId] = f;
  });
  return map;
}

export async function getFollowUp(conversationId: string): Promise<LocalFollowUp | undefined> {
  const db = await getDB();
  return db.get('followUps', conversationId);
}

export async function saveFollowUp(followUp: LocalFollowUp) {
  const db = await getDB();
  await db.put('followUps', followUp);
}

export async function toggleFollowUp(
  conversationId: string,
  reminderLabel?: string,
  note?: string
): Promise<LocalFollowUp> {
  const db = await getDB();
  const existing = await db.get('followUps', conversationId);
  const flagged = existing ? !existing.flagged : true;
  const updated: LocalFollowUp = {
    conversationId,
    flagged,
    reminderLabel: reminderLabel ?? existing?.reminderLabel,
    note: note ?? existing?.note,
    updatedAt: Date.now()
  };
  await db.put('followUps', updated);
  return updated;
}

// Contact Directory CRUD
export async function saveStoredContact(
  contact: Omit<StoredContact, 'phoneKey' | 'updatedAt'> & { phoneKey?: string; updatedAt?: number }
) {
  const db = await getDB();
  const phoneKey = contact.phoneKey || toPhoneKey(contact.phone);
  if (!phoneKey) return null;
  const stored: StoredContact = {
    ...contact,
    phoneKey,
    updatedAt: contact.updatedAt || Date.now()
  };
  await db.put('contacts', stored);
  return stored;
}

export async function getStoredContact(rawPhone: string): Promise<StoredContact | undefined> {
  const key = toPhoneKey(rawPhone);
  if (!key) return undefined;
  const db = await getDB();
  return db.get('contacts', key);
}

export async function getAllStoredContacts(): Promise<Record<string, StoredContact>> {
  const db = await getDB();
  const list = await db.getAll('contacts');
  const map: Record<string, StoredContact> = {};
  for (const c of list) {
    map[c.phoneKey] = c;
  }
  return map;
}

export async function deleteStoredContact(rawPhone: string) {
  const key = toPhoneKey(rawPhone);
  if (!key) return;
  const db = await getDB();
  await db.delete('contacts', key);
}

// Scheduled Messages CRUD
export async function getScheduledMessages(): Promise<ScheduledMessage[]> {
  const db = await getDB();
  const list = await db.getAll('scheduledMessages');
  return list
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => a.scheduledFor - b.scheduledFor);
}

export async function saveScheduledMessage(msg: ScheduledMessage): Promise<ScheduledMessage> {
  const db = await getDB();
  await db.put('scheduledMessages', msg);
  return msg;
}

export async function deleteScheduledMessage(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('scheduledMessages', id);
}

export async function importStoredContacts(
  newContacts: Array<{ name: string; phone: string; email?: string; source?: string }>
): Promise<number> {
  const db = await getDB();
  let count = 0;
  for (const c of newContacts) {
    const phoneKey = toPhoneKey(c.phone);
    if (!phoneKey || !c.name.trim()) continue;
    const existing = await db.get('contacts', phoneKey);
    const firstName = c.name.split(/\s+/)[0] || '';
    const lastName = c.name.split(/\s+/).slice(1).join(' ');
    await db.put('contacts', {
      phoneKey,
      phone: c.phone,
      name: c.name.trim(),
      firstName: firstName || existing?.firstName,
      lastName: lastName || existing?.lastName,
      email: c.email || existing?.email,
      source: (c.source as any) || existing?.source || 'planning-center',
      updatedAt: Date.now()
    });
    count++;
  }
  return count;
}

// Data Backup & Restore
export interface MessagesPlusBackup {
  app: 'Messages+' | 'ProText';
  version: number;
  exportedAt: number;
  data: {
    settings?: Array<{ key: string; value: unknown }>;
    aliases?: LocalAlias[];
    notes?: LocalNote[];
    followUps?: LocalFollowUp[];
    bookmarks?: Bookmark[];
    templates?: MessageTemplate[];
    contactGroups?: ContactGroup[];
    smartTabs?: SmartTab[];
    autoRules?: AutoRule[];
    contacts?: StoredContact[];
  };
}

export async function exportAllData(): Promise<MessagesPlusBackup> {
  const db = await getDB();
  const settingsKeys = await db.getAllKeys('settings');
  const settingsList: Array<{ key: string; value: unknown }> = [];
  for (const k of settingsKeys) {
    const val = await db.get('settings', k);
    settingsList.push({ key: String(k), value: val });
  }

  const aliases = await db.getAll('aliases');
  const notes = await db.getAll('notes');
  const followUps = await db.getAll('followUps');
  const bookmarks = await db.getAll('bookmarks');
  const templates = await db.getAll('templates');
  const contactGroups = await db.getAll('contactGroups');
  const smartTabs = await db.getAll('smartTabs');
  const autoRules = await db.getAll('autoRules');
  const contacts = await db.getAll('contacts');

  return {
    app: 'ProText',
    version: 1,
    exportedAt: Date.now(),
    data: {
      settings: settingsList,
      aliases,
      notes,
      followUps,
      bookmarks,
      templates,
      contactGroups,
      smartTabs,
      autoRules,
      contacts
    }
  };
}

export async function importAllData(backup: MessagesPlusBackup): Promise<{
  counts: Record<string, number>;
}> {
  const db = await getDB();
  const counts: Record<string, number> = {};

  if (backup.data.settings && Array.isArray(backup.data.settings)) {
    for (const item of backup.data.settings) {
      await db.put('settings', item.value, item.key as any);
    }
    counts.settings = backup.data.settings.length;
  }
  if (backup.data.aliases && Array.isArray(backup.data.aliases)) {
    for (const a of backup.data.aliases) await db.put('aliases', a);
    counts.aliases = backup.data.aliases.length;
  }
  if (backup.data.notes && Array.isArray(backup.data.notes)) {
    for (const n of backup.data.notes) await db.put('notes', n);
    counts.notes = backup.data.notes.length;
  }
  if (backup.data.followUps && Array.isArray(backup.data.followUps)) {
    for (const f of backup.data.followUps) await db.put('followUps', f);
    counts.followUps = backup.data.followUps.length;
  }
  if (backup.data.bookmarks && Array.isArray(backup.data.bookmarks)) {
    for (const b of backup.data.bookmarks) await db.put('bookmarks', b);
    counts.bookmarks = backup.data.bookmarks.length;
  }
  if (backup.data.templates && Array.isArray(backup.data.templates)) {
    for (const t of backup.data.templates) await db.put('templates', t);
    counts.templates = backup.data.templates.length;
  }
  if (backup.data.contactGroups && Array.isArray(backup.data.contactGroups)) {
    for (const g of backup.data.contactGroups) await db.put('contactGroups', g);
    counts.contactGroups = backup.data.contactGroups.length;
  }
  if (backup.data.smartTabs && Array.isArray(backup.data.smartTabs)) {
    for (const st of backup.data.smartTabs) await db.put('smartTabs', st);
    counts.smartTabs = backup.data.smartTabs.length;
  }
  if (backup.data.autoRules && Array.isArray(backup.data.autoRules)) {
    for (const ar of backup.data.autoRules) await db.put('autoRules', ar);
    counts.autoRules = backup.data.autoRules.length;
  }
  if (backup.data.contacts && Array.isArray(backup.data.contacts)) {
    for (const c of backup.data.contacts) await db.put('contacts', c);
    counts.contacts = backup.data.contacts.length;
  }

  return { counts };
}
