import { useState } from 'react';
import { useThemeMode, type CustomTheme } from '../features/ThemeEngine';

interface Props {
  initial?: CustomTheme | null;
  onSave: (theme: CustomTheme) => void;
  onCancel: () => void;
}

export function ThemeBuilder({ initial, onSave, onCancel }: Props) {
  const themeMode = useThemeMode();
  const isLight = themeMode === 'light';
  const [name, setName] = useState(initial?.name || 'My Custom Theme');
  const [bodyBg, setBodyBg] = useState(initial?.bodyBg || '#1e1e2e');
  const [sidebarBg, setSidebarBg] = useState(initial?.sidebarBg || '#181825');
  const [outgoingBg, setOutgoingBg] = useState(initial?.outgoingBg || '#89b4fa');
  const [outgoingText, setOutgoingText] = useState(initial?.outgoingText || '#11111b');
  const [incomingBg, setIncomingBg] = useState(initial?.incomingBg || '#313244');
  const [incomingText, setIncomingText] = useState(initial?.incomingText || '#cdd6f4');
  const [textColor, setTextColor] = useState(initial?.textColor || '#cdd6f4');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      id: initial?.id || `custom-${Date.now()}`,
      name: trimmed,
      bodyBg,
      sidebarBg,
      outgoingBg,
      outgoingText,
      incomingBg,
      incomingText,
      textColor
    });
  };

  return (
    <div className={`space-y-4 font-sans text-xs ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
      <div className={`flex items-center justify-between border-b pb-2 ${isLight ? 'border-gray-200' : 'border-gray-700/60'}`}>
        <h3 className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
          {initial ? 'Edit Custom Theme' : 'Build Custom Theme'}
        </h3>
        <button
          onClick={onCancel}
          className={`cursor-pointer text-xs ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
        >
          ← Back to themes
        </button>
      </div>

      {/* Theme Name */}
      <div>
        <label className={`mb-1 block font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Theme Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Sunset Amber"
          className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none focus:border-blue-500 ${
            isLight
              ? 'border-[#dadce0] bg-[#f8f9fa] text-gray-900 placeholder-gray-400'
              : 'border-gray-700 bg-gray-900/80 text-white placeholder-gray-500'
          }`}
        />
      </div>

      {/* Live Preview Card */}
      <div>
        <div className={`mb-1 text-[11px] font-semibold tracking-wider uppercase ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
          Live Mockup Preview
        </div>
        <div
          className="rounded-xl border border-black/10 dark:border-white/10 p-3 shadow-inner"
          style={{ backgroundColor: bodyBg, color: textColor }}
        >
          <div className="mb-2 flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-1.5">
            <div className="flex items-center gap-1.5">
              <div
                className="h-3 w-12 rounded"
                style={{ backgroundColor: sidebarBg }}
                title="Sidebar accent"
              />
              <span className="font-semibold" style={{ color: textColor }}>
                Preview Chat
              </span>
            </div>
            <span className="text-[10px] opacity-70">12:30 PM</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-start">
              <div
                className="max-w-[80%] rounded-2xl rounded-bl-xs px-3 py-1.5 text-[11px] shadow-sm"
                style={{ backgroundColor: incomingBg, color: incomingText }}
              >
                How do these colors look?
              </div>
            </div>
            <div className="flex justify-end">
              <div
                className="max-w-[80%] rounded-2xl rounded-br-xs px-3 py-1.5 text-[11px] shadow-sm"
                style={{ backgroundColor: outgoingBg, color: outgoingText }}
              >
                Looking great! Perfectly personalized.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Color Controls */}
      <div className="grid grid-cols-2 gap-2.5">
        <ColorField label="Chat Background" value={bodyBg} onChange={setBodyBg} isLight={isLight} />
        <ColorField label="Sidebar Background" value={sidebarBg} onChange={setSidebarBg} isLight={isLight} />
        <ColorField label="Outgoing Bubble" value={outgoingBg} onChange={setOutgoingBg} isLight={isLight} />
        <ColorField label="Outgoing Text" value={outgoingText} onChange={setOutgoingText} isLight={isLight} />
        <ColorField label="Incoming Bubble" value={incomingBg} onChange={setIncomingBg} isLight={isLight} />
        <ColorField label="Incoming Text" value={incomingText} onChange={setIncomingText} isLight={isLight} />
        <div className="col-span-2">
          <ColorField label="General Headings & Text" value={textColor} onChange={setTextColor} isLight={isLight} />
        </div>
      </div>

      {/* Action buttons */}
      <div className={`flex items-center justify-end gap-2 border-t pt-3 ${isLight ? 'border-gray-200' : 'border-gray-700/60'}`}>
        <button
          onClick={onCancel}
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs ${
            isLight
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="cursor-pointer rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50"
        >
          Save & Apply Theme
        </button>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  isLight
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isLight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 ${
      isLight
        ? 'border-[#dadce0] bg-[#f8f9fa]'
        : 'border-gray-700/60 bg-gray-800/40'
    }`}>
      <span className={`text-[11px] ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`font-mono text-[10px] uppercase ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{value}</span>
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
        />
      </div>
    </div>
  );
}
