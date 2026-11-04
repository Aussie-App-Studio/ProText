import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Anchor engine: ONE shared MutationObserver for the whole extension.
 * Components subscribe to a CSS selector and are told whenever the matching element
 * appears, is replaced (Angular re-render) or disappears. Callbacks are coalesced.
 */
type Listener = (el: Element | null) => void;
interface Watch { selector: string; current: Element | null; listeners: Set<Listener> }

const watches = new Map<string, Watch>();
let observer: MutationObserver | null = null;
let scheduled = false;

let currentConvId: string | null = null;
const urlListeners = new Set<() => void>();

function readConvIdFromUrl(): string | null {
  if (typeof location === 'undefined') return null;
  const m = location.pathname.match(/\/conversations\/([^/?#]+)/);
  return m ? m[1] : null;
}

function checkUrl() {
  const next = readConvIdFromUrl();
  if (next !== currentConvId) {
    currentConvId = next;
    urlListeners.forEach(l => l());
  }
}

function check() {
  scheduled = false;
  checkUrl();
  for (const w of watches.values()) {
    const el = document.querySelector(w.selector);
    if (el !== w.current) {
      w.current = el;
      w.listeners.forEach(l => l(el));
    }
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(check);
}

let popstateBound = false;
function ensureObserver() {
  if (!popstateBound && typeof window !== 'undefined') {
    popstateBound = true;
    currentConvId = readConvIdFromUrl();
    window.addEventListener('popstate', checkUrl);
  }
  if (observer) return;
  observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

/** Shared hook: returns the active conversation ID from URL (or null) without extra observers. */
export function useActiveConversationId(): string | null {
  return useSyncExternalStore(
    (cb) => {
      ensureObserver();
      urlListeners.add(cb);
      return () => { urlListeners.delete(cb); };
    },
    readConvIdFromUrl
  );
}

export function watchAnchor(selector: string, listener: Listener): () => void {
  ensureObserver();
  let w = watches.get(selector);
  if (!w) { w = { selector, current: null, listeners: new Set() }; watches.set(selector, w); }
  w.listeners.add(listener);
  w.current = document.querySelector(selector);
  listener(w.current);
  return () => {
    w!.listeners.delete(listener);
    if (!w!.listeners.size) watches.delete(selector);
  };
}

/** React hook: returns the live element matching `selector` (or null). */
export function useAnchor(selector: string): Element | null {
  return useSyncExternalStore(
    (cb) => watchAnchor(selector, () => cb()),
    () => document.querySelector(selector)
  );
}

type SidebarListener = (sidebar: Element, items: NodeListOf<Element>) => void;
const sidebarListeners = new Set<SidebarListener>();
let sidebarObserver: MutationObserver | null = null;
let sidebarEl: Element | null = null;
let sidebarUnwatch: (() => void) | null = null;
let sidebarScheduled = false;

function runSidebarPass() {
  sidebarScheduled = false;
  if (!sidebarEl || !sidebarListeners.size) return;
  const items = sidebarEl.querySelectorAll('mws-conversation-list-item');
  sidebarListeners.forEach(l => l(sidebarEl!, items));
}

function scheduleSidebarPass() {
  if (sidebarScheduled) return;
  sidebarScheduled = true;
  requestAnimationFrame(runSidebarPass);
}

/**
 * Shared, rAF-coalesced observer for `mws-conversations-list`.
 * Queries `mws-conversation-list-item` ONCE per frame and passes the list to all sidebar features.
 */
export function watchSidebar(listener: SidebarListener): () => void {
  sidebarListeners.add(listener);
  if (!sidebarUnwatch) {
    sidebarUnwatch = watchAnchor('mws-conversations-list', el => {
      sidebarObserver?.disconnect();
      sidebarObserver = null;
      sidebarEl = el;
      if (el) {
        sidebarObserver = new MutationObserver(scheduleSidebarPass);
        sidebarObserver.observe(el, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['data-e2e-is-unread']
        });
        listener(el, el.querySelectorAll('mws-conversation-list-item'));
      }
    });
  } else if (sidebarEl) {
    listener(sidebarEl, sidebarEl.querySelectorAll('mws-conversation-list-item'));
  }

  return () => {
    sidebarListeners.delete(listener);
    if (!sidebarListeners.size) {
      sidebarObserver?.disconnect();
      sidebarObserver = null;
      sidebarUnwatch?.();
      sidebarUnwatch = null;
      sidebarEl = null;
    }
  };
}

/** Watch many elements at once (e.g. every conversation list item). Fires on any DOM change, coalesced. */
export function useAnchors(selector: string): Element[] {
  const [els, setEls] = useState<Element[]>([]);
  useEffect(() => {
    ensureObserver();
    const update = () => {
      const next = Array.from(document.querySelectorAll(selector));
      setEls(prev => (prev.length === next.length && prev.every((e, i) => e === next[i]) ? prev : next));
    };
    update();
    const mo = new MutationObserver(() => queueMicrotask(update));
    mo.observe(document.documentElement, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [selector]);
  return els;
}
