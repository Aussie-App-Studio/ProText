import { SEL } from './selectors';

/**
 * Sends a message programmatically (delayed send, scheduled messages, campaigns, auto-reply)
 * without requiring the privileged 'debugger' permission.
 * Uses a complete native DOM event sequence (Pointer, Mouse, Click, and Enter keydown).
 */
export async function trustedClick(el: HTMLElement): Promise<boolean> {
  const ed = Array.from(document.querySelectorAll<HTMLElement>(SEL.editable)).find(
    e => e.offsetParent !== null
  );

  // 1. Dispatch full Pointer & Mouse event sequence on the button
  try {
    const mouseOpts: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      view: window
    };
    el.dispatchEvent(new PointerEvent('pointerdown', mouseOpts));
    el.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
    el.dispatchEvent(new PointerEvent('pointerup', mouseOpts));
    el.dispatchEvent(new MouseEvent('mouseup', mouseOpts));
    el.click();
  } catch {}

  // 2. Dispatch custom Angular events to host components
  try {
    const sendBtnHost = document.querySelector('mws-message-send-button, mw-message-send-button');
    const compose = document.querySelector('mws-message-compose');
    sendBtnHost?.dispatchEvent(new CustomEvent('sendClicked', { bubbles: true }));
    compose?.dispatchEvent(new CustomEvent('sendMessage', { bubbles: true }));
  } catch {}

  // Check if sent
  if (!ed || !(ed.textContent || '').trim()) {
    return true;
  }

  // 2. Dispatch Enter key event on the composer
  try {
    const enterEv = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    ed.dispatchEvent(enterEv);
  } catch {}

  // Short delay to let Angular process the event queue
  await new Promise(r => setTimeout(r, 60));

  return !ed || !(ed.textContent || '').trim();
}
