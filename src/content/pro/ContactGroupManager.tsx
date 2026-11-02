import { useState, useEffect, useRef } from 'react';
import {
  getContactGroups,
  saveContactGroup,
  deleteContactGroup,
  importStoredContacts,
  type ContactGroup
} from '../db';
import { parseAudience, type ContactRecipient } from './parser';
import { reloadContacts } from '../features/ContactNameResolver';

export function ContactGroupManager({
  onSelectGroup
}: {
  onSelectGroup?: (group: ContactGroup) => void;
}) {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ContactGroup | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');

  // Form state for creating or editing
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [membersText, setMembersText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadGroups = async () => {
    const list = await getContactGroups();
    setGroups(list);
    if (selectedGroup) {
      const updated = list.find(g => g.id === selectedGroup.id);
      setSelectedGroup(updated || list[0] || null);
    } else if (list.length > 0 && !isCreating) {
      setSelectedGroup(list[0]);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleStartCreate = () => {
    setSelectedGroup(null);
    setIsCreating(true);
    setEditName('');
    setEditDesc('');
    setMembersText('');
  };

  const handleSelectGroup = (g: ContactGroup) => {
    setIsCreating(false);
    setSelectedGroup(g);
    setEditName(g.name);
    setEditDesc(g.description || '');
    setMembersText(
      g.contacts.map(c => (c.name ? `${c.name}, ${c.phone}` : c.phone)).join('\n')
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = parseAudience(text);
    if (res.contacts.length > 0) {
      const formatted = res.contacts.map(c => (c.name ? `${c.name}, ${c.phone}` : c.phone)).join('\n');
      setMembersText(formatted);
      if (!editName.trim() && file.name) {
        const cleanName = file.name
          .replace(/\.(csv|tsv|txt|vcf)$/i, '')
          .replace(/[-_]/g, ' ')
          .trim();
        setEditName(cleanName);
      }
    } else {
      alert('Could not find any phone numbers in this file.');
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      alert('Please enter a group name.');
      return;
    }

    const { contacts } = parseAudience(membersText);
    if (contacts.length === 0) {
      alert('Please enter at least one valid contact with a phone number.');
      return;
    }

    const groupToSave: ContactGroup = {
      id: isCreating ? `grp-${Date.now()}` : selectedGroup?.id || `grp-${Date.now()}`,
      name: editName.trim(),
      description: editDesc.trim(),
      contacts,
      updatedAt: Date.now()
    };

    await saveContactGroup(groupToSave);
    importStoredContacts(
      contacts.filter(c => c.name && c.phone).map(c => ({
        name: c.name,
        phone: c.phone,
        source: 'group'
      }))
    ).then(cnt => {
      if (cnt > 0) reloadContacts();
    });
    setIsCreating(false);
    await loadGroups();
    setSelectedGroup(groupToSave);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    await deleteContactGroup(id);
    await loadGroups();
  };

  const filtered = groups.filter(
    g =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-12 gap-4 h-full font-sans text-xs text-gray-200">
      {/* Left List of Groups */}
      <div className="col-span-5 flex flex-col rounded-xl border border-gray-700/60 bg-[#1e1f23] p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">👥</span>
            <span className="font-semibold text-white text-xs">Saved Groups</span>
            <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[10px] text-purple-300 font-medium">
              {groups.length}
            </span>
          </div>
          <button
            onClick={handleStartCreate}
            className="cursor-pointer rounded-lg bg-purple-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-purple-500 transition-colors shadow-sm"
          >
            + New Group
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search groups..."
          className="w-full rounded-lg border border-gray-700 bg-gray-900/90 px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500 placeholder-gray-500"
        />

        {/* Groups List */}
        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 min-h-[280px]">
          {filtered.map(g => {
            const isSelected = selectedGroup?.id === g.id && !isCreating;
            return (
              <div
                key={g.id}
                onClick={() => handleSelectGroup(g)}
                className={`cursor-pointer rounded-xl border p-2.5 transition-all text-left group ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-white text-xs truncate max-w-[170px]">
                    {g.name}
                  </span>
                  <span className="rounded-full bg-gray-800 px-1.5 py-0.2 text-[10px] font-mono text-purple-300">
                    {g.contacts.length} {g.contacts.length === 1 ? 'member' : 'members'}
                  </span>
                </div>
                {g.description && (
                  <p className="text-[11px] text-gray-400 line-clamp-1 italic">
                    {g.description}
                  </p>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-700 p-6 text-center text-gray-500 text-xs">
              {search ? 'No groups match your search.' : 'No saved groups yet. Create one!'}
            </div>
          )}
        </div>
      </div>

      {/* Right Details / Editor */}
      <div className="col-span-7 flex flex-col rounded-xl border border-gray-700/60 bg-[#1e1f23] p-4 space-y-3 overflow-y-auto">
        {isCreating || selectedGroup ? (
          <>
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <span>{isCreating ? 'Create New Group' : `Edit: ${selectedGroup?.name}`}</span>
              </h3>

              {!isCreating && selectedGroup && onSelectGroup && (
                <button
                  onClick={() => onSelectGroup(selectedGroup)}
                  className="cursor-pointer rounded-lg bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition-colors flex items-center gap-1"
                  title="Load this group directly into Group Texting"
                >
                  <span>📢</span>
                  <span>Use in Announcement ↗</span>
                </button>
              )}
            </div>

            {/* Group Name & Description */}
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. Worship Team, Youth Ministry, Sunday Volunteers"
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                  Description / Purpose (Optional)
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="e.g. Musicians, sound tech, and vocalists"
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold uppercase text-gray-400">
                    Members (Name, Phone Number)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".csv,.tsv,.txt,.vcf"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer text-[10px] text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1"
                    >
                      <span>📂</span>
                      <span>Upload CSV / Planning Center</span>
                    </button>
                  </div>
                </div>
                <textarea
                  value={membersText}
                  onChange={e => setMembersText(e.target.value)}
                  placeholder="Paste contacts or CSV/spreadsheet rows:&#10;John Smith, +1234567890&#10;Sarah Davis: +1987654321&#10;+1555666777"
                  rows={7}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2.5 font-mono text-xs text-white outline-none focus:border-purple-500 resize-y"
                />
              </div>
            </div>

            {/* Current members parsed preview */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold uppercase text-gray-400">
                  Parsed Contacts ({parseAudience(membersText).contacts.length}):
                </span>
                {parseAudience(membersText).formatName && parseAudience(membersText).formatName !== 'Pasted List' && (
                  <span className="text-[10px] text-purple-300 font-medium">
                    ✨ {parseAudience(membersText).formatName}
                  </span>
                )}
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 bg-gray-900/40 rounded-xl p-2 border border-gray-800">
                {parseAudience(membersText).contacts.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[11px] px-2 py-0.5 rounded bg-gray-800/60"
                  >
                    <span className="font-medium text-white">{c.name || 'Unnamed'}</span>
                    <span className="font-mono text-gray-400">{c.phone}</span>
                  </div>
                ))}
                {parseAudience(membersText).contacts.length === 0 && (
                  <div className="text-gray-500 text-[11px] p-2 text-center">
                    Paste contacts or upload a Planning Center / spreadsheet file above to preview contacts.
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
              <div>
                {!isCreating && selectedGroup && (
                  <button
                    onClick={() => handleDelete(selectedGroup.id, selectedGroup.name)}
                    className="cursor-pointer text-xs text-red-400 hover:text-red-300 hover:underline"
                  >
                    Delete Group
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isCreating && (
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      if (groups.length > 0) handleSelectGroup(groups[0]);
                    }}
                    className="cursor-pointer rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSave}
                  className="cursor-pointer rounded-lg bg-purple-600 px-4 py-1.5 font-semibold text-white hover:bg-purple-500 shadow text-xs"
                >
                  {isCreating ? 'Create Group' : 'Save Changes'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500">
            <span className="text-3xl mb-2">👥</span>
            <p className="text-xs">Select a group on the left to view members or create a new group.</p>
          </div>
        )}
      </div>
    </div>
  );
}
