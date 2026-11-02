import { useEffect, useRef, useState, useMemo } from 'react';
import {
  FEATURES,
  FEATURE_CATEGORIES,
  type FeatureCategory,
  type FeatureId,
  closeFullSettings,
  setFeature,
  setMPlusPillVisible,
  useStore,
  PROTEXT_FEEDBACK_URL
} from './store';
import { BUILTIN_THEMES, useThemeEngine, type CustomTheme } from '../features/ThemeEngine';
import { ThemeBuilder } from './ThemeBuilder';
import { useQuickEmojis, EmojiCustomizer } from '../features/QuickEmojiBar';
import { exportAllData, importAllData, getAllStoredContacts, type MessagesPlusBackup } from '../db';

/** Material Design 3 Slide Toggle with custom category accent color */
function MaterialToggle({
  label,
  checked,
  accentColor = '#3b82f6',
  onChange
}: {
  label: string;
  checked: boolean;
  accentColor?: string;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden"
      style={{
        backgroundColor: checked ? accentColor : 'rgba(128, 128, 128, 0.35)'
      }}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function FullSettingsPage() {
  const { fullSettingsOpen, flags, mPlusPillVisible } = useStore();
  const { currentTheme, effectiveMode, selectTheme, customThemes, saveCustom, deleteCustom } = useThemeEngine();
  const { emojis, mode } = useQuickEmojis();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);
  const [showEmojiSettings, setShowEmojiSettings] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = effectiveMode === 'light';

  // Handle Escape key to close
  useEffect(() => {
    if (!fullSettingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeFullSettings();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [fullSettingsOpen]);

  // Filter features based on search and tab
  const filteredFeatures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FEATURES.filter(f => {
      const matchesSearch = !q || f.label.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
      const matchesTab = activeTab === 'all' || f.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [searchQuery, activeTab]);

  // Group filtered features by category
  const groupedFeatures = useMemo(() => {
    const map = new Map<FeatureCategory, typeof filteredFeatures>();
    FEATURE_CATEGORIES.forEach(cat => map.set(cat.id, []));
    filteredFeatures.forEach(f => {
      const arr = map.get(f.category);
      if (arr) arr.push(f);
    });
    return map;
  }, [filteredFeatures]);

  // Backup Export
  const handleExportBackup = async () => {
    try {
      const backup = await exportAllData();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `messages-plus-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatus('✓ Backup downloaded successfully!');
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // Backup Import
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as MessagesPlusBackup;
      if (!backup.version || !backup.exportedAt) {
        throw new Error('Invalid backup file format');
      }
      await importAllData(backup);
      setBackupStatus(`✓ Restored backup from ${new Date(backup.exportedAt).toLocaleDateString()}! Reloading...`);
      setTimeout(() => location.reload(), 1200);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Google Contacts CSV Export
  const handleExportGoogleContactsCSV = async () => {
    try {
      const contactsMap = await getAllStoredContacts();
      const list = Object.values(contactsMap || {});
      if (list.length === 0) {
        alert('No synced contacts found yet. Browse a few conversations or start a chat first!');
        return;
      }

      const csvLines = [
        'Given Name,Family Name,Name,Phone 1 - Type,Phone 1 - Value,E-mail 1 - Type,E-mail 1 - Value'
      ];
      for (const c of list) {
        const first = (c.firstName || c.name.split(/\s+/)[0] || '').replace(/"/g, '""');
        const last = (c.lastName || c.name.split(/\s+/).slice(1).join(' ') || '').replace(/"/g, '""');
        const full = (c.name || '').replace(/"/g, '""');
        const phone = (c.phone || '').replace(/"/g, '""');
        const email = (c.email || '').replace(/"/g, '""');
        csvLines.push(`"${first}","${last}","${full}","Mobile","${phone}","Home","${email}"`);
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

  if (!fullSettingsOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ProText Settings"
      className={`fixed inset-0 z-[2147483646] overflow-y-auto pointer-events-auto font-sans transition-colors duration-200 ${
        isLight ? 'bg-[#f8f9fa] text-gray-900' : 'bg-[#1e1f22] text-[#e8eaed]'
      }`}
    >
      {/* 1. TOP MATERIAL DESIGN HEADER (Matching Google Messages /web/settings) */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
          isLight
            ? 'bg-white/95 border-gray-200 text-gray-900 shadow-xs'
            : 'bg-[#1e1f22]/95 border-white/10 text-white shadow-md'
        }`}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Back button & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-mp-settings-back-button=""
              onClick={closeFullSettings}
              title="Back to messages (Esc)"
              className={`cursor-pointer rounded-full p-2 transition-colors ${
                isLight
                  ? 'hover:bg-gray-100 text-gray-700 active:bg-gray-200'
                  : 'hover:bg-white/10 text-gray-300 active:bg-white/15'
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            </button>

            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 font-bold text-[11px] tracking-wider text-white shadow-xs">
                PRO
              </span>
              <div>
                <h1 className="text-lg font-semibold tracking-tight leading-none sm:text-xl">
                  ProText Settings
                </h1>
                <span className={`text-[11px] font-medium leading-none ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  Themes, folders, undo send & power tools for Google Messages™
                </span>
              </div>
            </div>
          </div>

          {/* Search bar & Done button */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <input
                type="text"
                placeholder="Search ProText features..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-52 rounded-full border px-3.5 py-1.5 pl-8 text-xs transition-all focus:w-64 focus:outline-hidden ${
                  isLight
                    ? 'border-gray-300 bg-gray-50 focus:border-blue-500 focus:bg-white'
                    : 'border-white/15 bg-white/5 focus:border-blue-400 focus:bg-white/10'
                }`}
              />
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                🔍
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <a
              href={PROTEXT_FEEDBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors no-underline ${
                isLight
                  ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
              title="Report an issue or suggest a feature"
            >
              <span>Feedback</span>
              <span className="text-[10px] opacity-70">↗</span>
            </a>

            <button
              type="button"
              onClick={closeFullSettings}
              className="cursor-pointer rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
            >
              Done
            </button>
          </div>
        </div>

        {/* Category Jump Pills */}
        <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto px-4 pb-2.5 sm:px-6 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`cursor-pointer shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : isLight
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-white/10 text-gray-300 hover:bg-white/15'
            }`}
          >
            All Features ({FEATURES.length})
          </button>

          {FEATURE_CATEGORIES.map(cat => {
            const count = FEATURES.filter(f => f.category === cat.id).length;
            const activeCount = FEATURES.filter(f => f.category === cat.id && (flags[f.id] ?? true)).length;
            const isSelected = activeTab === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`cursor-pointer shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? 'text-white shadow-xs'
                    : isLight
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-white/10 text-gray-300 hover:bg-white/15'
                }`}
                style={isSelected ? { backgroundColor: cat.accentColor } : undefined}
              >
                <span>{cat.icon}</span>
                <span>{cat.shortName}</span>
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    isSelected ? 'bg-black/20 text-white' : isLight ? 'bg-gray-200 text-gray-600' : 'bg-white/15 text-gray-400'
                  }`}
                >
                  {activeCount}/{count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. MAIN SETTINGS BODY */}
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-6">
        {/* Appearance & Custom Themes Section (Always shown when tab is 'all') */}
        {activeTab === 'all' && !searchQuery && (
          <section
            className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
              isLight ? 'bg-white border-gray-200' : 'bg-[#232428] border-white/10'
            }`}
          >
            <div className="mb-4 flex items-center justify-between border-b pb-3 border-inherit">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎨</span>
                  <h2 className="text-base font-semibold">Appearance & Color Themes</h2>
                </div>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  Custom themes crafted specifically for Google Messages light & dark modes
                </p>
              </div>

              {!showBuilder && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTheme(null);
                    setShowBuilder(true);
                  }}
                  className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 transition-colors"
                >
                  + Build Theme
                </button>
              )}
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
              <div className="space-y-4">
                {/* 1. Google Default / Auto Sync */}
                <button
                  type="button"
                  onClick={() => selectTheme('default')}
                  className={`w-full flex items-center justify-between rounded-xl border p-3 text-xs font-medium transition-all cursor-pointer ${
                    currentTheme === 'default'
                      ? isLight
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20'
                        : 'border-blue-400 bg-blue-500/20 text-white ring-2 ring-blue-400/30'
                      : isLight
                      ? 'border-gray-200 bg-gray-50/50 text-gray-800 hover:border-blue-300'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-4 rounded-full bg-blue-500 shrink-0 ring-2 ring-blue-300/40" />
                    <div className="text-left">
                      <span className="font-semibold block text-sm">Google Messages Default (Auto Sync)</span>
                      <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                        Seamlessly matches Google Messages light or dark mode setting
                      </span>
                    </div>
                  </div>
                  {currentTheme === 'default' && (
                    <span className="rounded-full bg-blue-600 px-2.5 py-0.5 font-bold text-[11px] text-white">
                      ✓ Active
                    </span>
                  )}
                </button>

                {/* 2. Builtin Dark Themes */}
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider block mb-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    Dark Themes (Overrides Google Messages to Dark)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {BUILTIN_THEMES.filter(t => t.category === 'dark').map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTheme(t.id)}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-medium transition-all cursor-pointer ${
                          currentTheme === t.id
                            ? isLight
                              ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500 font-semibold'
                              : 'border-blue-400 bg-blue-500/20 text-white ring-1 ring-blue-400 font-semibold'
                            : isLight
                            ? 'border-gray-200 bg-white text-gray-800 hover:border-gray-400'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: t.dotColor }}
                        />
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Builtin Light Themes */}
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider block mb-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    Light Themes (Overrides Google Messages to Light)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {BUILTIN_THEMES.filter(t => t.category === 'light').map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTheme(t.id)}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-medium transition-all cursor-pointer ${
                          currentTheme === t.id
                            ? isLight
                              ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500 font-semibold'
                              : 'border-blue-400 bg-blue-500/20 text-white ring-1 ring-blue-400 font-semibold'
                            : isLight
                            ? 'border-gray-200 bg-white text-gray-800 hover:border-gray-400'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: t.dotColor }}
                        />
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Custom Themes */}
                {customThemes.length > 0 && (
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider block mb-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      My Custom Built Themes ({customThemes.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {customThemes.map(t => (
                        <div
                          key={t.id}
                          className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition-all ${
                            currentTheme === t.id
                              ? isLight
                                ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                                : 'border-blue-400 bg-blue-500/20 text-white font-semibold'
                              : isLight
                              ? 'border-gray-200 bg-white text-gray-800'
                              : 'border-white/10 bg-white/5 text-gray-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => selectTheme(t.id)}
                            className="flex items-center gap-2 flex-1 cursor-pointer truncate text-left"
                          >
                            <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: t.outgoingBg }} />
                            <span className="truncate">{t.name}</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTheme(t);
                                setShowBuilder(true);
                              }}
                              className="cursor-pointer text-gray-400 hover:text-blue-500 px-1 text-xs"
                              title="Edit theme"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCustom(t.id)}
                              className="cursor-pointer text-gray-400 hover:text-red-500 px-1 text-xs"
                              title="Delete theme"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Reaction Emojis & Header Pill Shortcut */}
                <div className={`mt-4 rounded-xl border p-3.5 transition-all ${isLight ? 'bg-gray-50/50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider block">Quick Reaction Emojis</span>
                      <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                        Configure your 5 quick reaction emojis above the message box
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEmojiSettings(v => !v)}
                      className="cursor-pointer rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/15 px-3 py-1 text-xs font-semibold transition-colors"
                    >
                      {showEmojiSettings ? 'Done' : 'Customize Emojis'}
                    </button>
                  </div>

                  {showEmojiSettings ? (
                    <div className="mt-3">
                      <EmojiCustomizer />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-2">
                      {emojis.map((e, idx) => (
                        <span
                          key={idx}
                          className={`h-8 w-8 rounded-lg border flex items-center justify-center text-lg shadow-2xs ${
                            isLight ? 'bg-white border-gray-200' : 'bg-[#1e1f22] border-white/10'
                          }`}
                        >
                          {e}
                        </span>
                      ))}
                      <span className={`text-xs ml-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                        ({mode === 'typing' ? 'Shows when typing' : mode === 'always' ? 'Always visible' : 'Hidden'})
                      </span>
                    </div>
                  )}
                </div>

                {/* Header ProText Pill visibility toggle */}
                <div className={`flex items-center justify-between rounded-xl border p-3.5 transition-all ${isLight ? 'bg-gray-50/50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider block">Header "ProText" Button</span>
                    <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      Show or hide the ProText shortcut pill next to your profile photo. Settings are always in the hamburger menu.
                    </p>
                  </div>
                  <MaterialToggle
                    label="Show ProText button in top header"
                    checked={mPlusPillVisible}
                    accentColor="#3b82f6"
                    onChange={v => void setMPlusPillVisible(v)}
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* 3. CATEGORIZED FEATURES LIST (Color-coordinated & segmented) */}
        {FEATURE_CATEGORIES.map(cat => {
          const catFeatures = groupedFeatures.get(cat.id) || [];
          if (catFeatures.length === 0) return null;

          const activeCount = catFeatures.filter(f => flags[f.id] ?? true).length;

          return (
            <section
              key={cat.id}
              className={`rounded-2xl border overflow-hidden transition-all shadow-xs ${
                isLight ? 'bg-white border-gray-200' : 'bg-[#232428] border-white/10'
              }`}
            >
              {/* Category Header Card */}
              <div
                className={`border-b p-4 sm:p-5 flex items-center justify-between transition-colors bg-gradient-to-r ${cat.headerGradient} ${
                  isLight ? 'border-gray-200' : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">{cat.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold tracking-tight">{cat.name}</h2>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold border ${cat.badgeBg} ${cat.badgeBorder} ${cat.badgeText}`}
                      >
                        {activeCount} of {catFeatures.length} active
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      {cat.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature Toggle Rows */}
              <ul className={`divide-y ${isLight ? 'divide-gray-100' : 'divide-white/5'}`}>
                {catFeatures.map(f => {
                  const isChecked = flags[f.id] ?? true;
                  return (
                    <li
                      key={f.id}
                      className={`flex items-center justify-between gap-4 p-4 sm:px-5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]`}
                    >
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: isChecked ? cat.accentColor : 'rgba(128,128,128,0.4)' }}
                          />
                          <span className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {f.label}
                          </span>
                          {f.shortcut && (
                            <span className="rounded-md bg-black/5 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-500 dark:text-gray-300">
                              {f.shortcut}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                          {f.description}
                        </p>
                      </div>

                      <MaterialToggle
                        label={f.label}
                        checked={isChecked}
                        accentColor={cat.accentColor}
                        onChange={v => setFeature(f.id, v)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {/* 4. DATA TRANSFER & BACKUPS (Always shown at bottom when on 'all') */}
        {activeTab === 'all' && !searchQuery && (
          <section
            className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
              isLight ? 'bg-white border-gray-200' : 'bg-[#232428] border-white/10'
            }`}
          >
            <div className="mb-3 flex items-center justify-between border-b pb-3 border-inherit">
              <div className="flex items-center gap-2">
                <span className="text-lg">💾</span>
                <div>
                  <h2 className="text-base font-semibold">Data Backup & Sync</h2>
                  <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    Safely export or migrate your templates, notes, contacts, and custom themes to any computer
                  </p>
                </div>
              </div>
            </div>

            {backupStatus && (
              <div className="mb-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-2.5 text-xs text-emerald-600 dark:text-emerald-300 font-medium">
                {backupStatus}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="cursor-pointer rounded-xl bg-blue-600 hover:bg-blue-500 p-2.5 text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
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
                className={`cursor-pointer rounded-xl border p-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  isLight
                    ? 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                    : 'border-white/20 bg-white/5 text-gray-200 hover:bg-white/10'
                }`}
              >
                <span>📂</span>
                <span>Restore Backup (.json)</span>
              </button>

              <button
                type="button"
                onClick={handleExportGoogleContactsCSV}
                className={`cursor-pointer rounded-xl border p-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  isLight
                    ? 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                    : 'border-white/20 bg-white/5 text-gray-200 hover:bg-white/10'
                }`}
              >
                <span>👤</span>
                <span>Export Contacts (.csv)</span>
              </button>
            </div>
          </section>
        )}

        {/* 5. HELP, FEEDBACK & BUG REPORTS */}
        {(!searchQuery || 'feedback bug report issue suggestion support help ideas'.includes(searchQuery.toLowerCase())) && (
          <section
            className={`rounded-2xl border p-4 sm:p-5 transition-all ${
              isLight
                ? 'border-blue-200/80 bg-blue-50/40 text-gray-900 shadow-xs'
                : 'border-blue-900/40 bg-blue-950/20 text-gray-100 shadow-md'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 text-xl select-none">
                  💡
                </span>
                <div>
                  <h2 className="text-base font-semibold leading-snug">Help, Feedback & Bug Reports</h2>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    Spotted a bug or have an idea to make ProText better? We read every submission.
                  </p>
                </div>
              </div>

              <a
                href={PROTEXT_FEEDBACK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 transition-colors no-underline"
                title="Open ProText Feedback & Bug Report Google Form in new tab"
              >
                <span>Share Feedback or Report Bug</span>
                <span className="text-sm">↗</span>
              </a>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
