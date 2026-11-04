import { useEffect, useRef, useState } from 'react';
import { useAnchor } from '../engine';
import { SEL } from '../selectors';
import { getThreadHistory, saveThreadHistory, type CachedMessage, type CachedThread } from '../db';
import { useFeature } from '../settings/store';
import { useThemePalette } from './ThemeEngine';

interface PeekTarget {
  conversationId: string;
  name: string;
  snippet: string;
  time: string;
  top: number;
  left: number;
}

/** Automatically caches messages from the currently open conversation into local IndexedDB. */
function useThreadRecorder(enabled: boolean) {
  const messagesList = useAnchor(SEL.messagesList);

  useEffect(() => {
    if (!enabled || !messagesList) return;

    let lastSavedSig = '';
    let debounceTimer: number | null = null;

    const record = () => {
      debounceTimer = null;
      const match = location.pathname.match(/\/conversations\/([^/?#]+)/);
      if (!match) return;
      const conversationId = match[1];

      const allWrappers = messagesList.querySelectorAll('mws-message-wrapper');
      if (!allWrappers.length) return;

      // Only inspect the last 20 wrappers since saveThreadHistory only stores the last 20 messages
      const startIdx = Math.max(0, allWrappers.length - 20);
      const messages: CachedMessage[] = [];
      for (let i = startIdx; i < allWrappers.length; i++) {
        const w = allWrappers[i];
        const core = w.querySelector('[data-e2e-message-wrapper-core]');
        const textEl = w.querySelector('[data-e2e-text-message-content]');
        const id = core?.getAttribute('data-e2e-message-id');
        const text = textEl?.textContent?.trim();
        const outgoing = core?.getAttribute('data-e2e-message-outgoing') === 'true';
        if (id && text) {
          messages.push({ id, text, outgoing });
        }
      }

      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        const headerTitle = document.querySelector(SEL.headerTitle)?.textContent?.trim() || '';
        const sig = `${conversationId}:${headerTitle}:${messages.length}:${lastMsg.id}:${lastMsg.text}`;
        if (sig === lastSavedSig) return;
        lastSavedSig = sig;
        void saveThreadHistory(conversationId, headerTitle, messages);
      }
    };

    const scheduleRecord = () => {
      if (debounceTimer !== null) return;
      debounceTimer = window.setTimeout(record, 500);
    };

    // Initial capture when message list mounts
    record();

    const mo = new MutationObserver(scheduleRecord);
    mo.observe(messagesList, { childList: true, subtree: true });
    return () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      mo.disconnect();
    };
  }, [enabled, messagesList]);
}

export function QuickPeek() {
  const enabled = useFeature('quickPeek');
  const palette = useThemePalette();
  useThreadRecorder(enabled);

  const [target, setTarget] = useState<PeekTarget | null>(null);
  const [thread, setThread] = useState<CachedThread | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const modalHovered = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setTarget(null);
      return;
    }

    const onMouseOver = (e: MouseEvent) => {
      const targetEl = e.target as HTMLElement | null;
      const item = targetEl?.closest('mws-conversation-list-item');
      if (!item) return;

      const link = item.querySelector('a[data-e2e-conversation]');
      if (!link) return;

      const href = link.getAttribute('href') || '';
      const match = href.match(/\/conversations\/([^/?#]+)/);
      if (!match) return;

      const conversationId = match[1];
      const name = item.querySelector('[data-e2e-conversation-name]')?.textContent?.trim() || 'Conversation';
      const snippet = item.querySelector('[data-e2e-conversation-snippet]')?.textContent?.trim() || '';
      const rawTime = item.querySelector('mws-relative-timestamp')?.textContent?.trim() || '';
      // Clean up duplicate concatenated day labels e.g. "SundaySun" -> "Sun"
      const time = rawTime.length > 8 ? rawTime.slice(0, Math.ceil(rawTime.length / 2)).trim() : rawTime;

      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }

      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);

      hoverTimer.current = window.setTimeout(async () => {
        const rect = item.getBoundingClientRect();
        // Position right next to the conversation list item
        const top = Math.max(70, Math.min(window.innerHeight - 420, rect.top));
        const left = rect.right + 8;

        setTarget({ conversationId, name, snippet, time, top, left });
        const cached = await getThreadHistory(conversationId);
        setThread(cached || null);
      }, 300);
    };

    const onMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related?.closest('mws-conversation-list-item')) return;

      if (hoverTimer.current) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }

      closeTimer.current = window.setTimeout(() => {
        if (!modalHovered.current) {
          setTarget(null);
          setThread(null);
        }
      }, 200);
    };

    const list = document.querySelector('mws-conversations-list') || document.body;
    list.addEventListener('mouseover', onMouseOver as EventListener);
    list.addEventListener('mouseout', onMouseOut as EventListener);

    return () => {
      list.removeEventListener('mouseover', onMouseOver as EventListener);
      list.removeEventListener('mouseout', onMouseOut as EventListener);
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, [enabled]);

  if (!enabled || !target) return null;

  const messages = thread?.messages ? thread.messages.slice(-10) : [];

  return (
    <div
      onMouseEnter={() => {
        modalHovered.current = true;
        if (closeTimer.current) window.clearTimeout(closeTimer.current);
      }}
      onMouseLeave={() => {
        modalHovered.current = false;
        setTarget(null);
        setThread(null);
      }}
      style={{
        top: `${target.top}px`,
        left: `${target.left}px`,
        backgroundColor: palette.boxBg,
        borderColor: palette.boxBorder,
        color: palette.textColor,
        boxShadow: palette.boxShadow
      }}
      className="fixed z-[2147483640] pointer-events-auto w-80 max-w-[90vw] rounded-xl border p-3.5 font-sans backdrop-blur-md transition-all shadow-xl animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header */}
      <div
        className="mb-2.5 flex items-center justify-between border-b pb-2"
        style={{ borderColor: palette.dividerBorder }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{
              backgroundColor: palette.avatarBg,
              color: palette.avatarText
            }}
          >
            {target.name.charAt(0).toUpperCase()}
          </div>
          <div
            className="truncate text-sm font-semibold"
            style={{ color: palette.textColor }}
          >
            {target.name}
          </div>
        </div>
        <div
          className="shrink-0 text-[11px]"
          style={{ color: palette.mutedTextColor }}
        >
          {target.time}
        </div>
      </div>

      {/* Message preview list (last 10 messages) */}
      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1 text-xs">
        {messages.length > 0 ? (
          messages.map(m => (
            <div
              key={m.id}
              className={`flex ${m.outgoing ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-1.5 leading-snug break-words ${
                  m.outgoing ? 'rounded-br-xs' : 'rounded-bl-xs'
                }`}
                style={{
                  backgroundColor: m.outgoing ? palette.outgoingBg : palette.incomingBg,
                  color: m.outgoing ? palette.outgoingText : palette.incomingText
                }}
              >
                {m.text}
              </div>
            </div>
          ))
        ) : (
          <div className="py-2 text-center">
            <div
              className="rounded-lg p-2.5 text-left border"
              style={{
                backgroundColor: palette.snippetBg,
                borderColor: palette.snippetBorder || palette.dividerBorder,
                color: palette.textColor
              }}
            >
              <span
                className="text-[10px] font-semibold tracking-wider uppercase block mb-1"
                style={{ color: palette.mutedTextColor }}
              >
                Latest
              </span>
              <p className="line-clamp-3 text-xs italic opacity-90">
                {target.snippet || '(no snippet available)'}
              </p>
            </div>
            <p
              className="mt-2 text-[10px]"
              style={{ color: palette.mutedTextColor }}
            >
              Open this thread once to cache full history
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="mt-2.5 border-t pt-1.5 text-center"
        style={{ borderColor: palette.dividerBorder }}
      >
        <span
          className="text-[10px]"
          style={{ color: palette.mutedTextColor }}
        >
          Quick Peek · Click thread to open
        </span>
      </div>
    </div>
  );
}
