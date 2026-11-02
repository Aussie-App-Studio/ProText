import { useState, useRef, useEffect } from 'react';
import { dispatcher, useDispatcherStore } from './dispatcher';
import {
  parseAudience,
  renderTemplate,
  extractVariables,
  type ContactRecipient
} from './parser';
import {
  type Campaign,
  type MessageTemplate,
  type ContactGroup,
  getContactGroups,
  saveContactGroup,
  importStoredContacts
} from '../db';
import { reloadContacts } from '../features/ContactNameResolver';

export function CampaignDispatcher({
  templates,
  onNavigateToTemplates,
  onNavigateToGroups,
  initialGroup
}: {
  templates: MessageTemplate[];
  onNavigateToTemplates: () => void;
  onNavigateToGroups?: () => void;
  initialGroup?: ContactGroup | null;
}) {
  const { state, campaign, currentRecipient, countdownSeconds, recentLogs } = useDispatcherStore();

  // Builder state
  const [campaignName, setCampaignName] = useState('New Announcement');
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);
  const [audienceText, setAudienceText] = useState('');
  const [contacts, setContacts] = useState<ContactRecipient[]>([]);
  const [invalidLines, setInvalidLines] = useState<string[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<string>('');
  const [templateText, setTemplateText] = useState('Hi {Name}, ');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isCsvMode, setIsCsvMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saved Groups state
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [showSaveGroupModal, setShowSaveGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const loadGroups = async () => {
    const list = await getContactGroups();
    setGroups(list);
    return list;
  };

  useEffect(() => {
    loadGroups().then(list => {
      if (initialGroup) {
        applyGroup(initialGroup);
      }
    });
  }, [initialGroup]);

  const applyGroup = (grp: ContactGroup) => {
    setSelectedGroupId(grp.id);
    const formatted = grp.contacts
      .map(c => (c.name ? `${c.name}, ${c.phone}` : c.phone))
      .join('\n');
    setAudienceText(formatted);
    setContacts(grp.contacts);
    setInvalidLines([]);
    setDetectedFormat('Saved Group');
    setIsCsvMode(false);
    if (campaignName === 'New Announcement' || !campaignName) {
      setCampaignName(`${grp.name} Announcement`);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    if (!groupId) return;
    const grp = groups.find(g => g.id === groupId);
    if (grp) {
      applyGroup(grp);
    }
  };

  const handleSaveAsGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Please enter a name for this group.');
      return;
    }
    if (contacts.length === 0) {
      alert('No contacts to save. Enter or paste contacts first.');
      return;
    }

    const newGroup: ContactGroup = {
      id: `grp-${Date.now()}`,
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      contacts,
      updatedAt: Date.now()
    };

    await saveContactGroup(newGroup);
    await loadGroups();
    setSelectedGroupId(newGroup.id);
    setShowSaveGroupModal(false);
    setNewGroupName('');
    setNewGroupDesc('');
  };

  // Index named contacts into local directory for name resolution across the app
  const indexNamedContacts = (parsedContacts: ContactRecipient[]) => {
    const named = parsedContacts
      .filter(c => c.name && c.name.trim().length > 0 && c.phone)
      .map(c => ({
        name: c.name,
        phone: c.phone,
        email: c.vars.Email || c.vars['Primary Email'],
        source: 'planning-center'
      }));
    if (named.length > 0) {
      importStoredContacts(named).then(cnt => {
        if (cnt > 0) reloadContacts();
      });
    }
  };

  // Parse pasted or entered text whenever it changes
  const handleAudienceTextChange = (text: string) => {
    setAudienceText(text);
    const res = parseAudience(text);
    setContacts(res.contacts);
    setInvalidLines(res.invalid);
    setDetectedFormat(res.formatName);
    indexNamedContacts(res.contacts);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setIsCsvMode(true);
    setAudienceText(text);
    const res = parseAudience(text);
    setContacts(res.contacts);
    setInvalidLines(res.invalid);
    setDetectedFormat(res.formatName);
    indexNamedContacts(res.contacts);

    // Auto-set announcement name from filename if default
    if (campaignName === 'New Announcement' && file.name) {
      const cleanName = file.name
        .replace(/\.(csv|tsv|txt|vcf)$/i, '')
        .replace(/[-_]/g, ' ')
        .trim();
      if (cleanName) {
        setCampaignName(`${cleanName} Announcement`);
      }
    }
  };

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const found = templates.find(t => t.id === id);
    if (found) {
      setTemplateText(found.body);
    }
  };

  const insertVariable = (v: string) => {
    setTemplateText(prev => (prev ? `${prev} {${v}}` : `{${v}}`));
  };

  const handleStart = async () => {
    if (contacts.length === 0) {
      alert('Please add at least one valid recipient.');
      return;
    }
    if (!templateText.trim()) {
      alert('Please enter a message template.');
      return;
    }

    const newCampaign: Campaign = {
      id: `camp-${Date.now()}`,
      name: campaignName.trim() || 'Untitled Campaign',
      templateText: templateText.trim(),
      total: contacts.length,
      sent: 0,
      failed: 0,
      status: 'draft',
      minDelay: Math.max(5, minDelay),
      maxDelay: Math.max(minDelay, maxDelay),
      createdAt: Date.now()
    };

    try {
      await dispatcher.startCampaign(newCampaign, contacts);
    } catch (err: any) {
      alert(err.message || 'Failed to start campaign');
    }
  };

  // Detected variables across contacts (prioritize friendly personal variables)
  const detectedVariables = Array.from(
    new Set(contacts.flatMap(c => Object.keys(c.vars)))
  ).filter(v => v !== 'Phone' && !/^(person ?id|individual ?id|col\d+)$/i.test(v));

  const previewRecipient = contacts[0] || { name: 'Jane Doe', phone: '+1234567890', vars: { Name: 'Jane Doe', Phone: '+1234567890' } };
  const previewText = renderTemplate(templateText, previewRecipient.vars);

  // If a campaign is currently in progress or paused, render the Live Console
  if (state === 'running' || state === 'paused') {
    const total = campaign?.total || 1;
    const sent = campaign?.sent || 0;
    const failed = campaign?.failed || 0;
    const progressPct = Math.round(((sent + failed) / total) * 100);

    return (
      <div className="space-y-4 font-sans text-xs text-gray-200">
        {/* Active Campaign Header Card */}
        <div className="rounded-2xl border border-blue-500/40 bg-[#1e222b] p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">{campaign?.name}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    state === 'running'
                      ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40 animate-pulse'
                      : 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                  }`}
                >
                  {state}
                </span>
              </div>
              <p className="text-gray-400 text-[11px] mt-0.5">
                Sending one-by-one with natural pauses ({campaign?.minDelay}s - {campaign?.maxDelay}s) to ensure delivery
              </p>
            </div>

            {/* Kill Switch Controls */}
            <div className="flex items-center gap-2">
              {state === 'running' ? (
                <button
                  onClick={() => dispatcher.pause()}
                  className="cursor-pointer rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 shadow-md transition-all"
                >
                  ⏸ Pause
                </button>
              ) : (
                <button
                  onClick={() => dispatcher.resume()}
                  className="cursor-pointer rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-md transition-all"
                >
                  ▶ Resume
                </button>
              )}

              {/* STOP SENDING BUTTON */}
              <button
                onClick={() => {
                  if (confirm('Stop sending? Any remaining unsent messages will be cancelled.')) {
                    dispatcher.cancel();
                  }
                }}
                className="cursor-pointer rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-500 shadow-lg transition-all ring-2 ring-red-500/30"
              >
                🛑 Stop Sending
              </button>
            </div>
          </div>

          {/* Progress Bar & Stats */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-300">
                Progress: <strong className="text-white">{sent + failed}</strong> of {total} messages ({progressPct}%)
              </span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400">✓ Sent: {sent}</span>
                <span className="text-red-400">✕ Unsent / Failed: {failed}</span>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${(sent / total) * 100}%` }}
              />
              <div
                className="bg-red-500 h-full transition-all duration-300"
                style={{ width: `${(failed / total) * 100}%` }}
              />
            </div>
          </div>

          {/* Live Cadence Countdown indicator */}
          {countdownSeconds > 0 && currentRecipient && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg animate-spin">⏳</span>
                <div>
                  <div className="font-semibold text-blue-200 text-xs">
                    Natural Sending Pause Active
                  </div>
                  <div className="text-[11px] text-gray-300">
                    Next text will be sent to <strong>{currentRecipient.name || 'Recipient'}</strong> ({currentRecipient.phone})
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xl font-bold text-blue-400">
                  {countdownSeconds}s
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live Logs Stream */}
        <div className="rounded-xl border border-gray-700/60 bg-[#1e1f23] p-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
            Live Sending Activity
          </div>
          <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {recentLogs.map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/80 px-3 py-1.5 text-[11px]"
              >
                <div className="truncate mr-2">
                  <span className="font-semibold text-white mr-1.5">{log.name || 'Contact'}</span>
                  <span className="font-mono text-gray-400 mr-2">{log.phone}</span>
                  <span className="text-gray-400 truncate italic">"{log.text}"</span>
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase ${
                    log.status === 'sent'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {log.status === 'sent' ? 'Sent ✓' : 'Failed ✕'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, render Campaign Builder
  return (
    <div className="space-y-4 font-sans text-xs text-gray-200">
      {/* Announcement Details & Delay settings */}
      <div className="rounded-xl border border-gray-700/60 bg-[#1e1f23] p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">1. Group Message Details</h3>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-[11px] font-medium text-gray-300 mb-1">
              Message or Group Name
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              placeholder="e.g. Sunday Service Reminder, Youth Group, Volunteer Team"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1" title="Pauses between texts so your mobile carrier does not flag them as automated spam">
              Safe Pause Between Texts
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={5}
                max={30}
                value={minDelay}
                onChange={e => setMinDelay(Number(e.target.value))}
                className="w-14 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-center text-xs text-white outline-none"
              />
              <span className="text-gray-400">to</span>
              <input
                type="number"
                min={minDelay}
                max={60}
                value={maxDelay}
                onChange={e => setMaxDelay(Number(e.target.value))}
                className="w-14 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-center text-xs text-white outline-none"
              />
              <span className="text-gray-400 text-[10px]">sec</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recipients Section */}
      <div className="rounded-xl border border-gray-700/60 bg-[#1e1f23] p-4 space-y-3 relative">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">2. People to Message</h3>
            <p className="text-[11px] text-gray-400">
              Select a group, paste contacts, or upload an export from Planning Center People, Breeze, Google Contacts, or Excel.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.tsv,.txt,.vcf"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-lg bg-gray-700/80 hover:bg-gray-600 px-2.5 py-1 text-[11px] font-semibold text-gray-200 transition-colors flex items-center gap-1.5"
              title="Upload Planning Center export, CSV, vCard (.vcf), or Excel list"
            >
              <span>📂</span>
              <span>Upload CSV / Planning Center</span>
            </button>
          </div>
        </div>

        {/* Saved Group Selector & Quick Save Bar */}
        <div className="flex items-center justify-between bg-gray-900/80 p-2 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-300 font-semibold flex items-center gap-1">
              <span>👥</span>
              <span>Saved Group:</span>
            </span>
            <select
              value={selectedGroupId}
              onChange={e => handleSelectGroup(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-200 outline-none focus:border-purple-500"
            >
              <option value="">-- Choose a Saved Group --</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.contacts.length} people)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={contacts.length === 0}
              onClick={() => {
                setNewGroupName(campaignName !== 'New Announcement' ? campaignName : '');
                setShowSaveGroupModal(true);
              }}
              className="cursor-pointer rounded-lg bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 px-2.5 py-1 text-[11px] font-semibold text-purple-300 disabled:opacity-40 transition-colors flex items-center gap-1"
              title="Save the currently entered list as a reusable group"
            >
              <span>💾</span>
              <span>Save as Group</span>
            </button>

            {onNavigateToGroups && (
              <button
                type="button"
                onClick={onNavigateToGroups}
                className="cursor-pointer rounded-lg bg-gray-800 hover:bg-gray-700 px-2.5 py-1 text-[11px] font-semibold text-gray-300 transition-colors flex items-center gap-1"
                title="Manage all saved groups"
              >
                <span>⚙</span>
                <span>Manage Groups</span>
              </button>
            )}
          </div>
        </div>

        <div>
          <textarea
            value={audienceText}
            onChange={e => {
              setSelectedGroupId('');
              handleAudienceTextChange(e.target.value);
            }}
            placeholder="Paste names and phone numbers (one per line):&#10;John Smith, +1234567890&#10;Sarah Davis: +1987654321&#10;+1555666777"
            rows={4}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2.5 font-mono text-xs text-white outline-none focus:border-blue-500 resize-y"
          />
        </div>

        {/* Modal: Save current list as reusable group */}
        {showSaveGroupModal && (
          <div className="absolute inset-0 z-20 rounded-xl bg-gray-950/90 backdrop-blur-xs p-4 flex flex-col justify-center border border-purple-500/50 shadow-2xl">
            <div className="space-y-3 max-w-md mx-auto w-full">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>💾</span>
                  <span>Save as Reusable Group</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowSaveGroupModal(false)}
                  className="cursor-pointer text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="e.g. Worship Team, Youth Parents, Setup Crew"
                  autoFocus
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  placeholder="e.g. Sunday musicians and sound techs"
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="text-[11px] text-gray-400 bg-purple-500/10 border border-purple-500/20 rounded-lg p-2">
                Will save <strong>{contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}</strong> to this group for future 1-click use.
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSaveGroupModal(false)}
                  className="cursor-pointer rounded-lg bg-gray-800 px-3 py-1 text-xs text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsGroup}
                  disabled={!newGroupName.trim()}
                  className="cursor-pointer rounded-lg bg-purple-600 px-3.5 py-1 font-semibold text-white hover:bg-purple-500 disabled:opacity-50 text-xs shadow"
                >
                  Save Group
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recipients summary badge & detected format */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`rounded-full px-2 py-0.5 font-semibold text-[10px] ${
                contacts.length > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {contacts.length} {contacts.length === 1 ? 'Person' : 'People'} ready to receive
            </span>

            {detectedFormat && detectedFormat !== 'Pasted List' && detectedFormat !== 'Empty File' && (
              <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 font-semibold text-[10px] text-purple-300 flex items-center gap-1 shadow-xs">
                <span>✨</span>
                <span>{detectedFormat}</span>
              </span>
            )}

            {invalidLines.length > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 font-semibold text-[10px] text-red-300">
                {invalidLines.length} Skipped (missing phone number)
              </span>
            )}
          </div>

          {detectedVariables.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-[10px]">Insert custom info:</span>
              {detectedVariables.map(v => (
                <span
                  key={v}
                  onClick={() => insertVariable(v)}
                  className="cursor-pointer rounded bg-blue-500/20 border border-blue-500/30 px-1.5 py-0.2 font-mono text-[10px] text-blue-300 hover:bg-blue-500/30"
                >
                  +{`{${v}}`}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Template Builder */}
      <div className="rounded-xl border border-gray-700/60 bg-[#1e1f23] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">3. Your Message</h3>
          <div className="flex items-center gap-2">
            {templates.length > 0 && (
              <select
                value={selectedTemplateId}
                onChange={e => handleSelectTemplate(e.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 outline-none"
              >
                <option value="">Load a saved message...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={onNavigateToTemplates}
              className="cursor-pointer text-blue-400 hover:text-blue-300 text-[11px]"
            >
              Saved Messages ↗
            </button>
          </div>
        </div>

        <div>
          <textarea
            value={templateText}
            onChange={e => setTemplateText(e.target.value)}
            placeholder="Hi {Name}, quick reminder about our service tomorrow at 10am..."
            rows={3}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2.5 text-xs text-white outline-none focus:border-blue-500 resize-y"
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
            <span>
              {templateText.length} characters • {templateText.length <= 160 ? 1 : Math.ceil(templateText.length / 153)} SMS {templateText.length <= 160 ? 'part' : 'parts'}
            </span>
            <span>Personalized fields: {extractVariables(templateText).join(', ') || 'None'}</span>
          </div>
        </div>

        {/* Live Sample Preview */}
        {contacts.length > 0 && templateText && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-2.5 text-[11px]">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 block mb-1">
              Sample Preview for {previewRecipient.name || previewRecipient.phone}:
            </span>
            <div className="text-gray-200 italic">"{previewText}"</div>
          </div>
        )}
      </div>

      {/* Launch Action */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-gray-400 text-[11px]">
          {contacts.length} {contacts.length === 1 ? 'text' : 'texts'} will be sent one-by-one with safe natural pauses.
        </div>
        <button
          onClick={handleStart}
          disabled={contacts.length === 0}
          className={`cursor-pointer rounded-xl px-5 py-2 text-xs font-bold text-white shadow-lg transition-all ${
            contacts.length > 0
              ? 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/25 ring-2 ring-blue-500/30'
              : 'bg-gray-700 opacity-50 cursor-not-allowed'
          }`}
        >
          📢 Send to Group ({contacts.length})
        </button>
      </div>
    </div>
  );
}
