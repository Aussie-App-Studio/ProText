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

function check() {
  scheduled = false;
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

function ensureObserver() {
  if (observer) return;
  observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
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
