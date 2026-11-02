import { useEffect, useSyncExternalStore } from 'react';
import { Slot } from '../Slot';
import { SEL } from '../selectors';
import { getSetting, setSetting } from '../db';
import { useFeature } from '../settings/store';
import { VisibilityOffIcon } from '../ui/MaterialIcons';
import { useThemeMode } from './ThemeEngine';

export interface PrivacyShieldConfig {
  active: boolean;
}

const DEFAULT_CONFIG: PrivacyShieldConfig = {
  active: false
};

const STORAGE_KEY = 'privacyShieldConfig';
const STYLE_ID = 'mp-privacy-shield-css';

export interface ShieldSnapshot {
  config: PrivacyShieldConfig;
  toast: { text: string; icon: string; active: boolean } | null;
  isLoaded: boolean;
}

let currentConfig: PrivacyShieldConfig = { ...DEFAULT_CONFIG };
let toastMessage: { text: string; icon: string; active: boolean } | null = null;
let toastTimeout: any = null;
let isLoaded = false;
let snapshot: ShieldSnapshot = {
  config: currentConfig,
  toast: toastMessage,
  isLoaded
};
const listeners = new Set<() => void>();

function notify() {
  snapshot = {
    config: currentConfig,
    toast: toastMessage,
    isLoaded
  };
  listeners.forEach(l => l());
}

const PRIVACY_CSS = `
  /* Privacy Shield CSS: Blurs conversation snippets and chat messages until hovered */
  body.mp-privacy-active [data-e2e-conversation-snippet],
  body.mp-privacy-active .snippet {
    filter: blur(6px) !important;
    transition: filter 0.18s ease-in-out !important;
    user-select: none !important;
  }
  body.mp-privacy-active mws-conversation-list-item:hover [data-e2e-conversation-snippet],
  body.mp-privacy-active [data-e2e-conversation-snippet]:hover {
    filter: blur(0) !important;
    user-select: auto !important;
  }

  body.mp-privacy-active mws-message-wrapper [data-e2e-text-message-content],
  body.mp-privacy-active mws-message-wrapper mws-image-attachment,
  body.mp-privacy-active mws-message-wrapper mws-audio-attachment,
  body.mp-privacy-active mws-message-wrapper mws-preview-card,
  body.mp-privacy-active mws-message-part-content {
    filter: blur(7px) !important;
    transition: filter 0.18s ease-in-out !important;
    user-select: none !important;
  }
  body.mp-privacy-active mws-message-wrapper:hover [data-e2e-text-message-content],
  body.mp-privacy-active mws-message-wrapper:hover mws-image-attachment,
  body.mp-privacy-active mws-message-wrapper:hover mws-audio-attachment,
  body.mp-privacy-active mws-message-wrapper:hover mws-preview-card,
  body.mp-privacy-active mws-message-wrapper:hover mws-message-part-content {
    filter: blur(0) !important;
    user-select: auto !important;
  }
`;

function ensureStyleSheet() {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  if (el.textContent !== PRIVACY_CSS) {
    el.textContent = PRIVACY_CSS;
  }
}

function syncBodyClasses(cfg: PrivacyShieldConfig) {
  ensureStyleSheet();
  const cl = document.body.classList;
  cl.remove('mp-blur-messages', 'mp-blur-snippets', 'mp-blur-names', 'mp-blur-avatars');
  if (cfg.active) {
    cl.add('mp-privacy-active');
  } else {
    cl.remove('mp-privacy-active');
  }
}

function showToast(text: string, icon: string, active: boolean) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastMessage = { text, icon, active };
  notify();
  toastTimeout = setTimeout(() => {
    toastMessage = null;
    notify();
  }, 1800);
}

// Load persisted configuration
getSetting<PrivacyShieldConfig>(STORAGE_KEY, DEFAULT_CONFIG).then(saved => {
  currentConfig = { active: Boolean(saved?.active) };
  isLoaded = true;
  syncBodyClasses(currentConfig);
  notify();
});

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const getSnapshot = () => snapshot;

export function usePrivacyShield() {
  const store = useSyncExternalStore(subscribe, getSnapshot);

  const toggleShield = (showNotification = true) => {
    const nextActive = !currentConfig.active;
    const nextConfig: PrivacyShieldConfig = { active: nextActive };
    currentConfig = nextConfig;
    syncBodyClasses(nextConfig);
    setSetting(STORAGE_KEY, nextConfig);
    if (showNotification) {
      showToast(
        nextActive ? 'Privacy Shield Enabled (Hover to reveal)' : 'Privacy Shield Paused',
        nextActive ? '🛡️' : '👁️',
        nextActive
      );
    }
    notify();
  };

  return {
    ...store,
    toggleShield
  };
}

/** Injected into Google's header next to M+ and Group Messages buttons */
export function PrivacyShieldButton() {
  const featureEnabled = useFeature('privacyShield');
  const { config, toggleShield } = usePrivacyShield();
  const themeMode = useThemeMode();
  const isLight = themeMode === 'light';

  // Global Alt + P keyboard shortcut
  useEffect(() => {
    if (!featureEnabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'p' || e.key === 'P' || e.code === 'KeyP')) {
        e.preventDefault();
        toggleShield(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [featureEnabled, toggleShield]);

  if (!featureEnabled) return null;

  return (
    <Slot
      anchor={SEL.accountSwitcher}
      position="before"
      id="privacy-shield-button"
      hostStyle="display:flex;align-items:center;margin-right:6px;"
    >
      <button
        type="button"
        onClick={() => toggleShield(true)}
        title={
          config.active
            ? 'Privacy Shield is ON (Alt+P to toggle). Click to turn off.'
            : 'Privacy Shield is OFF (Alt+P to toggle). Click to turn on.'
        }
        className={`cursor-pointer flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium shadow-xs transition-colors font-sans ${
          config.active
            ? isLight
              ? 'border-[#0b57d0] bg-[#0b57d0] text-white hover:bg-[#0842a0]'
              : 'border-[#004a77] bg-[#004a77] text-[#c2e7ff] hover:bg-[#005a92]'
            : isLight
              ? 'border-[#dadce0] bg-[#f1f3f4] text-[#3c4043] hover:bg-[#e8eaed] hover:text-[#1f1f1f]'
              : 'border-[#dadce0]/12 bg-[#303134] text-[#e8eaed] hover:bg-[#3c4043]'
        }`}
      >
        <VisibilityOffIcon
          size={15}
          className={
            config.active
              ? isLight ? 'text-white' : 'text-[#c2e7ff]'
              : isLight ? 'text-[#3c4043]' : 'text-[#dadce0]'
          }
        />
        <span>{config.active ? 'Shield ON' : 'Privacy'}</span>
      </button>
    </Slot>
  );
}

/** Floating toast when toggled via keyboard or button */
export function PrivacyShieldToast() {
  const { toast } = usePrivacyShield();
  if (!toast) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[2147483647] pointer-events-none transition-all duration-200">
      <div
        className={`flex items-center gap-2 rounded-full px-4 py-2 shadow-2xl backdrop-blur-md border text-xs font-medium text-white ${
          toast.active
            ? 'bg-emerald-950/90 border-emerald-500/50 shadow-emerald-900/30 ring-1 ring-emerald-400/30'
            : 'bg-gray-900/90 border-gray-700 shadow-black/40'
        }`}
      >
        <span className="text-sm">{toast.icon}</span>
        <span>{toast.text}</span>
      </div>
    </div>
  );
}
