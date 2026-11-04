import { useEffect, useState, useSyncExternalStore } from 'react';
import { Slot } from '../Slot';
import { useActiveConversationId, watchSidebar } from '../engine';
import { SEL } from '../selectors';
import { getAllAliases, saveAlias } from '../db';
import { useFeature } from '../settings/store';
import { LabelIcon } from '../ui/MaterialIcons';

// Reactive in-memory alias cache
let aliasesCache: Record<string, string> = {};
let aliasesLoaded = false;
const aliasListeners = new Set<() => void>();

function notifyAliases() {
  aliasListeners.forEach(l => l());
}

export async function reloadAliases() {
  aliasesCache = await getAllAliases();
  aliasesLoaded = true;
  notifyAliases();
}

reloadAliases();

const subscribeAliases = (cb: () => void) => {
  aliasListeners.add(cb);
  return () => aliasListeners.delete(cb);
};
const getAliasesSnapshot = () => aliasesCache;

export function useAliases() {
  const aliases = useSyncExternalStore(
    subscribeAliases,
    getAliasesSnapshot
  );
  return { aliases, loaded: aliasesLoaded, reload: reloadAliases };
}

/** Injected under / next to the conversation title in the header */
export function HeaderAliasBadge() {
  const enabled = useFeature('crmAliases');
  const conversationId = useActiveConversationId();
  const { aliases, reload } = useAliases();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const currentAlias = conversationId ? aliases[conversationId] || '' : '';

  useEffect(() => {
    setInputVal(currentAlias);
    setEditing(false);
  }, [conversationId, currentAlias]);

  if (!enabled || !conversationId) return null;

  const handleSave = async () => {
    await saveAlias(conversationId, inputVal);
    await reload();
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 ml-1 mt-0.5 font-sans">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="e.g. Youth Leader, Choir, Deacon"
          className="h-5 w-36 rounded-md border border-amber-400 bg-gray-800 px-2 text-xs text-white outline-none focus:ring-1 focus:ring-amber-400"
        />
        <button
          onClick={handleSave}
          className="cursor-pointer rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-amber-500"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="cursor-pointer rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300 hover:text-white"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center font-sans">
      {currentAlias ? (
        <button
          onClick={() => {
            setInputVal(currentAlias);
            setEditing(true);
          }}
          title="Click to edit private role or label"
          className="flex h-6 cursor-pointer items-center gap-1.5 rounded-full border border-[#dadce0]/15 bg-[#3c4043] px-2.5 text-[11px] font-medium text-[#e8eaed] transition-colors hover:bg-[#4a4e52]"
        >
          <LabelIcon size={13} className="text-[#a8c7fa]" />
          <span>{currentAlias}</span>
        </button>
      ) : (
        <button
          onClick={() => {
            setInputVal('');
            setEditing(true);
          }}
          title="Add a private role or label (only visible to you on this computer)"
          className="flex h-6 cursor-pointer items-center gap-1 rounded-full border border-[#dadce0]/15 bg-transparent px-2.5 text-[11px] font-medium text-[#9aa0a6] hover:bg-white/[0.08] hover:text-[#e8eaed] transition-colors"
        >
          <LabelIcon size={13} />
          <span>+ Role / Label</span>
        </button>
      )}
    </div>
  );
}

/** Sidebar enhancer: decorates conversation list items with alias tags */
function SidebarAliasEnhancer() {
  const { aliases } = useAliases();

  useEffect(() => {
    const hasAliases = Object.keys(aliases).length > 0;

    const unwatch = watchSidebar((sidebar, items) => {
      if (!hasAliases && !sidebar.querySelector('.mp-alias-badge')) return;
      items.forEach(item => {
        const link = item.querySelector('a[data-e2e-conversation]');
        const href = link?.getAttribute('href') || '';
        const match = href.match(/\/conversations\/([^/?#]+)/);
        const convId = match ? match[1] : null;

        const existingBadge = item.querySelector('.mp-alias-badge');

        if (convId && aliases[convId]) {
          if (!existingBadge) {
            const nameSpan = item.querySelector('[data-e2e-conversation-name]');
            if (nameSpan) {
              const badge = document.createElement('span');
              badge.className = 'mp-alias-badge';
              badge.style.cssText =
                'margin-left: 6px; font-size: 11px; font-weight: 500; color: #a8c7fa; background: rgba(168,199,250,0.14); padding: 1px 7px; border-radius: 9999px; display: inline-flex; align-items: center; border: 1px solid rgba(168,199,250,0.28);';
              badge.textContent = aliases[convId];
              nameSpan.after(badge);
            }
          } else if (existingBadge.textContent !== aliases[convId]) {
            existingBadge.textContent = aliases[convId];
          }
        } else if (existingBadge) {
          existingBadge.remove();
        }
      });
    });

    return () => {
      unwatch();
      document.querySelectorAll('.mp-alias-badge').forEach(b => b.remove());
    };
  }, [aliases]);

  return null;
}

export function CrmAlias() {
  const enabled = useFeature('crmAliases');

  useEffect(() => {
    if (!enabled) {
      document.querySelectorAll('.mp-alias-badge').forEach(b => b.remove());
    }
  }, [enabled]);

  if (!enabled) return null;
  return <SidebarAliasEnhancer />;
}
