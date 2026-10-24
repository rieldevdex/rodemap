/** Browser side effects that components may trigger through hooks (never directly). */
import { movementAllowed, type DeviceSignals } from '../domain/interactivity';
import type { AppearanceMode, InteractivityLevel, TextDensity, ThemePreference } from '../domain/types';

/** Applies the theme preference to <html data-theme>. "system" removes the attribute. */
export function applyTheme(theme: ThemePreference, root: HTMLElement = document.documentElement): void {
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

/**
 * Applies the appearance mode, text density and interactivity level to
 * <html data-mode data-density data-interactivity> (DESIGN.md §2.4, §10, §6.3).
 */
export function applyAppearance(
  mode: AppearanceMode,
  density: TextDensity,
  interactivity: InteractivityLevel,
  root: HTMLElement = document.documentElement,
): void {
  root.setAttribute('data-mode', mode);
  root.setAttribute('data-density', density);
  root.setAttribute('data-interactivity', interactivity);
}

const LEVELS: readonly string[] = ['none', 'slight', 'medium', 'extreme'];

/** The level in force on the page (set by applyAppearance and public/theme-init.js). */
export function pageInteractivity(root: HTMLElement = document.documentElement): InteractivityLevel {
  const value = root.getAttribute('data-interactivity') ?? 'medium';
  return (LEVELS.includes(value) ? value : 'medium') as InteractivityLevel;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Movement may run at `min` on this page (level and the device's reduced-motion setting). */
export function pageAllowsMovement(min: InteractivityLevel): boolean {
  return movementAllowed(pageInteractivity(), min, prefersReducedMotion());
}

/** Cores, memory and Data Saver as the browser reports them (adaptive loading, DESIGN.md §6.3). */
export function readDeviceSignals(): DeviceSignals {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return {
    cores: typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 ? nav.hardwareConcurrency : undefined,
    memoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : undefined,
    saveData: nav.connection?.saveData === true,
  };
}

/**
 * A short pulse that confirms an action on phones that support vibration (Android; iOS and
 * desktops ignore it), at "Tối đa" only. Call it inside the click that confirmed the action.
 */
export function hapticConfirm(): void {
  if (pageInteractivity() !== 'extreme' || prefersReducedMotion() || !('vibrate' in navigator)) return;
  navigator.vibrate(18);
}

/** Places the theme ripple's centre on `origin` (in viewport percentages, so it survives resizing). */
export function setRippleOrigin(origin: HTMLElement | null, root: HTMLElement = document.documentElement): void {
  if (!origin) return;
  const rect = origin.getBoundingClientRect();
  root.style.setProperty('--ripple-x', `${String(Math.round(((rect.left + rect.width / 2) / window.innerWidth) * 100))}%`);
  root.style.setProperty('--ripple-y', `${String(Math.round(((rect.top + rect.height / 2) / window.innerHeight) * 100))}%`);
}

/**
 * Runs `change` inside a view transition when the browser supports one and the level allows
 * movement (the theme ripple, DESIGN.md §6.2 #6); otherwise runs it at once.
 */
export function withViewTransition(change: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  if (typeof doc.startViewTransition !== 'function' || !pageAllowsMovement('medium')) {
    change();
    return;
  }
  const root = document.documentElement;
  root.classList.add('vt-ripple');
  const transition = doc.startViewTransition(change);
  void transition.finished.finally(() => {
    root.classList.remove('vt-ripple');
  });
}

/** True when the effective theme is dark (explicit choice or system setting). */
export function isDarkTheme(theme: ThemePreference): boolean {
  if (theme !== 'system') return theme === 'dark';
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Triggers a file download of `content`. */
export function downloadFile(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens the browser print dialog (portfolio A4 export). */
export function printPage(): void {
  window.print();
}

const MOCHI_ID_KEY = 'rodemap:mochi-id';
const MOCHI_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
let mochiIdInMemory: string | null = null;

function randomHex(bytes: number): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * A random id kept in this browser so Mochi's weekly question quota counts per browser.
 * It is not linked to the student; when storage is blocked it lasts until the page is closed.
 */
export function mochiBrowserId(): string {
  try {
    const saved = window.localStorage.getItem(MOCHI_ID_KEY);
    if (saved !== null && MOCHI_ID_RE.test(saved)) return saved;
  } catch {
    /* storage blocked: keep the id in memory */
  }
  mochiIdInMemory ??= randomHex(16);
  try {
    window.localStorage.setItem(MOCHI_ID_KEY, mochiIdInMemory);
  } catch {
    /* storage blocked */
  }
  return mochiIdInMemory;
}

/** A random id for new records (submissions, portfolio entries). */
export function newId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

/**
 * Registers the build-time service worker (production builds only) so Rodemap keeps working
 * without a network, e.g. on Voting Day.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Unsupported or blocked: the app works online as usual. */
    });
  });
}

/** Copies text to the clipboard; resolves false when the browser refuses (no permission, insecure page). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
