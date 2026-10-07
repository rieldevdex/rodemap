import { describe, expect, it } from 'vitest';
import { parseCss, prepareCss } from './lib/css-parse';
import { htmlCssView, htmlTextPieces, parseTags } from './lib/html';
import { createLineIndex, excerpt, formatFinding, sortFindings, summaryLine } from './lib/report';
import { extractStrings, TEMPLATE_PLACEHOLDER } from './lib/ts-strings';

describe('prepareCss', () => {
  it('keeps length and newlines while stripping comments and masking strings and url()', () => {
    const src = '/* a\n b */ .x { content: "#fff"; background: url(/img/lexend.png); font-family: "Inter"; }';
    const { clean, masked, fontView } = prepareCss(src);
    for (const view of [clean, masked, fontView]) {
      expect(view).toHaveLength(src.length);
      expect(view.indexOf('\n')).toBe(4);
      expect(view).not.toContain('/* a');
    }
    expect(clean).toContain('"#fff"');
    expect(clean).toContain('url(/img/lexend.png)');
    expect(masked).not.toContain('#fff');
    expect(masked).not.toContain('lexend');
    expect(masked).not.toContain('Inter');
    expect(fontView).toContain('"Inter"');
    expect(fontView).not.toContain('lexend');
  });

  it('does not treat comment markers inside strings as comments', () => {
    const { clean } = prepareCss('.x { content: "/* not a comment */"; }');
    expect(clean).toContain('/* not a comment */');
  });

  it('survives unterminated strings and comments', () => {
    const unterminatedString = '.x { content: "abc\n color: red; }';
    const unterminatedComment = '.x { color: red; /* open';
    expect(prepareCss(unterminatedString).clean).toBe(unterminatedString);
    expect(prepareCss(unterminatedComment).masked).toBe('.x { color: red;' + ' '.repeat(8));
  });
});

describe('parseCss', () => {
  it('collects declarations from rules, nested rules and at-rule blocks', () => {
    const src = '.a { color: var(--x); &:hover { fill: none } @media (min-width: 720px) { padding: 0; } }\n@font-face { font-family: inherit; }';
    const { masked } = prepareCss(src);
    const parsed = parseCss(masked);
    expect(parsed.declarations.map((d) => d.property)).toEqual(['color', 'fill', 'padding', 'font-family']);
    expect(parsed.preludes.map((p) => [p.name, masked.slice(p.start, p.end).trim()])).toEqual([
      ['media', '(min-width: 720px)'],
      ['font-face', ''],
    ]);
  });

  it('reads a bare declaration list (style attribute) and keeps custom property case', () => {
    const parsed = parseCss('COLOR: red; --Lane-Color: blue');
    expect(parsed.declarations.map((d) => d.property)).toEqual(['color', '--Lane-Color']);
  });

  it('tolerates stray braces and statements', () => {
    const parsed = parseCss('} @import "x.css"; .a { color: red; } }');
    expect(parsed.declarations.map((d) => d.property)).toEqual(['color']);
    expect(parsed.preludes.map((p) => p.name)).toEqual(['import']);
  });
});

describe('html helpers', () => {
  it('parses tags and attribute value offsets', () => {
    const html = '<a href="/x" data-k=v hidden>t</a>';
    const [tag] = parseTags(html);
    expect(tag?.name).toBe('a');
    expect(tag?.attributes.map((a) => [a.name, a.value, a.valueStart])).toEqual([
      ['href', '/x', 9],
      ['data-k', 'v', 20],
      ['hidden', '', -1],
    ]);
  });

  it('builds a same-length CSS view with separators', () => {
    const html = '<p style="color:red">a</p><style>b{}</style>';
    const view = htmlCssView(html);
    expect(view).toHaveLength(html.length);
    // `>a</p><style>` (13 characters) becomes blank space between the two regions.
    expect(view.trim()).toBe(`color:red;${' '.repeat(13)}b{};`);
  });

  it('extracts text and attribute values but not scripts, styles or comments', () => {
    const html = '<!doctype html><title>Tiêu đề</title><script>x</script><!-- c --><p lang="vi">Nội dung</p>';
    expect(htmlTextPieces(html).map((p) => [p.kind, p.text])).toEqual([
      ['text', 'Tiêu đề'],
      ['attribute', 'vi'],
      ['text', 'Nội dung'],
    ]);
  });
});

describe('extractStrings', () => {
  it('extracts literals, templates, JSX text and attributes with exact offsets', () => {
    const src = "const a = 'x';\nconst b = `p${q}r`;\nconst c = <p title=\"t\">Văn bản</p>;";
    const pieces = extractStrings(src, 'f.tsx');
    expect(pieces.map((p) => [p.kind, p.text])).toEqual([
      ['string', 'x'],
      ['template', `p${TEMPLATE_PLACEHOLDER}r`],
      ['jsx-attribute', 't'],
      ['jsx-text', 'Văn bản'],
    ]);
    for (const p of pieces) {
      const first = p.offsets[0] ?? -1;
      expect(src.charAt(first)).toBe(p.text.charAt(0));
    }
    expect(pieces[2]?.attribute).toBe('title');
  });

  it('skips module specifiers and whitespace-only JSX text', () => {
    const src = "import a from 'mod';\nexport * from './x';\nconst l = import('lazy');\nconst r = require('req');\nconst j = <div>\n  </div>;";
    expect(extractStrings(src, 'f.tsx')).toEqual([]);
  });

  it('records call, property and comparison contexts', () => {
    const src = "q('#a'); const o = { href: '#b' }; if (x.hash === '#c') {}";
    const pieces = extractStrings(src, 'f.ts');
    expect(pieces.map((p) => [p.callee, p.propertyName, p.comparedWith])).toEqual([
      ['q', undefined, undefined],
      [undefined, 'href', undefined],
      [undefined, undefined, 'hash'],
    ]);
  });

  it('maps escaped literals to the literal start', () => {
    const src = "const a = 'a\\u0062c';";
    const [piece] = extractStrings(src, 'f.ts');
    expect(piece?.text).toBe('abc');
    expect(piece?.offsets.slice(0, 3)).toEqual([11, 11, 11]);
  });
});

describe('report helpers', () => {
  it('converts offsets to 1-based line and column', () => {
    const index = createLineIndex('ab\ncd\r\nef');
    expect(index(0)).toEqual({ line: 1, col: 1 });
    expect(index(4)).toEqual({ line: 2, col: 2 });
    expect(index(7)).toEqual({ line: 3, col: 1 });
    expect(index(99)).toEqual({ line: 3, col: 3 });
  });

  it('formats, sorts and summarises findings', () => {
    const a = { file: 'src/b.css', line: 2, col: 1, rule: 'r', message: 'm' };
    const b = { file: 'src/a.css', line: 9, col: 4, rule: 'r', message: 'm' };
    const c = { file: 'src/a.css', line: 3, col: 7, rule: 'r', message: 'm' };
    expect(formatFinding(a)).toBe('src/b.css:2:1  r  m');
    expect(sortFindings([a, b, c])).toEqual([c, b, a]);
    expect(summaryLine('lint-x', [a, b, c], 10)).toBe('lint-x: 3 findings in 2 of 10 files scanned.');
    expect(summaryLine('lint-x', [], 1)).toBe('lint-x: no findings (1 file scanned).');
  });

  it('builds one-line excerpts with ellipses', () => {
    expect(excerpt('abcdefghij', 4, 6, 2)).toBe('…cdefgh…');
    expect(excerpt('ab\n cd', 0, 2)).toBe('ab cd');
  });
});
