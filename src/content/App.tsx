import { SettingsButton, SettingsModal, SettingsIntroModal } from './settings/Settings';
import { FullSettingsPage } from './settings/FullSettingsPage';
import { useFeature, useStore } from './settings/store';
import { ResizableInput } from './features/ResizableInput';
import { QuickEmojiBar } from './features/QuickEmojiBar';
import { SmartTabs } from './features/SmartTabs';
import { CrmAlias } from './features/CrmAlias';
import { CrmNotes } from './features/CrmNotes';
import { FollowUpFeature } from './features/FollowUp';
import { ContactNameResolverFeature } from './features/ContactNameResolver';
import { QuickPeek } from './features/QuickPeek';
import { useThemeEngine } from './features/ThemeEngine';
import { ProButton, ProWorkspaceModal } from './pro/ProWorkspace';
import { PrivacyShieldButton, PrivacyShieldToast } from './features/PrivacyShield';
import { QuickSwitcher } from './features/QuickSwitcher';
import { InConversationSearchBar } from './features/InConversationSearch';
import { ConversationExporterModal } from './features/ConversationExporter';
import { SharedMediaDrawer } from './features/SharedMediaDrawer';
import { SlashCommands } from './features/SlashCommands';
import { TextFormatter } from './features/TextFormatter';
import { UndoSendBuffer } from './features/UndoSendBuffer';
import { ConversationHeaderToolbar } from './features/ConversationHeaderToolbar';
import { ScheduleSendFeature } from './features/ScheduleSend';

function ProWorkspaceRoot() {
  const enabled = useFeature('proCampaigns');
  if (!enabled) return null;
  return (
    <>
      <ProButton />
      <ProWorkspaceModal />
    </>
  );
}

export function App() {
  const { loaded } = useStore();
  useThemeEngine(); // Initialize and apply saved theme

  return (
    <>
      <SettingsButton />
      <SettingsIntroModal />
      <SettingsModal />
      <FullSettingsPage />
      <PrivacyShieldButton />
      <PrivacyShieldToast />
      <QuickSwitcher />
      <InConversationSearchBar />
      <ConversationExporterModal />
      <SharedMediaDrawer />
      <SlashCommands />
      <TextFormatter />
      <UndoSendBuffer />
      {loaded && <ScheduleSendFeature />}
      {loaded && <ProWorkspaceRoot />}
      {/* Wait for saved flags so a disabled feature never flashes on at startup. */}
      {loaded && <SmartTabs />}
      {loaded && <ConversationHeaderToolbar />}
      {loaded && <CrmAlias />}
      {loaded && <CrmNotes />}
      {loaded && <FollowUpFeature />}
      {loaded && <ContactNameResolverFeature />}
      {loaded && <ResizableInput />}
      {loaded && <QuickEmojiBar />}
      {loaded && <QuickPeek />}
    </>
  );
}
