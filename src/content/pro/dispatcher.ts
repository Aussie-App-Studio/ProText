import { useSyncExternalStore } from 'react';
import {
  saveCampaign,
  saveCampaignLog,
  getCampaign,
  getCampaignLogs,
  type Campaign,
  type CampaignLog
} from '../db';
import { SEL } from '../selectors';
import { renderTemplate, type ContactRecipient } from './parser';
import { setDispatchingNative } from '../features/UndoSendBuffer';
import { trustedClick } from '../trustedClick';

export type DispatcherState = 'idle' | 'running' | 'paused' | 'cancelled';

export interface DispatcherSnapshot {
  state: DispatcherState;
  campaign: Campaign | null;
  currentRecipient: ContactRecipient | null;
  countdownSeconds: number;
  recentLogs: CampaignLog[];
  errorMessage: string | null;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class Dispatcher {
  private state: DispatcherState = 'idle';
  private campaign: Campaign | null = null;
  private currentRecipient: ContactRecipient | null = null;
  private countdownSeconds = 0;
  private recentLogs: CampaignLog[] = [];
  private errorMessage: string | null = null;
  private listeners = new Set<() => void>();
  private snapshot: DispatcherSnapshot = {
    state: 'idle',
    campaign: null,
    currentRecipient: null,
    countdownSeconds: 0,
    recentLogs: [],
    errorMessage: null
  };

  private notify() {
    this.snapshot = {
      state: this.state,
      campaign: this.campaign ? { ...this.campaign } : null,
      currentRecipient: this.currentRecipient,
      countdownSeconds: this.countdownSeconds,
      recentLogs: this.recentLogs,
      errorMessage: this.errorMessage
    };
    this.listeners.forEach(l => l());
  }

  private isPaused(): boolean {
    return (this.state as string) === 'paused';
  }

  private isCancelled(): boolean {
    return (this.state as string) === 'cancelled';
  }

  public get currentState(): DispatcherState {
    return this.state;
  }

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public getSnapshot = (): DispatcherSnapshot => {
    return this.snapshot;
  };

  private async waitForElement<T extends HTMLElement>(
    selectors: string[],
    timeout = 8000
  ): Promise<T | null> {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el && (el as HTMLElement).offsetParent !== null) {
          return el as T;
        }
      }
      await sleep(150);
    }
    return null;
  }

  /** Injects text into Google's contenteditable composer without triggering CSP */
  private async setComposerText(text: string): Promise<void> {
    const box = await this.waitForElement<HTMLElement>([
      SEL.editable,
      'mws-message-compose [contenteditable="true"]',
      'div[contenteditable="true"][data-e2e-message-input-box]'
    ], 6000);

    if (!box) {
      throw new Error('Message composer input box not found.');
    }

    box.focus();
    // Select all existing content
    document.execCommand('selectAll', false);
    // Insert text safely via execCommand
    const success = document.execCommand('insertText', false, text);
    if (!success) {
      // Fallback
      box.textContent = text;
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }
    box.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Initiates a new chat with the target phone number */
  private async openChatWithPhone(phone: string): Promise<void> {
    // 1. Click Start Chat button
    const startBtn = await this.waitForElement<HTMLAnchorElement>([
      SEL.startChatButton,
      'a[data-e2e-start-button]',
      'a[href*="/web/conversations/new"]'
    ], 5000);

    if (!startBtn) {
      throw new Error('Start chat button not found in Google Messages.');
    }
    startBtn.click();
    await sleep(400);

    // 2. Wait for recipient input
    const input = await this.waitForElement<HTMLInputElement>([
      'input[data-e2e-contact-input]',
      'mws-contact-chips-input input',
      'input[data-e2e-contact-search-input]',
      'input[placeholder*="phone" i]',
      'input[placeholder*="name" i]',
      'input[role="combobox"]'
    ], 6000);

    if (!input) {
      throw new Error('Recipient search input not found.');
    }

    input.focus();
    // Set value and trigger native events
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, phone);
    } else {
      input.value = phone;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(800);

    // 3. Select recipient option or press Enter
    const option = await this.waitForElement<HTMLElement>([
      'button[data-e2e-send-to-button]',
      'mw-contact-selector-button button',
      '[data-e2e-contact-row]',
      'mw-contact-row button',
      'mws-contact-selector-button button',
      'mws-contact-list-item button'
    ], 3000);
    if (option) {
      option.click();
    } else {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
    }

    await sleep(800);

    // 4. Verify composer appears
    const composer = await this.waitForElement<HTMLElement>([
      SEL.editable,
      'mws-message-compose [contenteditable="true"]'
    ], 7000);

    if (!composer) {
      throw new Error('Conversation failed to load for ' + phone);
    }
  }

  /** Clicks the native Send button */
  private async triggerSend(): Promise<void> {
    await sleep(400);
    const sendBtn = await this.waitForElement<HTMLButtonElement>([
      SEL.sendButton,
      'button[data-e2e-send-text-button]',
      'button[aria-label*="send" i]'
    ], 5000);

    if (!sendBtn) {
      throw new Error('Send button not found.');
    }

    if (sendBtn.disabled || sendBtn.getAttribute('aria-disabled') === 'true') {
      throw new Error('Send button is disabled (message empty or recipient invalid).');
    }

    setDispatchingNative(true);
    try {
      await trustedClick(sendBtn);
      await sleep(600);
    } finally {
      setDispatchingNative(false);
    }
  }

  private getRandomDelay(minSec: number, maxSec: number): number {
    const min = Math.max(5, minSec);
    const max = Math.max(min, maxSec);
    return Math.floor((min + Math.random() * (max - min)) * 1000);
  }

  /** Main Campaign Dispatch Loop */
  public async startCampaign(
    campaign: Campaign,
    recipients: ContactRecipient[]
  ): Promise<void> {
    if (this.state === 'running' || this.state === 'paused') {
      throw new Error('A campaign is already running.');
    }

    this.state = 'running';
    this.campaign = {
      ...campaign,
      status: 'running',
      startedAt: Date.now(),
      sent: 0,
      failed: 0
    };
    this.recentLogs = [];
    this.errorMessage = null;
    await saveCampaign(this.campaign);
    this.notify();

    for (let i = 0; i < recipients.length; i++) {
      // Pause check
      while (this.isPaused()) {
        await sleep(400);
      }

      // Kill Switch check
      if (this.isCancelled()) {
        break;
      }

      const recipient = recipients[i];
      this.currentRecipient = recipient;
      this.notify();

      const personalizedText = renderTemplate(this.campaign.templateText, recipient.vars);
      const logItem: CampaignLog = {
        id: `log-${Date.now()}-${i}`,
        campaignId: this.campaign.id,
        name: recipient.name,
        phone: recipient.phone,
        vars: recipient.vars,
        text: personalizedText,
        status: 'pending',
        timestamp: Date.now()
      };

      try {
        await this.openChatWithPhone(recipient.phone);

        if (this.isCancelled()) break;

        await this.setComposerText(personalizedText);
        await this.triggerSend();

        logItem.status = 'sent';
        this.campaign.sent += 1;
      } catch (err: any) {
        logItem.status = 'failed';
        logItem.error = err?.message || 'Send failed';
        this.campaign.failed += 1;
      }

      // Save log & update campaign stats in IndexedDB
      await saveCampaignLog(logItem);
      await saveCampaign(this.campaign);

      this.recentLogs = [logItem, ...this.recentLogs.slice(0, 49)];
      this.notify();

      // Enforce anti-spam human-like cadence between messages (unless last message)
      if (i < recipients.length - 1 && !this.isCancelled()) {
        let waitMs = this.getRandomDelay(this.campaign.minDelay, this.campaign.maxDelay);
        while (waitMs > 0 && !this.isCancelled()) {
          if (this.isPaused()) {
            await sleep(300);
            continue;
          }
          this.countdownSeconds = Math.ceil(waitMs / 1000);
          this.notify();
          await sleep(500);
          waitMs -= 500;
        }
        this.countdownSeconds = 0;
      }
    }

    // Finalize campaign
    this.campaign.status = this.isCancelled() ? 'cancelled' : 'completed';
    this.campaign.endedAt = Date.now();
    await saveCampaign(this.campaign);

    this.state = 'idle';
    this.currentRecipient = null;
    this.countdownSeconds = 0;
    this.notify();
  }

  public pause(): void {
    if (this.state === 'running') {
      this.state = 'paused';
      if (this.campaign) {
        this.campaign.status = 'paused';
        saveCampaign(this.campaign);
      }
      this.notify();
    }
  }

  public resume(): void {
    if (this.state === 'paused') {
      this.state = 'running';
      if (this.campaign) {
        this.campaign.status = 'running';
        saveCampaign(this.campaign);
      }
      this.notify();
    }
  }

  /** The Big Red Kill Switch: Immediately halts all dispatch */
  public cancel(): void {
    if (this.state !== 'idle') {
      this.state = 'cancelled';
      if (this.campaign) {
        this.campaign.status = 'cancelled';
        this.campaign.endedAt = Date.now();
        saveCampaign(this.campaign);
      }
      this.notify();
    }
  }

  /** Retry only failed recipients from a prior campaign */
  public async retryFailed(campaignId: string): Promise<void> {
    const prior = await getCampaign(campaignId);
    if (!prior) throw new Error('Prior campaign not found');

    const logs = await getCampaignLogs(campaignId);
    // Find latest status for each phone number
    const latestMap = new Map<string, CampaignLog>();
    logs.forEach(l => latestMap.set(l.phone, l));

    const failedRecipients: ContactRecipient[] = [];
    latestMap.forEach(l => {
      if (l.status === 'failed') {
        failedRecipients.push({
          id: `retry-${l.id}`,
          name: l.name,
          phone: l.phone,
          vars: l.vars || { Name: l.name, Phone: l.phone }
        });
      }
    });

    if (failedRecipients.length === 0) {
      throw new Error('No failed numbers to retry in this campaign.');
    }

    const retryCampaign: Campaign = {
      id: `camp-${Date.now()}`,
      name: `${prior.name} (Retry Failed)`,
      templateText: prior.templateText,
      total: failedRecipients.length,
      sent: 0,
      failed: 0,
      status: 'draft',
      minDelay: prior.minDelay,
      maxDelay: prior.maxDelay,
      createdAt: Date.now()
    };

    return this.startCampaign(retryCampaign, failedRecipients);
  }
}

export const dispatcher = new Dispatcher();

export function useDispatcherStore(): DispatcherSnapshot {
  return useSyncExternalStore(dispatcher.subscribe, dispatcher.getSnapshot);
}
