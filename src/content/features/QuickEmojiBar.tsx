import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Slot } from '../Slot';
import { SEL } from '../selectors';
import { getSetting, setSetting } from '../db';
import { useFeature } from '../settings/store';
import { ScheduleSendComposerButton } from './ScheduleSend';
import { TuneIcon } from '../ui/MaterialIcons';
import { useThemeMode } from './ThemeEngine';

export type QuickEmojiMode = 'typing' | 'always' | 'never';

export const DEFAULT_EMOJIS = ['👍', '❤️', '🙏', '😂', '🎉'];
export const POPULAR_EMOJIS = [
  '👍', '❤️', '🙏', '😂', '🎉',
  '🙌', '🤝', '✝️', '☕', '☀️',
  '🕊️', '📖', '👏', '😊', '💙',
  '🔥', '✨', '💐', '💪', '👋'
];

const KEY_EMOJIS = 'quickEmojis';
const KEY_MODE = 'quickEmojiMode';

interface EmojiStoreState {
  emojis: string[];
  mode: QuickEmojiMode;
}

// Shared in-memory store for quick emojis & display mode
let cachedEmojis: string[] = DEFAULT_EMOJIS;
let cachedMode: QuickEmojiMode = 'typing';
let snapshot: EmojiStoreState = { emojis: cachedEmojis, mode: cachedMode };
const listeners = new Set<() => void>();

function notify() {
  snapshot = { emojis: cachedEmojis, mode: cachedMode };
  listeners.forEach(l => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => snapshot;

export function useQuickEmojis() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export async function updateQuickEmojis(emojis: string[]) {
  cachedEmojis = emojis;
  await setSetting(KEY_EMOJIS, emojis);
  notify();
}

export async function updateQuickEmojiMode(mode: QuickEmojiMode) {
  cachedMode = mode;
  await setSetting(KEY_MODE, mode);
  notify();
}

// Initial loader from IndexedDB
Promise.all([
  getSetting<string[]>(KEY_EMOJIS, DEFAULT_EMOJIS),
  getSetting<QuickEmojiMode>(KEY_MODE, 'typing')
]).then(([savedEmojis, savedMode]) => {
  cachedEmojis = Array.isArray(savedEmojis) && savedEmojis.length === 5 ? savedEmojis : DEFAULT_EMOJIS;
  cachedMode = savedMode || 'typing';
  notify();
});

const firstGrapheme = (s: string) => {
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(seg.segment(s.trim()), x => x.segment)[0] ?? '';
};

/** Inserts text at the caret of Google's composer (supporting both contenteditable and textarea), firing input events. */
export function insertIntoComposer(text: string) {
  const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null);
  const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(SEL.textarea)).find(e => e.offsetParent !== null);

  if (ed) {
    ed.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(ed);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);

    try {
      ed.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
    } catch {}

    const ok = document.execCommand('insertText', false, text);
    if (!ok || !(ed.textContent || '').includes(text)) {
      ed.textContent = (ed.textContent || '') + text;
    }
    ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    ed.dispatchEvent(new Event('change', { bubbles: true }));

    const innerTa = document.querySelector<HTMLTextAreaElement>('mws-autosize-textarea textarea');
    if (innerTa) {
      innerTa.value = ed.textContent || text;
      innerTa.dispatchEvent(new Event('input', { bubbles: true }));
      innerTa.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else if (ta) {
    ta.focus();
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    ta.value = before + text + after;
    ta.selectionStart = ta.selectionEnd = start + text.length;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/** Hook to detect if the user is focused on or typing in Google Messages composer */
function useComposerActive() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer: number | null = null;
    const check = () => {
      const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null);
      if (!ed) {
        setActive(false);
        return;
      }
      const isFocused = document.activeElement === ed || ed.contains(document.activeElement);
      const hasText = (ed.textContent || '').trim().length > 0;
      setActive(isFocused || hasText);
    };

    const onFocusIn = () => {
      if (timer) window.clearTimeout(timer);
      check();
    };

    const onFocusOut = () => {
      // Delay slightly so clicking an emoji button doesn't hide the bar before the click registers
      timer = window.setTimeout(check, 250);
    };

    const onInput = () => check();

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('input', onInput);
    window.addEventListener('popstate', check);

    check();

    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('input', onInput);
      window.removeEventListener('popstate', check);
    };
  }, []);

  return active;
}

/** Reusable Emoji Customizer UI component used on the bar and in Settings */
export function EmojiCustomizer({ onClose }: { onClose?: () => void }) {
  const { emojis, mode } = useQuickEmojis();
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [customInput, setCustomInput] = useState('');

  const handleSelectPreset = (emoji: string) => {
    const next = [...emojis];
    next[selectedSlot] = emoji;
    updateQuickEmojis(next);
  };

  const handleCustomInput = (val: string) => {
    setCustomInput(val);
    const g = firstGrapheme(val);
    if (g) {
      const next = [...emojis];
      next[selectedSlot] = g;
      updateQuickEmojis(next);
      setCustomInput('');
    }
  };

  const handleReset = () => {
    updateQuickEmojis(DEFAULT_EMOJIS);
  };

  return (
    <div className="rounded-xl border border-gray-700/80 bg-[#1e2025] p-3.5 shadow-2xl space-y-3 font-sans text-xs text-gray-200">
      <div className="flex items-center justify-between border-b border-gray-700/60 pb-2">
        <span className="font-semibold text-white text-xs flex items-center gap-1.5">
          <span>✨</span>
          <span>Customize Quick Emojis</span>
        </span>
        {onClose && (
          <button onClick={onClose} className="cursor-pointer text-gray-400 hover:text-white text-sm">
            ✕
          </button>
        )}
      </div>

      {/* Visibility Mode Selector */}
      <div>
        <label className="block text-[11px] font-medium text-gray-300 mb-1.5">
          When should emojis be shown?
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => updateQuickEmojiMode('typing')}
            className={`cursor-pointer rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium transition-all ${
              mode === 'typing'
                ? 'border-blue-500 bg-blue-600/25 text-blue-200 font-semibold'
                : 'border-gray-700 bg-gray-800/60 text-gray-400 hover:text-gray-200'
            }`}
          >
            ✍️ When Typing
          </button>
          <button
            type="button"
            onClick={() => updateQuickEmojiMode('always')}
            className={`cursor-pointer rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium transition-all ${
              mode === 'always'
                ? 'border-blue-500 bg-blue-600/25 text-blue-200 font-semibold'
                : 'border-gray-700 bg-gray-800/60 text-gray-400 hover:text-gray-200'
            }`}
          >
            👁️ Always Show
          </button>
          <button
            type="button"
            onClick={() => updateQuickEmojiMode('never')}
            className={`cursor-pointer rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium transition-all ${
              mode === 'never'
                ? 'border-blue-500 bg-blue-600/25 text-blue-200 font-semibold'
                : 'border-gray-700 bg-gray-800/60 text-gray-400 hover:text-gray-200'
            }`}
          >
            🚫 Never Show
          </button>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">
          {mode === 'typing' && 'Keeps your screen clean: only appears when you click into the message box or start typing.'}
          {mode === 'always' && 'Permanently displayed right above the text message box.'}
          {mode === 'never' && 'Completely hidden.'}
        </p>
      </div>

      {/* 5 Emoji Slots */}
      <div>
        <label className="block text-[11px] font-medium text-gray-300 mb-1.5">
          Choose which slot to change:
        </label>
        <div className="flex items-center gap-2">
          {emojis.map((e, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedSlot(idx)}
              className={`flex-1 h-10 rounded-xl border flex items-center justify-center text-xl transition-all cursor-pointer ${
                selectedSlot === idx
                  ? 'border-blue-400 bg-blue-500/20 ring-2 ring-blue-500/40 scale-105 shadow-md'
                  : 'border-gray-700 bg-gray-800/60 hover:bg-gray-700/60'
              }`}
              title={`Click to replace slot ${idx + 1}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Select Preset Palette */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-300 font-medium">
            Click to set Slot {selectedSlot + 1}:
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="cursor-pointer text-[10px] text-gray-400 hover:text-white hover:underline"
          >
            Reset defaults
          </button>
        </div>
        <div className="grid grid-cols-10 gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-2">
          {POPULAR_EMOJIS.map(pe => (
            <button
              key={pe}
              type="button"
              onClick={() => handleSelectPreset(pe)}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/15 active:scale-95 text-base transition-transform cursor-pointer"
              title={`Set Slot ${selectedSlot + 1} to ${pe}`}
            >
              {pe}
            </button>
          ))}
        </div>
      </div>

      {/* Type / Paste any emoji input */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
        <span className="text-[11px] text-gray-400 shrink-0">Or paste any emoji:</span>
        <input
          type="text"
          value={customInput}
          onChange={e => handleCustomInput(e.target.value)}
          placeholder="Paste emoji here..."
          className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1 text-xs text-white outline-none focus:border-blue-500"
        />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-500 text-xs shadow"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}

const COMPOSER_SURFACE_STYLE_ID = 'mp-composer-surface-css';

function ensureComposerSurfaceCss(active: boolean) {
  let style = document.getElementById(COMPOSER_SURFACE_STYLE_ID) as HTMLStyleElement | null;
  if (!active) {
    style?.remove();
    return;
  }
  if (!style) {
    style = document.createElement('style');
    style.id = COMPOSER_SURFACE_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
    mws-message-compose {
      background: linear-gradient(
        to bottom,
        var(--input-bg-transparent-fade-color, transparent) 0%,
        var(--input-bg-fade-color, #202124) 40%,
        var(--input-bg-fade-color, #202124) 100%
      ) !important;
      padding-top: 10px !important;
    }
  `;
}

function Bar() {
  const emojiEnabled = useFeature('emojiBar');
  const scheduleEnabled = useFeature('scheduleSend');
  const { emojis, mode } = useQuickEmojis();
  const composerActive = useComposerActive();
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [hovered, setHovered] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const showEmojis =
    emojiEnabled &&
    (mode === 'always' ||
      (mode === 'typing' && (composerActive || hovered || showCustomizer)));

  const hasActions = showEmojis || scheduleEnabled;
  const themeMode = useThemeMode();
  const isLight = themeMode === 'light';

  useEffect(() => {
    ensureComposerSurfaceCss(hasActions);
    return () => ensureComposerSurfaceCss(false);
  }, [hasActions]);

  if (!hasActions) return null;

  return (
    <div
      ref={barRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex flex-col items-start justify-start font-sans relative"
      data-testid="emoji-bar"
    >
      {/* Material Design 3 Secondary Composer Pill */}
      <div className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-1 transition-colors ${
        isLight
          ? 'border-[#dadce0] bg-[#f1f3f4] text-[#3c4043] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
          : 'border-[#dadce0]/[0.09] bg-[#303134] text-[#e8eaed] shadow-[0_1px_5px_0_rgba(0,0,0,0.24),0_3px_4px_0_rgba(0,0,0,0.14)]'
      }`}>
        {showEmojis && (
          <div className="flex items-center gap-0.5 pl-0.5">
            {emojis.map((e, i) => (
              <button
                key={i}
                onMouseDown={ev => ev.preventDefault()}
                onClick={() => insertIntoComposer(e)}
                className={`h-7 w-7 cursor-pointer rounded-full text-[15px] leading-none transition-all hover:scale-110 active:scale-95 flex items-center justify-center ${
                  isLight ? 'hover:bg-black/[0.06]' : 'hover:bg-white/[0.1]'
                }`}
                title={`Insert ${e}`}
              >
                {e}
              </button>
            ))}

            {/* Customize emojis icon button */}
            <button
              type="button"
              data-testid="emoji-customize-btn"
              onMouseDown={ev => ev.preventDefault()}
              onClick={() => setShowCustomizer(v => !v)}
              title="Customize quick emojis (Edit)"
              aria-label="Edit quick emojis"
              className={`h-7 w-7 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                showCustomizer
                  ? isLight ? 'bg-[#0b57d0]/12 text-[#0b57d0]' : 'bg-[#a8c7fa]/20 text-[#a8c7fa]'
                  : isLight ? 'text-[#5f6368] hover:bg-black/[0.06] hover:text-[#1f1f1f]' : 'text-[#9aa0a6] hover:bg-white/[0.08] hover:text-[#e8eaed]'
              }`}
            >
              <TuneIcon size={15} />
            </button>
          </div>
        )}

        {/* Android-Style Schedule Send */}
        {scheduleEnabled && (
          <>
            {showEmojis && <div className={`h-4 w-px mx-0.5 ${isLight ? 'bg-[#dadce0]' : 'bg-[#dadce0]/12'}`} />}
            <ScheduleSendComposerButton />
          </>
        )}
      </div>

      {/* Popover Customizer */}
      {showCustomizer && (
        <div className="absolute bottom-11 left-0 z-[2147483640] w-80 shadow-2xl">
          <EmojiCustomizer onClose={() => setShowCustomizer(false)} />
        </div>
      )}
    </div>
  );
}

export function QuickEmojiBar() {
  const emojiEnabled = useFeature('emojiBar');
  const scheduleEnabled = useFeature('scheduleSend');
  const slashEnabled = useFeature('slashCommands');

  if (!emojiEnabled && !scheduleEnabled && !slashEnabled) return null;

  return (
    <Slot
      anchor={SEL.composeContainer}
      position="before"
      id="emoji-bar"
      hostStyle="width: calc(100% - 60px); max-width: 975px; margin: 0 auto 8px auto; display: block; position: relative; z-index: 103;"
    >
      <Bar />
    </Slot>
  );
}
