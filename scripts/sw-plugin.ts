/**
 * Build-time service worker for Voting Day: the app shell, every built asset and the public
 * files are precached, so Rodemap opens and runs without a network (Mochi then answers in its
 * offline mode). Navigations are network-first (fresh deploys win) with the cached shell as
 * fallback; other same-origin GETs are cache-first; /api is never cached.
 */
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

/** Files in /public that the shell needs (index.html references them). */
const PUBLIC_FILES = ['/theme-init.js', '/favicon.svg'];

export function serviceWorkerSource(version: string, urls: readonly string[]): string {
  return `/* Rodemap service worker ${version} (generated at build time). */
const CACHE = 'rodemap-${version}';
const PRECACHE = ${JSON.stringify(urls)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('rodemap-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          if (response.ok) caches.open(CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/').then((cached) => cached || Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
`;
}

/** Emits /sw.js listing the shell, every emitted file and the public files. */
export function serviceWorkerPlugin(): Plugin {
  return {
    name: 'rodemap-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const emitted = Object.keys(bundle)
        .filter((file) => !file.endsWith('.map') && file !== 'index.html' && file !== 'sw.js')
        .sort()
        .map((file) => `/${file}`);
      const urls = ['/', ...PUBLIC_FILES, ...emitted];
      const version = createHash('sha256').update(urls.join('\n')).digest('hex').slice(0, 12);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorkerSource(version, urls) });
    },
  };
}
