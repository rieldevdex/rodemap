import { describe, expect, it } from 'vitest';
import { isExternalHref } from './Link';
import {
  APP_NAME,
  ROUTES,
  documentTitle,
  matchRoute,
  normalizePath,
  pathFor,
  routeTitle,
  stripPath,
  type RouteName,
} from './routes';

describe('ROUTES', () => {
  it('lists every screen once with a Vietnamese title', () => {
    const names = ROUTES.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(17);
    for (const r of ROUTES) expect(r.title.length).toBeGreaterThan(0);
  });

  it('uses the contract paths', () => {
    const paths = Object.fromEntries(ROUTES.map((r) => [r.name, r.path]));
    expect(paths).toMatchObject({
      home: '/',
      onboarding: '/thiet-lap',
      dashboard: '/tong-quan',
      explore: '/kham-pha',
      event: '/su-kien/:slug',
      route: '/lo-trinh',
      calendar: '/lich',
      portfolio: '/ho-so',
      clubs: '/cau-lac-bo',
      club: '/cau-lac-bo/:slug',
      clubPortal: '/cong-cau-lac-bo',
      moderation: '/kiem-duyet',
      proposal: '/de-an',
      news: '/ban-tin',
      newsCompose: '/ban-tin/soan-bai',
      newsArticle: '/ban-tin/:slug',
    });
  });
});

describe('matchRoute', () => {
  it('matches static routes', () => {
    expect(matchRoute('/')).toEqual({ name: 'home', params: {} });
    expect(matchRoute('/tong-quan')).toEqual({ name: 'dashboard', params: {} });
    expect(matchRoute('/kham-pha')).toEqual({ name: 'explore', params: {} });
    expect(matchRoute('/lo-trinh')).toEqual({ name: 'route', params: {} });
    expect(matchRoute('/lich')).toEqual({ name: 'calendar', params: {} });
    expect(matchRoute('/ho-so')).toEqual({ name: 'portfolio', params: {} });
    expect(matchRoute('/cong-cau-lac-bo')).toEqual({ name: 'clubPortal', params: {} });
    expect(matchRoute('/kiem-duyet')).toEqual({ name: 'moderation', params: {} });
    expect(matchRoute('/de-an')).toEqual({ name: 'proposal', params: {} });
    expect(matchRoute('/thiet-lap')).toEqual({ name: 'onboarding', params: {} });
  });

  it('extracts and decodes params', () => {
    expect(matchRoute('/su-kien/giai-tranh-bien-2026')).toEqual({ name: 'event', params: { slug: 'giai-tranh-bien-2026' } });
    expect(matchRoute('/cau-lac-bo/inkstep')).toEqual({ name: 'club', params: { slug: 'inkstep' } });
    expect(matchRoute('/su-kien/a%20b')).toEqual({ name: 'event', params: { slug: 'a b' } });
  });

  it('prefers the static route over the parameterised one', () => {
    expect(matchRoute('/cau-lac-bo')).toEqual({ name: 'clubs', params: {} });
    expect(matchRoute('/ban-tin/soan-bai')).toEqual({ name: 'newsCompose', params: {} });
    expect(matchRoute('/ban-tin/tong-ket-le-khai-giang')).toEqual({ name: 'newsArticle', params: { slug: 'tong-ket-le-khai-giang' } });
  });

  it('tolerates trailing and repeated slashes, query strings and hashes', () => {
    expect(matchRoute('/tong-quan/')).toEqual({ name: 'dashboard', params: {} });
    expect(matchRoute('//kham-pha//')).toEqual({ name: 'explore', params: {} });
    expect(matchRoute('/kham-pha?q=tranh&linh-vuc=HT')).toEqual({ name: 'explore', params: {} });
    expect(matchRoute('/de-an#ke-hoach')).toEqual({ name: 'proposal', params: {} });
    expect(matchRoute('')).toEqual({ name: 'home', params: {} });
  });

  it('falls back to notFound', () => {
    expect(matchRoute('/khong-ton-tai')).toEqual({ name: 'notFound', params: {} });
    expect(matchRoute('/su-kien')).toEqual({ name: 'notFound', params: {} });
    expect(matchRoute('/su-kien/a/b')).toEqual({ name: 'notFound', params: {} });
    expect(matchRoute('/Tong-Quan')).toEqual({ name: 'notFound', params: {} });
    expect(matchRoute('/khong-tim-thay')).toEqual({ name: 'notFound', params: {} });
  });

  it('treats malformed percent-encoding as not found', () => {
    expect(matchRoute('/su-kien/%E0%A4%A')).toEqual({ name: 'notFound', params: {} });
  });
});

describe('pathFor', () => {
  it('builds static paths', () => {
    expect(pathFor('home')).toBe('/');
    expect(pathFor('dashboard')).toBe('/tong-quan');
    expect(pathFor('proposal')).toBe('/de-an');
    expect(pathFor('notFound')).toBe('/khong-tim-thay');
  });

  it('fills and encodes params', () => {
    expect(pathFor('event', { slug: 'ngay-hoi-cau-lac-bo' })).toBe('/su-kien/ngay-hoi-cau-lac-bo');
    expect(pathFor('club', { slug: 'inkstep' })).toBe('/cau-lac-bo/inkstep');
    expect(pathFor('event', { slug: 'a b/c' })).toBe('/su-kien/a%20b%2Fc');
  });

  it('round-trips with matchRoute for every route', () => {
    for (const r of ROUTES) {
      const params = r.path.includes(':slug') ? { slug: 'mau-thu' } : {};
      const path = pathFor(r.name, params);
      expect(matchRoute(path)).toEqual({ name: r.name, params });
    }
  });

  it('throws on missing params and unknown routes', () => {
    expect(() => pathFor('event')).toThrow(/slug/);
    expect(() => pathFor('club', { slug: '' })).toThrow(/slug/);
    expect(() => pathFor('nope' as RouteName)).toThrow(/Unknown route/);
  });
});

describe('titles and path helpers', () => {
  it('formats the document title with the product name', () => {
    expect(APP_NAME).toBe('Rodemap');
    expect(documentTitle(routeTitle('dashboard'))).toBe('Tổng quan · Rodemap');
    expect(documentTitle(routeTitle('notFound'))).toBe('Không tìm thấy trang · Rodemap');
    expect(routeTitle('nope' as RouteName)).toBe('Rodemap');
  });

  it('normalises paths', () => {
    expect(stripPath('/a?b#c')).toBe('/a');
    expect(stripPath('?q=1')).toBe('/');
    expect(normalizePath('/cau-lac-bo/')).toBe('/cau-lac-bo');
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('/kham-pha?q=1')).toBe('/kham-pha');
  });

  it('detects external hrefs', () => {
    expect(isExternalHref('https://calendar.google.com')).toBe(true);
    expect(isExternalHref('mailto:clb@example.org')).toBe(true);
    expect(isExternalHref('//cdn.example.org/x')).toBe(true);
    expect(isExternalHref('/kham-pha')).toBe(false);
    expect(isExternalHref('#muc-1')).toBe(false);
  });
});
