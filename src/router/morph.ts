/**
 * Card to page (DESIGN.md §6.3, "Tối đa"): Material's container transform built with
 * same-document View Transitions. The clicked title is named `event-morph` for the old snapshot;
 * after the route changes, the page's `[data-morph-target]` heading takes the name, so the browser
 * carries one into the other while the rest of the page cross-fades.
 */
import { flushSync } from 'react-dom';

const NAME = 'event-morph';
/** The new page may still be loading its chunk; never hold the old frame longer than this. */
const TARGET_TIMEOUT_MS = 1000;
const POLL_MS = 16;

type TransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> };
};

/** Polls with timers: rendering (and with it requestAnimationFrame) is paused during the update. */
function waitForTarget(): Promise<void> {
  return new Promise((resolve) => {
    const started = performance.now();
    const check = () => {
      if (document.querySelector('[data-morph-target]') !== null || performance.now() - started > TARGET_TIMEOUT_MS) resolve();
      else window.setTimeout(check, POLL_MS);
    };
    check();
  });
}

/** Navigates with the morph at "Tối đa" (and without reduced motion); otherwise navigates at once. */
export function navigateWithMorph(source: HTMLElement, go: () => void): void {
  const doc = document as TransitionDocument;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (root.getAttribute('data-interactivity') !== 'extreme' || reduced || typeof doc.startViewTransition !== 'function') {
    go();
    return;
  }
  source.style.setProperty('view-transition-name', NAME);
  root.classList.add('vt-morph');
  const transition = doc.startViewTransition(async () => {
    source.style.removeProperty('view-transition-name');
    root.classList.add('vt-morph-target');
    flushSync(go);
    await waitForTarget();
  });
  void transition.finished.finally(() => {
    root.classList.remove('vt-morph', 'vt-morph-target');
  });
}
