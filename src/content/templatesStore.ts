import { useSyncExternalStore } from 'react';
import { getTemplates, type MessageTemplate } from './db';

let templatesCache: MessageTemplate[] = [];
let templatesLoaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => l());
}

export async function reloadTemplates(): Promise<MessageTemplate[]> {
  templatesCache = await getTemplates();
  templatesLoaded = true;
  notify();
  return templatesCache;
}

reloadTemplates();

const subscribeTemplates = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getTemplatesSnapshot = () => templatesCache;

export function useTemplates() {
  const templates = useSyncExternalStore(subscribeTemplates, getTemplatesSnapshot);
  return { templates, loaded: templatesLoaded, reload: reloadTemplates };
}
