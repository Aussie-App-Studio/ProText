import { useEffect, useMemo, useRef, useState } from 'react';
import { useFeature, openSettings, PROTEXT_FEEDBACK_URL } from '../settings/store';
import { openProWorkspace } from '../pro/ProWorkspace';
import { usePrivacyShield } from './PrivacyShield';
import { getAllStoredContacts, type StoredContact } from '../db';
import { setActiveTab } from './SmartTabs';
import { useThemeMode } from './ThemeEngine';

interface ConversationItem {
  id: string;
  name: string;
  subPhone?: string;
  snippet?: string;
  href: string;
  unread: boolean;
}

interface PaletteItem {
  type: 'conversation' | 'contact' | 'tab' | 'action';
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  icon: string;
  action: () => void;
}

export function QuickSwitcher() {
  const enabled = useFeature('quickSwitcher');
  const themeMode = useThemeMode();
  const isLight = themeMode === 'light';
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [storedContacts, setStoredContacts] = useState<StoredContact[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { toggleShield } = usePrivacyShield();

  // Load stored contacts when palette opens
  useEffect(() => {
    if (isOpen) {
      getAllStoredContacts()
        .then(dict => setStoredContacts(Object.values(dict)))
        .catch(() => {});
    }
  }, [isOpen]);

  // Global Ctrl + K / Cmd + K listener
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K or Cmd + K (or Ctrl + /)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK' || e.key === '/')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, isOpen]);

  // Focus input on open & reset selection
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const focusInput = () => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      };
      requestAnimationFrame(focusInput);
      const t1 = setTimeout(focusInput, 30);
      const t2 = setTimeout(focusInput, 100);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen]);

  // Gather live conversation items from the DOM
  const domConversations = useMemo<ConversationItem[]>(() => {
    if (!isOpen) return [];
    const elements = Array.from(document.querySelectorAll('mws-conversation-list-item'));
    return elements.map(item => {
      const link = item.querySelector('a');
      const nameEl = item.querySelector('[data-e2e-conversation-name]');
      const subPhoneEl = item.querySelector('.mp-contact-subphone');
      const snippetEl = item.querySelector('[data-e2e-conversation-snippet]');
      const href = link ? link.getAttribute('href') || '' : '';
      const isUnread = link ? link.getAttribute('data-e2e-is-unread') === 'true' : false;

      return {
        id: href || Math.random().toString(),
        name: nameEl?.textContent?.trim() || 'Unknown',
        subPhone: subPhoneEl?.textContent?.trim() || undefined,
        snippet: snippetEl?.textContent?.trim() || undefined,
        href,
        unread: isUnread
      };
    }).filter(c => !!c.href);
  }, [isOpen]);

  // Build searchable items
  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const result: PaletteItem[] = [];

    // 1. Conversations from DOM
    for (const c of domConversations) {
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = c.subPhone ? c.subPhone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) : false;
      const matchSnippet = c.snippet ? c.snippet.toLowerCase().includes(q) : false;

      if (!q || matchName || matchPhone || matchSnippet) {
        result.push({
          type: 'conversation',
          id: c.href,
          title: c.name,
          subtitle: c.subPhone ? `${c.subPhone} • ${c.snippet || ''}` : c.snippet,
          badge: c.unread ? 'Unread' : undefined,
          icon: '💬',
          action: () => {
            const link = document.querySelector(`mws-conversation-list-item a[href="${c.href}"]`) as HTMLElement;
            if (link) {
              link.click();
            } else {
              window.location.href = c.href;
            }
            setIsOpen(false);
          }
        });
      }
    }

    // 2. Directory contacts (if not already listed in DOM conversations)
    if (q) {
      const existingHrefs = new Set(domConversations.map(c => c.name.toLowerCase()));
      for (const sc of storedContacts) {
        if (existingHrefs.has(sc.name.toLowerCase())) continue;
        const matchName = sc.name.toLowerCase().includes(q);
        const matchPhone = sc.phone ? sc.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) : false;

        if (matchName || matchPhone) {
          result.push({
            type: 'contact',
            id: `contact-${sc.phoneKey}`,
            title: sc.name,
            subtitle: sc.phone + (sc.email ? ` • ${sc.email}` : '') + (sc.source ? ` (${sc.source})` : ''),
            badge: 'Directory',
            icon: '👤',
            action: () => {
              // Try to find in sidebar or open start chat
              const found = domConversations.find(d => 
                d.subPhone?.replace(/\s+/g, '').includes(sc.phone.replace(/\s+/g, '')) ||
                d.name.toLowerCase() === sc.name.toLowerCase()
              );
              if (found) {
                const link = document.querySelector(`mws-conversation-list-item a[href="${found.href}"]`) as HTMLElement;
                link?.click();
              } else {
                // Open start chat button and prefill phone
                const startBtn = document.querySelector('a[data-e2e-start-button]') as HTMLElement;
                startBtn?.click();
                setTimeout(() => {
                  const inp = document.querySelector<HTMLInputElement>('input[data-e2e-contact-input], input[placeholder*="phone" i]');
                  if (inp && sc.phone) {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                    if (setter) setter.call(inp, sc.phone);
                    else inp.value = sc.phone;
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                    setTimeout(() => {
                      const sendTo = document.querySelector<HTMLElement>('button[data-e2e-send-to-button], mw-contact-selector-button button, [data-e2e-contact-row]');
                      sendTo?.click();
                    }, 500);
                  }
                }, 400);
              }
              setIsOpen(false);
            }
          });
        }
      }
    }

    // 3. Smart Folder Tabs
    const tabs: Array<{ id: string; name: string; icon: string }> = [
      { id: 'all', name: 'All Conversations', icon: '📥' },
      { id: 'unread', name: 'Unread Messages', icon: '📬' },
      { id: 'needs_followup', name: 'Follow-Up', icon: '🚩' },
      { id: 'volunteers', name: 'Volunteers Folder', icon: '🤝' },
      { id: 'reminders', name: 'Reminders Folder', icon: '⏰' }
    ];

    for (const t of tabs) {
      if (!q || t.name.toLowerCase().includes(q)) {
        result.push({
          type: 'tab',
          id: `tab-${t.id}`,
          title: t.name,
          subtitle: `Jump to folder`,
          badge: 'Folder',
          icon: t.icon,
          action: () => {
            setActiveTab(t.id);
            setIsOpen(false);
          }
        });
      }
    }

    // 4. Quick Actions
    const actions: PaletteItem[] = [
      {
        type: 'action',
        id: 'action-pro',
        title: 'Group Texting & Announcements',
        subtitle: 'Send personalized group texts or view templates',
        badge: 'Tool',
        icon: '📢',
        action: () => {
          openProWorkspace();
          setIsOpen(false);
        }
      },
      {
        type: 'action',
        id: 'action-privacy',
        title: 'Toggle Privacy Shield',
        subtitle: 'Blur chat messages and conversation previews (Alt + P)',
        badge: 'Privacy',
        icon: '🛡️',
        action: () => {
          toggleShield(true);
          setIsOpen(false);
        }
      },
      {
        type: 'action',
        id: 'action-settings',
        title: 'ProText Settings',
        subtitle: 'Themes, emojis, data backup, and preferences',
        badge: 'Settings',
        icon: '⚙️',
        action: () => {
          openSettings();
          setIsOpen(false);
        }
      },
      {
        type: 'action',
        id: 'action-feedback',
        title: 'Feedback & Bug Report',
        subtitle: 'Share feedback, suggest features, or report issues',
        badge: 'Support',
        icon: '💡',
        action: () => {
          window.open(PROTEXT_FEEDBACK_URL, '_blank');
          setIsOpen(false);
        }
      }
    ];

    for (const a of actions) {
      if (!q || a.title.toLowerCase().includes(q) || (a.subtitle && a.subtitle.toLowerCase().includes(q))) {
        result.push(a);
      }
    }

    return result;
  }, [query, domConversations, storedContacts, toggleShield]);

  // Adjust selection if items length changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard navigation inside palette
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(idx => (idx + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(idx => (idx - 1 + Math.max(1, items.length)) % Math.max(1, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  if (!enabled || !isOpen) return null;

  return (
    <div
      data-testid="quick-switcher-modal"
      className="fixed inset-0 z-[2147483647] pointer-events-auto flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs font-sans text-gray-100 animate-in fade-in duration-100"
      onKeyDown={e => e.stopPropagation()}
      onClick={e => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className={`w-[560px] max-w-[94vw] rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[75vh] transition-all ${
        isLight
          ? 'bg-white border-[#dadce0] text-gray-900'
          : 'bg-[#1e2025] border-gray-700/80 text-gray-100'
      }`}>
        {/* Top Search Input */}
        <div className={`flex items-center px-4 py-3 border-b gap-3 ${
          isLight ? 'border-gray-200 bg-[#f8f9fa]' : 'border-gray-800 bg-[#25272c]'
        }`}>
          <span className="text-gray-400 text-base">🔍</span>
          <input
            ref={inputRef}
            data-testid="quick-switcher-input"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Jump to person, phone number, folder, or action..."
            className={`flex-1 bg-transparent text-sm outline-none ${
              isLight ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-gray-400'
            }`}
          />
          <kbd className={`hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold rounded border ${
            isLight
              ? 'text-gray-500 bg-gray-100 border-gray-300'
              : 'text-gray-400 bg-gray-800 border-gray-700'
          }`}>
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-1 flex-1">
          {items.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">
              No matching conversations, contacts, or actions found
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : isLight
                        ? 'hover:bg-gray-100 text-gray-800'
                        : 'hover:bg-white/5 text-gray-200'
                  }`}
                >
                  <span className="text-lg shrink-0">{item.icon}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs truncate">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md font-medium shrink-0 ${
                            isSelected
                              ? 'bg-blue-800 text-blue-100'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isSelected ? 'text-blue-100' : 'text-gray-400'
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  <span
                    className={`text-[11px] font-mono opacity-0 transition-opacity shrink-0 ${
                      isSelected ? 'opacity-80 text-white' : ''
                    }`}
                  >
                    ↵ Enter
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 border-t border-gray-800 bg-[#191a1e] text-[11px] text-gray-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-gray-800 px-1 py-0.5 rounded text-[10px]">↑</kbd>{' '}
              <kbd className="font-mono bg-gray-800 px-1 py-0.5 rounded text-[10px]">↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono bg-gray-800 px-1 py-0.5 rounded text-[10px]">↵</kbd> select
            </span>
            <span>
              <kbd className="font-mono bg-gray-800 px-1 py-0.5 rounded text-[10px]">esc</kbd> close
            </span>
          </div>
          <span className="text-gray-400">Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
