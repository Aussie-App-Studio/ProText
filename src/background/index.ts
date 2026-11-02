// ProText Background Service Worker
// Fully compatible with Google Chrome, Microsoft Edge, Brave, and Chromium browsers.

const SCHEDULED_STORAGE_KEY = 'scheduled_messages';

interface ScheduledMessage {
  id: string;
  conversationId: string;
  contactName: string;
  text: string;
  scheduledFor: number;
  createdAt: number;
  status: 'scheduled' | 'sending' | 'delayed' | 'sent' | 'cancelled';
  lastAttemptAt?: number;
  delayReason?: string;
}

/**
 * Synchronizes browser alarms (chrome.alarms) with all active scheduled messages.
 * Runs on service worker boot, storage updates, and browser startup.
 */
async function syncAlarmsFromStorage(): Promise<void> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local || !chrome.alarms) return;

    const data = await chrome.storage.local.get(SCHEDULED_STORAGE_KEY);
    const list: ScheduledMessage[] = Array.isArray(data[SCHEDULED_STORAGE_KEY]) ? data[SCHEDULED_STORAGE_KEY] : [];
    const activeMessages = list.filter(m => m.status === 'scheduled' || m.status === 'delayed');

    const existingAlarms = await chrome.alarms.getAll();
    const activeIds = new Set(activeMessages.map(m => m.id));

    // Clear stale alarms that are no longer pending
    for (const alarm of existingAlarms) {
      if (!activeIds.has(alarm.name)) {
        await chrome.alarms.clear(alarm.name);
      }
    }

    // Schedule an alarm for each pending message
    for (const msg of activeMessages) {
      // chrome.alarms accepts a future timestamp (in ms).
      // If the time has already passed or is within 500ms, fire almost immediately.
      const when = Math.max(Date.now() + 500, msg.scheduledFor);
      chrome.alarms.create(msg.id, { when });
    }
  } catch (err) {
    console.warn('[ProText ServiceWorker] syncAlarmsFromStorage error:', err);
  }
}

// Fired when a scheduled alarm triggers
if (typeof chrome !== 'undefined' && chrome.alarms) {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    try {
      const data = await chrome.storage.local.get(SCHEDULED_STORAGE_KEY);
      const list: ScheduledMessage[] = Array.isArray(data[SCHEDULED_STORAGE_KEY]) ? data[SCHEDULED_STORAGE_KEY] : [];
      const msg = list.find(m => m.id === alarm.name);

      if (!msg || (msg.status !== 'scheduled' && msg.status !== 'delayed')) {
        return;
      }

      // Check for an active Google Messages tab
      const tabs = await chrome.tabs.query({ url: '*://messages.google.com/web/*' });

      if (tabs && tabs.length > 0) {
        // Send dispatch command to the active tab (or the first open Google Messages tab)
        const targetTab = tabs.find(t => t.active) || tabs[0];
        if (targetTab.id) {
          chrome.tabs.sendMessage(targetTab.id, {
            type: 'PROTEXT_DISPATCH_SCHEDULED',
            messageId: msg.id
          }).catch((err) => {
            console.warn('[ProText ServiceWorker] Could not message tab:', err);
          });
        }
      } else {
        // No Google Messages tab is currently open.
        // Surface a system desktop notification so the user can open Messages and dispatch.
        try {
          if (typeof chrome.notifications !== 'undefined' && chrome.notifications?.create) {
            chrome.notifications.create(`sched-${msg.id}`, {
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: `Scheduled Text Ready: ${msg.contactName}`,
              message: `"${msg.text.length > 60 ? msg.text.slice(0, 57) + '...' : msg.text}"\nClick to open Google Messages & send.`,
              priority: 2,
              requireInteraction: true
            });
          }
        } catch (notifErr) {
          // In Brave or restrictive privacy profiles, notifications might be blocked.
          console.warn('[ProText ServiceWorker] Desktop notification not available:', notifErr);
        }
      }
    } catch (err) {
      console.error('[ProText ServiceWorker] onAlarm error:', err);
    }
  });
}

// Clicking the desktop notification opens or focuses Google Messages
if (typeof chrome !== 'undefined' && chrome.notifications) {
  chrome.notifications.onClicked?.addListener(async (notificationId) => {
    try {
      if (notificationId.startsWith('sched-')) {
        chrome.notifications.clear(notificationId);
        const tabs = await chrome.tabs.query({ url: '*://messages.google.com/web/*' });
        if (tabs && tabs.length > 0 && tabs[0].id) {
          await chrome.tabs.update(tabs[0].id, { active: true });
          if (tabs[0].windowId && chrome.windows) {
            await chrome.windows.update(tabs[0].windowId, { focused: true });
          }
        } else {
          await chrome.tabs.create({ url: 'https://messages.google.com/web' });
        }
      }
    } catch (err) {
      console.warn('[ProText ServiceWorker] Notification click error:', err);
    }
  });
}

// React to storage changes automatically
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[SCHEDULED_STORAGE_KEY]) {
      void syncAlarmsFromStorage();
    }
  });
}

// Handle requests from content scripts
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'SCHEDULE_SYNC_ALARMS') {
      void syncAlarmsFromStorage().then(() => sendResponse?.({ ok: true }));
      return true;
    }
  });
}

// Bootstrapping hooks
chrome.runtime?.onInstalled?.addListener((details) => {
  console.log('[ProText ServiceWorker] Installed / updated:', details?.reason);
  if (details?.reason === 'install') {
    try {
      chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
    } catch (err) {
      console.warn('[ProText ServiceWorker] Could not open welcome tab:', err);
    }
  }
  void syncAlarmsFromStorage();
});

chrome.runtime?.onStartup?.addListener(() => {
  console.log('[ProText ServiceWorker] Browser startup');
  void syncAlarmsFromStorage();
});

// Clicking the extension icon in the Chrome toolbar focuses or opens Google Messages
if (typeof chrome !== 'undefined' && chrome.action?.onClicked) {
  chrome.action.onClicked.addListener(async () => {
    try {
      const tabs = await chrome.tabs.query({ url: '*://messages.google.com/web*' });
      if (tabs && tabs.length > 0 && tabs[0].id) {
        await chrome.tabs.update(tabs[0].id, { active: true });
        if (tabs[0].windowId && chrome.windows) {
          await chrome.windows.update(tabs[0].windowId, { focused: true });
        }
      } else {
        await chrome.tabs.create({ url: 'https://messages.google.com/web' });
      }
    } catch (err) {
      console.warn('[ProText ServiceWorker] Action click error:', err);
    }
  });
}
