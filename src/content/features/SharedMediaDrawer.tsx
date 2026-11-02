import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { SEL } from '../selectors';
import { useFeature } from '../settings/store';
import { MediaIcon } from '../ui/MaterialIcons';

let isDrawerOpen = false;
const listeners = new Set<() => void>();
function notify() { listeners.forEach(l => l()); }

export function openSharedMediaDrawer() {
  isDrawerOpen = true;
  notify();
}

export function closeSharedMediaDrawer() {
  isDrawerOpen = false;
  notify();
}

const subscribeMedia = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getMediaSnapshot = () => isDrawerOpen;

export function useSharedMediaDrawer() {
  const isOpen = useSyncExternalStore(subscribeMedia, getMediaSnapshot);
  return { isOpen, open: openSharedMediaDrawer, close: closeSharedMediaDrawer };
}

export interface SharedMediaData {
  contactName: string;
  links: string[];
  images: string[];
}

export function scanSharedMedia(): SharedMediaData {
  const headerEl = document.querySelector(SEL.headerTitle);
  const contactName = headerEl?.textContent?.trim() || 'Conversation';

  const list = document.querySelector('mws-messages-list');
  if (!list) return { contactName, links: [], images: [] };

  const rawLinks: string[] = [];
  const rawImages: string[] = [];
  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;

  // 1. Scan links in text & anchor tags
  const textEls = Array.from(list.querySelectorAll('[data-e2e-text-message-content], a'));
  for (const el of textEls) {
    if (el.tagName === 'A' && (el as HTMLAnchorElement).href) {
      const h = (el as HTMLAnchorElement).href;
      if (!h.startsWith('javascript:')) rawLinks.push(h);
    } else {
      const text = el.textContent || '';
      const matches = text.match(urlRegex);
      if (matches) {
        rawLinks.push(...matches);
      }
    }
  }

  // 2. Scan images
  const imgEls = Array.from(list.querySelectorAll('mws-image-attachment img, mws-message-part-content img'));
  for (const img of imgEls) {
    const src = (img as HTMLImageElement).src;
    if (src && !src.includes('data:image/svg')) {
      rawImages.push(src);
    }
  }

  // Deduplicate and reverse so newest appear first
  const links = Array.from(new Set(rawLinks)).reverse();
  const images = Array.from(new Set(rawImages)).reverse();

  return { contactName, links, images };
}

/** Injected button into ConversationHeaderToolbar */
export function HeaderMediaButton() {
  const enabled = useFeature('sharedMediaDrawer');
  const { open } = useSharedMediaDrawer();

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={open}
      title="Browse photos, flyers, and links shared in this conversation"
      aria-label="Media and links"
      className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-full text-[#dadce0] hover:bg-white/[0.08] hover:text-white transition-colors"
    >
      <MediaIcon size={16} />
      <span className="sr-only">Media</span>
    </button>
  );
}

/** Right-side slide-over drawer */
export function SharedMediaDrawer() {
  const enabled = useFeature('sharedMediaDrawer');
  const { isOpen, close } = useSharedMediaDrawer();
  const [activeTab, setActiveTab] = useState<'links' | 'photos'>('links');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const data = useMemo(() => {
    if (!isOpen) return { contactName: '', links: [], images: [] };
    return scanSharedMedia();
  }, [isOpen]);

  // Set default tab based on what's available
  useEffect(() => {
    if (isOpen) {
      if (data.images.length > 0 && data.links.length === 0) {
        setActiveTab('photos');
      } else {
        setActiveTab('links');
      }
    }
  }, [isOpen, data.images.length, data.links.length]);

  // Handle Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewImage) setPreviewImage(null);
        else close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, close, previewImage]);

  if (!enabled || !isOpen) return null;

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1500);
  };

  const getDomain = (url: string) => {
    try {
      const u = new URL(url);
      return u.hostname.replace('www.', '');
    } catch {
      return url.slice(0, 30);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[2147483646] pointer-events-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-100"
        onClick={close}
      />

      <div className="fixed top-0 right-0 bottom-0 z-[2147483647] pointer-events-auto w-96 max-w-[90vw] bg-[#1e2025] shadow-2xl border-l border-gray-700/80 flex flex-col font-sans text-gray-100 animate-in slide-in-from-right duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-800 bg-[#25272c]">
          <div className="flex items-center gap-2">
            <span className="text-base">📎</span>
            <div>
              <h2 className="text-sm font-semibold text-white">Shared Media & Links</h2>
              <p className="text-[11px] text-gray-400 truncate max-w-[200px]">
                {data.contactName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="cursor-pointer text-gray-400 hover:text-white px-2 py-1 text-sm rounded-lg hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-gray-800 bg-[#1c1d22] px-3 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('links')}
            className={`cursor-pointer flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-all ${
              activeTab === 'links'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            🔗 Links ({data.links.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`cursor-pointer flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-all ${
              activeTab === 'photos'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            🖼️ Photos ({data.images.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {activeTab === 'links' && (
            <div>
              {data.links.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  No links shared in this conversation yet
                </div>
              ) : (
                data.links.map((url, idx) => {
                  const domain = getDomain(url);
                  const isCopied = copiedUrl === url;

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-700/60 bg-[#25272c] p-3 shadow-sm hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1 truncate max-w-[200px]">
                          <span>🌐</span>
                          <span>{domain}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(url)}
                            className="cursor-pointer text-[10px] font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded transition-colors"
                          >
                            {isCopied ? '✓ Copied' : 'Copy'}
                          </button>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-medium text-blue-300 hover:text-white bg-blue-600/30 hover:bg-blue-600/50 px-2 py-0.5 rounded transition-colors"
                          >
                            Open ↗
                          </a>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-300 break-all line-clamp-2 select-all font-mono">
                        {url}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div>
              {data.images.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  No photos or attachments found in this conversation
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {data.images.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewImage(imgSrc)}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-800 border border-gray-700/60 cursor-pointer shadow hover:border-blue-500/60 transition-all"
                    >
                      <img
                        src={imgSrc}
                        alt="Shared media"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                        🔍 View
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-4 py-2.5 border-t border-gray-800 bg-[#25272c] text-[11px] text-gray-400 flex items-center justify-between">
          <span>{data.links.length} links • {data.images.length} photos</span>
          <span className="font-mono text-[10px]">Esc to close</span>
        </div>
      </div>

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[2147483648] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-[90vw] max-h-[85vh] relative flex flex-col items-center">
            <img
              src={previewImage}
              alt="Full Preview"
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <div className="flex items-center gap-3 mt-4" onClick={e => e.stopPropagation()}>
              <a
                href={previewImage}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 rounded-lg shadow transition-all"
              >
                Open Original ↗
              </a>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="cursor-pointer text-xs font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-3.5 py-1.5 rounded-lg shadow transition-all"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
