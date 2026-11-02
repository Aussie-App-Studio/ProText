import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { SEL } from '../selectors';
import { useFeature } from '../settings/store';
import { ExportIcon } from '../ui/MaterialIcons';

export interface TranscriptItem {
  type: 'message' | 'date';
  sender?: string;
  text: string;
  outgoing?: boolean;
}

// Global modal visibility store
let isExporterOpen = false;
const listeners = new Set<() => void>();
function notify() { listeners.forEach(l => l()); }

export function openConversationExporter() {
  isExporterOpen = true;
  notify();
}

export function closeConversationExporter() {
  isExporterOpen = false;
  notify();
}

const subscribeExporter = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getExporterSnapshot = () => isExporterOpen;

export function useConversationExporter() {
  const isOpen = useSyncExternalStore(subscribeExporter, getExporterSnapshot);
  return { isOpen, open: openConversationExporter, close: closeConversationExporter };
}

/** Extracts all loaded messages from the active chat */
export function extractTranscript(): {
  contactName: string;
  phone?: string;
  items: TranscriptItem[];
} {
  const headerEl = document.querySelector(SEL.headerTitle);
  const contactName = headerEl?.textContent?.trim() || 'Conversation';
  const subPhoneEl = document.querySelector('.mp-contact-subphone, .mp-header-subphone');
  const phone = subPhoneEl?.textContent?.trim();

  const wrappers = Array.from(document.querySelectorAll('mws-message-wrapper'));
  const items: TranscriptItem[] = [];
  const seenDates = new Set<string>();

  for (const w of wrappers) {
    // Check if there's an adjacent date divider or timestamp above this message
    const prev = w.previousElementSibling;
    if (prev && !prev.tagName.includes('WRAPPER') && prev.textContent) {
      const dateText = prev.textContent.trim();
      if (
        dateText &&
        dateText.length < 50 &&
        !seenDates.has(dateText) &&
        (dateText.includes('Monday') ||
          dateText.includes('Tuesday') ||
          dateText.includes('Wednesday') ||
          dateText.includes('Thursday') ||
          dateText.includes('Friday') ||
          dateText.includes('Saturday') ||
          dateText.includes('Sunday') ||
          dateText.includes('Today') ||
          dateText.includes('Yesterday'))
      ) {
        seenDates.add(dateText);
        items.push({ type: 'date', text: dateText });
      }
    }

    const core = w.querySelector('[data-e2e-message-wrapper-core]');
    const outgoing = core?.getAttribute('data-e2e-message-outgoing') === 'true';
    const textEl = w.querySelector('[data-e2e-text-message-content]');
    const text = textEl?.textContent?.trim() || '';

    if (text) {
      items.push({
        type: 'message',
        sender: outgoing ? 'You' : contactName,
        text,
        outgoing
      });
    }
  }

  return { contactName, phone, items };
}

/** Button rendered inside ConversationHeaderToolbar */
export function HeaderExportButton() {
  const enabled = useFeature('conversationExporter');
  const { open } = useConversationExporter();

  if (!enabled) return null;

  return (
    <button
      type="button"
      data-testid="header-export-btn"
      onClick={open}
      title="Print or export conversation transcript to PDF / text"
      aria-label="Export conversation"
      className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-full text-[#dadce0] hover:bg-white/[0.08] hover:text-white transition-colors"
    >
      <ExportIcon size={16} />
      <span className="sr-only">Export</span>
    </button>
  );
}

/** Printable and exportable modal dialog */
export function ConversationExporterModal() {
  const enabled = useFeature('conversationExporter');
  const { isOpen, close } = useConversationExporter();
  const [copied, setCopied] = useState(false);

  const data = useMemo(() => {
    if (!isOpen) return { contactName: '', phone: undefined, items: [] };
    return extractTranscript();
  }, [isOpen]);

  // Handle Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, close]);

  if (!enabled || !isOpen) return null;

  const exportDate = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const generatePlainText = () => {
    const lines: string[] = [];
    lines.push(`=======================================================`);
    lines.push(`CONVERSATION TRANSCRIPT: ${data.contactName.toUpperCase()}`);
    if (data.phone) lines.push(`Phone Number: ${data.phone}`);
    lines.push(`Exported: ${exportDate}`);
    lines.push(`Total Messages: ${data.items.filter(i => i.type === 'message').length}`);
    lines.push(`=======================================================\n`);

    for (const item of data.items) {
      if (item.type === 'date') {
        lines.push(`\n--- ${item.text} ---\n`);
      } else {
        lines.push(`[${item.sender}]:\n${item.text}\n`);
      }
    }

    return lines.join('\n');
  };

  const handleCopy = async () => {
    const text = generatePlainText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const text = generatePlainText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = data.contactName.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.href = url;
    a.download = `Transcript_${safeName}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const text = generatePlainText();
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Transcript - ${data.contactName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #111;
              line-height: 1.5;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .header h1 {
              margin: 0 0 5px 0;
              font-size: 24px;
            }
            .header p {
              margin: 0;
              font-size: 13px;
              color: #666;
            }
            .date-divider {
              text-align: center;
              font-size: 12px;
              font-weight: bold;
              color: #777;
              margin: 25px 0 15px 0;
              border-bottom: 1px dashed #ccc;
              line-height: 0.1em;
            }
            .date-divider span {
              background: #fff;
              padding: 0 10px;
            }
            .msg {
              margin-bottom: 14px;
              padding: 10px 14px;
              border-radius: 8px;
              max-width: 80%;
              word-break: break-word;
            }
            .msg.outgoing {
              margin-left: auto;
              background-color: #e3f2fd;
              border: 1px solid #bbdefb;
            }
            .msg.incoming {
              margin-right: auto;
              background-color: #f5f5f5;
              border: 1px solid #e0e0e0;
            }
            .sender {
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 3px;
              color: #444;
            }
            .text {
              font-size: 13px;
              white-space: pre-wrap;
            }
            @media print {
              body { padding: 0; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Conversation Transcript</h1>
            <p><strong>With:</strong> ${data.contactName} ${data.phone ? `(${data.phone})` : ''}</p>
            <p><strong>Exported:</strong> ${exportDate} • <strong>Total Messages:</strong> ${data.items.filter(i => i.type === 'message').length}</p>
          </div>
          <div class="transcript">
            ${data.items.map(item => {
              if (item.type === 'date') {
                return `<div class="date-divider"><span>${item.text}</span></div>`;
              }
              const isOut = item.outgoing;
              return `
                <div class="msg ${isOut ? 'outgoing' : 'incoming'}">
                  <div class="sender">${item.sender}</div>
                  <div class="text">${item.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                </div>
              `;
            }).join('')}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div
      data-testid="conversation-exporter-modal"
      className="fixed inset-0 z-[2147483647] pointer-events-auto flex items-center justify-center bg-black/75 backdrop-blur-xs font-sans text-gray-100 p-4 animate-in fade-in duration-100"
      onClick={e => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-[680px] max-w-[96vw] max-h-[85vh] rounded-2xl bg-[#1e2025] shadow-2xl border border-gray-700/80 overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-[#25272c]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">📄</span>
              <h2 className="text-sm font-semibold text-white">Conversation Transcript</h2>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              With <strong className="text-gray-200">{data.contactName}</strong> {data.phone && `(${data.phone})`} • {data.items.filter(i => i.type === 'message').length} messages
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow transition-all"
              title="Open print view to print or save as PDF"
            >
              <span>🖨️</span>
              <span>Print / Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-200 shadow transition-all"
              title="Copy formatted transcript text"
            >
              <span>{copied ? '✓' : '📋'}</span>
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-200 shadow transition-all"
              title="Download as text file (.txt)"
            >
              <span>💾</span>
              <span>.txt</span>
            </button>

            <button
              type="button"
              onClick={close}
              className="cursor-pointer text-gray-400 hover:text-white px-1.5 py-1 text-sm ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Transcript Preview */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#191a1e]">
          {data.items.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              No messages found in this conversation
            </div>
          ) : (
            data.items.map((item, idx) => {
              if (item.type === 'date') {
                return (
                  <div key={idx} className="flex items-center justify-center my-4">
                    <span className="rounded-full bg-gray-800/80 border border-gray-700 px-3 py-1 text-[10px] font-semibold text-gray-400">
                      {item.text}
                    </span>
                  </div>
                );
              }

              const isOut = item.outgoing;
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] font-semibold text-gray-400 mb-1 px-1">
                    {item.sender}
                  </span>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-sm whitespace-pre-wrap ${
                      isOut
                        ? 'bg-blue-600/90 text-white rounded-tr-none'
                        : 'bg-[#2a2c33] text-gray-200 border border-gray-700/60 rounded-tl-none'
                    }`}
                  >
                    {item.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-gray-800 bg-[#25272c] text-[11px] text-gray-400 flex items-center justify-between">
          <span>Ready for pastoral records, counseling notes, or committee documentation</span>
          <span className="font-mono text-[10px]">Esc to close</span>
        </div>
      </div>
    </div>
  );
}
