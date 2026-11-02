import { useEffect, useState } from 'react';
import { autoResponder, useAutoResponderStore } from './autoresponder';
import { getAutoRules, saveAutoRule, deleteAutoRule, type AutoRule } from '../db';

export function AutoResponderView() {
  const { active, keepAliveActive, lastReply } = useAutoResponderStore();
  const [rules, setRules] = useState<AutoRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [replyText, setReplyText] = useState('');

  const load = async () => {
    const list = await getAutoRules();
    setRules(list);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveRule = async () => {
    if (!ruleName.trim() || !keywords.trim() || !replyText.trim()) return;
    const rule: AutoRule = {
      id: `rule-${Date.now()}`,
      name: ruleName.trim(),
      keywords: keywords.split(',').map(s => s.trim()).filter(Boolean),
      replyText: replyText.trim(),
      active: true,
      createdAt: Date.now()
    };
    await saveAutoRule(rule);
    await load();
    await autoResponder.reloadRules();
    setShowForm(false);
    setRuleName('');
    setKeywords('');
    setReplyText('');
  };

  const handleToggleRule = async (rule: AutoRule) => {
    const updated = { ...rule, active: !rule.active };
    await saveAutoRule(updated);
    await load();
    await autoResponder.reloadRules();
  };

  const handleDeleteRule = async (id: string) => {
    await deleteAutoRule(id);
    await load();
    await autoResponder.reloadRules();
  };

  return (
    <div className="space-y-4 font-sans text-xs text-gray-200">
      {/* Master Toggle & Keep-alive Card */}
      <div className="rounded-xl border border-gray-700/70 bg-[#1e1f23] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>🤖</span> Automatic Keyword Replies
            </h3>
            <p className="text-[11px] text-gray-400">
              Automatically reply when someone texts a specific word (like PRAYER, TIMES, or ADDRESS).
            </p>
          </div>
          <button
            onClick={() => autoResponder.toggle()}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-md ${
              active
                ? 'bg-emerald-600 text-white hover:bg-emerald-500 ring-2 ring-emerald-500/30'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {active ? 'ACTIVE ✓' : 'OFF'}
          </button>
        </div>

        {/* Keep-alive status */}
        <div className="flex items-center justify-between rounded-lg bg-gray-900/60 border border-gray-800 px-3 py-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                active && keepAliveActive
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-gray-500'
              }`}
            />
            <span className="text-gray-300">
              {active
                ? 'Tab Kept Awake (Screen lock active so replies send even if you step away)'
                : 'Auto-Replies Inactive'}
            </span>
          </div>
          <span className="text-[10px] text-gray-500">60-sec pause between replies (prevents loops)</span>
        </div>

        {/* Last Reply banner */}
        {lastReply && (
          <div className="mt-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 p-2 text-[11px] text-blue-300 flex items-center justify-between">
            <span>
              Last auto-reply sent to <strong>{lastReply.recipient}</strong> (Rule: {lastReply.ruleName})
            </span>
            <span className="text-[10px] text-gray-400">
              {new Date(lastReply.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Rules Section Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Saved Auto-Reply Rules ({rules.length})
        </span>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm"
          >
            + Add Auto-Reply
          </button>
        )}
      </div>

      {/* Add Rule Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/95 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-gray-700/60 pb-2">
            <span className="font-semibold text-white text-xs">New Automatic Reply</span>
            <button onClick={() => setShowForm(false)} className="cursor-pointer text-gray-400 hover:text-white">
              ✕
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1">Rule Name</label>
            <input
              type="text"
              value={ruleName}
              onChange={e => setRuleName(e.target.value)}
              placeholder="e.g. Service Times, Prayer Requests, Address & Hours"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1">
              Trigger Words (comma separated)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="e.g. prayer, times, service, address, join, volunteer"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1">
              Your Reply Message
            </label>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Hi! Sunday services are at 9:00 AM and 11:00 AM. We'd love to see you there! Reply here anytime if you have any questions."
              rows={3}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-xs text-white outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/60">
            <button
              onClick={() => setShowForm(false)}
              className="cursor-pointer rounded-lg bg-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveRule}
              className="cursor-pointer rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-sm"
            >
              Save Rule
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
        {rules.map(rule => (
          <div
            key={rule.id}
            className="rounded-xl border border-gray-700/60 bg-[#1e1f23] p-3 transition-all hover:border-gray-600"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white text-xs">{rule.name}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleRule(rule)}
                  className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    rule.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {rule.active ? 'Active' : 'Disabled'}
                </button>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="cursor-pointer text-gray-400 hover:text-red-400 px-1 text-xs"
                  title="Delete rule"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="mb-1.5 flex flex-wrap gap-1">
              {rule.keywords.map(kw => (
                <span
                  key={kw}
                  className="rounded bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.2 text-[10px] font-mono text-blue-300"
                >
                  "{kw}"
                </span>
              ))}
            </div>

            <div className="rounded bg-gray-900/60 p-2 text-[11px] text-gray-300 italic border border-gray-800">
              "{rule.replyText}"
            </div>
          </div>
        ))}

        {rules.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-400">
            No auto-reply rules configured yet. Click "+ Add Rule" to set up your first keyword trigger.
          </div>
        )}
      </div>
    </div>
  );
}
