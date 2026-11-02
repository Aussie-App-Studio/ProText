import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAnchor } from './engine';
import css from './styles.css?inline';

export type Position = 'before' | 'after' | 'prepend' | 'append';

// One constructable stylesheet shared by every slot's shadow root (Tailwind stays isolated from Google's CSS).
let sheet: CSSStyleSheet | null = null;
export function getSheet() {
  if (!sheet) { sheet = new CSSStyleSheet(); sheet.replaceSync(css); }
  return sheet;
}

/**
 * Renders `children` into a fresh shadow-DOM host inserted next to the anchor element.
 * If Angular re-renders and drops our host, we re-insert it; if the anchor goes away, we unmount.
 */
export function Slot({ anchor, position, id, className, hostStyle, children }: {
  anchor: string; position: Position; id: string; className?: string; hostStyle?: string; children: ReactNode;
}) {
  const target = useAnchor(anchor);
  const [mountPoint, setMountPoint] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!target) {
      setMountPoint(null);
      return;
    }

    const host = document.createElement('div');
    host.setAttribute('data-mp-slot', id);
    if (className) host.className = className;
    if (hostStyle) host.style.cssText = hostStyle;
    const shadow = host.attachShadow({ mode: 'open' });
    const stopKeyLeak = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Escape') return;
      const t = ke.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        ke.stopPropagation();
      }
    };
    shadow.addEventListener('keydown', stopKeyLeak);
    shadow.addEventListener('keypress', stopKeyLeak);
    shadow.addEventListener('keyup', stopKeyLeak);

    shadow.adoptedStyleSheets = [getSheet()];
    const inner = document.createElement('div');
    inner.style.cssText = 'width: 100%; max-width: 100%; min-width: 0;';
    shadow.appendChild(inner);

    const place = () => {
      try {
        switch (position) {
          case 'before': target.before(host); break;
          case 'after': target.after(host); break;
          case 'prepend': target.prepend(host); break;
          case 'append': target.append(host); break;
        }
      } catch (err) {
        console.warn(`[ProText] Error placing slot ${id}:`, err);
      }
    };

    place();
    setMountPoint(inner);

    // Self-heal safely: ONLY re-place if host was disconnected by Angular,
    // and ALWAYS coalesce via requestAnimationFrame to prevent mutation recursion loops.
    let scheduled = false;
    const parent = position === 'before' || position === 'after' ? target.parentElement : target;
    const mo = new MutationObserver(() => {
      if (!host.isConnected && target.isConnected && !scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          if (!host.isConnected && target.isConnected) {
            place();
          }
        });
      }
    });

    if (parent) {
      mo.observe(parent, { childList: true });
    }

    return () => {
      mo.disconnect();
      host.remove();
      setMountPoint(null);
    };
  }, [target, anchor, position, id, className, hostStyle]);

  return mountPoint ? createPortal(children, mountPoint) : null;
}
