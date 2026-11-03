/** The sample student state for tests and screenshots (see sample-content.ts). Never imported by the app. */
import { createSeedState, type AppState } from '../state/schema';
import { SEED_PORTFOLIO, SEED_PROFILE, SEED_REGISTRATIONS } from './sample-content';

export * from './sample-content';

/** The sample grade 11 student (profile, registrations, portfolio). */
export function createDemoState(): AppState {
  return {
    ...createSeedState(),
    profile: structuredClone(SEED_PROFILE),
    registrations: structuredClone(SEED_REGISTRATIONS),
    portfolio: structuredClone(SEED_PORTFOLIO),
  };
}
