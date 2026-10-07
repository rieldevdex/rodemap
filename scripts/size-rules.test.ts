import { gunzipSync, gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  FIRST_LOAD_BUDGET_BYTES,
  distRelative,
  firstLoadScripts,
  formatKb,
  formatSizeTable,
  gzipSize,
  sumRows,
} from './lib/size-rules';

const BUILT_INDEX = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <script src="/theme-init.js"></script>
    <script type="module" crossorigin src="/assets/index-B1x2.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/react-C3d4.js">
    <link rel="modulepreload" href="./assets/router-D5e6.js?v=1">
    <link rel="stylesheet" crossorigin href="/assets/index-E7f8.css">
    <link rel="preload" as="font" href="/assets/lexend.woff2">
    <!-- <link rel="modulepreload" href="/assets/commented.js"> -->
    <link rel="modulepreload" href="https://cdn.example.com/x.js">
    <link rel="modulepreload" href="/assets/react-C3d4.js">
  </head>
  <body><div id="root"></div></body>
</html>`;

describe('firstLoadScripts', () => {
  it('collects the module entry then every modulepreload, deduplicated', () => {
    expect(firstLoadScripts(BUILT_INDEX)).toEqual(['/assets/index-B1x2.js', '/assets/react-C3d4.js', './assets/router-D5e6.js']);
  });

  it('ignores classic scripts, stylesheets, other preloads, comments and other origins', () => {
    const refs = firstLoadScripts(BUILT_INDEX);
    expect(refs).not.toContain('/theme-init.js');
    expect(refs.some((r) => r.endsWith('.css') || r.endsWith('.woff2'))).toBe(false);
    expect(refs).not.toContain('/assets/commented.js');
    expect(refs.some((r) => r.startsWith('http'))).toBe(false);
  });

  it('accepts attributes in any order and quoting style', () => {
    expect(firstLoadScripts("<script src='/a.js' type=module></script><link href=/b.js rel='modulepreload'>")).toEqual(['/a.js', '/b.js']);
  });

  it('returns an empty list when there is no module entry', () => {
    expect(firstLoadScripts('<html><body><script src="/x.js"></script></body></html>')).toEqual([]);
  });
});

describe('distRelative', () => {
  it('strips leading ./ and / from asset references', () => {
    expect(distRelative('/assets/a.js')).toBe('assets/a.js');
    expect(distRelative('./assets/a.js')).toBe('assets/a.js');
    expect(distRelative('assets/a.js')).toBe('assets/a.js');
  });
});

describe('sizes', () => {
  it('uses a 200 KB budget', () => {
    expect(FIRST_LOAD_BUDGET_BYTES).toBe(204800);
  });

  it('measures gzip at level 9', () => {
    const content = 'export const x = 1;\n'.repeat(500);
    expect(gzipSize(content)).toBe(gzipSync(content, { level: 9 }).length);
    expect(gzipSize(content)).toBeLessThan(content.length);
    expect(gunzipSync(gzipSync(content, { level: 9 })).toString()).toBe(content);
  });

  it('sums rows and formats kilobytes', () => {
    expect(sumRows([{ file: 'a', raw: 10, gzip: 4 }, { file: 'b', raw: 5, gzip: 2 }])).toEqual({ raw: 15, gzip: 6 });
    expect(sumRows([])).toEqual({ raw: 0, gzip: 0 });
    expect(formatKb(204800)).toBe('200.0 KB');
    expect(formatKb(1536)).toBe('1.5 KB');
  });

  it('renders an aligned table with a total row', () => {
    const table = formatSizeTable([
      { file: 'dist/assets/index.js', raw: 102400, gzip: 30720 },
      { file: 'dist/assets/react.js', raw: 2048, gzip: 1024 },
    ]);
    expect(table.split('\n')).toEqual([
      'File                       Raw     Gzip',
      '--------------------  --------  -------',
      'dist/assets/index.js  100.0 KB  30.0 KB',
      'dist/assets/react.js    2.0 KB   1.0 KB',
      '--------------------  --------  -------',
      'Total                 102.0 KB  31.0 KB',
    ]);
  });
});
