/** Pure selectors over AppState. Milestone 1 core; extended per docs/ARCHITECTURE.md. */
import { toMillis } from '../domain/dates';
import type { Millis } from '../domain/types';
import type { AppState } from './schema';

/** The demo clock: demoToday at 09:00 in Vietnam when set, otherwise the real time. */
export function selectNow(state: AppState, realNow: Millis): Millis {
  if (state.demoToday === null) return realNow;
  return toMillis(`${state.demoToday}T09:00:00+07:00`);
}
