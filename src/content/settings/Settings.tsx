import { useEffect, useRef, useState } from 'react';
import { Slot } from '../Slot';
import { SEL } from '../selectors';
import {
  FEATURES,
  FEATURE_CATEGORIES,
  type FeatureCategory,
  closeSettings,
  openSettings,
  openFullSettings,
  openSettingsIntro,
  closeSettingsIntro,
  completeSettingsIntro,
  setMPlusPillVisible,
  setFeature,
  useStore,
  PROTEXT_FEEDBACK_URL
} from './store';
import { BUILTIN_THEMES, useThemeEngine, type CustomTheme } from '../features/ThemeEngine';
import { ThemeBuilder } from './ThemeBuilder';
import { useQuickEmojis, EmojiCustomizer } from '../features/QuickEmojiBar';
import { exportAllData, importAllData, getAllStoredContacts, type MessagesPlusBackup } from '../db';
import { SettingsGearIcon } from '../ui/MaterialIcons';

/** Ensures "Messages+ Settings" is placed natively inside Google's top-left hamburger menu right beside Settings */
export function useHamburgerMenuSettingsItem() {
  useEffect(() => {
    const ensureMenuItem = () => {
      const middleNavList = document.querySelector('.middle-nav-list');
      if (!middleNavList) return;
      if (middleNavList.querySelector('.mp-nav-drawer-item')) return;

      const settingsItem = middleNavList.querySelector('mw-nav-drawer-item');
      if (!settingsItem) return;

      const clone = settingsItem.cloneNode(true) as HTMLElement;
      clone.className = 'ng-star-inserted mp-nav-drawer-item';

      const a = clone.querySelector('a') || clone.querySelector('button');
      if (a) {
        a.removeAttribute('href');
        (a as HTMLElement).style.cursor = 'pointer';

        const label = clone.querySelector('.nav-drawer-label');
        if (label) label.textContent = 'ProText Settings';

        const icon = clone.querySelector('mws-icon');
        if (icon) {
          const svg = icon.querySelector('svg');
          if (svg) {
            svg.style.color = '#3b82f6';
            svg.style.fill = 'currentColor';
          } else {
            icon.innerHTML = `<svg viewBox="0 0 24 24" style="color: #3b82f6; fill: currentColor; width: 24px; height: 24px;"><path d="M13.85 22.25h-3.7c-.74 0-1.36-.54-1.45-1.27l-.27-1.89c-.27-.14-.53-.29-.79-.46l-1.8.72c-.7.26-1.47-.03-1.81-.65L2.2 15.53c-.35-.66-.2-1.44.36-1.88l1.53-1.19c-.01-.15-.02-.3-.02-.46 0-.15.01-.31.02-.46l-1.52-1.19c-.59-.45-.74-1.26-.37-1.88l1.85-3.19c.34-.62 1.11-.9 1.79-.63l1.81.73c.26-.17.52-.32.78-.46l.27-1.91c.09-.7.71-1.25 1.44-1.25h3.7c.74 0 1.36.54 1.45 1.27l.27 1.89c.27.14.53.29.79.46l1.8-.72c.71-.26 1.48.03 1.82.65l1.84 3.18c.36.66.2 1.44-.36 1.88l-1.52 1.19c.01.15.02.3.02.46s-.01.31-.02.46l1.52 1.19c.56.45.72 1.23.37 1.86l-1.86 3.22c-.34.62-1.11.9-1.8.63l-1.8-.72c-.26.17-.52.32-.78.46l-.27 1.91c-.1.68-.72 1.22-1.46 1.22zm-3.23-2h2.76l.37-2.55.53-.22c.44-.18.88-.44 1.34-.78l.45-.34 2.38.96 1.38-2.4-2.03-1.58.07-.56c.03-.26.06-.51.06-.78s-.03-.53-.06-.78l-.07-.56 2.03-1.58-1.39-2.4-2.39.96-.45-.35c-.42-.32-.87-.58-1.33-.77l-.52-.22-.37-2.55h-2.76l-.37 2.55-.53.21c-.44.19-.88.44-1.34.79l-.45.33-2.38-.95-1.39 2.39 2.03 1.58-.07.56c-.03.26-.06.53-.06.79s.02.53.06.78l.07.56-2.03 1.58 1.38 2.4 2.39-.96.45.35c.43.33.86.58 1.33.77l.53.22.38 2.55z"></path><circle cx="12" cy="12" r="3.5"></circle></svg>`;
          }
        }

        a.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const backdrop = document.querySelector(
            '.mat-drawer-backdrop, .cdk-overlay-backdrop'
          ) as HTMLElement | null;
          if (backdrop) backdrop.click();
          else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          openFullSettings();
        });
      }

      settingsItem.after(clone);
    };

    ensureMenuItem();
    const mo = new MutationObserver(ensureMenuItem);
    mo.observe(document.documentElement, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
}

/** "ProText" button injected into Google's header, left of the account switcher. */
export function SettingsButton() {
  const { mPlusPillVisible, hasSeenSettingsIntro } = useStore();
  useHamburgerMenuSettingsItem();

  if (!mPlusPillVisible) return null;

  return (
    <Slot anchor={SEL.accountSwitcher} position="before" id="settings-button" hostStyle="display:flex;align-items:center;margin-right:8px">
      <style>{`
        @keyframes mp-pulse-fade {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.96); }
        }
      `}</style>
      <div
        className={`inline-flex items-center rounded-full bg-blue-600 hover:bg-blue-500 shadow-xs transition-all font-sans p-0.5 ${
          !hasSeenSettingsIntro ? 'ring-2 ring-blue-300/60 shadow-blue-500/40' : ''
        }`}
        style={!hasSeenSettingsIntro ? { animation: 'mp-pulse-fade 1.8s ease-in-out infinite' } : undefined}
      >
        <button
          type="button"
          onClick={() => {
            if (!hasSeenSettingsIntro) {
              openSettingsIntro();
            } else {
              openSettings();
            }
          }}
          title={!hasSeenSettingsIntro ? 'ProText Settings (Click to configure access)' : 'ProText Quick Settings'}
          className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
        >
          <span className="rounded bg-white/20 px-1 py-0.2 text-[9px] font-black tracking-wider uppercase">PRO</span>
          <span>Text</span>
        </button>
        <div className="h-3.5 w-px bg-white/25" />
        <button
          type="button"
          onClick={() => openFullSettings()}
          title="Open Extension Settings & Advanced Options"
          aria-label="Open Extension Settings & Advanced Options"
          className="cursor-pointer rounded-full p-1 text-white hover:bg-white/20 transition-all flex items-center justify-center"
        >
          <SettingsGearIcon size={14} />
        </button>
      </div>
    </Slot>
  );
}

/** First-time choice modal explaining hamburger menu settings vs. M+ header pill */
export function SettingsIntroModal() {
  const { settingsIntroOpen } = useStore();

  useEffect(() => {
    if (!settingsIntroOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSettingsIntro();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsIntroOpen]);

  if (!settingsIntroOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[2147483647] pointer-events-auto flex items-center justify-center bg-black/65 backdrop-blur-xs font-sans text-gray-100 animate-in fade-in duration-150"
      onClick={closeSettingsIntro}
    >
      <div
        role="dialog"
        aria-label="Welcome to ProText Settings"
        className="w-[490px] max-w-[94vw] rounded-2xl bg-[#232428] p-6 shadow-2xl border border-gray-700/80 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold text-xs tracking-wider shadow-inner">
            PRO
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Welcome to ProText</h2>
            <p className="text-xs text-gray-400">Power tools, themes, folders & undo send for Google Messages</p>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="rounded-xl bg-gray-800/60 p-4 border border-gray-700/60 mb-5 text-xs text-gray-300 leading-relaxed space-y-2">
          <p>
            ProText settings are conveniently located right alongside Google's default Settings inside the <strong>top-left main menu</strong> (☰ &gt; <em>ProText Settings</em>).
          </p>
          <p className="text-gray-400 text-[11px]">
            We also added this top-bar <strong>ProText</strong> button for fast 1-click access. You can keep the button visible, or hide it to keep your header bar minimal.
          </p>
        </div>

        {/* Choice Cards */}
        <div className="space-y-3 mb-5">
          <button
            type="button"
            onClick={() => void completeSettingsIntro(true)}
            className="w-full text-left p-3.5 rounded-xl border border-blue-500/50 bg-blue-950/30 hover:bg-blue-900/40 hover:border-blue-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm text-blue-300 group-hover:text-blue-200 flex items-center gap-2">
                <span>Keep ProText button visible in header</span>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                  Recommended
                </span>
              </span>
              <span className="text-blue-400 font-bold text-sm">→</span>
            </div>
            <p className="text-xs text-gray-400 leading-normal">
              Keep the 1-click shortcut in the top header next to your profile photo for quick access anytime.
            </p>
          </button>

          <button
            type="button"
            onClick={() => void completeSettingsIntro(false)}
            className="w-full text-left p-3.5 rounded-xl border border-gray-700/70 bg-gray-900/50 hover:bg-gray-800/60 hover:border-gray-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm text-gray-200 group-hover:text-white flex items-center gap-2">
                <span>Hide header button (use top-left ☰ menu only)</span>
              </span>
              <span className="text-gray-400 group-hover:text-white font-bold text-sm">→</span>
            </div>
            <p className="text-xs text-gray-400 leading-normal">
              Keep your header clean and minimal. You can always access ProText settings anytime from Google's top-left ☰ hamburger menu.
            </p>
          </button>
        </div>

        <div className="text-center text-[11px] text-gray-500">
          You can toggle the header button on or off anytime inside Settings.
        </div>
      </div>
    </div>
  );
}

function Toggle({
  on,
  onChange,
  label,
  accentColor = '#3b82f6'
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  accentColor?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors"
      style={{
        backgroundColor: on ? accentColor : 'rgba(128, 128, 128, 0.35)'
      }}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-all ${
          on ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

/** Modal rendered in the extension's own root (fixed overlay, above Google's UI). */
export function SettingsModal() {
  const { settingsOpen, flags, mPlusPillVisible } = useStore();
  const { currentTheme, customThemes, effectiveMode, selectTheme, saveCustom, deleteCustom } = useThemeEngine();
  const isLight = effectiveMode === 'light';
  const { emojis, mode } = useQuickEmojis();
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showEmojiSettings, setShowEmojiSettings] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSettings();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen]);

  const handleExportBackup = async () => {
    try {
      const backup = await exportAllData();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `messages-plus-backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatus('✓ Backup saved to your downloads!');
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed: MessagesPlusBackup = JSON.parse(text);
      if (!parsed.data || typeof parsed.data !== 'object') {
        throw new Error('Invalid ProText backup file format.');
      }

      if (!confirm('This will restore all saved groups, message templates, pastoral notes, aliases, and settings from the backup file. Proceed?')) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const { counts } = await importAllData(parsed);
      const summary = Object.entries(counts)
        .map(([k, v]) => `${v} ${k}`)
        .join(', ');

      setBackupStatus(`✓ Restored: ${summary}! Refreshing...`);
      setTimeout(() => {
        location.reload();
      }, 1500);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportGoogleContactsCSV = async () => {
    try {
      const contactsMap = await getAllStoredContacts();
      const list = Object.values(contactsMap);
      if (list.length === 0) {
        alert('No local contacts found yet. Upload a Planning Center list or save contact names first.');
        return;
      }

      // Standard Google Contacts CSV headers
      const csvLines = [
        'Given Name,Family Name,Name,Phone 1 - Type,Phone 1 - Value,E-mail 1 - Type,E-mail 1 - Value'
      ];

      for (const c of list) {
        const first = (c.firstName || c.name.split(/\s+/)[0] || '').replace(/"/g, '""');
        const last = (c.lastName || c.name.split(/\s+/).slice(1).join(' ') || '').replace(/"/g, '""');
        const full = (c.name || '').replace(/"/g, '""');
        const phone = (c.phone || '').replace(/"/g, '""');
        const email = (c.email || '').replace(/"/g, '""');

        csvLines.push(
          `"${first}","${last}","${full}","Mobile","${phone}","Home","${email}"`
        );
      }

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `google-contacts-import-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setBackupStatus(`✓ Exported ${list.length} contacts for Google Contacts!`);
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  if (!settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-[2147483647] pointer-events-auto flex items-center justify-center bg-black/60 backdrop-blur-xs" onClick={closeSettings}>
      <div
        role="dialog" aria-label="ProText Settings"
        className={`w-[520px] max-w-[94vw] max-h-[90vh] overflow-y-auto rounded-2xl p-5 font-sans shadow-2xl border transition-all ${
          isLight
            ? 'bg-white text-gray-900 border-[#dadce0]'
            : 'bg-[#232428] text-gray-100 border-gray-700/60'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`mb-3 flex items-center justify-between border-b pb-2.5 ${
          isLight ? 'border-gray-200' : 'border-gray-700/60'
        }`}>
          <div>
            <h2 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>ProText Settings</h2>
            <span className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              Currently active mode: <strong className={isLight ? 'text-blue-600' : 'text-blue-400'}>{isLight ? 'Light Theme' : 'Dark Theme'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                closeSettings();
                openFullSettings();
              }}
              title="Open full Material-Design settings page with all options"
              className={`cursor-pointer flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                isLight
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40'
              }`}
            >
              <SettingsGearIcon size={14} />
              <span>All Settings</span>
              <span>↗</span>
            </button>
            <button onClick={closeSettings} aria-label="Close" className="cursor-pointer rounded-full px-2 text-xl leading-none text-gray-400 hover:text-gray-600 dark:hover:text-white">×</button>
          </div>
        </div>

        {showBuilder ? (
          <ThemeBuilder
            initial={editingTheme}
            onSave={theme => {
              saveCustom(theme);
              setShowBuilder(false);
              setEditingTheme(null);
            }}
            onCancel={() => {
              setShowBuilder(false);
              setEditingTheme(null);
            }}
          />
        ) : (
          <>
            {/* Color Themes Section */}
            <div className={`mb-5 rounded-xl p-3.5 border transition-all ${
              isLight ? 'bg-[#f8f9fa] border-[#dadce0]' : 'bg-gray-800/40 border-gray-700/60'
            }`}>
              <div className="mb-2.5 flex items-center justify-between">
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Color Themes</span>
                  <p className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Works seamlessly whether Google Messages is in light or dark mode</p>
                </div>
                <button
                  onClick={() => {
                    setEditingTheme(null);
                    setShowBuilder(true);
                  }}
                  className="cursor-pointer rounded-lg bg-blue-600/90 hover:bg-blue-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-all"
                >
                  + Build Theme
                </button>
              </div>

              {/* 1. Google Default / System Auto Option */}
              <button
                type="button"
                onClick={() => selectTheme('default')}
                className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium mb-3 transition-all cursor-pointer ${
                  currentTheme === 'default'
                    ? isLight
                      ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs ring-1 ring-blue-500'
                      : 'border-blue-400 bg-blue-500/20 text-white shadow-sm ring-1 ring-blue-400'
                    : isLight
                      ? 'border-[#dadce0] bg-white text-[#3c4043] hover:border-blue-400'
                      : 'border-gray-700/80 bg-gray-900/60 text-gray-300 hover:border-gray-500 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-3.5 w-3.5 rounded-full border border-white/20 shrink-0 bg-blue-500" />
                  <div className="text-left">
                    <span className="font-semibold block text-xs">Google Messages Default (Auto Sync)</span>
                    <span className={`text-[10.5px] block ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      Seamlessly matches Google Messages light or dark mode setting
                    </span>
                  </div>
                </div>
                {currentTheme === 'default' && (
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 shrink-0">✓ Active</span>
                )}
              </button>

              {/* 2. Dedicated Dark Themes */}
              <div className="mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${
                  isLight ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Dark Themes (Overrides Google Messages to Dark)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {BUILTIN_THEMES.filter(t => t.category === 'dark').map(t => (
                    <button
                      key={t.id}
                      onClick={() => selectTheme(t.id)}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                        currentTheme === t.id
                          ? isLight
                            ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs ring-1 ring-blue-500 font-semibold'
                            : 'border-blue-400 bg-blue-500/20 text-white shadow-sm ring-1 ring-blue-400'
                          : isLight
                            ? 'border-[#dadce0] bg-white text-[#3c4043] hover:border-gray-400'
                            : 'border-gray-700/80 bg-gray-900/60 text-gray-300 hover:border-gray-500 hover:text-white'
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: t.dotColor }}
                      />
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Dedicated Light Themes */}
              <div className="mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${
                  isLight ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Light Themes (Overrides Google Messages to Light)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {BUILTIN_THEMES.filter(t => t.category === 'light').map(t => (
                    <button
                      key={t.id}
                      onClick={() => selectTheme(t.id)}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                        currentTheme === t.id
                          ? isLight
                            ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs ring-1 ring-blue-500 font-semibold'
                            : 'border-blue-400 bg-blue-500/20 text-white shadow-sm ring-1 ring-blue-400'
                          : isLight
                            ? 'border-[#dadce0] bg-white text-[#3c4043] hover:border-gray-400'
                            : 'border-gray-700/80 bg-gray-900/60 text-gray-300 hover:border-gray-500 hover:text-white'
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: t.dotColor }}
                      />
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Themes List (if any) */}
              {customThemes.length > 0 && (
                <div className={`mt-3 border-t pt-2.5 ${isLight ? 'border-gray-200' : 'border-gray-700/50'}`}>
                  <div className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${
                    isLight ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    Your Custom Themes ({customThemes.length})
                  </div>
                  <div className="space-y-1.5">
                    {customThemes.map(ct => (
                      <div
                        key={ct.id}
                        className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                          currentTheme === ct.id
                            ? isLight
                              ? 'border-blue-600 bg-blue-50 text-blue-900'
                              : 'border-blue-400 bg-blue-500/20 text-white'
                            : isLight
                              ? 'border-[#dadce0] bg-white text-[#3c4043]'
                              : 'border-gray-700/60 bg-gray-900/40 text-gray-300'
                        }`}
                      >
                        <button
                          onClick={() => selectTheme(ct.id)}
                          className="flex items-center gap-2 overflow-hidden text-left cursor-pointer flex-1"
                        >
                          <span
                            className="h-3 w-3 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: ct.outgoingBg }}
                          />
                          <span className="truncate font-medium">{ct.name}</span>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            onClick={() => {
                              setEditingTheme(ct);
                              setShowBuilder(true);
                            }}
                            title="Edit theme"
                            className="cursor-pointer text-gray-400 hover:text-white px-1"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => deleteCustom(ct.id)}
                            title="Delete theme"
                            className="cursor-pointer text-gray-400 hover:text-red-400 px-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Emojis Section */}
            <div className={`mb-5 rounded-xl p-3.5 border transition-all ${
              isLight ? 'bg-[#f8f9fa] border-[#dadce0]' : 'bg-gray-800/40 border-gray-700/60'
            }`}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Quick Reaction Emojis</span>
                  <p className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Choose your 5 quick emojis and decide when they appear</p>
                </div>
                <button
                  onClick={() => setShowEmojiSettings(v => !v)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    isLight
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      : 'bg-gray-700/80 hover:bg-gray-600 text-gray-200'
                  }`}
                >
                  {showEmojiSettings ? 'Done' : 'Customize'}
                </button>
              </div>
              {showEmojiSettings ? (
                <div className="mt-3">
                  <EmojiCustomizer />
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  {emojis.map((e, idx) => (
                    <span
                      key={idx}
                      className={`h-8 w-8 rounded-lg border flex items-center justify-center text-lg ${
                        isLight
                          ? 'bg-white border-[#dadce0]'
                          : 'bg-gray-900/60 border-gray-700/80'
                      }`}
                    >
                      {e}
                    </span>
                  ))}
                  <span className={`text-[11px] ml-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    ({mode === 'typing' ? 'Shows only when typing' : mode === 'always' ? 'Always visible' : 'Hidden'})
                  </span>
                </div>
              )}
            </div>

            {/* Header Shortcut Section */}
            <div className={`mb-5 rounded-xl p-3.5 border transition-all ${
              isLight ? 'bg-[#f8f9fa] border-[#dadce0]' : 'bg-gray-800/40 border-gray-700/60'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Header "ProText" Button</span>
                  <p className={`text-[11px] mt-0.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    Show or hide the ProText shortcut pill next to your profile photo. Settings are always accessible in the top-left ☰ hamburger menu.
                  </p>
                </div>
                <Toggle
                  label="Show ProText button in top header"
                  on={mPlusPillVisible}
                  onChange={v => void setMPlusPillVisible(v)}
                />
              </div>
            </div>

            {/* Features Toggle Section with Category Filtering & Color Coordination */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  Features & Tools
                </span>
                <span className={`text-[11px] ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                  Sorted by area with color-coded controls
                </span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`cursor-pointer shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-white/10 text-gray-300 hover:bg-white/15'
                  }`}
                >
                  All ({FEATURES.length})
                </button>
                {FEATURE_CATEGORIES.map(cat => {
                  const count = FEATURES.filter(f => f.category === cat.id).length;
                  const isSel = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`cursor-pointer shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                        isSel
                          ? 'text-white shadow-xs'
                          : isLight
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-white/10 text-gray-300 hover:bg-white/15'
                      }`}
                      style={isSel ? { backgroundColor: cat.accentColor } : undefined}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.shortName}</span>
                      <span className={`text-[10px] rounded-full px-1 ${isSel ? 'bg-black/20 text-white' : 'opacity-70'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Categorized Groups */}
              <div className="space-y-4">
                {FEATURE_CATEGORIES.map(cat => {
                  if (selectedCategory !== 'all' && selectedCategory !== cat.id) return null;
                  const catFeatures = FEATURES.filter(f => f.category === cat.id);
                  if (catFeatures.length === 0) return null;

                  const activeCount = catFeatures.filter(f => flags[f.id] ?? true).length;

                  return (
                    <div key={cat.id} className="rounded-xl border overflow-hidden transition-all shadow-2xs border-inherit">
                      {/* Category Header */}
                      <div
                        className={`flex items-center justify-between p-2.5 px-3 border-b border-inherit bg-gradient-to-r ${cat.headerGradient}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{cat.icon}</span>
                          <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                            {cat.name}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.badgeBg} ${cat.badgeBorder} ${cat.badgeText}`}
                        >
                          {activeCount}/{catFeatures.length} on
                        </span>
                      </div>

                      {/* Items */}
                      <ul className={`divide-y ${isLight ? 'divide-gray-100 bg-white' : 'divide-white/5 bg-gray-900/40'}`}>
                        {catFeatures.map(f => {
                          const isChecked = flags[f.id] ?? true;
                          return (
                            <li key={f.id} className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015]">
                              <div className="flex-1 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="h-1.5 w-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: isChecked ? cat.accentColor : 'rgba(128,128,128,0.4)' }}
                                  />
                                  <div className={`text-xs font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                    {f.label}
                                  </div>
                                  {f.shortcut && (
                                    <span className="rounded bg-black/5 dark:bg-white/10 px-1 py-0.2 text-[9px] font-mono text-gray-500 dark:text-gray-400">
                                      {f.shortcut}
                                    </span>
                                  )}
                                </div>
                                <div className={`text-[11px] mt-0.5 leading-snug ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                  {f.description}
                                </div>
                              </div>
                              <Toggle
                                label={f.label}
                                on={isChecked}
                                accentColor={cat.accentColor}
                                onChange={v => setFeature(f.id, v)}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Backup & Data Transfer Section */}
            <div className={`rounded-xl p-3.5 border transition-all ${
              isLight ? 'bg-[#f8f9fa] border-[#dadce0]' : 'bg-gray-800/40 border-gray-700/60'
            }`}>
              <div className="mb-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                  Data Backup & Transfer
                </span>
                <p className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  Safely save your templates, groups, notes, and settings to a file, or restore them onto another computer.
                </p>
              </div>

              {backupStatus && (
                <div className="mb-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 p-2 text-xs text-emerald-600 dark:text-emerald-300 font-medium">
                  {backupStatus}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="cursor-pointer flex-1 rounded-lg bg-blue-600/90 hover:bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <span>💾</span>
                  <span>Backup All Data (.json)</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportBackup}
                  accept=".json"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    isLight
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      : 'bg-gray-700/80 hover:bg-gray-600 text-gray-200'
                  }`}
                >
                  <span>📂</span>
                  <span>Restore from Backup</span>
                </button>
              </div>
            </div>

            {/* Google Contacts Integration Section */}
            <div className={`mt-4 rounded-xl p-3.5 border transition-all ${
              isLight ? 'bg-[#f8f9fa] border-[#dadce0]' : 'bg-gray-800/40 border-gray-700/60'
            }`}>
              <div className="mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🌐</span>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                    Google Contacts Sync & Export
                  </span>
                </div>
                <p className={`text-[11px] mt-0.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  Contacts saved or imported into Google Contacts automatically sync down to your Android phone and appear natively across all your devices.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportGoogleContactsCSV}
                  className="cursor-pointer flex-1 rounded-lg bg-blue-600/90 hover:bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition-all flex items-center justify-center gap-1.5"
                  title="Download all your local & Planning Center contacts formatted for 1-click import into Google Contacts"
                >
                  <span>📥</span>
                  <span>Export for Google Contacts (.csv)</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.open('https://contacts.google.com', '_blank')}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    isLight
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      : 'bg-gray-700/80 hover:bg-gray-600 text-gray-200'
                  }`}
                  title="Open Google Contacts in a new tab"
                >
                  <span>↗</span>
                  <span>Google Contacts</span>
                </button>
              </div>
            </div>

            {/* Feedback & Bug Reports Footer */}
            <div className={`mt-4 rounded-xl p-3 border transition-all flex items-center justify-between gap-3 ${
              isLight
                ? 'bg-blue-50/60 border-blue-200/70 text-gray-800'
                : 'bg-blue-950/20 border-blue-800/40 text-gray-200'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base select-none">💡</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold leading-tight">Feedback & Bug Reports</div>
                  <div className={`text-[11px] truncate leading-tight ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    Suggest a feature or report an issue
                  </div>
                </div>
              </div>
              <a
                href={PROTEXT_FEEDBACK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer shrink-0 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors flex items-center gap-1.5 no-underline"
                title="Open ProText Feedback & Bug Report Form"
              >
                <span>Share Feedback</span>
                <span className="text-[10px]">↗</span>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
