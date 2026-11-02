import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Slot } from '../Slot';
import { SEL } from '../selectors';
import {
  getScheduledMessages,
  saveScheduledMessage,
  deleteScheduledMessage,
  type ScheduledMessage
} from '../db';
import { useFeature } from '../settings/store';
import {
  dispatchNativeMessage,
  getIsDispatchingNative,
  navigateToConversation
} from './UndoSendBuffer';
import {
  ScheduleSendIcon,
  ScheduleClockIcon,
  EditIcon,
  SendIcon,
  DeleteIcon
} from '../ui/MaterialIcons';
import { useThemeMode } from './ThemeEngine';

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes overdue threshold

interface ScheduleModalState {
  open: boolean;
  initialText: string;
  editingMessage: ScheduledMessage | null;
}

let modalState: ScheduleModalState = {
  open: false,
  initialText: '',
  editingMessage: null
};
let cachedScheduled: ScheduledMessage[] = [];
let toastMessage: string | null = null;

interface StoreSnapshot {
  modal: ScheduleModalState;
  scheduled: ScheduledMessage[];
  toast: string | null;
}

let snapshot: StoreSnapshot = {
  modal: modalState,
  scheduled: cachedScheduled,
  toast: toastMessage
};

const listeners = new Set<() => void>();
function notify() {
  snapshot = {
    modal: modalState,
    scheduled: cachedScheduled,
    toast: toastMessage
  };
  listeners.forEach(l => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => snapshot;

export function useScheduleSendStore() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export async function reloadScheduledMessages() {
  cachedScheduled = await getScheduledMessages();
  notify();
}

void reloadScheduledMessages();

function showScheduleToast(msg: string) {
  toastMessage = msg;
  notify();
  setTimeout(() => {
    if (toastMessage === msg) {
      toastMessage = null;
      notify();
    }
  }, 4000);
}

/** Detects if Google Messages is currently disconnected from the Android phone */
export function detectPhoneDisconnected(): boolean {
  const alertEls = document.querySelectorAll(
    'mw-connection-status, .connection-status, mw-banner, [role="alert"], mws-conversations-list-banner'
  );
  for (const el of Array.from(alertEls)) {
    if ((el as HTMLElement).offsetParent !== null) {
      const t = (el.textContent || '').toLowerCase();
      if (
        t.includes('reach your phone') ||
        t.includes('phone not connected') ||
        t.includes('phone is offline') ||
        t.includes('reconnecting to phone') ||
        t.includes('waiting for your phone')
      ) {
        return true;
      }
    }
  }
  return false;
}

/** React hook tracking phone connection status */
export function usePhoneConnectionStatus(): boolean {
  const [connected, setConnected] = useState(!detectPhoneDisconnected());

  useEffect(() => {
    const check = () => {
      setConnected(!detectPhoneDisconnected());
    };
    check();
    const id = setInterval(check, 2500);
    const mo = new MutationObserver(check);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => {
      clearInterval(id);
      mo.disconnect();
    };
  }, []);

  return connected;
}

/** Reads current text in Google Messages composer */
function readComposerText(): string {
  const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null);
  const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(SEL.textarea)).find(e => e.offsetParent !== null);
  if (ed) return (ed.textContent || '').trim();
  if (ta) return (ta.value || '').trim();
  return '';
}

/** Clears Google Messages composer cleanly without breaking Angular model */
function clearComposerText() {
  const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null);
  const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(SEL.textarea)).find(e => e.offsetParent !== null);
  if (ed) {
    ed.focus();
    document.execCommand('selectAll', false);
    document.execCommand('delete', false);
  }
  if (ta) {
    ta.value = '';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

export function getActiveConversationId(): string {
  const match = location.pathname.match(/\/conversations\/([^/?#]+)/);
  return match ? match[1] : '';
}

export function getActiveContactName(): string {
  const titleEl = document.querySelector(SEL.headerTitle);
  return titleEl?.textContent?.trim() || 'Contact';
}

export function openScheduleModal(editing?: ScheduledMessage) {
  const text = editing ? editing.text : readComposerText();
  modalState = {
    open: true,
    initialText: text,
    editingMessage: editing || null
  };
  notify();
}

export function closeScheduleModal() {
  modalState = {
    open: false,
    initialText: '',
    editingMessage: null
  };
  notify();
}

interface PresetOption {
  id: string;
  label: string;
  timeText: string;
  timestamp: number;
}

/** Generates 3 dynamic Android-style time presets based on current local time */
function getSmartPresets(): PresetOption[] {
  const now = new Date();
  const hr = now.getHours();

  const makeTime = (daysAhead: number, targetHour: number, targetMin = 0): Date => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysAhead);
    d.setHours(targetHour, targetMin, 0, 0);
    return d;
  };

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (hr < 12) {
    const t1 = makeTime(0, 13, 0);
    const t2 = makeTime(0, 17, 0);
    const t3 = makeTime(1, 8, 0);
    return [
      { id: 'p1', label: 'Later today', timeText: fmtTime(t1), timestamp: t1.getTime() },
      { id: 'p2', label: 'Later today', timeText: fmtTime(t2), timestamp: t2.getTime() },
      { id: 'p3', label: 'Tomorrow', timeText: fmtTime(t3), timestamp: t3.getTime() }
    ];
  } else if (hr < 16) {
    const t1 = makeTime(0, 17, 0);
    const t2 = makeTime(0, 20, 0);
    const t3 = makeTime(1, 8, 0);
    return [
      { id: 'p1', label: 'Later today', timeText: fmtTime(t1), timestamp: t1.getTime() },
      { id: 'p2', label: 'Later tonight', timeText: fmtTime(t2), timestamp: t2.getTime() },
      { id: 'p3', label: 'Tomorrow', timeText: fmtTime(t3), timestamp: t3.getTime() }
    ];
  } else if (hr < 20) {
    const t1 = makeTime(0, 21, 0);
    const t2 = makeTime(1, 8, 0);
    const t3 = makeTime(1, 13, 0);
    return [
      { id: 'p1', label: 'Later tonight', timeText: fmtTime(t1), timestamp: t1.getTime() },
      { id: 'p2', label: 'Tomorrow', timeText: fmtTime(t2), timestamp: t2.getTime() },
      { id: 'p3', label: 'Tomorrow', timeText: fmtTime(t3), timestamp: t3.getTime() }
    ];
  } else {
    const t1 = makeTime(1, 8, 0);
    const t2 = makeTime(1, 13, 0);
    const t3 = makeTime(1, 17, 0);
    return [
      { id: 'p1', label: 'Tomorrow morning', timeText: fmtTime(t1), timestamp: t1.getTime() },
      { id: 'p2', label: 'Tomorrow afternoon', timeText: fmtTime(t2), timestamp: t2.getTime() },
      { id: 'p3', label: 'Tomorrow evening', timeText: fmtTime(t3), timestamp: t3.getTime() }
    ];
  }
}

function getTimezoneLabel(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const short = new Date()
      .toLocaleTimeString(undefined, { timeZoneName: 'short' })
      .split(' ')
      .pop();
    return short ? `${tz.replace(/_/g, ' ')} (${short})` : tz;
  } catch {
    return 'Local Time';
  }
}

export function formatScheduledTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today, ${timeStr}`;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;
  const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${dateStr}, ${timeStr}`;
}

function formatOverdueDuration(ms: number): string {
  const mins = Math.max(1, Math.round(ms / (60 * 1000)));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

/** Button mounted inside the Composer Secondary Pill */
export function ScheduleSendComposerButton() {
  const enabled = useFeature('scheduleSend');
  const themeMode = useThemeMode();
  const isLight = themeMode === 'light';
  if (!enabled) return null;

  return (
    <button
      type="button"
      data-testid="schedule-send-composer-btn"
      onMouseDown={e => e.preventDefault()}
      onClick={() => openScheduleModal()}
      title="Schedule send (or long-press / right-click the Send button)"
      className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors cursor-pointer select-none ${
        isLight
          ? 'text-[#3c4043] hover:bg-black/[0.06] active:bg-black/[0.1] hover:text-[#1f1f1f]'
          : 'text-[#e8eaed] hover:bg-white/[0.08] active:bg-white/[0.14]'
      }`}
    >
      <ScheduleSendIcon size={16} className={isLight ? 'text-[#0b57d0]' : 'text-[#a8c7fa]'} />
      <span>Schedule</span>
    </button>
  );
}

/** Inline Scheduled Messages tray rendered right above the composer in the active chat */
function InlineScheduledQueue() {
  const { scheduled } = useScheduleSendStore();
  const isPhoneConnected = usePhoneConnectionStatus();
  const [convId, setConvId] = useState(getActiveConversationId());
  const [expanded, setExpanded] = useState(true);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const curr = getActiveConversationId();
      if (curr !== convId) {
        setConvId(curr);
        setActiveActionId(null);
      }
    }, 400);
    return () => clearInterval(id);
  }, [convId]);

  const chatScheduled = scheduled.filter(m => m.conversationId === convId);
  if (!convId || chatScheduled.length === 0) return null;

  const handleSendNow = async (msg: ScheduledMessage) => {
    setActiveActionId(null);
    await deleteScheduledMessage(msg.id);
    await reloadScheduledMessages();
    dispatchNativeMessage(msg.text, undefined, msg.conversationId);
    showScheduleToast(`Sent scheduled message to ${msg.contactName}`);
  };

  const handleDelete = async (msg: ScheduledMessage) => {
    setActiveActionId(null);
    await deleteScheduledMessage(msg.id);
    await reloadScheduledMessages();
    showScheduleToast('Scheduled message deleted');
  };

  const handleUpdate = (msg: ScheduledMessage) => {
    setActiveActionId(null);
    openScheduleModal(msg);
  };

  return (
    <div
      data-testid="inline-scheduled-queue"
      className="w-full pb-2 font-sans text-xs"
    >
      <div className="rounded-3xl border border-[#dadce0]/12 bg-[#2d3033] px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="cursor-pointer flex items-center gap-2 text-[#a8c7fa] hover:text-[#d2e3fc] font-medium text-[12px]"
          >
            <ScheduleSendIcon size={16} />
            <span>
              Scheduled {chatScheduled.length === 1 ? 'message' : `messages (${chatScheduled.length})`}
            </span>
            <span className="text-[10px] text-[#9aa0a6] ml-0.5">
              {expanded ? '▾' : '▸'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => openScheduleModal()}
            className="cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] text-[#a8c7fa] hover:bg-white/[0.08] font-medium transition-colors"
          >
            + Schedule another
          </button>
        </div>

        {/* Scheduled Message Bubbles (Android Google Messages Style) */}
        {expanded && (
          <div className="mt-2.5 space-y-2">
            {chatScheduled.map(msg => {
              const menuOpen = activeActionId === msg.id;
              const isDelayed = msg.status === 'delayed';

              return (
                <div
                  key={msg.id}
                  data-testid="scheduled-message-item"
                  className="flex flex-col items-end relative"
                >
                  <div className="flex items-center gap-2 max-w-[88%]">
                    {/* Outgoing Scheduled Bubble */}
                    <div
                      onClick={() => setActiveActionId(menuOpen ? null : msg.id)}
                      title="Click to Update, Send now, or Delete"
                      className={`cursor-pointer rounded-2xl rounded-br-sm border px-3.5 py-2 text-xs shadow-xs transition-all ${
                        isDelayed
                          ? 'border-amber-400/40 bg-amber-950/30 hover:bg-amber-950/50 text-amber-100'
                          : 'border-[#a8c7fa]/30 bg-[#0842a0]/45 hover:bg-[#0842a0]/60 text-[#e8eaed]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.text}
                      </p>
                    </div>

                    {/* Android Clock Badge Button */}
                    <button
                      type="button"
                      data-testid="scheduled-message-clock-btn"
                      onClick={() => setActiveActionId(menuOpen ? null : msg.id)}
                      title="Scheduled message options"
                      className={`cursor-pointer flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isDelayed
                          ? 'bg-amber-400/15 border-amber-400/40 text-amber-300 hover:bg-amber-400/25'
                          : 'bg-[#a8c7fa]/15 border-[#a8c7fa]/30 text-[#a8c7fa] hover:bg-[#a8c7fa]/25 hover:text-white'
                      }`}
                    >
                      <ScheduleClockIcon size={15} />
                    </button>
                  </div>

                  {/* Scheduled Timestamp Label & Delay Status */}
                  <div className="flex items-center gap-1.5 mt-0.5 mr-9">
                    {isDelayed && (
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.2 text-[9px] font-semibold text-amber-200">
                        ⏳ Delayed ({msg.delayReason === 'phone_offline' ? 'Phone was offline' : 'Overdue'})
                      </span>
                    )}
                    <span className="text-[10px] text-[#9aa0a6]">
                      Scheduled for {formatScheduledTimestamp(msg.scheduledFor)}
                    </span>
                  </div>

                  {/* Android 3-Option Action Menu */}
                  {menuOpen && (
                    <div
                      data-testid="scheduled-message-actions-menu"
                      className="mt-1.5 mr-8 flex items-center gap-1 rounded-full border border-[#dadce0]/15 bg-[#3c4043] p-1 shadow-xl z-20 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <button
                        type="button"
                        data-testid="scheduled-action-update"
                        onClick={() => handleUpdate(msg)}
                        className="cursor-pointer flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-[#e8eaed] hover:bg-white/10 transition-colors"
                      >
                        <EditIcon size={14} />
                        <span>Update message</span>
                      </button>

                      <button
                        type="button"
                        data-testid="scheduled-action-send-now"
                        onClick={() => handleSendNow(msg)}
                        className="cursor-pointer flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-[#a8c7fa] hover:bg-[#a8c7fa]/15 transition-colors"
                      >
                        <SendIcon size={13} />
                        <span>Send now</span>
                      </button>

                      <button
                        type="button"
                        data-testid="scheduled-action-delete"
                        onClick={() => handleDelete(msg)}
                        className="cursor-pointer flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-[#f28b82] hover:bg-[#f28b82]/15 transition-colors"
                      >
                        <DeleteIcon size={14} />
                        <span>Delete message</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Connection health & Browser Alarms status indicator */}
            <div className="mt-2 pt-1.5 border-t border-[#dadce0]/10 flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    isPhoneConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <span className={isPhoneConnected ? 'text-[#9aa0a6]' : 'text-amber-300 font-medium'}>
                  {isPhoneConnected
                    ? 'Phone connected • Background alarms active'
                    : 'Phone disconnected • Scheduled texts will hold until reconnected'}
                </span>
              </span>
              <span className="text-[#9aa0a6]">chrome.alarms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ScheduleSendFeature() {
  const enabled = useFeature('scheduleSend');
  const { modal, scheduled, toast } = useScheduleSendStore();
  const isPhoneConnected = usePhoneConnectionStatus();

  const [messageText, setMessageText] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [dueAlert, setDueAlert] = useState<ScheduledMessage | null>(null);
  const [staleReview, setStaleReview] = useState<ScheduledMessage | null>(null);

  const longPressTimerRef = useRef<any>(null);
  const longPressTriggeredRef = useRef(false);
  const isDispatchingRef = useRef(false);

  // Sync modal state when opened
  useEffect(() => {
    if (modal.open) {
      setMessageText(modal.initialText);
      setCustomMode(false);

      const defaultDate = modal.editingMessage
        ? new Date(modal.editingMessage.scheduledFor)
        : new Date(Date.now() + 3600 * 1000);

      const yyyy = defaultDate.getFullYear();
      const mm = String(defaultDate.getMonth() + 1).padStart(2, '0');
      const dd = String(defaultDate.getDate()).padStart(2, '0');
      const hh = String(defaultDate.getHours()).padStart(2, '0');
      const min = String(defaultDate.getMinutes()).padStart(2, '0');

      setCustomDate(`${yyyy}-${mm}-${dd}`);
      setCustomTime(`${hh}:${min}`);
    }
  }, [modal.open, modal.initialText, modal.editingMessage]);

  // Attach Long-Press and Right-Click listener to Google's Send button
  useEffect(() => {
    if (!enabled) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || getIsDispatchingNative()) return;
      const target = e.target as HTMLElement | null;
      const sendBtn = target?.closest(SEL.sendButton);
      if (!sendBtn) return;

      longPressTriggeredRef.current = false;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        openScheduleModal();
      }, 450);
    };

    const onMouseUp = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const onClickCapture = (e: MouseEvent) => {
      if (getIsDispatchingNative()) return;
      const target = e.target as HTMLElement | null;
      const sendBtn = target?.closest(SEL.sendButton);
      if (sendBtn && longPressTriggeredRef.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        longPressTriggeredRef.current = false;
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (getIsDispatchingNative()) return;
      const target = e.target as HTMLElement | null;
      const sendBtn = target?.closest(SEL.sendButton);
      if (sendBtn) {
        e.preventDefault();
        e.stopPropagation();
        openScheduleModal();
      }
    };

    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('click', onClickCapture, true);
    window.addEventListener('contextmenu', onContextMenu, true);

    return () => {
      window.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('mouseup', onMouseUp, true);
      window.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('contextmenu', onContextMenu, true);
    };
  }, [enabled]);

  // Main Dispatch Processor: handles due time, disconnection safety, stale review, and silent navigation
  const processDueMessage = async (due: ScheduledMessage) => {
    if (isDispatchingRef.current) return;
    const now = Date.now();
    const delayMs = now - due.scheduledFor;

    // 1. Stale Message Protection: If overdue by > 10 mins (e.g. overnight disconnect or sleeping PC)
    // DO NOT auto-fire blindly. Present review dialog instead.
    if (delayMs > STALE_THRESHOLD_MS && due.status !== 'sending') {
      if (due.status !== 'delayed') {
        due.status = 'delayed';
        due.delayReason = 'phone_offline';
        await saveScheduledMessage(due);
        await reloadScheduledMessages();
      }
      setStaleReview(due);
      return;
    }

    // 2. Disconnection Guard: If phone is currently disconnected, pause and wait for reconnect
    if (detectPhoneDisconnected()) {
      if (due.status !== 'delayed') {
        due.status = 'delayed';
        due.delayReason = 'phone_offline';
        await saveScheduledMessage(due);
        await reloadScheduledMessages();
        showScheduleToast('Phone is offline — scheduled message paused until reconnected');
      }
      return;
    }

    // 3. Phone is connected and message is within grace window (<= 10 mins) -> Dispatch!
    isDispatchingRef.current = true;
    due.status = 'sending';
    await saveScheduledMessage(due);

    const activeConvId = getActiveConversationId();

    if (activeConvId && activeConvId === due.conversationId) {
      // User is already in the recipient's conversation
      dispatchNativeMessage(
        due.text,
        async success => {
          isDispatchingRef.current = false;
          if (success) {
            await deleteScheduledMessage(due.id);
            await reloadScheduledMessages();
            showScheduleToast(`Scheduled message sent to ${due.contactName}`);
          } else {
            due.status = 'scheduled';
            await saveScheduledMessage(due);
            await reloadScheduledMessages();
          }
        },
        due.conversationId
      );
    } else {
      // User is in a different chat (or main view).
      // Check if user is currently typing a draft in the active composer.
      const currentDraft = readComposerText();

      if (currentDraft.length > 0) {
        // User is actively composing in another conversation: show alert banner instead of disrupting
        isDispatchingRef.current = false;
        due.status = 'scheduled';
        await saveScheduledMessage(due);
        setDueAlert(due);
      } else {
        // User is not typing: perform smooth headless navigation, send, and return
        const returnConvId = activeConvId;
        const navigated = await navigateToConversation(due.conversationId, due.contactName);

        if (navigated) {
          dispatchNativeMessage(
            due.text,
            async success => {
              if (success) {
                await deleteScheduledMessage(due.id);
                await reloadScheduledMessages();
                showScheduleToast(`Scheduled message sent to ${due.contactName}`);
                // Smoothly return user back to where they were
                if (returnConvId && returnConvId !== due.conversationId) {
                  await navigateToConversation(returnConvId);
                }
              } else {
                due.status = 'scheduled';
                await saveScheduledMessage(due);
                await reloadScheduledMessages();
              }
              isDispatchingRef.current = false;
            },
            due.conversationId
          );
        } else {
          // Navigation could not find conversation link: fallback to prompt
          isDispatchingRef.current = false;
          due.status = 'scheduled';
          await saveScheduledMessage(due);
          setDueAlert(due);
        }
      }
    }
  };

  // Check and dispatch routine
  const checkAndDispatch = async (specificMessageId?: string) => {
    if (isDispatchingRef.current) return;
    const now = Date.now();
    const all = await getScheduledMessages();
    cachedScheduled = all;

    const due = specificMessageId
      ? all.find(m => m.id === specificMessageId && m.scheduledFor <= now)
      : all.find(m => (m.status === 'scheduled' || m.status === 'delayed') && m.scheduledFor <= now);

    if (due) {
      await processDueMessage(due);
    }
  };

  // 1. Listen for dispatch triggers from background alarms (chrome.alarms)
  useEffect(() => {
    if (!enabled) return;

    const onRuntimeMessage = (message: any, _sender: any, sendResponse: any) => {
      if (message?.type === 'PROTEXT_DISPATCH_SCHEDULED') {
        void checkAndDispatch(message.messageId);
        sendResponse?.({ received: true });
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(onRuntimeMessage);
    }

    return () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime?.onMessage) {
          chrome.runtime.onMessage.removeListener(onRuntimeMessage);
        }
      } catch {}
    };
  }, [enabled]);

  // 2. React to chrome.storage changes automatically
  useEffect(() => {
    if (!enabled) return;

    const onStorageChanged = (changes: any, areaName: string) => {
      if (areaName === 'local' && changes['scheduled_messages']) {
        void reloadScheduledMessages();
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(onStorageChanged);
    }

    return () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage?.onChanged) {
          chrome.storage.onChanged.removeListener(onStorageChanged);
        }
      } catch {}
    };
  }, [enabled]);

  // 3. Fallback interval check to guarantee dispatch even if alarm was suppressed
  useEffect(() => {
    if (!enabled) return;

    // Filter only active pending messages
    const activeMessages = scheduled.filter(m => m.status === 'scheduled' || m.status === 'delayed');
    if (activeMessages.length === 0) {
      // Zero pending messages: 0 background timers running
      return;
    }

    // Exact timer targeting the next due message directly
    const earliestTime = Math.min(...activeMessages.map(m => m.scheduledFor));
    const delay = Math.max(500, Math.min(earliestTime - Date.now(), 2147483647));

    const exactTimer = setTimeout(() => {
      void checkAndDispatch();
    }, delay);

    // Gentle 180s (3-minute) fallback check as secondary safety net
    const fallbackTimer = setInterval(() => {
      // If extension context was invalidated (e.g. extension reloaded in dev mode), cease polling
      if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
        clearInterval(fallbackTimer);
        return;
      }
      void checkAndDispatch();
    }, 180_000);

    return () => {
      clearTimeout(exactTimer);
      clearInterval(fallbackTimer);
    };
  }, [enabled, scheduled]);

  if (!enabled) return null;

  const handleConfirmSchedule = async (timestamp: number) => {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    const convId = modal.editingMessage?.conversationId || getActiveConversationId();
    const contactName = modal.editingMessage?.contactName || getActiveContactName();

    if (!convId) {
      showScheduleToast('Please open a conversation first');
      return;
    }

    const msg: ScheduledMessage = {
      id: modal.editingMessage?.id || `sched-${Date.now()}`,
      conversationId: convId,
      contactName,
      text: trimmed,
      scheduledFor: timestamp,
      createdAt: modal.editingMessage?.createdAt || Date.now(),
      status: 'scheduled'
    };

    await saveScheduledMessage(msg);
    if (!modal.editingMessage) {
      clearComposerText();
    }
    await reloadScheduledMessages();
    closeScheduleModal();
    showScheduleToast(`Scheduled for ${formatScheduledTimestamp(timestamp)}`);
  };

  const handleCustomSave = () => {
    if (!customDate || !customTime) return;
    const dt = new Date(`${customDate}T${customTime}`);
    if (isNaN(dt.getTime())) return;
    handleConfirmSchedule(dt.getTime());
  };

  const presets = getSmartPresets();

  return (
    <>
      {/* Inline Scheduled Messages Queue above composer */}
      <Slot
        anchor={SEL.composeContainer}
        position="before"
        id="scheduled-messages-queue"
        hostStyle="width: calc(100% - 60px); max-width: 975px; margin: 0 auto; display: block;"
      >
        <InlineScheduledQueue />
      </Slot>

      {/* Toast Notification */}
      {toast && (
        <div
          data-testid="schedule-send-toast"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[2147483647] flex items-center gap-2 rounded-full border border-[#dadce0]/15 bg-[#303134] px-4 py-2 text-xs font-medium text-[#e8eaed] shadow-2xl font-sans"
        >
          <ScheduleSendIcon size={16} className="text-[#a8c7fa]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Stale / Delayed Message Review Modal (Grace Protection) */}
      {staleReview && (
        <div
          data-testid="schedule-stale-review-modal"
          className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/65 backdrop-blur-xs font-sans text-xs"
          onClick={() => setStaleReview(null)}
        >
          <div
            className="w-[430px] max-w-[94vw] rounded-3xl border border-amber-500/40 bg-[#1e2025] p-6 text-gray-100 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Delayed Scheduled Message
                </h3>
                <p className="text-[11px] text-amber-300">
                  Scheduled for {formatScheduledTimestamp(staleReview.scheduledFor)} ({formatOverdueDuration(Date.now() - staleReview.scheduledFor)} ago)
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 mb-3 leading-relaxed">
              This scheduled text to <strong className="text-white">{staleReview.contactName}</strong> was delayed while your phone was disconnected or your computer was asleep.
            </p>

            <div className="rounded-2xl border border-gray-700 bg-gray-900/90 p-3.5 mb-4 text-xs text-gray-100 whitespace-pre-wrap break-words leading-relaxed font-mono">
              "{staleReview.text}"
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={async () => {
                  const item = staleReview;
                  setStaleReview(null);
                  await deleteScheduledMessage(item.id);
                  await reloadScheduledMessages();
                  showScheduleToast('Delayed message discarded');
                }}
                className="cursor-pointer rounded-xl px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors font-medium"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={() => {
                  const item = staleReview;
                  setStaleReview(null);
                  openScheduleModal(item);
                }}
                className="cursor-pointer rounded-xl px-3.5 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors font-medium"
              >
                Edit & Reschedule
              </button>

              <button
                type="button"
                onClick={async () => {
                  const item = staleReview;
                  setStaleReview(null);
                  await deleteScheduledMessage(item.id);
                  await reloadScheduledMessages();
                  dispatchNativeMessage(item.text, undefined, item.conversationId);
                  showScheduleToast(`Sent scheduled message to ${item.contactName}`);
                }}
                className="cursor-pointer rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow transition-colors"
              >
                Send Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Due Scheduled Message Alert (when user was actively composing in another conversation) */}
      {dueAlert && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[2147483647] flex items-center gap-3 rounded-2xl border border-blue-500/50 bg-[#1b1c20] px-4 py-3 text-xs text-white shadow-2xl font-sans">
          <span className="text-lg">🕒</span>
          <div>
            <div className="font-bold text-blue-300">
              Scheduled message ready for {dueAlert.contactName}
            </div>
            <div className="text-gray-300 truncate max-w-[260px]">"{dueAlert.text}"</div>
          </div>
          <button
            type="button"
            onClick={async () => {
              const targetConv = dueAlert.conversationId;
              const link = document.querySelector<HTMLAnchorElement>(
                `a[data-e2e-conversation][href*="/conversations/${targetConv}"]`
              );
              if (link) link.click();
              setTimeout(async () => {
                await deleteScheduledMessage(dueAlert.id);
                await reloadScheduledMessages();
                dispatchNativeMessage(dueAlert.text, undefined, targetConv);
                setDueAlert(null);
              }, 500);
            }}
            className="cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 font-semibold text-white"
          >
            Jump & Send
          </button>
          <button
            type="button"
            onClick={() => setDueAlert(null)}
            className="cursor-pointer text-gray-400 hover:text-white px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Android-Style "Schedule send" Modal */}
      {modal.open && (
        <div
          data-testid="schedule-send-modal"
          className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-xs font-sans text-xs"
          onClick={closeScheduleModal}
          onKeyDown={e => e.stopPropagation()}
        >
          <div
            className="w-[390px] max-w-[94vw] rounded-3xl border border-gray-700/80 bg-[#1e2025] text-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="px-6 pt-5 pb-3 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="text-blue-400">🕒</span>
                  <span>{modal.editingMessage ? 'Update scheduled message' : 'Schedule send'}</span>
                </h3>
                <button
                  type="button"
                  onClick={closeScheduleModal}
                  className="cursor-pointer text-gray-400 hover:text-white text-sm px-1.5 py-0.5 rounded-lg hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                <span>{getTimezoneLabel()}</span>
                <span className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isPhoneConnected ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span className={isPhoneConnected ? 'text-emerald-300' : 'text-amber-300 font-medium'}>
                    {isPhoneConnected ? 'Phone connected' : 'Phone offline'}
                  </span>
                </span>
              </div>
            </div>

            {/* Editable Message Input Box */}
            <div className="px-6 pt-3.5 pb-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Message to {modal.editingMessage?.contactName || getActiveContactName()}
              </label>
              <textarea
                data-testid="schedule-send-message-input"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Type message to schedule..."
                rows={2}
                autoFocus={!messageText}
                className="w-full rounded-xl border border-gray-700 bg-gray-900/90 px-3 py-2 text-xs text-white outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Browser Alarms & Phone Connection Explainer */}
            <div className="mx-6 mb-2 flex items-start gap-2.5 rounded-xl border border-blue-500/35 bg-blue-500/10 px-3 py-2 text-[11px] text-blue-200/90 leading-tight">
              <span className="text-sm shrink-0">⏰</span>
              <div>
                <span className="font-semibold text-blue-100">Scheduled via Browser Alarms:</span>
                <span className="text-blue-200/80 ml-1">
                  Scheduled texts are backed by chrome.alarms. If your phone disconnects or PC sleeps, messages pause safely. Messages delayed &gt;10 mins will ask for your confirmation before sending.
                </span>
              </div>
            </div>

            {!customMode ? (
              /* Android Preset List + Select Date & Time */
              <div className="px-3 py-2 space-y-0.5">
                {presets.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`schedule-preset-${preset.id}`}
                    disabled={!messageText.trim()}
                    onClick={() => handleConfirmSchedule(preset.timestamp)}
                    className="cursor-pointer w-full flex items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <span className="text-xs font-medium text-gray-200 group-hover:text-white">
                      {preset.label}
                    </span>
                    <span className="text-xs text-gray-400 group-hover:text-blue-300 font-medium">
                      {preset.timeText}
                    </span>
                  </button>
                ))}

                <div className="my-1 border-t border-gray-800/80 mx-3" />

                <button
                  type="button"
                  data-testid="schedule-custom-datetime-btn"
                  onClick={() => setCustomMode(true)}
                  className="cursor-pointer w-full flex items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors hover:bg-blue-500/15 text-blue-300"
                >
                  <span className="flex items-center gap-2.5 font-medium text-xs">
                    <span>📅</span>
                    <span>Select date and time</span>
                  </span>
                  <span className="text-gray-400">➔</span>
                </button>
              </div>
            ) : (
              /* Custom Date & Time Picker View */
              <div className="px-6 py-3 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      data-testid="schedule-custom-date"
                      value={customDate}
                      onChange={e => setCustomDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-700 bg-gray-900 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      data-testid="schedule-custom-time"
                      value={customTime}
                      onChange={e => setCustomTime(e.target.value)}
                      className="w-full rounded-xl border border-gray-700 bg-gray-900 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setCustomMode(false)}
                    className="cursor-pointer rounded-xl px-3 py-1.5 text-xs text-gray-400 hover:bg-white/10 hover:text-white"
                  >
                    ← Back to presets
                  </button>

                  <button
                    type="button"
                    data-testid="schedule-custom-save-btn"
                    disabled={!messageText.trim() || !customDate || !customTime}
                    onClick={handleCustomSave}
                    className="cursor-pointer rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 py-1.5 text-xs font-semibold text-white shadow"
                  >
                    Save & Schedule
                  </button>
                </div>
              </div>
            )}

            {/* Footer Tip */}
            <div className="bg-[#18191e] px-6 py-2.5 text-[10px] text-gray-500 flex items-center justify-between border-t border-gray-800/80">
              <span>Tip: Long-press or right-click Send anytime</span>
              <span>{scheduled.length} scheduled</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
