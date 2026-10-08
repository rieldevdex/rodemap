/** Browser side effects that components may trigger through hooks (never directly). */
import type { ThemePreference } from '../domain/types';

/** Applies the theme preference to <html data-theme>. "system" removes the attribute. */
export function applyTheme(theme: ThemePreference, root: HTMLElement = document.documentElement): void {
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
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
