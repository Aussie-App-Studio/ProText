import { useEffect, useRef, useState } from 'react';
import { Slot } from '../Slot';
import { useAnchor } from '../engine';
import { useFeature } from '../settings/store';
import { SEL } from '../selectors';
import { getSetting, setSetting } from '../db';

const KEY = 'inputMinHeight';
const STYLE_ID = 'mp-resizable-input-css';
const SINGLE_LINE = 48; // height of Google's one-line input

/**
 * Default: do nothing (Google's own behaviour). Only once the user has manually dragged the box
 * taller than its default do we override. Google caps the composer at ~108px via an inline style set
 * by its JS; a stylesheet rule with !important beats inline styles, so we then (1) let the box
 * auto-grow to 70vh and (2) apply the dragged height as a min-height.
 * Rules target the contenteditable, not obfuscated classes.
 */
function applyCss(minHeight: number | null, extra: number) {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) { style = document.createElement('style'); style.id = STYLE_ID; document.head.appendChild(style); }
  const totalPad = 48 + Math.max(0, Math.round(extra));
  if (!minHeight) {
    style.textContent = `${SEL.messagesContent} { padding-bottom: ${totalPad}px !important; }`;
    return;
  }
  style.textContent = `
    ${SEL.editable} {
      height: auto !important;
      max-height: 70vh !important;
      overflow-y: auto !important;
      min-height: ${minHeight}px !important;
    }
    /* The composer and secondary pill float over the message list, so pad the list accordingly. */
    ${SEL.messagesContent} { padding-bottom: ${totalPad}px !important; }`;
}

function getEditable(): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null) ?? null;
}

function Handle() {
  const [height, setHeight] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [extra, setExtra] = useState(0);
  const drag = useRef<{ y: number; h: number } | null>(null);

  useEffect(() => { getSetting<number | null>(KEY, null).then(setHeight); }, []);
  useEffect(() => { applyCss(height, extra); }, [height, extra]);
  useEffect(() => () => { document.getElementById(STYLE_ID)?.remove(); }, []);

  // Track how much taller than a single line the input currently is (covers typing AND dragging).
  // useAnchor keeps this bound to the live element, which Angular replaces when you switch chats.
  const editable = useAnchor(SEL.editable);
  useEffect(() => {
    if (!editable) return;
    const ro = new ResizeObserver(() => setExtra(editable.getBoundingClientRect().height - SINGLE_LINE));
    ro.observe(editable);
    return () => ro.disconnect();
  }, [editable]);

  const onDown = (e: React.PointerEvent) => {
    const ed = getEditable();
    if (!ed) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, h: ed.getBoundingClientRect().height };
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const next = drag.current.h + (drag.current.y - e.clientY); // dragging up grows the box
    // Not taller than the default one-line box -> stay on Google's normal behaviour.
    setHeight(next <= SINGLE_LINE + 4 ? null : Math.round(Math.min(window.innerHeight * 0.7, next)));
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    setHeight(h => { setSetting(KEY, h); return h; });
  };
  const reset = () => { setHeight(null); setSetting(KEY, null); };

  return (
    <div
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      onDoubleClick={reset}
      title="Drag to resize the message box · double-click to reset"
      className="pointer-events-auto group flex h-2.5 w-24 cursor-ns-resize touch-none items-center justify-center select-none"
    >
      <div className={`h-1 w-9 rounded-full transition-colors ${dragging ? 'bg-[#a8c7fa]' : 'bg-[#dadce0]/25 group-hover:bg-[#a8c7fa]'}`} />
    </div>
  );
}

export function ResizableInput() {
  const enabled = useFeature('resizableInput');
  if (!enabled) return null; // unmounting Handle also removes our injected CSS
  return (
    <Slot
      anchor="mws-message-compose .input-box"
      position="prepend"
      id="resize-handle"
      hostStyle="position:absolute;top:0;left:0;right:0;z-index:20;display:flex;justify-content:center;pointer-events:none;"
    >
      <Handle />
    </Slot>
  );
}
