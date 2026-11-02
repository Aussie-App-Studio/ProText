import { useEffect, useState, useSyncExternalStore } from 'react';
import { Slot } from '../Slot';
import { SEL } from '../selectors';
import { HeaderNameEditor } from './ContactNameResolver';
import { HeaderFollowUpButton } from './FollowUp';
import { HeaderNotesButton } from './CrmNotes';
import { HeaderAliasBadge } from './CrmAlias';
import { HeaderSearchButton } from './InConversationSearch';
import { HeaderExportButton } from './ConversationExporter';
import { HeaderMediaButton } from './SharedMediaDrawer';
import { useThemeMode } from './ThemeEngine';
import { SettingsGearIcon } from '../ui/MaterialIcons';
import { openFullSettings } from '../settings/store';

export function HeaderSettingsButton() {
  const themeMode = useThemeMode();
  const isLight = themeMode === 'light';

  return (
    <button
      type="button"
      data-testid="header-settings-btn"
      onClick={() => openFullSettings()}
      title="Messages+ Settings & Advanced Options"
      aria-label="Messages+ Settings & Advanced Options"
      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors cursor-pointer ${
        isLight
          ? 'text-[#5f6368] hover:bg-black/[0.06] hover:text-[#1f1f1f] active:bg-black/[0.1]'
          : 'text-[#9aa0a6] hover:bg-white/[0.08] hover:text-[#e8eaed] active:bg-white/[0.12]'
      }`}
    >
      <SettingsGearIcon size={16} />
    </button>
  );
}

const HEADER_LAYOUT_STYLE_ID = 'mp-header-layout-css';

function ensureHeaderLayoutCss() {
  let style = document.getElementById(HEADER_LAYOUT_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = HEADER_LAYOUT_STYLE_ID;
    style.textContent = `
      mws-header {
        clip-path: none !important;
      }
      mws-header .left-content {
        min-width: 0 !important;
        overflow: hidden !important;
        margin-right: 12px !important;
      }
      mws-header .left-content .title-container {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        flex-wrap: nowrap !important;
        gap: 8px !important;
        min-width: 0 !important;
      }
      mws-header .left-content .title-container .title {
        flex-shrink: 0 !important;
        max-width: 260px !important;
      }
    `;
    document.head.appendChild(style);
  }
}

function useActiveConversationId(): string | null {
  useEffect(() => {
    ensureHeaderLayoutCss();
  }, []);

  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('popstate', cb);
      const mo = new MutationObserver(cb);
      mo.observe(document.documentElement, { childList: true, subtree: true });
      return () => {
        window.removeEventListener('popstate', cb);
        mo.disconnect();
      };
    },
    () => {
      const m = location.pathname.match(/\/conversations\/([^/?#]+)/);
      return m ? m[1] : null;
    }
  );
}

/**
 * Material Design 3 Conversation Header Integration:
 * 1. Left Identity Slot (beside Contact Name): Role/Label chip + Contact Name Editor
 * 2. Right Secondary Pill Slot (before native Mute/Menu icons): Unified Material 3 pill for tools
 */
export function ConversationHeaderToolbar() {
  const convId = useActiveConversationId();
  const themeMode = useThemeMode();
  const isLight = themeMode === 'light';
  if (!convId) return null;

  return (
    <>
      {/* Left Identity Metadata right beside Contact Title */}
      <Slot
        anchor={SEL.headerTitle}
        position="after"
        id="conversation-header-identity"
        hostStyle="display:inline-flex;align-items:center;vertical-align:middle;flex-shrink:0;"
      >
        <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap font-sans text-xs">
          <HeaderAliasBadge />
          <HeaderNameEditor />
        </div>
      </Slot>

      {/* Right Material 3 Secondary Pill placed cleanly before Google's right-content buttons */}
      <Slot
        anchor="mws-header .right-content"
        position="before"
        id="conversation-header-toolbar"
        hostStyle="display:inline-flex;align-items:center;margin-right:8px;vertical-align:middle;flex-shrink:0;"
      >
        <div className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-1 flex-nowrap whitespace-nowrap [&_button]:whitespace-nowrap [&_button]:shrink-0 font-sans text-xs transition-colors ${
          isLight
            ? 'border-[#dadce0] bg-[#f1f3f4] text-[#3c4043] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
            : 'border-[#dadce0]/[0.09] bg-[#303134] text-[#e8eaed] shadow-[0_1px_3px_rgba(0,0,0,0.2)]'
        }`}>
          <HeaderFollowUpButton />
          <HeaderNotesButton />
          <div className={`h-4 w-px mx-0.5 ${isLight ? 'bg-[#dadce0]' : 'bg-[#dadce0]/15'}`} />
          <HeaderSearchButton />
          <HeaderMediaButton />
          <HeaderExportButton />
          <div className={`h-4 w-px mx-0.5 ${isLight ? 'bg-[#dadce0]' : 'bg-[#dadce0]/15'}`} />
          <HeaderSettingsButton />
        </div>
      </Slot>
    </>
  );
}
