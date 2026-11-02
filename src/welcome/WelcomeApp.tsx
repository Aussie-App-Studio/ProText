import { useEffect } from 'react';
import { useThemeEngine } from '../content/features/ThemeEngine';
import { FullSettingsPage } from '../content/settings/FullSettingsPage';
import { PROTEXT_FEEDBACK_URL } from '../content/settings/store';

export function WelcomeApp() {
  const { effectiveMode } = useThemeEngine();
  const isLight = effectiveMode === 'light';

  // Function to open or switch to Google Messages
  const handleLaunchGoogleMessages = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ url: '*://messages.google.com/web*' }, (tabs) => {
        if (tabs && tabs.length > 0 && tabs[0].id) {
          chrome.tabs.update(tabs[0].id, { active: true });
          if (tabs[0].windowId && chrome.windows) {
            chrome.windows.update(tabs[0].windowId, { focused: true });
          }
        } else {
          chrome.tabs.create({ url: 'https://messages.google.com/web' });
        }
      });
    } else {
      window.open('https://messages.google.com/web', '_blank');
    }
  };

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-200 pb-28 ${
        isLight ? 'bg-[#f4f6f8] text-[#1f2937]' : 'bg-[#121316] text-[#e8eaed]'
      }`}
    >
      {/* Top Navigation Bar */}
      <nav
        className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
          isLight
            ? 'bg-white/90 border-gray-200 text-gray-900 shadow-xs'
            : 'bg-[#18191c]/90 border-white/10 text-white shadow-md'
        }`}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 font-bold text-xs tracking-wider text-white shadow-sm ring-1 ring-white/20">
              PRO
            </span>
            <div>
              <span className="font-bold text-base tracking-tight leading-tight block">
                ProText for Google Messages™
              </span>
              <span className={`text-[11px] block leading-none ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                Welcome & Quick Setup
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href={PROTEXT_FEEDBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors no-underline ${
                isLight
                  ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  : 'border-white/15 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              Feedback / Suggestions ↗
            </a>
            <button
              type="button"
              onClick={handleLaunchGoogleMessages}
              className="cursor-pointer rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-1.5 shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>Open Messages</span>
              <span className="text-[11px]">→</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 space-y-8">
        {/* 1. HERO HEADER */}
        <div className="text-center space-y-3 pt-2 pb-1">
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold shadow-xs border bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400">
            <span>✨</span>
            <span>Welcome aboard • Extension successfully installed</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Supercharge your desktop texting
          </h1>
          <p className={`text-sm sm:text-base max-w-2xl mx-auto ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            Organize chats into smart tabs, undo accidental sends, keep pastoral and client notes, and personalize your theme—running locally with complete privacy.
          </p>
        </div>

        {/* 2. ABOUT ME SECTION (Jesse's Note) */}
        <section
          className={`rounded-2xl border p-6 sm:p-7 shadow-xs transition-colors relative overflow-hidden ${
            isLight
              ? 'bg-white border-gray-200'
              : 'bg-gradient-to-b from-[#1c1d22] to-[#17181c] border-white/10'
          }`}
        >
          {/* Subtle top accent border */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-inherit">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600/15 border border-blue-500/30 text-2xl shadow-inner">
              👋
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  A quick note from the creator
                </h2>
                <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-300">
                  Creator
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                Jesse • Pastor in Sydney, Australia 🇦🇺
              </p>
            </div>
          </div>

          {/* Bio Paragraphs */}
          <div className={`space-y-4 text-sm sm:text-[15px] leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            <p className="font-semibold text-base text-blue-600 dark:text-blue-400">
              G’day, I’m Jesse! 👋
            </p>

            <p>
              I’m a pastor based in Sydney, Australia. I originally built ProText because I needed a better way to stay organized and keep in touch with church members without getting overwhelmed. Along the way, I realized these tools—like smart folders, quick notes, and undo send—are just as helpful for anyone managing lots of conversations every day.
            </p>

            <p>
              ProText is <strong>100% free</strong>: no paid tiers, no subscriptions, and definitely no ads or data collection. If you enjoy using it and want to do something for me in return, I don’t need your money—instead, I’d love for you to check out this video of a Bible expert tackling tough, honest questions on the Flagrant podcast. I suggest putting it on in the background sometime.
            </p>

            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              If you want to check out what church I'm a part of, you are welcome to do that too, although the Bible Expert Video is probably going to be much more useful to you.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-5 border-t border-inherit flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* YouTube Flagrant Bible Expert Button */}
            <a
              href="https://www.youtube.com/watch?v=p58vknxGR4I&t=50s"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-1 inline-flex items-center justify-between gap-3 rounded-xl bg-[#cc0000] hover:bg-[#b30000] text-white px-4 py-3 font-semibold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] no-underline"
              title="Watch Bible Expert on Flagrant Podcast on YouTube"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm">
                  ▶
                </span>
                <span className="font-bold">Watch: Bible Expert Takes Hard Questions on Flagrant</span>
              </div>
              <span className="text-xs opacity-80 group-hover:opacity-100 transition-opacity">
                YouTube ↗
              </span>
            </a>

            {/* Hope Church Sydney Button */}
            <a
              href="https://hopeccc.org.au"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-xs sm:text-sm border transition-all hover:scale-[1.01] active:scale-[0.99] no-underline ${
                isLight
                  ? 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-800'
                  : 'border-white/15 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white'
              }`}
              title="Visit Hope Church Sydney website"
            >
              <span className="text-base">⛪</span>
              <span>Hope Church (hopeccc.org.au) ↗</span>
            </a>
          </div>
        </section>

        {/* 3. SINGLE-PARAGRAPH APP SUMMARY */}
        <section
          className={`rounded-2xl border p-5 sm:p-6 transition-colors shadow-xs ${
            isLight
              ? 'bg-blue-50/60 border-blue-200 text-gray-800'
              : 'bg-blue-950/25 border-blue-500/20 text-gray-200'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <span className="text-2xl shrink-0 mt-0.5">💡</span>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                What ProText Does For You
              </h3>
              <p className="text-sm leading-relaxed">
                <strong>ProText transforms Google Messages for Web into a desktop productivity powerhouse.</strong> It adds smart folder tabs (Unread, Personal, Business, VIPs) to keep your inbox organized, an undo-send buffer to catch typos before they deliver, contact CRM notes and aliases to remember key details, custom dark & color themes, quick emojis, and scheduled sends—all running locally inside your browser with complete privacy.
              </p>
            </div>
          </div>
        </section>

        {/* 4. SETTINGS & FEATURE CONFIGURATION */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                ⚙️ Customize Your Experience
              </h2>
              <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                Set your favorite theme, configure your undo-send delay, or toggle any features off or on. All changes save instantly.
              </p>
            </div>
          </div>

          {/* Embedded Full Settings Page */}
          <FullSettingsPage embedded={true} />
        </section>
      </main>

      {/* 5. STICKY BOTTOM LAUNCH BAR */}
      <div
        className={`fixed bottom-0 inset-x-0 z-50 border-t backdrop-blur-md py-3.5 px-4 sm:px-6 shadow-2xl transition-colors ${
          isLight
            ? 'bg-white/95 border-gray-200 text-gray-900'
            : 'bg-[#18191c]/95 border-white/10 text-white'
        }`}
      >
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={isLight ? 'text-gray-600 font-medium' : 'text-gray-300 font-medium'}>
              All settings and themes save automatically to your browser.
            </span>
          </div>

          <button
            type="button"
            onClick={handleLaunchGoogleMessages}
            className="cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Launch Google Messages Now</span>
            <span className="text-base">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
