/** Persisted application state: shape, seed and versioned migration. Pure. */
import { SEED_PORTFOLIO, SEED_PROFILE, SEED_REGISTRATIONS, SEED_SUBMISSIONS } from '../data/seed';
import type {
  EventStatus,
  IsoDate,
  NewsPost,
  PortfolioEntry,
  Profile,
  Registration,
  Role,
  SchoolEvent,
  Submission,
  ThemePreference,
} from '../domain/types';

export const STORAGE_KEY = 'rodemap:v1';
export const STATE_VERSION = 1;
export const DEFAULT_CLUB_ID = 'inkstep';

export interface AppState {
  version: 1;
  role: Role;
  /** The club the demo "Câu lạc bộ" role acts for. */
  activeClubId: string;
  profile: Profile | null;
  registrations: Registration[];
  portfolio: PortfolioEntry[];
  /** Events created through Cổng câu lạc bộ, or edited copies of seed events after resubmission. */
  submittedEvents: SchoolEvent[];
  /** Status overrides for any event id (seed or submitted). */
  moderation: Record<string, EventStatus>;
  submissions: Submission[];
  /** Articles published through Soạn bài viết (the seed articles live in src/data/news.ts). */
  newsPosts: NewsPost[];
  theme: ThemePreference;
  /** Overrides "today" for the demo; null follows the real clock. */
  demoToday: IsoDate | null;
  /** Forces Mochi's offline mode (for presentations). */
  mochiForcedOffline: boolean;
}

/** A fresh copy of the illustrative demo state. */
export function createSeedState(): AppState {
  return {
    version: STATE_VERSION,
    role: 'student',
    activeClubId: DEFAULT_CLUB_ID,
    profile: structuredClone(SEED_PROFILE),
    registrations: structuredClone(SEED_REGISTRATIONS),
    portfolio: structuredClone(SEED_PORTFOLIO),
    submittedEvents: [],
    moderation: {},
    submissions: structuredClone(SEED_SUBMISSIONS),
    newsPosts: [],
    theme: 'system',
    demoToday: null,
    mochiForcedOffline: false,
  };
}

const ROLES: readonly string[] = ['student', 'club', 'moderator'];
const THEMES: readonly string[] = ['system', 'light', 'dark'];

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Structural check of a parsed v1 state. Deep content is trusted (it was written by this app). */
export function isAppStateV1(x: unknown): x is AppState {
  if (!isRecord(x)) return false;
  return (
    x.version === 1 &&
    typeof x.role === 'string' &&
    ROLES.includes(x.role) &&
    typeof x.activeClubId === 'string' &&
    (x.profile === null || isRecord(x.profile)) &&
    Array.isArray(x.registrations) &&
    Array.isArray(x.portfolio) &&
    Array.isArray(x.submittedEvents) &&
    isRecord(x.moderation) &&
    Array.isArray(x.submissions) &&
    Array.isArray(x.newsPosts) &&
    typeof x.theme === 'string' &&
    THEMES.includes(x.theme) &&
    (x.demoToday === null || (typeof x.demoToday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.demoToday))) &&
    typeof x.mochiForcedOffline === 'boolean'
  );
}

/**
 * Upgrades any known persisted version to the current one.
 * Returns null for unknown or corrupt data (the caller falls back to the seed).
 */
export function migrate(raw: unknown): AppState | null {
  // v1 states saved before the newsletter existed have no newsPosts yet.
  const upgraded = isRecord(raw) && raw.version === 1 && !('newsPosts' in raw) ? { ...raw, newsPosts: [] } : raw;
  if (isAppStateV1(upgraded)) return upgraded;
  return null;
}
