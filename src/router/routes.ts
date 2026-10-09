/** Route table and pure path helpers. No React, no DOM: unit tested in router.test.ts. */

export type RouteName =
  | 'home'
  | 'onboarding'
  | 'dashboard'
  | 'explore'
  | 'event'
  | 'route'
  | 'calendar'
  | 'portfolio'
  | 'clubs'
  | 'club'
  | 'clubPortal'
  | 'moderation'
  | 'proposal'
  | 'news'
  | 'newsCompose'
  | 'newsArticle'
  | 'notFound';

export interface RouteDef {
  name: RouteName;
  /** Path pattern; `:param` segments match one non-empty URL segment. */
  path: string;
  /** Vietnamese page title; the document title is "<title> · Rodemap". */
  title: string;
}

export const APP_NAME = 'Rodemap';

export const ROUTES: RouteDef[] = [
  { name: 'home', path: '/', title: 'Trang chủ' },
  { name: 'onboarding', path: '/thiet-lap', title: 'Thiết lập hồ sơ' },
  { name: 'dashboard', path: '/tong-quan', title: 'Tổng quan' },
  { name: 'explore', path: '/kham-pha', title: 'Khám phá sự kiện' },
  { name: 'event', path: '/su-kien/:slug', title: 'Chi tiết sự kiện' },
  { name: 'route', path: '/lo-trinh', title: 'Lộ trình' },
  { name: 'calendar', path: '/lich', title: 'Lịch của tôi' },
  { name: 'portfolio', path: '/ho-so', title: 'Hồ sơ năng lực' },
  { name: 'clubs', path: '/cau-lac-bo', title: 'Câu lạc bộ' },
  { name: 'club', path: '/cau-lac-bo/:slug', title: 'Câu lạc bộ' },
  { name: 'clubPortal', path: '/cong-cau-lac-bo', title: 'Cổng câu lạc bộ' },
  { name: 'moderation', path: '/kiem-duyet', title: 'Kiểm duyệt' },
  { name: 'proposal', path: '/de-an', title: 'Đề án' },
  { name: 'news', path: '/ban-tin', title: 'Bản tin Hội đồng Học sinh' },
  // Before newsArticle, so /ban-tin/soan-bai is never read as an article slug.
  { name: 'newsCompose', path: '/ban-tin/soan-bai', title: 'Soạn bài viết' },
  { name: 'newsArticle', path: '/ban-tin/:slug', title: 'Bản tin Hội đồng Học sinh' },
  { name: 'notFound', path: '/khong-tim-thay', title: 'Không tìm thấy trang' },
];

export interface RouteMatch {
  name: RouteName;
  params: Record<string, string>;
}

const ROUTE_BY_NAME = new Map<RouteName, RouteDef>(ROUTES.map((r) => [r.name, r]));

function splitPath(path: string): string[] {
  return path.split('/').filter((s) => s !== '');
}

function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** Removes the query string and hash, and normalises an empty path to "/". */
export function stripPath(href: string): string {
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  return path === '' ? '/' : path;
}

/** "/cau-lac-bo/" → "/cau-lac-bo"; "" → "/". Repeated slashes collapse. */
export function normalizePath(pathname: string): string {
  const segments = splitPath(stripPath(pathname));
  return `/${segments.join('/')}`;
}

/** Params when `segments` match `pattern` (`:name` matches one non-empty segment), else null. */
function matchPattern(pattern: string[], segments: string[]): Record<string, string> | null {
  if (pattern.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (const [i, part] of pattern.entries()) {
    const segment = segments[i] ?? '';
    if (part.startsWith(':')) {
      const value = safeDecode(segment);
      if (value === null || value === '') return null;
      params[part.slice(1)] = value;
    } else if (part !== segment) {
      return null;
    }
  }
  return params;
}

/** Resolves a pathname (query and hash ignored, trailing slash tolerated) to a route. */
export function matchRoute(pathname: string): RouteMatch {
  const segments = splitPath(stripPath(pathname));
  for (const route of ROUTES) {
    if (route.name === 'notFound') continue;
    const params = matchPattern(splitPath(route.path), segments);
    if (params) return { name: route.name, params };
  }
  return { name: 'notFound', params: {} };
}

/** Builds the URL path of a route. Throws when a required parameter is missing or empty. */
export function pathFor(name: RouteName, params: Record<string, string> = {}): string {
  const route = ROUTE_BY_NAME.get(name);
  if (!route) throw new Error(`Unknown route: ${name}`);
  const parts = splitPath(route.path).map((part) => {
    if (!part.startsWith(':')) return part;
    const key = part.slice(1);
    const value = params[key];
    if (value === undefined || value === '') throw new Error(`Missing route parameter "${key}" for ${name}`);
    return encodeURIComponent(value);
  });
  return `/${parts.join('/')}`;
}

/** Pages open before the student has set up a profile: Trang chủ, Thiết lập hồ sơ, Đề án and 404. */
export const PUBLIC_ROUTES: readonly RouteName[] = ['home', 'onboarding', 'proposal', 'notFound'];

/** Every other page asks for the student profile first (Rodemap sends the visitor to /thiet-lap). */
export function requiresProfile(name: RouteName): boolean {
  return !PUBLIC_ROUTES.includes(name);
}

/** Query parameter of /thiet-lap holding the page to open once the profile is set up. */
export const RETURN_PARAM = 'tiep-theo';

/** /thiet-lap?tiep-theo=… for a page the visitor tried to open (path, query and hash kept). */
export function setupPathFor(returnTo: string): string {
  return `${pathFor('onboarding')}?${RETURN_PARAM}=${encodeURIComponent(returnTo)}`;
}

/**
 * The page to open after profile setup: only an in-app path ("/…", never "//…" or a full URL)
 * of a page that needs the profile. Anything else is ignored (null).
 */
export function returnPathAfterSetup(value: string | null): string | null {
  if (value === null || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  return requiresProfile(matchRoute(value).name) ? value : null;
}

export function routeTitle(name: RouteName): string {
  return ROUTE_BY_NAME.get(name)?.title ?? APP_NAME;
}

/** "Tổng quan · Rodemap". */
export function documentTitle(title: string): string {
  return `${title} · ${APP_NAME}`;
}
