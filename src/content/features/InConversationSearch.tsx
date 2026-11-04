import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Slot } from '../Slot';
import { SEL } from '../selectors';
import { useFeature } from '../settings/store';
import { SearchIcon } from '../ui/MaterialIcons';

const STYLE_ID = 'mp-in-conv-search-css';

const SEARCH_CSS = `
  mark.mp-search-highlight {
    background-color: rgba(245, 158, 11, 0.45) !important;
    color: inherit !important;
    border-radius: 2px !important;
    padding: 0 2px !important;
  }
  mark.mp-search-active {
    background-color: #f59e0b !important;
    color: #111 !important;
    font-weight: 600 !important;
    box-shadow: 0 0 0 2px #d97706 !important;
  }
`;

function ensureSearchStyle() {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = SEARCH_CSS;
    document.head.appendChild(el);
  }
}

// Global search state
let isSearchOpen = false;
const listeners = new Set<() => void>();
function notify() { listeners.forEach(l => l()); }

export function openConversationSearch() {
  isSearchOpen = true;
  notify();
}

export function closeConversationSearch() {
  isSearchOpen = false;
  notify();
}

const subscribeSearch = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSearchSnapshot = () => isSearchOpen;

function useConversationSearchOpen() {
  return useSyncExternalStore(subscribeSearch, getSearchSnapshot);
}

/** Recursively unwraps any existing <mark class="mp-search-highlight"> */
function clearHighlights() {
  const marks = Array.from(document.querySelectorAll('mark.mp-search-highlight'));
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize();
    }
  }
}

/** Search button rendered inside ConversationHeaderToolbar */
export function HeaderSearchButton() {
  const enabled = useFeature('inConversationSearch');
  const isOpen = useConversationSearchOpen();

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (isOpen) closeConversationSearch();
        else openConversationSearch();
      }}
      title="Search inside this conversation (Ctrl+F)"
      aria-label="Search conversation"
      className={`cursor-pointer flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
        isOpen
          ? 'bg-[#a8c7fa]/20 text-[#a8c7fa]'
          : 'text-[#dadce0] hover:bg-white/[0.08] hover:text-white'
      }`}
    >
      <SearchIcon size={16} />
      <span className="sr-only">Search</span>
    </button>
  );
}

/** Floating In-Conversation Search Bar */
export function InConversationSearchBar() {
  const enabled = useFeature('inConversationSearch');
  const isOpen = useConversationSearchOpen();

  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<HTMLElement[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear highlights on unmount or close
  useEffect(() => {
    ensureSearchStyle();
    if (!isOpen) {
      clearHighlights();
      setQuery('');
      setMatches([]);
      setActiveIndex(0);
    } else {
      setTimeout(() => inputRef.current?.focus(), 50);
      const onGlobalEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeConversationSearch();
        }
      };
      window.addEventListener('keydown', onGlobalEsc, true);
      return () => window.removeEventListener('keydown', onGlobalEsc, true);
    }
    return () => {
      clearHighlights();
    };
  }, [isOpen]);

  // Clean highlights when navigating away or switching conversations
  useEffect(() => {
    const onLocationChange = () => {
      clearHighlights();
      setMatches([]);
      setActiveIndex(0);
    };
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  // Perform search & highlight (debounced by 120ms while typing to avoid full-DOM TreeWalker churn on every keystroke)
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q || !isOpen) {
      clearHighlights();
      setMatches([]);
      setActiveIndex(0);
      return;
    }

    const timer = window.setTimeout(() => {
      clearHighlights();

      const messageEls = Array.from(document.querySelectorAll('mws-message-wrapper [data-e2e-text-message-content]'));
      const foundMarks: HTMLElement[] = [];

      for (const el of messageEls) {
        // Walk text nodes
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const textNodes: Text[] = [];
        let currentNode = walker.nextNode();
        while (currentNode) {
          textNodes.push(currentNode as Text);
          currentNode = walker.nextNode();
        }

        for (const textNode of textNodes) {
          const text = textNode.nodeValue || '';
          const lower = text.toLowerCase();
          let idx = lower.indexOf(q);

          if (idx !== -1) {
            const frag = document.createDocumentFragment();
            let lastIdx = 0;

            while (idx !== -1) {
              // Text before match
              if (idx > lastIdx) {
                frag.appendChild(document.createTextNode(text.substring(lastIdx, idx)));
              }

              // Matched mark
              const mark = document.createElement('mark');
              mark.className = 'mp-search-highlight';
              mark.textContent = text.substring(idx, idx + q.length);
              frag.appendChild(mark);
              foundMarks.push(mark);

              lastIdx = idx + q.length;
              idx = lower.indexOf(q, lastIdx);
            }

            // Remaining text
            if (lastIdx < text.length) {
              frag.appendChild(document.createTextNode(text.substring(lastIdx)));
            }

            textNode.parentNode?.replaceChild(frag, textNode);
          }
        }
      }

      setMatches(foundMarks);
      setActiveIndex(0);

      if (foundMarks.length > 0) {
        foundMarks[0].classList.add('mp-search-active');
        foundMarks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [query, isOpen]);

  const goToNext = () => {
    if (matches.length === 0) return;
    matches[activeIndex]?.classList.remove('mp-search-active');
    const nextIdx = (activeIndex + 1) % matches.length;
    setActiveIndex(nextIdx);
    matches[nextIdx]?.classList.add('mp-search-active');
    matches[nextIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const goToPrev = () => {
    if (matches.length === 0) return;
    matches[activeIndex]?.classList.remove('mp-search-active');
    const prevIdx = (activeIndex - 1 + matches.length) % matches.length;
    setActiveIndex(prevIdx);
    matches[prevIdx]?.classList.add('mp-search-active');
    matches[prevIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) goToPrev();
      else goToNext();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeConversationSearch();
    }
  };

  if (!enabled || !isOpen) return null;

  return (
    <div className="fixed top-16 right-8 z-[2147483640] pointer-events-auto flex items-center gap-2 rounded-xl border border-gray-700/80 bg-[#1e2025]/95 p-2 shadow-2xl backdrop-blur-md text-xs text-gray-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
      <div className="flex items-center gap-1.5 bg-gray-900/90 rounded-lg border border-gray-700 px-2.5 py-1">
        <span className="text-gray-400">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in chat..."
          className="w-44 bg-transparent text-xs text-white placeholder-gray-500 outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="cursor-pointer text-gray-400 hover:text-white text-[10px]"
          >
            ✕
          </button>
        )}
      </div>

      {/* Match Count */}
      <span className="text-[11px] font-mono text-gray-400 min-w-12 text-center">
        {query ? (matches.length > 0 ? `${activeIndex + 1}/${matches.length}` : '0/0') : ''}
      </span>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1 border-l border-gray-800 pl-1.5">
        <button
          type="button"
          onClick={goToPrev}
          disabled={matches.length === 0}
          title="Previous match (Shift+Enter)"
          className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-lg hover:bg-white/10 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-default"
        >
          ▲
        </button>

        <button
          type="button"
          onClick={goToNext}
          disabled={matches.length === 0}
          title="Next match (Enter)"
          className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-lg hover:bg-white/10 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-default"
        >
          ▼
        </button>

        <button
          type="button"
          onClick={closeConversationSearch}
          title="Close search (Esc)"
          className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white ml-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
