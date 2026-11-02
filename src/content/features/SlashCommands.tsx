import { useEffect, useMemo, useRef, useState } from 'react';
import { SEL } from '../selectors';
import { useTemplates } from '../templatesStore';
import { renderTemplate } from '../pro/parser';
import { useFeature } from '../settings/store';
import type { MessageTemplate } from '../db';

interface SlashTrigger {
  query: string;
  isContentEditable: boolean;
  node?: Node;
  startOffset: number;
  endOffset: number;
}

let slashPopupCurrentlyOpen = false;
export function isSlashPopupOpen(): boolean {
  return slashPopupCurrentlyOpen;
}

export function SlashCommands() {
  const enabled = useFeature('slashCommands');
  const { templates } = useTemplates();
  const [trigger, setTrigger] = useState<SlashTrigger | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter templates matching current query
  const matchingTemplates = useMemo(() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();
    if (!q) return templates;
    return templates.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.title.toLowerCase().replace(/[^a-z0-9]/g, '').includes(q)
    );
  }, [trigger, templates]);

  // Reset index when matches change
  useEffect(() => {
    setSelectedIndex(0);
  }, [matchingTemplates.length]);

  useEffect(() => {
    slashPopupCurrentlyOpen = !!(enabled && trigger && matchingTemplates.length > 0);
    return () => {
      slashPopupCurrentlyOpen = false;
    };
  }, [enabled, trigger, matchingTemplates.length]);

  // Keyboard navigation & caret detection
  useEffect(() => {
    if (!enabled) {
      setTrigger(null);
      return;
    }

    const checkCaret = () => {
      const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null);
      const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(SEL.textarea)).find(e => e.offsetParent !== null);

      if (ed && (document.activeElement === ed || ed.contains(document.activeElement))) {
        const sel = window.getSelection();
        if (!sel || !sel.isCollapsed || !sel.focusNode) {
          setTrigger(null);
          return;
        }
        const node = sel.focusNode;
        const offset = sel.focusOffset;
        const text = node.textContent || '';
        const textBefore = text.slice(0, offset);

        const match = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
        if (match) {
          const slashIdx = textBefore.lastIndexOf('/');
          setTrigger({
            query: match[1],
            isContentEditable: true,
            node,
            startOffset: slashIdx,
            endOffset: offset
          });
          return;
        }
      } else if (ta && document.activeElement === ta) {
        const offset = ta.selectionStart;
        const textBefore = ta.value.slice(0, offset);
        const match = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
        if (match) {
          const slashIdx = textBefore.lastIndexOf('/');
          setTrigger({
            query: match[1],
            isContentEditable: false,
            startOffset: slashIdx,
            endOffset: offset
          });
          return;
        }
      }

      setTrigger(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!trigger || matchingTemplates.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(idx => (idx + 1) % matchingTemplates.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(idx => (idx - 1 + matchingTemplates.length) % matchingTemplates.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        expandTemplate(matchingTemplates[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setTrigger(null);
      }
    };

    document.addEventListener('input', checkCaret);
    document.addEventListener('keyup', checkCaret);
    document.addEventListener('mouseup', checkCaret);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('input', checkCaret);
      document.removeEventListener('keyup', checkCaret);
      document.removeEventListener('mouseup', checkCaret);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, trigger, matchingTemplates, selectedIndex]);

  const expandTemplate = (template: MessageTemplate) => {
    if (!trigger || !template) return;

    // Resolve personalization variables
    const titleEl = document.querySelector(SEL.headerTitle);
    const fullName = titleEl?.textContent?.trim() || '';
    const firstName = fullName.split(/\s+/)[0] || fullName;
    const now = new Date();
    const vars: Record<string, string> = {
      Name: fullName || 'there',
      'First Name': firstName || 'there',
      FirstName: firstName || 'there',
      Date: now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      Time: now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    };

    const rendered = renderTemplate(template.body, vars);

    if (trigger.isContentEditable && trigger.node) {
      try {
        const range = document.createRange();
        range.setStart(trigger.node, trigger.startOffset);
        range.setEnd(trigger.node, trigger.endOffset);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        document.execCommand('insertText', false, rendered);
      } catch {
        // Fallback
        const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(e => e.offsetParent !== null);
        if (ed) {
          ed.focus();
          document.execCommand('insertText', false, rendered);
        }
      }
    } else {
      const ta = Array.from(document.querySelectorAll<HTMLTextAreaElement>(SEL.textarea)).find(e => e.offsetParent !== null);
      if (ta) {
        const before = ta.value.slice(0, trigger.startOffset);
        const after = ta.value.slice(trigger.endOffset);
        ta.value = before + rendered + after;
        ta.selectionStart = ta.selectionEnd = trigger.startOffset + rendered.length;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    setTrigger(null);
  };

  if (!enabled || !trigger || matchingTemplates.length === 0) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2147483645] w-[420px] max-w-[92vw] rounded-2xl bg-[#1e2025] shadow-2xl border border-gray-700/80 p-2 font-sans text-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
      onMouseDown={e => e.preventDefault()} // Keep focus in composer
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-800 text-[11px] text-gray-400">
        <span className="font-semibold text-white flex items-center gap-1.5">
          <span>⚡</span>
          <span>Slash Templates (/{trigger.query})</span>
        </span>
        <span className="font-mono text-[10px]">
          ↵ / Tab to expand • Esc
        </span>
      </div>

      {/* Templates List */}
      <div ref={listRef} className="max-h-56 overflow-y-auto p-1 space-y-1">
        {matchingTemplates.map((t, idx) => {
          const isSelected = idx === selectedIndex;
          const shortcut = t.title.toLowerCase().replace(/[^a-z0-9]/g, '');

          return (
            <div
              key={t.id}
              onClick={() => expandTemplate(t)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`flex flex-col gap-0.5 px-3 py-2 rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow'
                  : 'hover:bg-white/5 text-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs truncate">
                  {t.title}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-blue-800 text-blue-100' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  /{shortcut}
                </span>
              </div>
              <p
                className={`text-[11px] truncate ${
                  isSelected ? 'text-blue-100' : 'text-gray-400'
                }`}
              >
                {t.body}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
