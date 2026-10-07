/**
 * Tiny History-API router. One context holds the current location; pages read it
 * through useRoute() and change it through useNavigate() or <Link>.
 *
 * On every navigation to a new path: scroll to top (or to the #hash target), set
 * document.title "<route title> · Rodemap" and move focus to #main-heading once the
 * (lazy) page has rendered it. Query-only changes (filters) keep scroll and focus.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { documentTitle, matchRoute, normalizePath, routeTitle, type RouteName } from './routes';

/** How the current location was reached. */
type NavKind = 'initial' | 'push' | 'pop';

interface Location {
  pathname: string;
  search: string;
  hash: string;
  kind: NavKind;
  /** Increments on every location change so effects can react to repeated paths. */
  seq: number;
}

interface PendingNav {
  seq: number;
  kind: NavKind;
  hash: string;
  focus: boolean;
}

export interface RouteState {
  name: RouteName;
  params: Record<string, string>;
  search: URLSearchParams;
  /** Normalised pathname, e.g. "/su-kien/abc". */
  pathname: string;
  hash: string;
}

export interface NavigateOptions {
  replace?: boolean;
}

export type Navigate = (to: string, opts?: NavigateOptions) => void;

interface RouterContextValue {
  route: RouteState;
  navigate: Navigate;
}

const RouterContext = createContext<RouterContextValue | null>(null);

/** Element that receives focus after a navigation (pages give their h1 this id and tabIndex={-1}). */
export const MAIN_HEADING_ID = 'main-heading';
const FOCUS_WAIT_MS = 10_000;

function readLocation(kind: NavKind, seq: number): Location {
  const { pathname, search, hash } = window.location;
  return { pathname, search, hash, kind, seq };
}

/** Focuses #main-heading now, or as soon as a lazily loaded page renders it. Returns a cleanup. */
function focusMainHeadingWhenReady(): () => void {
  const tryFocus = (): boolean => {
    const el = document.getElementById(MAIN_HEADING_ID);
    if (!el) return false;
    el.focus({ preventScroll: true });
    return true;
  };
  if (tryFocus()) return () => undefined;
  const observer = new MutationObserver(() => {
    if (tryFocus()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const timer = window.setTimeout(() => {
    observer.disconnect();
  }, FOCUS_WAIT_MS);
  return () => {
    observer.disconnect();
    window.clearTimeout(timer);
  };
}

function scrollToHashOrTop(hash: string): void {
  const id = hash.startsWith('#') ? safeDecodeHash(hash.slice(1)) : '';
  const target = id === '' ? null : document.getElementById(id);
  if (target) target.scrollIntoView({ block: 'start' });
  else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

function safeDecodeHash(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location>(() => readLocation('initial', 0));

  useEffect(() => {
    const onPop = () => {
      setLocation((prev) => readLocation('pop', prev.seq + 1));
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  const navigate = useCallback<Navigate>((to, opts) => {
    const url = new URL(to, window.location.href);
    if (url.origin !== window.location.origin) {
      window.location.assign(url.href);
      return;
    }
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (opts?.replace === true || next === current) window.history.replaceState(null, '', next);
    else window.history.pushState(null, '', next);
    setLocation((prev) => readLocation('push', prev.seq + 1));
  }, []);

  const pathname = normalizePath(location.pathname);
  const match = useMemo(() => matchRoute(pathname), [pathname]);

  // Title first (layout effect), so a page's own useDocumentTitle (passive effect) can refine it.
  useLayoutEffect(() => {
    document.title = documentTitle(routeTitle(match.name));
  }, [match.name, pathname]);

  // Scroll and focus when the path changes; query-only updates (filters) keep the reader in
  // place, and a pushed #hash on the same page scrolls to its target without moving focus.
  // Derived during render from the previous location (no setState inside effects).
  const [seen, setSeen] = useState({ seq: location.seq, pathname });
  const [pending, setPending] = useState<PendingNav | null>(null);
  if (seen.seq !== location.seq) {
    setSeen({ seq: location.seq, pathname });
    if (seen.pathname !== pathname) {
      setPending({ seq: location.seq, kind: location.kind, hash: location.hash, focus: true });
    } else if (location.kind === 'push' && location.hash !== '') {
      setPending({ seq: location.seq, kind: location.kind, hash: location.hash, focus: false });
    }
  }

  useEffect(() => {
    if (pending === null) return undefined;
    // Back/forward: the browser restores the scroll position itself.
    if (pending.kind === 'push') scrollToHashOrTop(pending.hash);
    return pending.focus ? focusMainHeadingWhenReady() : undefined;
  }, [pending]);

  const value = useMemo<RouterContextValue>(
    () => ({
      route: {
        name: match.name,
        params: match.params,
        search: new URLSearchParams(location.search),
        pathname,
        hash: location.hash,
      },
      navigate,
    }),
    [match, location.search, location.hash, pathname, navigate],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function useRouterContext(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (ctx === null) throw new Error('Router hooks must be used inside <RouterProvider>');
  return ctx;
}

/** The current route: name, decoded params and query string. */
export function useRoute(): RouteState {
  return useRouterContext().route;
}

/** Navigates within the app (pushState, or replaceState with { replace: true }). */
export function useNavigate(): Navigate {
  return useRouterContext().navigate;
}

/**
 * Refines the document title for the current page, e.g. an event or club name:
 * "<title> · Rodemap". Pass null to keep the route title.
 */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    if (title !== null && title !== '') document.title = documentTitle(title);
  }, [title]);
}
