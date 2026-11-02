import { useSyncExternalStore } from 'react';
import { getAutoRules, type AutoRule } from '../db';
import { SEL, attr } from '../selectors';
import { setDispatchingNative } from '../features/UndoSendBuffer';
import { trustedClick } from '../trustedClick';

export interface AutoResponderSnapshot {
  active: boolean;
  rules: AutoRule[];
  keepAliveActive: boolean;
  lastReply: { ruleName: string; timestamp: number; recipient: string } | null;
}

class AutoResponder {
  private active = false;
  private rules: AutoRule[] = [];
  private observer: MutationObserver | null = null;
  private seenMessages = new WeakSet<Element>();
  private lastRepliedTimes = new Map<string, number>();
  private wakeLock: any = null;
  private releaseWebLock: (() => void) | null = null;
  private keepAliveActive = false;
  private lastReply: { ruleName: string; timestamp: number; recipient: string } | null = null;
  private listeners = new Set<() => void>();
  private snapshot: AutoResponderSnapshot = {
    active: false,
    rules: [],
    keepAliveActive: false,
    lastReply: null
  };

  private notify() {
    this.snapshot = {
      active: this.active,
      rules: this.rules,
      keepAliveActive: this.keepAliveActive,
      lastReply: this.lastReply
    };
    this.listeners.forEach(l => l());
  }

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public getSnapshot = (): AutoResponderSnapshot => {
    return this.snapshot;
  };

  public async reloadRules() {
    const all = await getAutoRules();
    this.rules = all.filter(r => r.active !== false);
    this.notify();
  }

  public async start() {
    await this.reloadRules();
    this.active = true;
    this.markExistingMessages();

    // Observe document for new incoming messages
    this.observer = new MutationObserver(() => this.scanForIncoming());
    this.observer.observe(document.body, { childList: true, subtree: true });

    // Enable keepalive
    await this.enableKeepAlive();
    this.notify();
  }

  public stop() {
    this.active = false;
    this.observer?.disconnect();
    this.observer = null;
    this.disableKeepAlive();
    this.notify();
  }

  public toggle() {
    if (this.active) this.stop();
    else this.start();
  }

  private async enableKeepAlive() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      }
      if ('locks' in navigator && !this.releaseWebLock) {
        (navigator as any).locks.request('mp-keepalive', () => {
          return new Promise<void>(resolve => {
            this.releaseWebLock = resolve;
          });
        });
      }
      this.keepAliveActive = true;
    } catch {
      this.keepAliveActive = false;
    }
  }

  private disableKeepAlive() {
    this.wakeLock?.release?.().catch(() => {});
    this.wakeLock = null;
    if (this.releaseWebLock) {
      this.releaseWebLock();
      this.releaseWebLock = null;
    }
    this.keepAliveActive = false;
  }

  private markExistingMessages() {
    const msgs = document.querySelectorAll(`[${attr.outgoing}="false"]`);
    msgs.forEach(m => this.seenMessages.add(m));
  }

  private async scanForIncoming() {
    if (!this.active || this.rules.length === 0) return;

    // Find incoming messages
    const incomingEls = document.querySelectorAll(`[${attr.outgoing}="false"]`);
    const newEls = Array.from(incomingEls).filter(el => !this.seenMessages.has(el));
    if (newEls.length === 0) return;

    // Mark as seen immediately so we don't trigger twice
    newEls.forEach(el => this.seenMessages.add(el));

    const latest = newEls[newEls.length - 1];
    const textEl = latest.querySelector(SEL.messageText) || latest;
    const text = (textEl.textContent || '').trim().toLowerCase();
    if (!text) return;

    // Check against active rules
    const matchedRule = this.rules.find(r => {
      return r.keywords.some(kw => kw.trim() && text.includes(kw.trim().toLowerCase()));
    });

    if (!matchedRule) return;

    // Cooldown check (prevent infinite reply loops, 60s per conversation)
    const convId = location.pathname;
    const lastTime = this.lastRepliedTimes.get(convId) || 0;
    if (Date.now() - lastTime < 60000) return;

    this.lastRepliedTimes.set(convId, Date.now());

    // Simulated human response delay: 2.5s - 4.5s
    const delay = 2500 + Math.random() * 2000;
    setTimeout(async () => {
      if (!this.active) return;
      try {
        const composer = document.querySelector<HTMLElement>(SEL.editable);
        if (!composer) return;

        composer.focus();
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, matchedRule.replyText);
        composer.dispatchEvent(new Event('input', { bubbles: true }));

        await new Promise(r => setTimeout(r, 400));
        const sendBtn = Array.from(
          document.querySelectorAll<HTMLButtonElement>(`${SEL.sendButton}, button[data-e2e-send-text-button]`)
        ).find(b => b.offsetParent !== null);
        if (sendBtn && !sendBtn.disabled) {
          setDispatchingNative(true);
          await trustedClick(sendBtn);
          setTimeout(() => setDispatchingNative(false), 300);
          this.markExistingMessages();

          const headerTitle = document.querySelector(SEL.headerTitle)?.textContent?.trim() || 'Conversation';
          this.lastReply = {
            ruleName: matchedRule.name,
            timestamp: Date.now(),
            recipient: headerTitle
          };
          this.notify();
        }
      } catch (err) {
        console.warn('[ProText] Auto-responder error:', err);
      }
    }, delay);
  }
}

export const autoResponder = new AutoResponder();

export function useAutoResponderStore(): AutoResponderSnapshot {
  return useSyncExternalStore(autoResponder.subscribe, autoResponder.getSnapshot);
}
