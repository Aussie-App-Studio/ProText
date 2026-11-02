import { useEffect, useState, useSyncExternalStore } from 'react';
import { Slot } from '../Slot';
import { SEL } from '../selectors';
import { getTemplates, type MessageTemplate, type ContactGroup } from '../db';
import { CampaignDispatcher } from './CampaignDispatcher';
import { ContactGroupManager } from './ContactGroupManager';
import { TemplateManager } from './TemplateManager';
import { CampaignHistory } from './CampaignHistory';
import { ClickToChat } from './ClickToChat';
import { AutoResponderView } from './AutoResponderView';
import { useDispatcherStore } from './dispatcher';
import { CampaignIcon } from '../ui/MaterialIcons';

// Simple external store for Pro Drawer visibility
let isOpen = false;
const listeners = new Set<() => void>();
function notify() { listeners.forEach(l => l()); }

export function openProWorkspace() {
  isOpen = true;
  notify();
}

export function closeProWorkspace() {
  isOpen = false;
  notify();
}

const subscribePro = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getProSnapshot = () => isOpen;

export function useProWorkspaceStore() {
  return useSyncExternalStore(subscribePro, getProSnapshot);
}

/** Injected into Google Messages top header bar */
export function ProButton() {
  const { state } = useDispatcherStore();

  return (
    <Slot
      anchor={SEL.accountSwitcher}
      position="before"
      id="pro-button"
      hostStyle="display:flex;align-items:center;margin-right:6px;"
    >
      <button
        onClick={openProWorkspace}
        title="Group Texting, Announcements, Templates & Auto-Replies"
        className={`cursor-pointer flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors shadow-xs ${
          state === 'running'
            ? 'border-[#004a77] bg-[#004a77] text-[#c2e7ff] animate-pulse'
            : 'border-[#dadce0]/12 bg-[#303134] text-[#e8eaed] hover:bg-[#3c4043]'
        }`}
      >
        <CampaignIcon size={16} className="text-[#a8c7fa]" />
        <span>Group Messages</span>
        {state === 'running' && (
          <span className="h-2 w-2 rounded-full bg-[#a8c7fa] animate-ping ml-0.5" />
        )}
      </button>
    </Slot>
  );
}

type ProTab = 'dispatcher' | 'groups' | 'templates' | 'history' | 'clicktochat' | 'autoresponder';

export function ProWorkspaceModal() {
  const open = useProWorkspaceStore();
  const [activeTab, setActiveTab] = useState<ProTab>('dispatcher');
  const [selectedGroupForDispatcher, setSelectedGroupForDispatcher] = useState<ContactGroup | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  const reloadTemplates = async () => {
    const list = await getTemplates();
    setTemplates(list);
  };

  useEffect(() => {
    if (open) {
      reloadTemplates();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeProWorkspace();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      data-testid="pro-workspace-modal"
      className="fixed inset-0 z-[2147483646] pointer-events-auto flex items-center justify-center bg-black/60 backdrop-blur-xs font-sans text-xs"
      onClick={closeProWorkspace}
    >
      <div
        className="w-[780px] max-w-[95vw] h-[86vh] max-h-[820px] rounded-2xl bg-[#1b1c20] text-gray-100 shadow-2xl border border-gray-700/60 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-gray-800 bg-[#22242a] px-5 py-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 font-bold text-white shadow">
              📢
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Group Texting & Announcements</span>
                <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                  Community Edition
                </span>
              </h2>
              <p className="text-[10px] text-gray-400">
                Send personalized messages, manage team groups, save templates, set auto-replies, and connect with your team
              </p>
            </div>
          </div>

          <button
            onClick={closeProWorkspace}
            className="cursor-pointer text-gray-400 hover:text-white text-lg px-1.5 py-0.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 border-b border-gray-800 bg-[#1e2025] px-5 py-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('dispatcher')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'dispatcher'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>📢</span>
            <span>Send to Group</span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'groups'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>👥</span>
            <span>Saved Groups</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'templates'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>📝</span>
            <span>Saved Messages</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>📜</span>
            <span>Sent History</span>
          </button>

          <button
            onClick={() => setActiveTab('clicktochat')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'clicktochat'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>🔗</span>
            <span>"Text Me" Links</span>
          </button>

          <button
            onClick={() => setActiveTab('autoresponder')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'autoresponder'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>🤖</span>
            <span>Auto-Replies</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'dispatcher' && (
            <CampaignDispatcher
              templates={templates}
              onNavigateToTemplates={() => setActiveTab('templates')}
              onNavigateToGroups={() => setActiveTab('groups')}
              initialGroup={selectedGroupForDispatcher}
            />
          )}

          {activeTab === 'groups' && (
            <ContactGroupManager
              onSelectGroup={grp => {
                setSelectedGroupForDispatcher(grp);
                setActiveTab('dispatcher');
              }}
            />
          )}

          {activeTab === 'templates' && (
            <TemplateManager
              onSelectTemplate={() => {
                setActiveTab('dispatcher');
              }}
            />
          )}

          {activeTab === 'history' && (
            <CampaignHistory
              onOpenDispatcher={() => setActiveTab('dispatcher')}
            />
          )}

          {activeTab === 'clicktochat' && <ClickToChat />}

          {activeTab === 'autoresponder' && <AutoResponderView />}
        </div>
      </div>
    </div>
  );
}
