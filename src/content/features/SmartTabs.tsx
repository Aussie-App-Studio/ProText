import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Slot } from '../Slot';
import { watchSidebar } from '../engine';
import { SEL } from '../selectors';
import { useFeature } from '../settings/store';
import {
  getSmartTabs,
  saveSmartTab,
  deleteSmartTab,
  type SmartTab,
  type SmartRule
} from '../db';
import { useFollowUps } from './FollowUp';
import { FlagIcon, TuneIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/MaterialIcons';
import { useThemeMode } from './ThemeEngine';

const STYLE_ID = 'mp-smart-tabs-filter-css';

// In-memory sync for smart tabs
let tabsCache: SmartTab[] = [];
let tabsLoaded = false;
const tabListeners = new Set<() => void>();

function notifyTabs() {
  tabListeners.forEach(l => l());
}

async function reloadTabs() {
  const allTabs = await getSmartTabs();
  tabsCache = allTabs.filter(t => t.id !== 'saved');
  tabsLoaded = true;
  notifyTabs();
}

reloadTabs();

const subscribeTabs = (cb: () => void) => {
  tabListeners.add(cb);
  return () => tabListeners.delete(cb);
};
const getTabsSnapshot = () => tabsCache;

export function useSmartTabsStore() {
  const tabs = useSyncExternalStore(
    subscribeTabs,
    getTabsSnapshot
  );
  return { tabs, loaded: tabsLoaded, reload: reloadTabs };
}

/** Compiles smart rules to RegExp: [If message contains 'xyz'] -> /xyz/i */
export function compileRulesToRegex(rules: SmartRule[]): RegExp[] {
  return rules
    .map(r => {
      const val = r.value.trim();
      if (!val) return null;
      try {
        // Escape special regex chars if simple contains, or allow direct pattern
        const escaped = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped, 'i');
      } catch {
        return null;
      }
    })
    .filter((r): r is RegExp => r !== null);
}

/** Rule Builder Modal */
function RuleBuilderModal({
  tab,
  onClose,
  onSave
}: {
  tab: SmartTab;
  onClose: () => void;
  onSave: (updated: SmartTab) => void;
}) {
  const [tabName, setTabName] = useState(tab.name);
  const [rules, setRules] = useState<SmartRule[]>(tab.rules || []);
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleField, setNewRuleField] = useState<'message_contains' | 'sender_contains'>('message_contains');

  const themeMode = useThemeMode();
  const isLight = themeMode === 'light';

  const handleAddRule = () => {
    if (!newRuleValue.trim()) return;
    const rule: SmartRule = {
      id: `rule-${Date.now()}`,
      field: newRuleField,
      value: newRuleValue.trim()
    };
    setRules([...rules, rule]);
    setNewRuleValue('');
  };

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const handleSave = () => {
    if (!tabName.trim()) return;
    onSave({
      ...tab,
      name: tabName.trim(),
      rules
    });
  };

  const modalContent = (
    <div
      data-testid="rule-builder-modal"
      className="fixed inset-0 z-[2147483647] pointer-events-auto flex items-center justify-center bg-black/60 backdrop-blur-xs font-sans text-xs"
      onClick={onClose}
    >
      <div
        className={`w-[420px] max-w-[92vw] rounded-2xl p-5 shadow-2xl border transition-all ${
          isLight
            ? 'bg-white text-gray-900 border-[#dadce0]'
            : 'bg-[#232428] text-gray-100 border-gray-700/60'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`mb-4 flex items-center justify-between border-b pb-2 ${
          isLight ? 'border-gray-200' : 'border-gray-700/60'
        }`}>
          <h3 className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {tab.name ? (
              <>
                Rule Builder: <span className="text-blue-500">{tab.name}</span>
              </>
            ) : (
              'Create New Smart Tab'
            )}
          </h3>
          <button onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg">
            ✕
          </button>
        </div>

        {/* Tab Name (if not system) */}
        {!tab.isSystem && (
          <div className="mb-3">
            <label className={`mb-1 block font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Tab Name</label>
            <input
              type="text"
              value={tabName}
              onChange={e => setTabName(e.target.value)}
              className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none focus:border-blue-500 ${
                isLight
                  ? 'border-[#dadce0] bg-[#f8f9fa] text-gray-900'
                  : 'border-gray-700 bg-gray-900/80 text-white'
              }`}
            />
          </div>
        )}

        {/* Existing Rules */}
        <div className="mb-3">
          <label className={`mb-1 block font-medium uppercase tracking-wider text-[10px] ${
            isLight ? 'text-gray-500' : 'text-gray-400'
          }`}>
            Active Categorisation Rules ({rules.length})
          </label>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {rules.map(r => (
              <div
                key={r.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-1.5 ${
                  isLight
                    ? 'border-[#dadce0] bg-[#f8f9fa]'
                    : 'border-gray-700/80 bg-gray-900/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>If</span>
                  <span className={`font-semibold ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>
                    {r.field === 'message_contains' ? 'message contains' : 'sender contains'}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 font-mono ${
                    isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-500/20 text-blue-200'
                  }`}>
                    "{r.value}"
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveRule(r.id)}
                  className="cursor-pointer text-gray-400 hover:text-red-500"
                  title="Remove rule"
                >
                  ✕
                </button>
              </div>
            ))}
            {rules.length === 0 && (
              <div className={`rounded-lg border border-dashed p-3 text-center text-[11px] ${
                isLight ? 'border-gray-300 text-gray-400' : 'border-gray-700 text-gray-500'
              }`}>
                No rules defined yet. Add a condition below to automatically sort messages into this tab.
              </div>
            )}
          </div>
        </div>

        {/* Add New Rule */}
        <div className="mb-4 rounded-xl border border-gray-700/60 bg-gray-800/40 p-3">
          <span className="block mb-2 font-medium text-gray-300 text-[11px] uppercase tracking-wider">
            + Add Sorting Rule
          </span>
          <div className="flex items-center gap-2 mb-2">
            <select
              value={newRuleField}
              onChange={e => setNewRuleField(e.target.value as any)}
              className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-200 outline-none"
            >
              <option value="message_contains">If message contains</option>
              <option value="sender_contains">If sender name contains</option>
            </select>
            <input
              type="text"
              value={newRuleValue}
              onChange={e => setNewRuleValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddRule()}
              placeholder="e.g. prayer, volunteer, Sunday, meeting"
              className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleAddRule}
            disabled={!newRuleValue.trim()}
            className="cursor-pointer rounded-lg bg-gray-700 hover:bg-gray-600 px-3 py-1 text-xs text-white disabled:opacity-50"
          >
            Add Rule Condition
          </button>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between border-t border-gray-700/60 pt-3">
          {!tab.isSystem ? (
            <button
              onClick={async () => {
                if (confirm(`Delete tab "${tab.name}"?`)) {
                  await deleteSmartTab(tab.id);
                  await reloadTabs();
                  onClose();
                }
              }}
              className="cursor-pointer text-red-400 hover:text-red-300 text-xs"
            >
              Delete Tab
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="cursor-pointer rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-500"
            >
              Save Rules
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const host = document.getElementById('messages-plus-root')?.shadowRoot;
  return host ? createPortal(modalContent, host) : modalContent;
}

let globalActiveTabId = 'all';
const activeTabListeners = new Set<() => void>();

export function setActiveTab(id: string) {
  globalActiveTabId = id;
  activeTabListeners.forEach(l => l());
}

export function useActiveTab() {
  return useSyncExternalStore(
    cb => {
      activeTabListeners.add(cb);
      return () => activeTabListeners.delete(cb);
    },
    () => globalActiveTabId
  );
}

/** Main Smart Tabs Bar Component */
function SmartTabsBar() {
  const { tabs, reload } = useSmartTabsStore();
  const activeTabId = useActiveTab();
  const setActiveTabId = setActiveTab;
  const [editingTab, setEditingTab] = useState<SmartTab | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { followUps } = useFollowUps();
  const followUpCount = Object.keys(followUps).length;

  // Keep unread count fresh and filter conversations via the single shared sidebar observer
  useEffect(() => {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    if (activeTabId === 'unread') {
      style.textContent = `
        mws-conversation-list-item:has(a[data-e2e-is-unread="false"]) {
          display: none !important;
        }
      `;
    } else {
      style.textContent = '';
    }

    const currentTab =
      activeTabId !== 'all' && activeTabId !== 'unread' && activeTabId !== 'needs_followup'
        ? tabs.find(t => t.id === activeTabId)
        : undefined;
    const regexes = currentTab ? compileRulesToRegex(currentTab.rules) : [];

    const clearInlineDisplay = () => {
      document.querySelectorAll('mws-conversation-list-item').forEach(el => {
        if ((el as HTMLElement).style.display !== '') {
          (el as HTMLElement).style.display = '';
        }
      });
    };

    if (activeTabId === 'all' || activeTabId === 'unread') {
      clearInlineDisplay();
    }

    const unwatch = watchSidebar((sidebar, items) => {
      // 1. Update unread badge count
      const unreadLinks = sidebar.querySelectorAll('mws-conversation-list-item a[data-e2e-is-unread="true"]');
      setUnreadCount(unreadLinks.length);

      // 2. Apply tab filtering if needed
      if (activeTabId === 'needs_followup') {
        items.forEach(item => {
          const link = item.querySelector('a[data-e2e-conversation]');
          const href = link?.getAttribute('href') || '';
          const match = href.match(/\/conversations\/([^/?#]+)/);
          const convId = match ? match[1] : null;
          const isFlagged = convId ? !!followUps[convId]?.flagged : false;
          const nextDisplay = isFlagged ? '' : 'none';
          if ((item as HTMLElement).style.display !== nextDisplay) {
            (item as HTMLElement).style.display = nextDisplay;
          }
        });
      } else if (activeTabId !== 'all' && activeTabId !== 'unread') {
        items.forEach(item => {
          const name = item.querySelector('[data-e2e-conversation-name]')?.textContent || '';
          const snippet = item.querySelector('[data-e2e-conversation-snippet]')?.textContent || '';
          const textToTest = `${name} ${snippet}`;

          const matches = regexes.length === 0 ? true : regexes.some(r => r.test(textToTest));
          const nextDisplay = matches ? '' : 'none';
          if ((item as HTMLElement).style.display !== nextDisplay) {
            (item as HTMLElement).style.display = nextDisplay;
          }
        });
      }
    });

    return () => {
      unwatch();
      if (style) style.textContent = '';
      clearInlineDisplay();
    };
  }, [activeTabId, tabs, followUps]);

  const themeMode = useThemeMode();
  const isLight = themeMode === 'light';

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 2;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setCanScrollLeft(!atStart);
    setCanScrollRight(!atEnd);
  }, []);

  // Listen for wheel, scroll, and container resize
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    const handleWheel = (e: WheelEvent) => {
      // Natural horizontal scrolling via standard vertical mouse wheel
      if (e.deltaY !== 0) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
        updateScrollState();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('scroll', updateScrollState, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateScrollState();
      });
      ro.observe(el);
    }

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('scroll', updateScrollState);
      ro?.disconnect();
    };
  }, [updateScrollState]);

  // Recalculate scroll state when tabs change
  useEffect(() => {
    const timer = setTimeout(updateScrollState, 50);
    return () => clearTimeout(timer);
  }, [tabs, updateScrollState]);

  // Smoothly keep the active tab in view if selected
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      setTimeout(updateScrollState, 300);
    }
  }, [activeTabId, updateScrollState]);

  // Drag-to-scroll support for mouse/trackpad users
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX;
    scrollLeftRef.current = scrollRef.current?.scrollLeft || 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    const dx = e.pageX - startXRef.current;
    if (Math.abs(dx) > 4) {
      hasDraggedRef.current = true;
      scrollRef.current.scrollLeft = scrollLeftRef.current - dx;
      updateScrollState();
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 60);
  };

  const scrollByAmount = (amount: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(updateScrollState, 250);
  };

  const handleCreateTab = () => {
    setEditingTab({
      id: `tab-${Date.now()}`,
      name: '',
      rules: [],
      order: tabs.length + 1
    });
  };

  return (
    <div className="font-sans relative w-full max-w-full min-w-0 select-none group/smarttabs">
      {/* Left Chevron Button with Gradient Mask */}
      {canScrollLeft && (
        <div
          className={`absolute left-0 top-0 bottom-0 z-10 flex items-center pr-5 pl-1 pointer-events-none transition-opacity duration-200 ${
            isLight
              ? 'bg-gradient-to-r from-white via-white/95 to-transparent'
              : 'bg-gradient-to-r from-[#2a2b2e] via-[#2a2b2e]/95 to-transparent'
          }`}
        >
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              scrollByAmount(-140);
            }}
            title="Scroll tabs left"
            className={`pointer-events-auto flex h-6 w-6 cursor-pointer items-center justify-center rounded-full shadow-md border transition-all hover:scale-110 active:scale-95 ${
              isLight
                ? 'bg-white border-[#dadce0] text-gray-700 hover:bg-gray-100'
                : 'bg-[#282a2d] border-[#dadce0]/20 text-gray-200 hover:bg-[#3c4043]'
            }`}
          >
            <ChevronLeftIcon size={14} />
          </button>
        </div>
      )}

      {/* Right Chevron Button with Gradient Mask */}
      {canScrollRight && (
        <div
          className={`absolute right-0 top-0 bottom-0 z-10 flex items-center pl-5 pr-1 pointer-events-none transition-opacity duration-200 ${
            isLight
              ? 'bg-gradient-to-l from-white via-white/95 to-transparent'
              : 'bg-gradient-to-l from-[#2a2b2e] via-[#2a2b2e]/95 to-transparent'
          }`}
        >
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              scrollByAmount(140);
            }}
            title="Scroll tabs right"
            className={`pointer-events-auto flex h-6 w-6 cursor-pointer items-center justify-center rounded-full shadow-md border transition-all hover:scale-110 active:scale-95 ${
              isLight
                ? 'bg-white border-[#dadce0] text-gray-700 hover:bg-gray-100'
                : 'bg-[#282a2d] border-[#dadce0]/20 text-gray-200 hover:bg-[#3c4043]'
            }`}
          >
            <ChevronRightIcon size={14} />
          </button>
        </div>
      )}

      {/* Scrollable Material 3 Filter Chip Bar */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing w-full min-w-0"
        data-testid="smart-tabs-bar"
      >
        {tabs.map(tab => {
          const isActive = activeTabId === tab.id;
          const cleanName = tab.name.replace(/^(?:🚩|★|☆)\s*/u, '');
          return (
            <div key={tab.id} data-tab-id={tab.id} className="relative group shrink-0">
              <button
                onClick={() => {
                  if (hasDraggedRef.current) return;
                  setActiveTabId(tab.id);
                }}
                className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? isLight
                      ? 'border-[#0b57d0] bg-[#0b57d0] text-white shadow-xs'
                      : 'border-[#004a77] bg-[#004a77] text-[#c2e7ff]'
                    : isLight
                      ? 'border-[#dadce0] bg-[#f1f3f4] text-[#3c4043] hover:bg-[#e8eaed] hover:text-[#1f1f1f]'
                      : 'border-[#dadce0]/12 bg-[#303134] text-[#e8eaed] hover:bg-[#3c4043]'
                }`}
              >
                {tab.id === 'needs_followup' && (
                  <FlagIcon
                    size={13}
                    filled={isActive}
                    className={isActive ? (isLight ? 'text-white' : 'text-[#c2e7ff]') : (isLight ? 'text-[#0b57d0]' : 'text-[#a8c7fa]')}
                  />
                )}
                <span>{cleanName}</span>

                {/* Badges for unread and follow-up */}
                {tab.id === 'unread' && unreadCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      isActive
                        ? isLight ? 'bg-white/25 text-white' : 'bg-[#c2e7ff]/20 text-[#c2e7ff]'
                        : isLight ? 'bg-[#0b57d0]/12 text-[#0b57d0]' : 'bg-[#a8c7fa]/20 text-[#a8c7fa]'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
                {tab.id === 'needs_followup' && followUpCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      isActive
                        ? isLight ? 'bg-white/25 text-white' : 'bg-[#c2e7ff]/20 text-[#c2e7ff]'
                        : isLight ? 'bg-[#0b57d0]/12 text-[#0b57d0]' : 'bg-[#a8c7fa]/20 text-[#a8c7fa]'
                    }`}
                  >
                    {followUpCount}
                  </span>
                )}
              </button>

              {/* Rule Builder gear button on hover (for non-system tabs) */}
              {!tab.isSystem && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setEditingTab(tab);
                  }}
                  title={`Configure rules for ${cleanName}`}
                  className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-[#3c4043] border border-[#dadce0]/20 text-[10px] text-[#e8eaed] hover:bg-[#004a77] hover:text-[#c2e7ff] shadow"
                >
                  <TuneIcon size={10} />
                </button>
              )}
            </div>
          );
        })}

        {/* Add Tab Button */}
        <button
          onClick={() => {
            if (hasDraggedRef.current) return;
            handleCreateTab();
          }}
          title="Add new Smart Tab"
          className={`shrink-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border text-sm font-medium transition-colors ${
            isLight
              ? 'border-[#dadce0] bg-[#f1f3f4] text-[#3c4043] hover:bg-[#e8eaed] hover:text-[#1f1f1f]'
              : 'border-[#dadce0]/12 bg-[#303134] text-[#dadce0] hover:bg-[#3c4043] hover:text-white'
          }`}
        >
          +
        </button>
      </div>

      {/* Rule Builder Modal */}
      {editingTab && (
        <RuleBuilderModal
          tab={editingTab}
          onClose={() => setEditingTab(null)}
          onSave={async updated => {
            if (!updated.name.trim()) return;
            await saveSmartTab(updated);
            await reload();
            setActiveTabId(updated.id);
            setEditingTab(null);
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
                updateScrollState();
              }
            }, 150);
          }}
        />
      )}
    </div>
  );
}

export function SmartTabs() {
  const enabled = useFeature('smartTabs');
  if (!enabled) return null;

  return (
    <Slot
      anchor={SEL.conversationsList}
      position="before"
      id="smart-tabs"
      hostStyle="display: block; width: 100%; max-width: 100%; min-width: 0; overflow: hidden;"
    >
      <SmartTabsBar />
    </Slot>
  );
}
