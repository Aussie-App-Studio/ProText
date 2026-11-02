import { useEffect, useRef, useState } from 'react';
import { Slot } from '../Slot';
import { SEL } from '../selectors';
import { getNote, saveNote } from '../db';
import { useFeature } from '../settings/store';
import { NotesIcon, CheckIcon } from '../ui/MaterialIcons';
import { useThemeMode } from './ThemeEngine';

export function useActiveConversationId(): string | null {
  const [id, setId] = useState<string | null>(() => {
    const m = location.pathname.match(/\/conversations\/([^/?#]+)/);
    return m ? m[1] : null;
  });

  useEffect(() => {
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const m = location.pathname.match(/\/conversations\/([^/?#]+)/);
      const next = m ? m[1] : null;
      setId(prev => (prev === next ? prev : next));
    };
    update();
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    };
    const mo = new MutationObserver(schedule);
    mo.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('popstate', update);
    return () => {
      mo.disconnect();
      window.removeEventListener('popstate', update);
    };
  }, []);

  return id;
}

// Reactive note cache and sync
const noteListeners = new Set<() => void>();
const notesCache: Record<string, string> = {};

export function useContactNote(convId: string | null) {
  const [note, setNote] = useState<string>(() => (convId ? notesCache[convId] || '' : ''));

  useEffect(() => {
    if (!convId) {
      setNote('');
      return;
    }
    if (notesCache[convId] !== undefined) {
      setNote(notesCache[convId]);
    } else {
      getNote(convId).then(n => {
        notesCache[convId] = n || '';
        setNote(n || '');
      });
    }

    const onUpdate = () => {
      setNote(notesCache[convId] || '');
    };
    noteListeners.add(onUpdate);
    return () => {
      noteListeners.delete(onUpdate);
    };
  }, [convId]);

  const update = async (newText: string) => {
    if (!convId) return;
    notesCache[convId] = newText;
    setNote(newText);
    noteListeners.forEach(l => l());
    await saveNote(convId, newText);
  };

  return { note, update };
}

/** Header toolbar button: 1-click access to view/add private notes without cluttering the chat */
export function HeaderNotesButton() {
  const enabled = useFeature('crmNotes');
  const convId = useActiveConversationId();
  const { note, update } = useContactNote(convId);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [localText, setLocalText] = useState(note);
  const [saveStatus, setSaveStatus] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<number | null>(null);
  const themeMode = useThemeMode();
  const isLight = themeMode === 'light';

  const hasNotes = !!note.trim();

  // Sync external note changes into local input
  useEffect(() => {
    setLocalText(note);
  }, [note]);

  // Auto-focus textarea when popover opens
  useEffect(() => {
    if (popoverOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [popoverOpen]);

  // Close on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [popoverOpen]);

  if (!enabled || !convId) return null;

  const handleChange = (val: string) => {
    setLocalText(val);
    setSaveStatus('Saving...');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      await update(val);
      setSaveStatus('Saved locally ✓');
      setTimeout(() => setSaveStatus(''), 2000);
    }, 350);
  };

  const handleClear = async () => {
    setLocalText('');
    await update('');
    setSaveStatus('');
  };

  return (
    <div className="relative inline-flex items-center font-sans" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setPopoverOpen(v => !v)}
        title={hasNotes ? 'View or edit private note' : 'Add private note'}
        aria-label="Private note"
        className={`cursor-pointer flex h-7 items-center gap-1.5 px-2 rounded-full transition-colors text-xs font-medium select-none ${
          hasNotes
            ? isLight
              ? 'bg-[#0b57d0]/12 text-[#0b57d0] hover:bg-[#0b57d0]/20'
              : 'bg-[#a8c7fa]/20 text-[#a8c7fa] hover:bg-[#a8c7fa]/30'
            : isLight
              ? 'text-[#3c4043] hover:bg-black/[0.06] hover:text-[#1f1f1f]'
              : 'text-[#dadce0] hover:bg-white/[0.08] hover:text-white'
        }`}
      >
        <NotesIcon size={14} className="shrink-0" />
        <span>Note</span>
        {hasNotes && (
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
              isLight ? 'bg-[#0b57d0]' : 'bg-[#a8c7fa]'
            }`}
          />
        )}
      </button>

      {/* Popover Note Editor */}
      {popoverOpen && (
        <div
          className={`absolute top-8 right-0 z-[2147483645] w-80 rounded-xl border p-3.5 shadow-2xl backdrop-blur-md text-xs font-sans animate-in fade-in zoom-in-95 duration-100 ${
            isLight
              ? 'border-[#dadce0] bg-white text-gray-900 shadow-xl'
              : 'border-gray-700/80 bg-[#1e2025] text-gray-200'
          }`}
        >
          {/* Popover Header */}
          <div
            className={`flex items-center justify-between border-b pb-2 mb-2.5 ${
              isLight ? 'border-gray-200' : 'border-gray-800'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <NotesIcon
                size={14}
                className={isLight ? 'text-[#0b57d0]' : 'text-[#a8c7fa]'}
              />
              <span className={`font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Private Note
              </span>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus && (
                <span className={`text-[10px] ${isLight ? 'text-[#137333] font-medium' : 'text-[#81c995]'}`}>
                  {saveStatus}
                </span>
              )}
              <button
                type="button"
                onClick={() => setPopoverOpen(false)}
                className={`cursor-pointer px-1 text-xs ${
                  isLight ? 'text-gray-400 hover:text-gray-600' : 'text-gray-400 hover:text-white'
                }`}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={localText}
            onChange={e => handleChange(e.target.value)}
            placeholder="Add a private note for this person (only you can see this on this computer)..."
            rows={4}
            className={`w-full rounded-lg border p-2.5 text-xs outline-none focus:border-blue-500 transition-colors resize-y min-h-[85px] max-h-56 ${
              isLight
                ? 'border-[#dadce0] bg-[#f8f9fa] text-gray-900 placeholder-gray-400'
                : 'border-gray-700/80 bg-gray-900/90 text-gray-100 placeholder-gray-500'
            }`}
          />

          {/* Popover Footer */}
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>
              Saved locally on your device
            </span>
            {localText && (
              <button
                type="button"
                onClick={handleClear}
                className={`cursor-pointer transition-colors ${
                  isLight ? 'text-gray-500 hover:text-red-600' : 'text-gray-400 hover:text-red-400'
                }`}
              >
                Clear note
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** In-chat note card: ONLY appears when a note actually exists so empty conversations stay completely clean */
function InChatNoteCard({
  note,
  convId
}: {
  note: string;
  convId: string;
}) {
  const { update } = useContactNote(convId);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note);
  const [isExpanded, setIsExpanded] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const timer = useRef<number | null>(null);
  const themeMode = useThemeMode();
  const isLight = themeMode === 'light';

  useEffect(() => {
    setEditText(note);
  }, [note]);

  // If note was cleared, hide completely
  if (!note.trim() && !isEditing) return null;

  const handleTextChange = (val: string) => {
    setEditText(val);
    setSaveStatus('Saving...');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      await update(val);
      setSaveStatus('Saved locally ✓');
      setTimeout(() => setSaveStatus(''), 2000);
      if (!val.trim()) {
        setIsEditing(false);
      }
    }, 400);
  };

  const handleClear = async () => {
    setEditText('');
    await update('');
    setIsEditing(false);
  };

  return (
    <div className="mx-4 my-2 font-sans transition-all">
      <div
        className={`rounded-xl border shadow-xs transition-all overflow-hidden ${
          isLight
            ? 'border-[#dadce0] bg-[#f8f9fa]'
            : 'border-[#dadce0]/12 bg-[#282a2d]'
        }`}
      >
        {/* Card Header */}
        <div
          onClick={() => setIsExpanded(v => !v)}
          className={`flex cursor-pointer items-center justify-between px-3.5 py-1.5 text-xs transition-colors ${
            isLight
              ? 'text-gray-900 hover:bg-black/[0.02]'
              : 'text-[#e8eaed] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
            <NotesIcon
              size={14}
              className={`shrink-0 ${isLight ? 'text-[#0b57d0]' : 'text-[#a8c7fa]'}`}
            />
            <span className={`font-semibold text-[11.5px] shrink-0 ${isLight ? 'text-[#0b57d0]' : 'text-[#a8c7fa]'}`}>
              Private Note
            </span>
            {!isExpanded && (
              <span className={`truncate text-xs ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                {note.split('\n')[0]}
              </span>
            )}
            <span className={`text-[10.5px] shrink-0 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              (Saved locally)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saveStatus && (
              <span className={`text-[10px] ${isLight ? 'text-[#137333] font-medium' : 'text-[#81c995]'}`}>
                {saveStatus}
              </span>
            )}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setIsEditing(v => !v);
                setIsExpanded(true);
              }}
              className={`cursor-pointer px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                isLight
                  ? 'text-blue-700 hover:bg-blue-100'
                  : 'text-[#a8c7fa] hover:bg-white/10'
              }`}
            >
              {isEditing ? 'Done' : 'Edit'}
            </button>
            <span className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              {isExpanded ? '▴' : '▾'}
            </span>
          </div>
        </div>

        {/* Card Body */}
        {isExpanded && (
          <div className={`border-t px-3.5 py-2.5 ${isLight ? 'border-gray-200 bg-white' : 'border-gray-700/50 bg-[#1e2025]'}`}>
            {isEditing ? (
              <>
                <textarea
                  value={editText}
                  onChange={e => handleTextChange(e.target.value)}
                  placeholder="Private notes for this person..."
                  rows={3}
                  className={`w-full rounded-lg border p-2 text-xs outline-none focus:border-blue-500 transition-colors resize-y min-h-[60px] max-h-40 ${
                    isLight
                      ? 'border-[#dadce0] bg-[#f8f9fa] text-gray-900 placeholder-gray-400'
                      : 'border-gray-700/80 bg-gray-900/80 text-gray-100 placeholder-gray-500'
                  }`}
                />
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>
                    Only stored on this computer
                  </span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className={`cursor-pointer transition-colors ${
                      isLight ? 'text-gray-500 hover:text-red-600' : 'text-gray-400 hover:text-red-400'
                    }`}
                  >
                    Clear note
                  </button>
                </div>
              </>
            ) : (
              <div className={`text-xs whitespace-pre-wrap leading-relaxed ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                {note}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Root In-Chat Mount: ONLY renders if notes exist for the active contact */
export function CrmNotes() {
  const enabled = useFeature('crmNotes');
  const convId = useActiveConversationId();
  const { note } = useContactNote(convId);

  // If feature is disabled, or no active conversation, or NO note exists: render NOTHING!
  // This keeps the messages area 100% clean and free of empty space.
  if (!enabled || !convId || !note.trim()) return null;

  return (
    <Slot anchor={SEL.messagesList} position="before" id="crm-notes" hostStyle="display:block;margin-top:68px;">
      <InChatNoteCard note={note} convId={convId} />
    </Slot>
  );
}
