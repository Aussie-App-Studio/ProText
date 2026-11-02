import { useEffect, useRef, useState } from 'react';
import { SEL } from '../selectors';
import { useFeature } from '../settings/store';
import { insertIntoComposer } from './QuickEmojiBar';
import { isSlashPopupOpen } from './SlashCommands';
import { trustedClick } from '../trustedClick';
import { SendIcon } from '../ui/MaterialIcons';

let isDispatchingNative = false;
let queuedConversationIdAfterDispatch: string | null = null;

export function setDispatchingNative(val: boolean) {
  isDispatchingNative = val;
}

if (typeof window !== 'undefined') {
  (window as any).__mpDispatchNative = dispatchNativeMessage;
}

export function getIsDispatchingNative(): boolean {
  return isDispatchingNative;
}

export function getActiveConversationIdFromUrl(): string {
  const match = location.pathname.match(/\/conversations\/([^/?#]+)/);
  return match ? match[1] : '';
}

export function getActiveHeaderContactName(): string {
  const h2 = document.querySelector(`${SEL.headerTitle} h2`);
  const titleEl = h2 || document.querySelector(SEL.headerTitle);
  return titleEl?.getAttribute('data-mp-original-name') || titleEl?.textContent?.trim() || 'Contact';
}

/** Reads current text in Google Messages composer */
function readCurrentComposerText(): string {
  const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null);
  const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(SEL.textarea)).find(e => e.offsetParent !== null);
  if (ed) return (ed.textContent || '').trim();
  if (ta) return (ta.value || '').trim();
  return '';
}

/** Navigates Google Messages to a specific conversation ID and waits until its composer is active and verified */
export async function navigateToConversation(
  targetConvId: string,
  _expectedContactName?: string,
  timeoutMs = 2500
): Promise<boolean> {
  if (!targetConvId) return false;
  if (getActiveConversationIdFromUrl() === targetConvId) {
    return true;
  }

  const link = document.querySelector<HTMLAnchorElement>(
    `a[data-e2e-conversation][href*="/conversations/${targetConvId}"]`
  );

  if (link) {
    link.click();
  } else {
    window.history.pushState(null, '', `/web/conversations/${targetConvId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 40));
    const currId = getActiveConversationIdFromUrl();
    const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(
      e => e.offsetParent !== null
    );
    if (currId === targetConvId && ed) {
      // Give Angular 100ms to finish binding the new conversation's composer state
      await new Promise(r => setTimeout(r, 100));
      return getActiveConversationIdFromUrl() === targetConvId;
    }
  }

  return false;
}

/** Clears Google Messages composer cleanly so Angular's internal model stays in sync */
export function clearNativeComposer() {
  const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null);
  const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(SEL.textarea)).find(e => e.offsetParent !== null);

  if (ed) {
    ed.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(ed);
    sel?.removeAllRanges();
    sel?.addRange(range);
    document.execCommand('delete', false);
    if ((ed.textContent || '').length > 0) {
      ed.textContent = '';
    }
    ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
  }

  if (ta) {
    ta.value = '';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/**
 * Dispatches a message through Google's native composer and Send button without triggering the Undo Send buffer.
 * When `expectedConversationId` is provided, strictly verifies at every step that the active conversation
 * matches `expectedConversationId` so a message can NEVER be sent to the wrong recipient.
 */
export function dispatchNativeMessage(
  text: string,
  onComplete?: (success: boolean) => void,
  expectedConversationId?: string
) {
  if (typeof window !== 'undefined') {
    (window as any).__mpDispatchNative = dispatchNativeMessage;
  }
  const clean = text.trim();
  if (!clean) {
    onComplete?.(false);
    return;
  }

  // Strict Recipient Guard #1: Verify active conversation before touching the composer
  if (expectedConversationId && getActiveConversationIdFromUrl() !== expectedConversationId) {
    onComplete?.(false);
    return;
  }

  isDispatchingNative = true;
  queuedConversationIdAfterDispatch = null;

  const finishDispatch = (success: boolean) => {
    isDispatchingNative = false;
    const queuedConvId = queuedConversationIdAfterDispatch;
    queuedConversationIdAfterDispatch = null;
    onComplete?.(success);
    if (queuedConvId && queuedConvId !== getActiveConversationIdFromUrl()) {
      void navigateToConversation(queuedConvId);
    }
  };

  try {
    window.focus();
  } catch {}

  const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null);
  const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(`${SEL.textarea}, mws-autosize-textarea textarea`)).find(e => e.offsetParent !== null);

  if (ed) {
    ed.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(ed);
    sel?.removeAllRanges();
    sel?.addRange(range);

    try {
      ed.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: clean }));
    } catch {}

    const inserted = document.execCommand('insertText', false, clean);
    if (!inserted || (ed.textContent || '').trim() !== clean) {
      ed.textContent = clean;
    }
    ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: clean }));
    ed.dispatchEvent(new Event('change', { bubbles: true }));

    // Also notify hidden textarea inside autosize wrapper so Angular form model stays in sync
    const innerTa = document.querySelector<HTMLTextAreaElement>('mws-autosize-textarea textarea');
    if (innerTa) {
      innerTa.value = clean;
      innerTa.dispatchEvent(new Event('input', { bubbles: true }));
      innerTa.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else if (ta) {
    ta.focus();
    ta.value = clean;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  }

  let attempts = 0;
  const attemptSend = () => {
    attempts++;

    // Strict Recipient Guard #2: Verify active conversation right before clicking Send
    if (expectedConversationId && getActiveConversationIdFromUrl() !== expectedConversationId) {
      clearNativeComposer();
      finishDispatch(false);
      return;
    }

    const sendBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        `${SEL.sendButton}, button[data-e2e-send-text-button], mws-message-compose button.send-button`
      )
    ).find(b => b.offsetParent !== null && b.getBoundingClientRect().width > 0);

    const isReady =
      sendBtn &&
      !sendBtn.disabled &&
      !sendBtn.classList.contains('mat-mdc-button-disabled') &&
      sendBtn.getAttribute('aria-disabled') !== 'true';

    console.log('[dispatchNativeMessage] ' + JSON.stringify({ attempts, isReady, sendBtn: !!sendBtn, disabled: sendBtn?.disabled, hasDisabledClass: sendBtn?.classList.contains('mat-mdc-button-disabled'), ariaDisabled: sendBtn?.getAttribute('aria-disabled') }));

    if (isReady && sendBtn) {
      // Final check immediately before dispatch
      if (expectedConversationId && getActiveConversationIdFromUrl() !== expectedConversationId) {
        clearNativeComposer();
        finishDispatch(false);
        return;
      }

      // 1. Dispatch custom Angular events to host components
      try {
        const sendBtnHost = document.querySelector('mws-message-send-button, mw-message-send-button');
        const compose = document.querySelector('mws-message-compose');
        sendBtnHost?.dispatchEvent(new CustomEvent('sendClicked', { bubbles: true }));
        compose?.dispatchEvent(new CustomEvent('sendMessage', { bubbles: true }));
      } catch {}

      // 2. Immediate element click
      try {
        sendBtn.click();
      } catch {}

      // 2. Immediate Enter keydown on composer
      const activeEd = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(
        e => e.offsetParent !== null
      );
      if (activeEd && (activeEd.textContent || '').trim().length > 0) {
        try {
          const enterEv = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          activeEd.dispatchEvent(enterEv);
        } catch {}
      }

      // 3. Trusted click fallback via background worker
      void trustedClick(sendBtn).then(async () => {
        // Wait and verify composer cleared
        await new Promise(r => setTimeout(r, 200));

        if (expectedConversationId && getActiveConversationIdFromUrl() !== expectedConversationId) {
          finishDispatch(false);
          return;
        }

        const currentEd = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(
          e => e.offsetParent !== null
        );
        const remaining = (currentEd?.textContent || '').trim();

        if (remaining.length > 0 && attempts < 5) {
          if (!expectedConversationId || getActiveConversationIdFromUrl() === expectedConversationId) {
            const refreshedBtn = Array.from(
              document.querySelectorAll<HTMLButtonElement>(
                `${SEL.sendButton}, button[data-e2e-send-text-button], mws-message-compose button.send-button`
              )
            ).find(b => b.offsetParent !== null);
            if (refreshedBtn && !refreshedBtn.disabled && !refreshedBtn.classList.contains('mat-mdc-button-disabled')) {
              await trustedClick(refreshedBtn);
            }
          }
        }

        setTimeout(() => {
          const finalEd = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(
            e => e.offsetParent !== null
          );
          const success = !(finalEd?.textContent || '').trim();
          finishDispatch(success);
        }, 200);
      });
    } else if (attempts < 20) {
      setTimeout(attemptSend, 80);
    } else {
      finishDispatch(false);
    }
  };

  setTimeout(attemptSend, 100);
}

interface PendingBufferedMessage {
  text: string;
  conversationId: string;
  contactName: string;
  pausedForSwitch?: boolean;
}

export function UndoSendBuffer() {
  const enabled = useFeature('undoSend');
  const [pending, setPending] = useState<PendingBufferedMessage | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(3);

  const pendingRef = useRef<PendingBufferedMessage | null>(null);
  const timerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  };

  const cancelAndRestore = async () => {
    clearTimers();
    const item = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    if (!item) return;

    // If the user switched conversations before hitting Undo, switch back to the original conversation
    // so the restored draft goes back into the right person's message box.
    if (item.conversationId && getActiveConversationIdFromUrl() !== item.conversationId) {
      await navigateToConversation(item.conversationId, item.contactName);
    }
    insertIntoComposer(item.text);
  };

  const dispatchNow = async () => {
    clearTimers();
    const item = pendingRef.current;
    if (!item) return;

    const currentConvId = getActiveConversationIdFromUrl();
    const switchedChats = Boolean(item.conversationId && currentConvId !== item.conversationId);
    const savedOtherDraft = switchedChats ? readCurrentComposerText() : '';

    // If user switched to another conversation during the 3-second buffer,
    // navigate back to the original recipient's conversation before dispatching!
    if (switchedChats) {
      if (savedOtherDraft) {
        clearNativeComposer();
      }
      const navigated = await navigateToConversation(item.conversationId, item.contactName);
      if (!navigated || getActiveConversationIdFromUrl() !== item.conversationId) {
        // Could not automatically switch back: hold the message safely instead of sending to the wrong person
        const held: PendingBufferedMessage = { ...item, pausedForSwitch: true };
        pendingRef.current = held;
        setPending(held);
        return;
      }
    }

    pendingRef.current = null;
    setPending(null);

    dispatchNativeMessage(
      item.text,
      async (success) => {
        if (!success && getActiveConversationIdFromUrl() !== item.conversationId) {
          // Safety fallback: hold message if conversation switched mid-dispatch
          const held: PendingBufferedMessage = { ...item, pausedForSwitch: true };
          pendingRef.current = held;
          setPending(held);
          return;
        }

        // If user was viewing another conversation, smoothly return them to it and restore any draft
        if (switchedChats && currentConvId && currentConvId !== item.conversationId) {
          const returned = await navigateToConversation(currentConvId);
          if (returned && savedOtherDraft) {
            insertIntoComposer(savedOtherDraft);
          }
        }
      },
      item.conversationId
    );
  };

  // Intercept Enter key, Send button click, and mid-dispatch sidebar navigation
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      pendingRef.current = null;
      setPending(null);
      return;
    }

    const startBuffer = (text: string) => {
      clearTimers();
      const conversationId = getActiveConversationIdFromUrl();
      const contactName = getActiveHeaderContactName();

      const nextItem: PendingBufferedMessage = {
        text,
        conversationId,
        contactName
      };

      pendingRef.current = nextItem;
      setPending(nextItem);
      setSecondsLeft(3);

      // Clear composer text immediately
      clearNativeComposer();

      // Interval countdown
      intervalRef.current = setInterval(() => {
        setSecondsLeft(sec => {
          if (sec <= 1) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return sec - 1;
        });
      }, 1000);

      // Final dispatch timeout after 3 seconds
      timerRef.current = setTimeout(() => {
        void dispatchNow();
      }, 3000);
    };

    const handleKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (isDispatchingNative) return;
        if (isSlashPopupOpen()) return;

        const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(el => el.offsetParent !== null);
        const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(SEL.textarea)).find(el => el.offsetParent !== null);
        const isEd = ed && (document.activeElement === ed || ed.contains(document.activeElement));
        const isTa = ta && document.activeElement === ta;

        if (isEd || isTa) {
          const text = isEd ? (ed?.textContent || '').trim() : (ta?.value || '').trim();
          if (!text) return;

          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          startBuffer(text);
        }
      } else if (pendingRef.current && (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key === 'z'))) {
        e.preventDefault();
        void cancelAndRestore();
      }
    };

    const handleClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;

      // Guard: If user clicks a sidebar conversation while native dispatch is mid-flight (~250ms),
      // defer the conversation switch until the send click completes so it cannot land on the new chat!
      if (isDispatchingNative) {
        const convLink = target?.closest<HTMLAnchorElement>('a[data-e2e-conversation]');
        if (convLink) {
          const href = convLink.getAttribute('href') || '';
          const m = href.match(/\/conversations\/([^/?#]+)/);
          if (m && m[1]) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            queuedConversationIdAfterDispatch = m[1];
            return;
          }
        }
      }

      const sendBtn = target?.closest(SEL.sendButton);
      if (sendBtn) {
        if (isDispatchingNative) return;

        const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(el => el.offsetParent !== null);
        const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(SEL.textarea)).find(el => el.offsetParent !== null);
        const text = ed ? (ed.textContent || '').trim() : (ta?.value || '').trim();
        if (!text) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        startBuffer(text);
      }
    };

    window.addEventListener('keydown', handleKeyDownCapture, true);
    window.addEventListener('click', handleClickCapture, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDownCapture, true);
      window.removeEventListener('click', handleClickCapture, true);
      clearTimers();
    };
  }, [enabled]);

  if (!enabled || !pending) return null;

  return (
    <div
      data-testid="undo-send-banner"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2147483647] pointer-events-auto flex items-center gap-3 rounded-full border border-[#dadce0]/15 bg-[#303134] px-4 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.45)] text-xs text-[#e8eaed] animate-in fade-in slide-in-from-bottom-3 duration-150 font-sans"
    >
      <div className="flex items-center gap-2.5">
        <div
          data-testid="undo-send-countdown"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#a8c7fa]/20 border border-[#a8c7fa]/50 font-mono text-xs font-bold text-[#a8c7fa]"
        >
          {pending.pausedForSwitch ? '!' : secondsLeft}
        </div>
        <div>
          <span className="font-medium text-[#e8eaed]">
            {pending.pausedForSwitch
              ? `Held message for ${pending.contactName}`
              : `Sending to ${pending.contactName}...`}
          </span>
          <p className="text-[10px] text-[#9aa0a6]">
            {pending.pausedForSwitch
              ? 'Switched chats — click Send Now to jump back & deliver'
              : 'Press Esc or Ctrl+Z to undo'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-l border-[#dadce0]/15 pl-3">
        <button
          type="button"
          data-testid="undo-send-cancel-btn"
          onClick={() => void cancelAndRestore()}
          className="cursor-pointer rounded-full bg-[#a8c7fa] hover:bg-[#d2e3fc] text-[#062e6f] font-semibold px-3.5 py-1 transition-colors"
        >
          Undo
        </button>

        <button
          type="button"
          data-testid="undo-send-now-btn"
          onClick={() => void dispatchNow()}
          className="cursor-pointer flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-[#dadce0] hover:bg-white/[0.08] hover:text-white transition-colors"
          title={`Send immediately to ${pending.contactName}`}
        >
          <span>Send now</span>
          <SendIcon size={12} />
        </button>
      </div>
    </div>
  );
}
