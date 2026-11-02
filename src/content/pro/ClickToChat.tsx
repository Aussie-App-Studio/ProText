import { useState } from 'react';
import { normalizePhone, looksLikePhone } from './parser';

export function ClickToChat() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const cleanPhone = normalizePhone(phone);
  const isValidPhone = looksLikePhone(cleanPhone);
  const encodedMsg = encodeURIComponent(message.trim());

  const smsLink = cleanPhone ? `sms:${cleanPhone}?body=${encodedMsg}` : '';
  const iosSmsLink = cleanPhone ? `sms:${cleanPhone}&body=${encodedMsg}` : '';
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone.replace(/\+/g, '')}?text=${encodedMsg}` : '';

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <div className="space-y-4 font-sans text-xs text-gray-200">
      <div className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-4">
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-1.5">
          <span>🔗</span> One-Tap "Text Me" Link Maker
        </h3>
        <p className="text-gray-400 text-[11px] mb-3">
          Create links you can share in church bulletins, newsletters, emails, or QR codes so anyone can text you with a single tap on their phone.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1">
              Your Phone Number (the number people will text)
            </label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +61 400 123 456 or +1 (555) 234-5678"
              className="w-full rounded-lg border border-gray-700 bg-gray-900/90 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
            />
            {phone && !isValidPhone && (
              <span className="text-[10px] text-amber-400 mt-1 block">
                Please enter a valid phone number with country code.
              </span>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1">
              Pre-filled Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. Hi Pastor, I'd like to get connected with the community!"
              rows={3}
              className="w-full rounded-lg border border-gray-700 bg-gray-900/90 p-2.5 text-xs text-white outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Generated Links */}
      {isValidPhone && (
        <div className="space-y-2.5">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">
            Generated Direct Links
          </div>

          {/* Standard SMS */}
          <div className="flex items-center justify-between rounded-xl border border-gray-700/70 bg-[#1e1f23] p-3">
            <div className="truncate mr-3">
              <div className="font-semibold text-white text-xs">Standard SMS Deep Link</div>
              <div className="font-mono text-[11px] text-gray-400 truncate">{smsLink}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => copyToClipboard(smsLink, 'sms')}
                className="cursor-pointer rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                {copiedKey === 'sms' ? 'Copied ✓' : 'Copy'}
              </button>
              <a
                href={smsLink}
                className="cursor-pointer rounded-lg bg-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-200 hover:bg-gray-600 transition-colors"
              >
                Test
              </a>
            </div>
          </div>

          {/* iOS SMS */}
          <div className="flex items-center justify-between rounded-xl border border-gray-700/70 bg-[#1e1f23] p-3">
            <div className="truncate mr-3">
              <div className="font-semibold text-white text-xs">iOS Optimized SMS Link</div>
              <div className="font-mono text-[11px] text-gray-400 truncate">{iosSmsLink}</div>
            </div>
            <button
              onClick={() => copyToClipboard(iosSmsLink, 'ios')}
              className="cursor-pointer rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shrink-0"
            >
              {copiedKey === 'ios' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>

          {/* WhatsApp Direct */}
          <div className="flex items-center justify-between rounded-xl border border-gray-700/70 bg-[#1e1f23] p-3">
            <div className="truncate mr-3">
              <div className="font-semibold text-white text-xs">WhatsApp Direct Chat Link</div>
              <div className="font-mono text-[11px] text-gray-400 truncate">{waLink}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => copyToClipboard(waLink, 'wa')}
                className="cursor-pointer rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                {copiedKey === 'wa' ? 'Copied ✓' : 'Copy'}
              </button>
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="cursor-pointer rounded-lg bg-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-200 hover:bg-gray-600 transition-colors"
              >
                Open
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
