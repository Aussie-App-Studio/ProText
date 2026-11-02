import { useEffect, useState } from 'react';
import { getTemplates, saveTemplate, deleteTemplate, type MessageTemplate } from '../db';
import { renderTemplate } from './parser';

const COMMON_TAGS = ['{Name}', '{First Name}', '{Phone}', '{Date}', '{Team}', '{Note}'];

export function TemplateManager({
  onSelectTemplate
}: {
  onSelectTemplate?: (tpl: MessageTemplate) => void;
}) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const list = await getTemplates();
    setTemplates(list);
  };

  useEffect(() => {
    load();
  }, []);

  const handleStartCreate = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setShowForm(true);
  };

  const handleStartEdit = (tpl: MessageTemplate) => {
    setEditingId(tpl.id);
    setTitle(tpl.title);
    setBody(tpl.body);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return;
    const tpl: MessageTemplate = {
      id: editingId || `tpl-${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      updatedAt: Date.now()
    };
    await saveTemplate(tpl);
    await load();
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
    await load();
  };

  const insertTag = (tag: string) => {
    setBody(prev => (prev ? `${prev} ${tag}` : tag));
  };

  const charCount = body.length;
  const segmentCount = charCount <= 160 ? 1 : Math.ceil(charCount / 153);

  return (
    <div className="space-y-4 font-sans text-xs text-gray-200">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Saved Message Templates</h3>
          <p className="text-[11px] text-gray-400">
            Create reusable messages that automatically personalize with tags like <span className="font-mono text-blue-400">{'{Name}'}</span>.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={handleStartCreate}
            className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-sm transition-all"
          >
            + New Message
          </button>
        )}
      </div>

      {/* Editor Modal / Card */}
      {showForm && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/95 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-gray-700/60 pb-2">
            <span className="font-semibold text-white text-xs">
              {editingId ? 'Edit Message' : 'Create New Message'}
            </span>
            <button
              onClick={() => setShowForm(false)}
              className="cursor-pointer text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1">
              Template Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Sunday Service Reminder, Prayer Request Check-In, Volunteer Roster"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-gray-300">
                Message Body
              </label>
              <span className="text-[10px] text-gray-400">
                {charCount} chars • {segmentCount} SMS {segmentCount > 1 ? 'segments' : 'segment'}
              </span>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Hi {Name}, ..."
              rows={4}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-xs text-white outline-none focus:border-blue-500 resize-y"
            />
          </div>

          {/* Variable pills */}
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
              Click to add personalized information:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertTag(tag)}
                  className="cursor-pointer rounded bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-mono font-medium text-blue-300 hover:bg-blue-500/25 transition-all"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          {body && (
            <div className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-2.5">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Preview with Sample Data (Jane Doe):
              </div>
              <div className="text-gray-300 text-xs italic">
                "{renderTemplate(body, { Name: 'Jane Doe', Phone: '+1234567890', Date: 'tomorrow at 2pm', Company: 'Acme Corp', Code: '984321' })}"
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/60">
            <button
              onClick={() => setShowForm(false)}
              className="cursor-pointer rounded-lg bg-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="cursor-pointer rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-sm"
            >
              Save Template
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
        {templates.map(tpl => (
          <div
            key={tpl.id}
            className="group rounded-xl border border-gray-700/70 bg-[#1e1f23] p-3 transition-all hover:border-gray-600 hover:bg-[#24262b]"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-white text-xs">{tpl.title}</span>
              <div className="flex items-center gap-1.5">
                {onSelectTemplate && (
                  <button
                    onClick={() => onSelectTemplate(tpl)}
                    className="cursor-pointer rounded bg-blue-600/80 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-blue-600"
                  >
                    Use in Campaign
                  </button>
                )}
                <button
                  onClick={() => handleStartEdit(tpl)}
                  className="cursor-pointer text-gray-400 hover:text-white px-1 text-xs"
                  title="Edit template"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  className="cursor-pointer text-gray-400 hover:text-red-400 px-1 text-xs"
                  title="Delete template"
                >
                  ✕
                </button>
              </div>
            </div>
            <p className="text-gray-300 text-xs line-clamp-2">{tpl.body}</p>
          </div>
        ))}

        {templates.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-400">
            No templates created yet. Click "+ New Template" to add one.
          </div>
        )}
      </div>
    </div>
  );
}
