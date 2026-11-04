import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useActiveConversationId, watchSidebar } from '../engine';
import { SEL } from '../selectors';
import {
  getFollowUps,
  toggleFollowUp,
  saveFollowUp,
  type LocalFollowUp
} from '../db';
import { useFeature } from '../settings/store';
import { FlagIcon, CheckIcon } from '../ui/MaterialIcons';
import { useThemeMode } from './ThemeEngine';

// Reactive in-memory follow-ups cache
let followUpsCache: Record<string, LocalFollowUp> = {};
let followUpsLoaded = false;
const followUpListeners = new Set<() => void>();

function notifyFollowUps() {
  followUpListeners.forEach(l => l());
}

export async function reloadFollowUps() {
  followUpsCache = await getFollowUps();
  followUpsLoaded = true;
  notifyFollowUps();
  return followUpsCache;
}

reloadFollowUps();

const subscribeFollowUps = (cb: () => void) => {
  followUpListeners.add(cb);
  return () => followUpListeners.delete(cb);
};
const getFollowUpsSnapshot = () => followUpsCache;

export function useFollowUps() {
  const followUps = useSyncExternalStore(subscribeFollowUps, getFollowUpsSnapshot);
  return { followUps, loaded: followUpsLoaded, reload: reloadFollowUps };
}

const PRESET_TIMEFRAMES = ['Today', 'Tomorrow', 'In 2 Days', 'This Sunday', 'Next Week'];

/** Header action button in conversation toolbar */
export function HeaderFollowUpButton() {
  const enabled = useFeature('crmNotes');
  const conversationId = useActiveConversationId();
  const { followUps, reload } = useFollowUps();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const themeMode = useThemeMode();
  const isLight = themeMode === 'light';

  const activeFollowUp = conversationId ? followUps[conversationId] : undefined;
  const isFlagged = !!activeFollowUp?.flagged;

  useEffect(() => {
    if (activeFollowUp) {
      setNoteText(activeFollowUp.note || '');
    } else {
      setNoteText('');
    }
  }, [activeFollowUp]);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const path = e.composedPath ? e.composedPath() : [];
      if (popoverRef.current && !path.includes(popoverRef.current) && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [popoverOpen]);

  if (!enabled || !conversationId) return null;

  const handleAddTag = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFollowUp(conversationId, 'Follow-up');
    await reload();
  };

  const handleMarkFollowedUp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFollowUp(conversationId);
    await reload();
    setPopoverOpen(false);
  };

  const handleSetReminder = async (label: string) => {
    if (!conversationId) return;
    await saveFollowUp({
      conversationId,
      flagged: true,
      reminderLabel: label,
      note: noteText,
      updatedAt: Date.now()
    });
    await reload();
  };

  const handleSaveNote = async () => {
    if (!conversationId) return;
    await saveFollowUp({
      conversationId,
      flagged: true,
      reminderLabel: activeFollowUp?.reminderLabel || 'Follow-up',
      note: noteText.trim(),
      updatedAt: Date.now()
    });
    await reload();
    setPopoverOpen(false);
  };

  if (!isFlagged) {
    return (
      <button
        type="button"
        onClick={handleAddTag}
        className={`cursor-pointer flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
          isLight
            ? 'text-[#3c4043] hover:bg-black/[0.06] hover:text-[#1f1f1f]'
            : 'text-[#dadce0] hover:bg-white/[0.08] hover:text-white'
        }`}
        title="Tag for follow-up"
      >
        <FlagIcon size={15} filled={false} className={isLight ? 'text-[#3c4043]' : 'text-[#dadce0]'} />
        <span className="sr-only">Tag for follow-up</span>
      </button>
    );
  }

  return (
    <div className="relative inline-flex items-center font-sans" ref={popoverRef}>
      <div className={`inline-flex items-center rounded-full border overflow-hidden transition-all ${
        isLight
          ? 'bg-[#0b57d0]/12 border-[#0b57d0]/30'
          : 'bg-[#a8c7fa]/20 border-[#a8c7fa]/35'
      }`}>
        {/* Tag button: toggles note / timeframe popover */}
        <button
          type="button"
          onClick={() => setPopoverOpen(v => !v)}
          className={`cursor-pointer flex h-7 items-center gap-1.5 pl-2.5 pr-1.5 text-[11.5px] font-medium transition-colors ${
            isLight
              ? 'text-[#0b57d0] hover:bg-[#0b57d0]/15'
              : 'text-[#a8c7fa] hover:bg-[#a8c7fa]/15'
          }`}
          title="Tagged for follow-up. Click for notes."
        >
          <FlagIcon size={13} filled className={isLight ? 'text-[#0b57d0]' : 'text-[#a8c7fa]'} />
          <span>Follow-up</span>
        </button>

        <div className={`h-3.5 w-px ${isLight ? 'bg-[#0b57d0]/25' : 'bg-[#a8c7fa]/30'}`} />

        {/* 1-click Mark Done button: immediately marks followed up and removes tag */}
        <button
          type="button"
          onClick={handleMarkFollowedUp}
          className={`cursor-pointer flex h-7 items-center gap-1 px-2 text-[11px] font-semibold transition-colors ${
            isLight
              ? 'text-[#0b57d0] hover:bg-[#137333]/15 hover:text-[#137333]'
              : 'text-[#a8c7fa] hover:bg-[#81c995]/25 hover:text-[#81c995]'
          }`}
          title="Mark followed up (removes tag)"
        >
          <CheckIcon size={12} className="text-current" />
          <span className="text-[10.5px]">Done</span>
        </button>
      </div>

      {/* Popover to view/edit note or mark followed up */}
      {popoverOpen && (
        <div
          onMouseDown={e => e.stopPropagation()}
          className={`absolute top-8 left-0 z-[2147483645] w-72 rounded-xl border p-3 backdrop-blur-md text-xs ${
            isLight
              ? 'border-[#dadce0] bg-white text-gray-900 shadow-[0_12px_36px_rgba(0,0,0,0.18)]'
              : 'border-white/15 bg-[#1e2025] text-gray-200 shadow-[0_12px_36px_rgba(0,0,0,0.7)] ring-1 ring-white/10'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-2 mb-2.5 ${
            isLight ? 'border-gray-200' : 'border-gray-800'
          }`}>
            <span className={`font-semibold flex items-center gap-1.5 text-xs ${isLight ? 'text-gray-900' : 'text-white'}`}>
              <FlagIcon size={14} filled className={isLight ? 'text-[#0b57d0]' : 'text-[#a8c7fa]'} />
              <span>Follow-up Tag</span>
            </span>
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              className="cursor-pointer text-gray-400 hover:text-gray-600 text-xs px-1"
            >
              ✕
            </button>
          </div>

          {/* Prominent Mark Followed Up Button */}
          <div className="mb-3">
            <button
              type="button"
              onClick={handleMarkFollowedUp}
              className="w-full cursor-pointer flex items-center justify-center gap-1.5 rounded-lg bg-[#81c995]/20 border border-[#81c995]/40 py-1.5 px-3 text-xs font-semibold text-[#81c995] hover:bg-[#81c995]/30 transition-colors"
            >
              <CheckIcon size={13} />
              <span>Mark as Followed Up (Remove Tag)</span>
            </button>
          </div>

          {/* Quick Follow-up Note */}
          <div className="mb-3">
            <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveNote()}
              placeholder="e.g. Needs quote, callback about appointment"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          {/* Optional timing presets */}
          <div className="mb-3">
            <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
              Timing
            </label>
            <div className="flex flex-wrap gap-1">
              {PRESET_TIMEFRAMES.map(tf => {
                const isSelected = activeFollowUp?.reminderLabel === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => handleSetReminder(tf)}
                    className={`cursor-pointer rounded-lg px-2 py-0.5 text-[10.5px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save / Close */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              className="cursor-pointer text-gray-400 hover:text-white px-2 py-1 text-[11px]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 shadow"
            >
              Save Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const BADGE_STYLE_ID = 'mp-followup-badge-css';

function ensureBadgeStyle() {
  if (document.getElementById(BADGE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BADGE_STYLE_ID;
  style.textContent = `
    .mp-followup-badge {
      margin-left: 6px;
      font-size: 10px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      cursor: pointer;
      transition: all 0.15s ease;
      vertical-align: middle;
      line-height: 1.4;
    }
    body.mp-theme-dark .mp-followup-badge {
      color: #a8c7fa;
      background: rgba(168, 199, 250, 0.15);
      border: 1px solid rgba(168, 199, 250, 0.35);
    }
    body.mp-theme-dark .mp-followup-badge:hover {
      color: #81c995 !important;
      background: rgba(129, 201, 149, 0.2) !important;
      border-color: rgba(129, 201, 149, 0.5) !important;
    }
    body.mp-theme-light .mp-followup-badge {
      color: #0b57d0;
      background: rgba(11, 87, 208, 0.08);
      border: 1px solid rgba(11, 87, 208, 0.25);
    }
    body.mp-theme-light .mp-followup-badge:hover {
      color: #137333 !important;
      background: rgba(19, 115, 51, 0.12) !important;
      border-color: rgba(19, 115, 51, 0.35) !important;
    }
  `;
  document.head.appendChild(style);
}

/** Sidebar enhancer: adds visible, 1-click removable 🚩 Follow-up badge to conversation items */
function SidebarFollowUpEnhancer() {
  const { followUps } = useFollowUps();

  useEffect(() => {
    ensureBadgeStyle();
    const hasFollowUps = Object.keys(followUps).length > 0;

    const unwatch = watchSidebar((sidebar, items) => {
      if (!hasFollowUps && !sidebar.querySelector('.mp-followup-badge')) return;
      items.forEach(item => {
        const link = item.querySelector('a[data-e2e-conversation]');
        const href = link?.getAttribute('href') || '';
        const match = href.match(/\/conversations\/([^/?#]+)/);
        const convId = match ? match[1] : null;

        const existingBadge = item.querySelector('.mp-followup-badge');
        const flag = convId ? followUps[convId] : undefined;

        if (flag && flag.flagged) {
          const titleText = flag.note ? `Follow-up: ${flag.note} (Click to mark done)` : 'Tagged for follow-up. Click to mark done.';

          if (!existingBadge) {
            const nameSpan = item.querySelector('[data-e2e-conversation-name]');
            if (nameSpan) {
              const badge = document.createElement('button');
              badge.type = 'button';
              badge.className = 'mp-followup-badge';
              badge.textContent = '🚩 Follow-up';
              badge.title = titleText;

              badge.addEventListener('mouseenter', () => {
                badge.textContent = '✓ Done';
              });

              badge.addEventListener('mouseleave', () => {
                badge.textContent = '🚩 Follow-up';
              });

              badge.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (convId) {
                  await toggleFollowUp(convId);
                  await reloadFollowUps();
                }
              });

              nameSpan.after(badge);
            }
          } else if ((existingBadge as HTMLElement).title !== titleText) {
            (existingBadge as HTMLElement).title = titleText;
          }
        } else if (existingBadge) {
          existingBadge.remove();
        }
      });
    });

    return () => {
      unwatch();
      document.querySelectorAll('.mp-followup-badge').forEach(b => b.remove());
    };
  }, [followUps]);

  return null;
}

export function FollowUpFeature() {
  const enabled = useFeature('crmNotes');
  if (!enabled) return null;
  return <SidebarFollowUpEnhancer />;
}
