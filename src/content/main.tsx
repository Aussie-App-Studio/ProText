import { createRoot } from 'react-dom/client';
import { App } from './App';
import css from './styles.css?inline';

// Mount React inside a shadow root so Tailwind never leaks into (or is overridden by) Google's styles.
function mount() {
  document.getElementById('messages-plus-root')?.remove();
  const host = document.createElement('div');
  host.id = 'messages-plus-root';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const stopKeyLeak = (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Escape') return;
    const t = ke.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
      ke.stopPropagation();
    }
  };
  shadow.addEventListener('keydown', stopKeyLeak);
  shadow.addEventListener('keypress', stopKeyLeak);
  shadow.addEventListener('keyup', stopKeyLeak);

  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);
  const el = document.createElement('div');
  shadow.appendChild(el);
  createRoot(el).render(<App />);
}

mount();
