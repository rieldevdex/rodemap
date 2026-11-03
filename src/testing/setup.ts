/**
 * Vitest setup: unit tests run against the official data merged with the test-only sample content
 * (sample-content.ts), so flows that need open events, articles and proposals stay covered.
 * src/data/data.test.ts checks the official data itself through vi.importActual.
 */
import { vi } from 'vitest';
import { SAMPLE_EVENTS, SAMPLE_NEWS, SAMPLE_PERIODS, SAMPLE_PROPOSAL_RESPONSES, SAMPLE_PROPOSALS } from './sample-content';

vi.mock('../data/events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/events')>();
  return { ...actual, EVENTS: [...SAMPLE_EVENTS, ...actual.EVENTS] };
});

vi.mock('../data/news', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/news')>();
  return { ...actual, NEWS: [...SAMPLE_NEWS, ...actual.NEWS].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt)) };
});

vi.mock('../data/proposals', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/proposals')>();
  return {
    ...actual,
    ACTIVITY_PROPOSALS: [...SAMPLE_PROPOSALS, ...actual.ACTIVITY_PROPOSALS],
    PROPOSAL_RESPONSES: { ...SAMPLE_PROPOSAL_RESPONSES, ...actual.PROPOSAL_RESPONSES },
  };
});

vi.mock('../data/calendar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/calendar')>();
  return { ...actual, PERIODS: [...SAMPLE_PERIODS, ...actual.PERIODS] };
});
