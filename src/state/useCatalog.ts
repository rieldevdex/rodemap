/** Convenience hook for pages: the store plus the lookups nearly every screen needs. */
import { useMemo } from 'react';
import { CLUBS } from '../data/clubs';
import type { Club, Millis, SchoolEvent } from '../domain/types';
import { useAppState, useDispatch, useNow } from './hooks';
import type { AppState } from './schema';
import { selectAllEvents, selectPublicEvents } from './selectors';

export interface Catalog {
  state: AppState;
  dispatch: ReturnType<typeof useDispatch>;
  now: Millis;
  /** Approved events, sorted by start. */
  publicEvents: SchoolEvent[];
  eventById: (id: string) => SchoolEvent | undefined;
  clubById: (id: string) => Club | undefined;
  /** Short club name ("CLB Tranh biện"), or an empty string. */
  clubName: (id: string) => string;
}

export function useCatalog(): Catalog {
  const state = useAppState();
  const dispatch = useDispatch();
  const now = useNow();
  return useMemo(() => {
    const all = selectAllEvents(state);
    const events = new Map(all.map((e) => [e.id, e]));
    const clubs = new Map(CLUBS.map((c) => [c.id, c]));
    return {
      state,
      dispatch,
      now,
      publicEvents: selectPublicEvents(state),
      eventById: (id) => events.get(id),
      clubById: (id) => clubs.get(id),
      clubName: (id) => clubs.get(id)?.shortName ?? '',
    };
  }, [state, dispatch, now]);
}
