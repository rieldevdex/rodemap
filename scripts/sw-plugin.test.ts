import { Script } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { serviceWorkerSource } from './sw-plugin';

describe('serviceWorkerSource', () => {
  const source = serviceWorkerSource('abc123', ['/', '/assets/index-x.js']);

  it('versions the cache and lists the precached files', () => {
    expect(source).toContain("const CACHE = 'rodemap-abc123';");
    expect(source).toContain('const PRECACHE = ["/","/assets/index-x.js"];');
  });

  it('never caches the Mochi API and falls back to the shell for navigations', () => {
    expect(source).toContain("url.pathname.startsWith('/api/')");
    expect(source).toContain("caches.match('/')");
  });

  it('is valid JavaScript', () => {
    expect(() => new Script(source)).not.toThrow();
  });
});
