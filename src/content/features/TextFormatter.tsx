import { useEffect, useState } from 'react';
import { SEL } from '../selectors';
import { useFeature } from '../settings/store';

export function wrapSelection(prefix: string, suffix: string = prefix) {
  const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null);
  const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(SEL.textarea)).find(e => e.offsetParent !== null);

  if (ed && (document.activeElement === ed || ed.contains(document.activeElement))) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString();
    if (!text) return;

    if (text.startsWith(prefix) && text.endsWith(suffix) && text.length >= prefix.length + suffix.length) {
      const unwrapped = text.slice(prefix.length, text.length - suffix.length);
      document.execCommand('insertText', false, unwrapped);
    } else {
      document.execCommand('insertText', false, `${prefix}${text}${suffix}`);
    }
  } else if (ta && document.activeElement === ta) {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return;
    const text = ta.value.slice(start, end);

    let nextText = `${prefix}${text}${suffix}`;
    if (text.startsWith(prefix) && text.endsWith(suffix) && text.length >= prefix.length + suffix.length) {
      nextText = text.slice(prefix.length, text.length - suffix.length);
    }

    ta.value = ta.value.slice(0, start) + nextText + ta.value.slice(end);
    ta.selectionStart = start;
    ta.selectionEnd = start + nextText.length;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

export function formatBulletList() {
  const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null);
  const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(SEL.textarea)).find(e => e.offsetParent !== null);

  if (ed && (document.activeElement === ed || ed.contains(document.activeElement))) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString();
    if (!text) return;

    const lines = text.split('\n');
    const bulleted = lines.map(l => (l.startsWith('• ') ? l.slice(2) : `• ${l}`)).join('\n');
    document.execCommand('insertText', false, bulleted);
  } else if (ta && document.activeElement === ta) {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return;
    const text = ta.value.slice(start, end);
    const lines = text.split('\n');
    const bulleted = lines.map(l => (l.startsWith('• ') ? l.slice(2) : `• ${l}`)).join('\n');
    ta.value = ta.value.slice(0, start) + bulleted + ta.value.slice(end);
    ta.selectionStart = start;
    ta.selectionEnd = start + bulleted.length;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

export function TextFormatter() {
  const enabled = useFeature('textFormatter');
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setToolbarPos(null);
      return;
    }

    const checkSelection = () => {
      const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null);
      const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(SEL.textarea)).find(e => e.offsetParent !== null);

      if (ed && (document.activeElement === ed || ed.contains(document.activeElement))) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          setToolbarPos(null);
          return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setToolbarPos({
            top: Math.max(10, rect.top - 42),
            left: rect.left + rect.width / 2
          });
          return;
        }
      } else if (ta && document.activeElement === ta) {
        if (ta.selectionStart !== ta.selectionEnd) {
          const rect = ta.getBoundingClientRect();
          setToolbarPos({
            top: Math.max(10, rect.top - 42),
            left: rect.left + rect.width / 2
          });
          return;
        }
      }

      setToolbarPos(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null);
      const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(SEL.textarea)).find(e => e.offsetParent !== null);
      const isFocused = (ed && (document.activeElement === ed || ed.contains(document.activeElement))) ||
                        (ta && document.activeElement === ta);

      if (!isFocused) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        wrapSelection('*');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        wrapSelection('_');
      }
    };

    document.addEventListener('selectionchange', checkSelection);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('selectionchange', checkSelection);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled]);

  if (!enabled || !toolbarPos) return null;

  return (
    <div
      data-mp-formatting-toolbar="true"
      style={{ top: `${toolbarPos.top}px`, left: `${toolbarPos.left}px` }}
      onMouseDown={e => e.preventDefault()} // Prevent losing selection
      className="fixed z-[2147483645] -translate-x-1/2 flex items-center gap-1 rounded-full border border-gray-700/80 bg-[#1e2025]/95 px-2 py-1 shadow-2xl backdrop-blur-md text-xs text-gray-200 animate-in fade-in zoom-in-95 duration-75 font-sans pointer-events-auto"
    >
      <button
        type="button"
        onClick={() => wrapSelection('*')}
        title="Bold (Ctrl+B) -> *text*"
        className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-lg font-bold hover:bg-white/10 hover:text-white transition-colors"
      >
        B
      </button>

      <button
        type="button"
        onClick={() => wrapSelection('_')}
        title="Italic (Ctrl+I) -> _text_"
        className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-lg italic font-serif hover:bg-white/10 hover:text-white transition-colors"
      >
        I
      </button>

      <button
        type="button"
        onClick={() => wrapSelection('~')}
        title="Strikethrough -> ~text~"
        className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-lg line-through hover:bg-white/10 hover:text-white transition-colors"
      >
        S
      </button>

      <button
        type="button"
        onClick={() => wrapSelection('`')}
        title="Code -> `text`"
        className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-lg font-mono text-[11px] hover:bg-white/10 hover:text-white transition-colors"
      >
        {'<>'}
      </button>

      <div className="h-4 w-px bg-gray-700/80 mx-0.5" />

      <button
        type="button"
        onClick={formatBulletList}
        title="Bullet list -> • item"
        className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition-colors text-sm"
      >
        •
      </button>
    </div>
  );
}
