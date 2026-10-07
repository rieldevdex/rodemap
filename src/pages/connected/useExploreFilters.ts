/**
 * "Khám phá sự kiện" filter state, kept in the URL query string (see exploreQuery.ts) so a
 * filtered list can be shared, bookmarked and restored. Every write replaces the history
 * entry. The search text updates the results at once and reaches the URL after a short
 * pause, so typing does not flood the history API.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CLUBS } from '../../data/clubs';
import { pathFor, useNavigate, useRoute } from '../../router';
import {
  canonicalQuery,
  DEFAULT_EXPLORE_FILTER,
  explorePath,
  parseExploreQuery,
  type ExploreFilterState,
  type ExploreView,
} from './exploreQuery';

/** Club ids in display order (unknown ids in the URL are dropped). */
export const EXPLORE_CLUB_IDS: readonly string[] = CLUBS.map((c) => c.id);

const QUERY_SYNC_DELAY_MS = 250;

export interface ExploreFilters {
  /** The applied filter; `query` is the live text of the search field. */
  filter: ExploreFilterState;
  view: ExploreView;
  /** The URL asks for the search field to be focused (`?tim=1`). */
  focusSearch: boolean;
  setQuery: (query: string) => void;
  /** Applies a whole filter (rail change, sheet "Áp dụng", chip removal). */
  apply: (next: ExploreFilterState) => void;
  /** Clears every filter, including the search text. Keeps the view. */
  reset: () => void;
  setView: (view: ExploreView) => void;
  /** Drops `tim=1` from the URL once the field has focus. */
  clearFocusRequest: () => void;
}

export function useExploreFilters(): ExploreFilters {
  const route = useRoute();
  const navigate = useNavigate();
  const base = pathFor('explore');
  const searchKey = route.search.toString();
  const parsed = useMemo(() => parseExploreQuery(new URLSearchParams(searchKey), EXPLORE_CLUB_IDS), [searchKey]);
  const urlQuery = parsed.filter.query;

  // `draft` is the field's text; `synced` is the URL value it was last aligned with. A URL
  // change we did not write (back/forward, a shared link) replaces the draft.
  const [draft, setDraft] = useState(urlQuery);
  const [synced, setSynced] = useState(urlQuery);
  if (urlQuery !== synced) {
    setSynced(urlQuery);
    setDraft(urlQuery);
  }

  const write = useCallback(
    (next: ExploreFilterState, view: ExploreView) => {
      setDraft(next.query);
      setSynced(canonicalQuery(next.query));
      navigate(explorePath(base, next, view), { replace: true });
    },
    [navigate, base],
  );

  useEffect(() => {
    if (canonicalQuery(draft) === urlQuery) return undefined;
    const timer = window.setTimeout(() => {
      write({ ...parsed.filter, query: draft }, parsed.view);
    }, QUERY_SYNC_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [draft, urlQuery, parsed, write]);

  const filter = useMemo<ExploreFilterState>(() => ({ ...parsed.filter, query: draft }), [parsed, draft]);

  const apply = useCallback(
    (next: ExploreFilterState) => {
      write(next, parsed.view);
    },
    [write, parsed.view],
  );

  const reset = useCallback(() => {
    write(DEFAULT_EXPLORE_FILTER, parsed.view);
  }, [write, parsed.view]);

  const setView = useCallback(
    (view: ExploreView) => {
      write(filter, view);
    },
    [write, filter],
  );

  const clearFocusRequest = useCallback(() => {
    if (!parsed.focusSearch) return;
    navigate(explorePath(base, parsed.filter, parsed.view), { replace: true });
  }, [navigate, base, parsed]);

  return {
    filter,
    view: parsed.view,
    focusSearch: parsed.focusSearch,
    setQuery: setDraft,
    apply,
    reset,
    setView,
    clearFocusRequest,
  };
}
