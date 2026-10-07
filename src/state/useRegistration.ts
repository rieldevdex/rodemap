/** Registration facts and actions for one event, for pages and connected components. */
import { useCallback } from 'react';
import { wouldExceedBudget } from '../domain/budget';
import { findConflicts } from '../domain/conflicts';
import { toIsoDateTime } from '../domain/dates';
import {
  deadlineDaysLeft,
  isEligible,
  isPast,
  registrationState,
  seatsLeft,
  type RegistrationState,
} from '../domain/events';
import type { Club, SchoolEvent } from '../domain/types';
import { DEFAULT_WEEKLY_HOUR_BUDGET } from '../domain/budget';
import { useAppState, useDispatch, useNow } from './hooks';
import { selectClub, selectEventById, selectUpcomingMine } from './selectors';

export interface RegistrationInfo {
  event: SchoolEvent;
  club: Club | undefined;
  state: RegistrationState;
  seatsLeft: number;
  deadlineDays: number;
  /** My upcoming events that overlap this one. */
  conflicts: SchoolEvent[];
  /** Registering would exceed the weekly hour budget. */
  overBudget: boolean;
  eligible: boolean;
  canRegister: boolean;
  canUnregister: boolean;
}

export function registrationInfo(
  event: SchoolEvent,
  ctx: { club: Club | undefined; plan: SchoolEvent[]; regs: Parameters<typeof seatsLeft>[1]; grade: Parameters<typeof isEligible>[1]; budget: number; now: number },
): RegistrationInfo {
  const state = registrationState(event, ctx.regs, ctx.now);
  const others = ctx.plan.filter((e) => e.id !== event.id);
  const conflictIds = new Set(findConflicts(event, others).flatMap((c) => [c.a, c.b]));
  const eligible = isEligible(event, ctx.grade);
  return {
    event,
    club: ctx.club,
    state,
    seatsLeft: seatsLeft(event, ctx.regs),
    deadlineDays: deadlineDaysLeft(event, ctx.now),
    conflicts: others.filter((e) => conflictIds.has(e.id)),
    overBudget: state === 'open' && wouldExceedBudget(event, others, ctx.budget),
    eligible,
    canRegister: state === 'open' && eligible,
    canUnregister: state === 'registered' && !isPast(event, ctx.now),
  };
}

/** Registration facts and the two confirmed actions for `eventId` (undefined when unknown). */
export function useRegistration(eventId: string): {
  info: RegistrationInfo | undefined;
  register: () => void;
  unregister: () => void;
} {
  const state = useAppState();
  const dispatch = useDispatch();
  const now = useNow();
  const event = selectEventById(state, eventId);
  const info =
    event === undefined
      ? undefined
      : registrationInfo(event, {
          club: selectClub(state, event.clubId),
          plan: selectUpcomingMine(state, now),
          regs: state.registrations,
          grade: state.profile?.grade ?? null,
          budget: state.profile?.weeklyHourBudget ?? DEFAULT_WEEKLY_HOUR_BUDGET,
          now,
        });
  const register = useCallback(() => {
    dispatch({ type: 'registration/register', eventId, at: toIsoDateTime(now) });
  }, [dispatch, eventId, now]);
  const unregister = useCallback(() => {
    dispatch({ type: 'registration/unregister', eventId });
  }, [dispatch, eventId]);
  return { info, register, unregister };
}
