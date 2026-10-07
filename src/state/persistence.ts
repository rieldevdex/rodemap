/** localStorage persistence. Every access is wrapped: storage may be missing, full or blocked. */
import { createSeedState, migrate, STORAGE_KEY, type AppState } from './schema';

/** The browser's localStorage, or null when it is unavailable (private mode, blocked, SSR). */
export function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadState(storage: Storage | null): AppState {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    return migrate(JSON.parse(raw)) ?? createSeedState();
  } catch {
    return createSeedState();
  }
}

export function saveState(storage: Storage | null, state: AppState): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded or storage blocked: the demo keeps working in memory */
  }
}
