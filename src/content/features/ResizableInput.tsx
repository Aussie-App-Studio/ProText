import { useEffect, useRef, useState } from 'react';
import { Slot } from '../Slot';
import { useAnchor } from '../engine';
import { useFeature } from '../settings/store';
import { SEL } from '../selectors';
import { getSetting, setSetting } from '../db';

const KEY_HEIGHT = 'inputMinHeight';
const KEY_WIDTH = 'inputMaxWidth';
const STYLE_ID = 'mp-resizable-input-css';
const SINGLE_LINE = 48; // height of Google's one-line input
const DEFAULT_COMPOSE_MAX_WIDTH = 975;

/**
 * Default: do nothing (Google's own behaviour). Only once the user has manually dragged the box
 * taller or wider than default do we override.
 * Google caps the composer at ~108px height and 975px width via inline and stylesheet rules.
 * Rules target structural elements, not obfuscated classes.
 */
function applyCss(minHeight: number | null, extra: number, maxWidth: number | null) {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  const totalPad = 48 + Math.max(0, Math.round(extra));

  let css = `${SEL.messagesContent} { padding-bottom: ${totalPad}px !important; }\n`;

  if (minHeight) {
    css += `
    ${SEL.editable} {
      height: auto !important;
      max-height: 70vh !important;
      overflow-y: auto !important;
      min-height: ${minHeight}px !important;
    }\n`;
  }

  if (maxWidth) {
    css += `
    ${SEL.composeContainer} {
      max-width: ${maxWidth}px !important;
    }\n`;
  }

  style.textContent = css;
}

function getEditable(): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null) ?? null;
}

function getComposeContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(SEL.composeContainer) ?? null;
}

function Handle() {
  const [height, setHeight] = useState<number | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [draggingHeight, setDraggingHeight] = useState(false);
  const [draggingWidth, setDraggingWidth] = useState(false);
  const [extra, setExtra] = useState(0);

  const dragHeight = useRef<{ y: number; h: number } | null>(null);
  const dragWidth = useRef<{ startX: number; startW: number; side: 'left' | 'right' } | null>(null);

  useEffect(() => {
    getSetting<number | null>(KEY_HEIGHT, null).then(setHeight);
    getSetting<number | null>(KEY_WIDTH, null).then(setWidth);
  }, []);

  useEffect(() => {
    applyCss(height, extra, width);
  }, [height, extra, width]);

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

  // Height drag handlers
  const onDownHeight = (e: React.PointerEvent) => {
    const ed = getEditable();
    if (!ed) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    dragHeight.current = { y: e.clientY, h: ed.getBoundingClientRect().height };
    setDraggingHeight(true);
  };

  const onMoveHeight = (e: React.PointerEvent) => {
    if (!dragHeight.current) return;
    const next = dragHeight.current.h + (dragHeight.current.y - e.clientY); // dragging up grows the box
    setHeight(next <= SINGLE_LINE + 4 ? null : Math.round(Math.min(window.innerHeight * 0.7, next)));
  };

  const onUpHeight = () => {
    if (!dragHeight.current) return;
    dragHeight.current = null;
    setDraggingHeight(false);
    setHeight(h => { setSetting(KEY_HEIGHT, h); return h; });
  };

  const resetHeight = () => {
    setHeight(null);
    setSetting(KEY_HEIGHT, null);
  };

  // Width drag handlers (symmetrical expansion around centered composer)
  const onDownWidth = (e: React.PointerEvent, side: 'left' | 'right') => {
    const cc = getComposeContainer();
    if (!cc) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    dragWidth.current = {
      startX: e.clientX,
      startW: cc.getBoundingClientRect().width,
      side
    };
    setDraggingWidth(true);
  };

  const onMoveWidth = (e: React.PointerEvent) => {
    if (!dragWidth.current) return;
    const { startX, startW, side } = dragWidth.current;
    const delta = side === 'right' ? (e.clientX - startX) * 2 : (startX - e.clientX) * 2;
    const next = Math.round(startW + delta);

    const conv = document.querySelector(SEL.conversationContainer);
    const maxAllowed = conv ? Math.round(conv.getBoundingClientRect().width - 40) : Math.round(window.innerWidth * 0.95);
    const clamped = Math.max(550, Math.min(maxAllowed, next));

    if (Math.abs(clamped - DEFAULT_COMPOSE_MAX_WIDTH) <= 16) {
      setWidth(null);
    } else {
      setWidth(clamped);
    }
  };

  const onUpWidth = () => {
    if (!dragWidth.current) return;
    dragWidth.current = null;
    setDraggingWidth(false);
    setWidth(w => {
      setSetting(KEY_WIDTH, w);
      return w;
    });
  };

  const resetWidth = (e: React.MouseEvent) => {
    if (e.altKey || e.shiftKey) {
      const conv = document.querySelector(SEL.conversationContainer);
      const full = conv ? Math.round(conv.getBoundingClientRect().width - 60) : Math.round(window.innerWidth * 0.95);
      setWidth(full);
      setSetting(KEY_WIDTH, full);
      return;
    }
    setWidth(null);
    setSetting(KEY_WIDTH, null);
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top Handle (Height) */}
      <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none">
        <div
          onPointerDown={onDownHeight}
          onPointerMove={onMoveHeight}
          onPointerUp={onUpHeight}
          onPointerCancel={onUpHeight}
          onDoubleClick={resetHeight}
          title="Drag to resize message box height · double-click to reset"
          className="pointer-events-auto group flex h-2.5 w-24 cursor-ns-resize touch-none items-center justify-center select-none"
        >
          <div className={`h-1 w-9 rounded-full transition-colors ${draggingHeight ? 'bg-[#a8c7fa]' : 'bg-[#dadce0]/25 group-hover:bg-[#a8c7fa]'}`} />
        </div>
      </div>

      {/* Left Handle (Width) */}
      <div className="absolute left-0 top-0 bottom-0 flex items-center pointer-events-none">
        <div
          onPointerDown={(e) => onDownWidth(e, 'left')}
          onPointerMove={onMoveWidth}
          onPointerUp={onUpWidth}
          onPointerCancel={onUpWidth}
          onDoubleClick={resetWidth}
          title="Drag to resize message box width · double-click to reset · Alt+double-click for full width"
          className="pointer-events-auto group flex h-12 w-2.5 cursor-ew-resize touch-none items-center justify-center select-none -ml-1"
        >
          <div className={`w-1 h-7 rounded-full transition-colors ${draggingWidth ? 'bg-[#a8c7fa]' : 'bg-[#dadce0]/25 group-hover:bg-[#a8c7fa]'}`} />
        </div>
      </div>

      {/* Right Handle (Width) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center pointer-events-none">
        <div
          onPointerDown={(e) => onDownWidth(e, 'right')}
          onPointerMove={onMoveWidth}
          onPointerUp={onUpWidth}
          onPointerCancel={onUpWidth}
          onDoubleClick={resetWidth}
          title="Drag to resize message box width · double-click to reset · Alt+double-click for full width"
          className="pointer-events-auto group flex h-12 w-2.5 cursor-ew-resize touch-none items-center justify-center select-none -mr-1"
        >
          <div className={`w-1 h-7 rounded-full transition-colors ${draggingWidth ? 'bg-[#a8c7fa]' : 'bg-[#dadce0]/25 group-hover:bg-[#a8c7fa]'}`} />
        </div>
      </div>
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
      hostStyle="position:absolute;inset:0;z-index:20;pointer-events:none;"
    >
      <Handle />
    </Slot>
  );
}
