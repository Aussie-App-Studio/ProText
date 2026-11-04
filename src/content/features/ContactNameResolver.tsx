import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Slot } from '../Slot';
import { useActiveConversationId, watchSidebar } from '../engine';
import { SEL } from '../selectors';
import {
  getAllStoredContacts,
  saveStoredContact,
  toPhoneKey,
  type StoredContact
} from '../db';
import { looksLikePhone } from '../pro/parser';
import { EditIcon, ContactsIcon } from '../ui/MaterialIcons';

// Reactive in-memory contacts directory cache
let contactsCache: Record<string, StoredContact> = {};
let contactsLoaded = false;
const listeners = new Set<() => void>();

function notifyContacts() {
  listeners.forEach(l => l());
}

export async function reloadContacts(): Promise<Record<string, StoredContact>> {
  contactsCache = await getAllStoredContacts();
  contactsLoaded = true;
  notifyContacts();
  return contactsCache;
}

reloadContacts();

const subscribeContacts = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getContactsSnapshot = () => contactsCache;

export function useContactsDirectory() {
  const contacts = useSyncExternalStore(subscribeContacts, getContactsSnapshot);

  const lookup = (rawPhone: string): StoredContact | undefined => {
    const key = toPhoneKey(rawPhone);
    if (!key) return undefined;
    return contacts[key];
  };

  const save = async (contact: { phone: string; name: string; email?: string; notes?: string }) => {
    const res = await saveStoredContact({
      ...contact,
      source: 'manual'
    });
    await reloadContacts();
    return res;
  };

  return { contacts, loaded: contactsLoaded, lookup, save, reload: reloadContacts };
}

/** Opens Google Contacts new contact page with prefilled parameters */
export function openGoogleContactsPrefill(name: string, phone: string, email?: string) {
  const params = new URLSearchParams();
  if (name) params.set('name', name.trim());
  if (phone) params.set('phone', phone.trim());
  if (email) params.set('email', email.trim());
  window.open(`https://contacts.google.com/new?${params.toString()}`, '_blank');
}

/** Header Name Editor and Google Contacts shortcut */
export function HeaderNameEditor() {
  const convId = useActiveConversationId();
  const { lookup, save } = useContactsDirectory();
  const [isOpen, setIsOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Get current header title text from Google's DOM (target inner h2 so Angular's DOM bindings stay intact)
  const headerEl = document.querySelector(`${SEL.headerTitle} h2`) || document.querySelector(SEL.headerTitle);
  const currentTitle = headerEl?.getAttribute('data-mp-original-name') || headerEl?.textContent?.trim() || '';
  const isPhone = looksLikePhone(currentTitle);
  const matchedContact = isPhone ? lookup(currentTitle) : undefined;

  // Synchronize header text with contact name if known
  useEffect(() => {
    if (!headerEl) return;
    if (matchedContact) {
      if (!headerEl.hasAttribute('data-mp-original-name')) {
        headerEl.setAttribute('data-mp-original-name', currentTitle);
      }
      if (headerEl.textContent !== matchedContact.name) {
        headerEl.textContent = matchedContact.name;
      }
    } else {
      const orig = headerEl.getAttribute('data-mp-original-name');
      if (orig && headerEl.textContent !== orig) {
        headerEl.textContent = orig;
        headerEl.removeAttribute('data-mp-original-name');
      }
    }
  }, [headerEl, matchedContact, currentTitle]);

  useEffect(() => {
    if (matchedContact) {
      setNameInput(matchedContact.name);
      setEmailInput(matchedContact.email || '');
    } else {
      setNameInput('');
      setEmailInput('');
    }
  }, [matchedContact]);

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const path = e.composedPath ? e.composedPath() : [];
      if (popoverRef.current && !path.includes(popoverRef.current) && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  if (!convId || (!isPhone && !matchedContact)) return null;

  const phoneToSave = matchedContact?.phone || currentTitle;

  const handleSaveLocal = async () => {
    if (!nameInput.trim()) return;
    await save({
      phone: phoneToSave,
      name: nameInput.trim(),
      email: emailInput.trim()
    });
    setIsOpen(false);
  };

  const handleSaveAndSyncGoogle = async () => {
    if (nameInput.trim()) {
      await save({
        phone: phoneToSave,
        name: nameInput.trim(),
        email: emailInput.trim()
      });
    }
    openGoogleContactsPrefill(nameInput || matchedContact?.name || '', phoneToSave, emailInput);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-flex items-center font-sans" ref={popoverRef}>
      {/* Compact Material Icon Buttons */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setIsOpen(v => !v)}
          className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-full text-[#9aa0a6] hover:bg-white/[0.08] hover:text-[#e8eaed] transition-colors"
          title={matchedContact ? `Edit contact name for ${phoneToSave}` : `Set name for ${phoneToSave}`}
        >
          <EditIcon size={14} />
          <span className="sr-only">{matchedContact ? 'Name' : 'Set Name'}</span>
        </button>

        <button
          type="button"
          onClick={() => openGoogleContactsPrefill(matchedContact?.name || '', phoneToSave, matchedContact?.email)}
          className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-full text-[#9aa0a6] hover:bg-white/[0.08] hover:text-[#a8c7fa] transition-colors"
          title="Save or open in Google Contacts"
          aria-label="Google Contacts"
        >
          <ContactsIcon size={15} />
          <span className="sr-only">Google Contacts</span>
        </button>
      </div>

      {/* Inline Name Editor Popover */}
      {isOpen && (
        <div
          onMouseDown={e => e.stopPropagation()}
          className="absolute top-7 left-0 z-[2147483645] w-72 rounded-xl border border-white/15 bg-[#1e2025] p-3 shadow-[0_12px_36px_rgba(0,0,0,0.7)] ring-1 ring-white/10 backdrop-blur-md text-xs text-gray-200"
        >
          <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2.5">
            <span className="font-semibold text-white flex items-center gap-1 text-xs">
              <span>👤</span>
              <span>{matchedContact ? 'Edit Contact' : 'Identify Person'}</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="cursor-pointer text-gray-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveLocal()}
                placeholder="e.g. Sarah Miller, Pastor John"
                autoFocus
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                Phone Number
              </label>
              <div className="font-mono text-gray-300 bg-gray-900/60 rounded-lg px-2.5 py-1 border border-gray-800 text-[11px]">
                {phoneToSave}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="e.g. sarah@example.com"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-800 gap-1.5">
              <button
                type="button"
                onClick={handleSaveAndSyncGoogle}
                className="cursor-pointer rounded-lg bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 px-2 py-1 text-[11px] font-semibold text-blue-300 transition-colors flex items-center gap-1"
                title="Saves locally and opens prefilled in Google Contacts"
              >
                <span>🌐</span>
                <span>Sync Google</span>
              </button>

              <button
                type="button"
                onClick={handleSaveLocal}
                disabled={!nameInput.trim()}
                className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 shadow"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Sidebar enhancer: replaces raw phone numbers with real names in conversation list */
function SidebarNameResolver() {
  const { lookup, contacts } = useContactsDirectory();

  useEffect(() => {
    const hasContacts = Object.keys(contacts).length > 0;

    const unwatch = watchSidebar((sidebar, items) => {
      if (!hasContacts && !sidebar.querySelector('[data-mp-original-phone]')) return;
      items.forEach(item => {
        const nameSpan = item.querySelector<HTMLElement>('[data-e2e-conversation-name]');
        if (!nameSpan) return;

        const currentText = nameSpan.textContent?.trim() || '';
        const originalPhone = nameSpan.getAttribute('data-mp-original-phone');

        // Check if currently displaying a phone number or previously identified
        const textToCheck = originalPhone || currentText;

        if (looksLikePhone(textToCheck)) {
          const contact = lookup(textToCheck);
          if (contact) {
            if (!originalPhone) {
              nameSpan.setAttribute('data-mp-original-phone', currentText);
            }
            if (nameSpan.textContent !== contact.name) {
              nameSpan.textContent = contact.name;
            }

            // Ensure sub-phone label exists so user still sees the number
            let subPhone = item.querySelector<HTMLElement>('.mp-contact-subphone');
            if (!subPhone) {
              subPhone = document.createElement('span');
              subPhone.className = 'mp-contact-subphone';
              subPhone.style.cssText =
                'display: block; font-size: 10px; color: #9ca3af; font-family: monospace; font-weight: normal; line-height: 1.2;';
              nameSpan.after(subPhone);
            }
            if (subPhone.textContent !== textToCheck) {
              subPhone.textContent = textToCheck;
            }
          } else if (originalPhone) {
            // Revert if removed
            nameSpan.textContent = originalPhone;
            nameSpan.removeAttribute('data-mp-original-phone');
            item.querySelector('.mp-contact-subphone')?.remove();
          }
        }
      });
    });

    return () => {
      unwatch();
      document.querySelectorAll('[data-mp-original-phone]').forEach(el => {
        const orig = el.getAttribute('data-mp-original-phone');
        if (orig) el.textContent = orig;
        el.removeAttribute('data-mp-original-phone');
      });
      document.querySelectorAll('.mp-contact-subphone').forEach(el => el.remove());
    };
  }, [contacts, lookup]);

  return null;
}

export function ContactNameResolverFeature() {
  return <SidebarNameResolver />;
}
