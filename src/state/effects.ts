/** Browser side effects that components may trigger through hooks (never directly). */
import type { AppearanceMode, TextDensity, ThemePreference } from '../domain/types';

/** Applies the theme preference to <html data-theme>. "system" removes the attribute. */
export function applyTheme(theme: ThemePreference, root: HTMLElement = document.documentElement): void {
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

/** Applies the appearance mode and text density to <html data-mode data-density> (DESIGN.md §2.4, §10). */
export function applyAppearance(mode: AppearanceMode, density: TextDensity, root: HTMLElement = document.documentElement): void {
  root.setAttribute('data-mode', mode);
  root.setAttribute('data-density', density);
}

/** Places the theme ripple's centre on `origin` (in viewport percentages, so it survives resizing). */
export function setRippleOrigin(origin: HTMLElement | null, root: HTMLElement = document.documentElement): void {
  if (!origin) return;
  const rect = origin.getBoundingClientRect();
  root.style.setProperty('--ripple-x', `${String(Math.round(((rect.left + rect.width / 2) / window.innerWidth) * 100))}%`);
  root.style.setProperty('--ripple-y', `${String(Math.round(((rect.top + rect.height / 2) / window.innerHeight) * 100))}%`);
}

/**
 * Runs `change` inside a view transition when the browser supports one and motion is allowed
 * (the theme ripple, DESIGN.md §6.2); otherwise runs it at once.
 */
export function withViewTransition(change: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof doc.startViewTransition !== 'function' || reduced) {
    change();
    return;
  }
  doc.startViewTransition(change);
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
