import type { Page } from '@playwright/test';
import { CLUBS } from '../../src/data/clubs';
import { EVENTS } from '../../src/data/events';
import { createSeedState, STORAGE_KEY } from '../../src/state/schema';

/** The fixed demo date used by every browser test, so screens and flows are deterministic. */
export const DEMO_TODAY = '2026-10-07';

const firstApproved = EVENTS.find((e) => e.status === 'approved');
const firstClub = CLUBS[0];
if (!firstApproved || !firstClub) throw new Error('Sample data is missing events or clubs');

export const ROUTES: { name: string; path: string }[] = [
  { name: 'trang-chu', path: '/' },
  { name: 'thiet-lap', path: '/thiet-lap' },
  { name: 'tong-quan', path: '/tong-quan' },
  { name: 'kham-pha', path: '/kham-pha' },
  { name: 'chi-tiet-su-kien', path: `/su-kien/${firstApproved.slug}` },
  { name: 'lo-trinh', path: '/lo-trinh' },
  { name: 'lich', path: '/lich' },
  { name: 'ho-so', path: '/ho-so' },
  { name: 'cau-lac-bo', path: '/cau-lac-bo' },
  { name: 'chi-tiet-cau-lac-bo', path: `/cau-lac-bo/${firstClub.slug}` },
  { name: 'cong-cau-lac-bo', path: '/cong-cau-lac-bo' },
  { name: 'kiem-duyet', path: '/kiem-duyet' },
  { name: 'de-an', path: '/de-an' },
  { name: 'khong-tim-thay', path: '/khong-ton-tai' },
];

/**
 * Seeds localStorage with the illustrative state pinned to DEMO_TODAY, once per
 * browser context (later navigations keep whatever the app saved).
 */
export async function seedDemo(page: Page, overrides: Record<string, unknown> = {}): Promise<void> {
  const state = { ...createSeedState(), demoToday: DEMO_TODAY, ...overrides };
  await page.addInitScript(
    ([key, value]) => {
      try {
        if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, value);
      } catch {
        /* storage blocked: the app falls back to the seed */
      }
    },
    [STORAGE_KEY, JSON.stringify(state)] as const,
  );
}

/** Collects console errors and uncaught page errors for later assertions. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}
