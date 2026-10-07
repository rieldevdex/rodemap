import { describe, expect, it } from 'vitest';
import { lintCss, lintHtmlStyles, lintTsTokens } from './lib/token-rules';

const rules = (findings: { rule: string }[]): string[] => findings.map((f) => f.rule);
const css = (body: string): string[] => rules(lintCss(body));
const decl = (declaration: string): string[] => css(`.x {\n  ${declaration};\n}\n`);

describe('lintCss: colors', () => {
  it('flags every hex color form', () => {
    for (const hex of ['#abc', '#abcd', '#a1b2c3', '#a1b2c3d4', '#FFF']) {
      expect(decl(`color: ${hex}`)).toEqual(['raw-color-hex']);
    }
  });

  it('does not treat id selectors or url(#fragment) as colors', () => {
    expect(css('#add, #fade { color: var(--color-ink); }')).toEqual([]);
    expect(decl('fill: url(#bead)')).toEqual([]);
    expect(decl('mask: url("#face")')).toEqual([]);
  });

  it('flags color functions', () => {
    for (const fn of ['rgb(0 0 0)', 'rgba(0,0,0,.5)', 'hsl(10 20% 30%)', 'hsla(1,2%,3%,.4)', 'oklch(0.5 0.1 200)', 'oklab(0.5 0 0)', 'lab(50 0 0)', 'lch(50 0 0)', 'color(display-p3 1 0 0)']) {
      expect(decl(`color: ${fn}`)).toContain('raw-color-function');
    }
  });

  it('allows tokens and color-mix of tokens', () => {
    expect(decl('color: var(--color-ink)')).toEqual([]);
    expect(decl('background: color-mix(in oklch, var(--color-signal) 20%, transparent)')).toEqual([]);
  });

  it('flags named colors in color properties only', () => {
    expect(decl('color: red')).toEqual(['raw-color-name']);
    expect(decl('background-color: White')).toEqual(['raw-color-name']);
    expect(decl('border: var(--rule-hair) solid black')).toEqual(['raw-color-name']);
    expect(decl('border-inline-start-color: navy')).toEqual(['raw-color-name']);
    expect(decl('outline: var(--focus-w) solid tomato')).toEqual(['raw-color-name']);
    expect(decl('fill: white')).toEqual(['raw-color-name']);
    expect(decl('stroke: blue')).toEqual(['raw-color-name']);
    expect(decl('caret-color: green')).toEqual(['raw-color-name']);
    expect(decl('accent-color: purple')).toEqual(['raw-color-name']);
    expect(decl('text-decoration-color: gray')).toEqual(['raw-color-name']);
    expect(decl('--lane-color: red')).toEqual(['raw-color-name']);
    // not a color property / not a color value
    expect(decl('animation-name: tan')).toEqual([]);
    expect(decl('--state: active')).toEqual([]);
  });

  it('allows currentColor, transparent and CSS-wide keywords', () => {
    for (const v of ['currentColor', 'currentcolor', 'transparent', 'inherit', 'initial', 'unset', 'none']) {
      expect(decl(`color: ${v}`)).toEqual([]);
      expect(decl(`fill: ${v}`)).toEqual([]);
    }
  });

  it('does not read color names inside custom property names or function names', () => {
    expect(decl('color: var(--color-red)')).toEqual([]);
    expect(decl('background: var(--tan, var(--color-ground))')).toEqual([]);
    expect(decl('color: var(--x, red)')).toEqual(['raw-color-name']);
  });
});

describe('lintCss: fonts', () => {
  it('requires font-family to be a font token or inherit', () => {
    expect(decl('font-family: var(--font-body)')).toEqual([]);
    expect(decl('font-family: var(--font-mono) !important')).toEqual([]);
    expect(decl('font-family: inherit')).toEqual([]);
    expect(decl('font-family: var(--space-1)')).toEqual(['font-family']);
    expect(decl("font-family: 'Lexend Variable', sans-serif")).toEqual(['font-family', 'font-name', 'font-name']);
  });

  it('flags literal font names in any declaration', () => {
    expect(decl('font: 1em/1.6 Arial')).toEqual(['font-name']);
    expect(decl('--x: "Be  Vietnam Pro"')).toEqual(['font-name']);
    for (const name of ['Bricolage Grotesque', 'JetBrains Mono', 'Inter', 'Helvetica', 'Roboto', 'serif', 'monospace', 'system-ui']) {
      expect(decl(`font: inherit; --f: ${name}`)).toEqual(['font-name']);
    }
  });

  it('does not flag font words inside custom property names, url() or other keywords', () => {
    expect(decl('font: var(--font-serif)')).toEqual([]);
    expect(decl('text-justify: inter-word')).toEqual([]);
    expect(decl('background-image: url("/lexend.svg")')).toEqual([]);
    expect(css(".serif-note { color: var(--color-ink); }")).toEqual([]);
  });

  it('ignores @import preludes', () => {
    expect(css("@import '@fontsource-variable/lexend';\n")).toEqual([]);
  });
});

describe('lintCss: lengths', () => {
  it('flags px and rem in declarations', () => {
    expect(decl('padding: 12px')).toEqual(['raw-length']);
    expect(decl('margin: -0.5rem')).toEqual(['raw-length']);
    expect(decl('inset: .5px')).toEqual(['raw-length']);
    expect(decl('--gap: 4px')).toEqual(['raw-length']);
    expect(decl('inline-size: calc(100% - 2px)')).toEqual(['raw-length']);
  });

  it('allows tokens, other units and unitless numbers', () => {
    expect(decl('padding: var(--space-2) calc(var(--space-2) * 3)')).toEqual([]);
    expect(decl('max-inline-size: 62ch')).toEqual([]);
    expect(decl('letter-spacing: 0.08em')).toEqual([]);
    expect(decl('inline-size: min(var(--card-w), 80vw)')).toEqual([]);
    expect(decl('stroke-dasharray: 2 6')).toEqual([]);
    expect(decl('margin: 0')).toEqual([]);
  });

  it('does not read lengths inside identifiers, strings or comments', () => {
    expect(decl('grid-area: col-12px')).toEqual([]);
    expect(decl('content: "12px"')).toEqual([]);
    expect(css('/* padding: 12px; color: #fff */\n.x { color: var(--color-ink); }')).toEqual([]);
  });

  it('allows only 720px and 1080px inside @media and @container preludes', () => {
    expect(css('@media (min-width: 720px) { .x { display: grid; } }')).toEqual([]);
    expect(css('@media (min-width: 1080px) { .x { display: grid; } }')).toEqual([]);
    expect(css('@media (width < 720px) { .x { display: grid; } }')).toEqual([]);
    expect(css('@media (720px <= width < 1080px) { .x { display: grid; } }')).toEqual([]);
    expect(css('@container (inline-size > 720px) { .x { display: grid; } }')).toEqual([]);
    expect(css('@media (max-width: 719.98px) { .x { display: grid; } }')).toEqual(['raw-length']);
    expect(css('@media (min-width: 48rem) { .x { display: grid; } }')).toEqual(['raw-length']);
    expect(css('@media (min-width: 600px) { .x { display: grid; } }')).toEqual(['raw-length']);
  });

  it('still flags breakpoint values used in declarations and other preludes', () => {
    expect(css('@media (min-width: 720px) { .x { max-inline-size: 720px; } }')).toEqual(['raw-length']);
    expect(css('@supports (inline-size: 1080px) { .x { display: grid; } }')).toEqual(['raw-length']);
  });
});

describe('lintCss: effects, motion and layers', () => {
  it('flags gradients of every kind', () => {
    for (const g of ['linear-gradient(red, blue)', 'radial-gradient(var(--a), var(--b))', 'conic-gradient(var(--a), var(--b))', 'repeating-linear-gradient(45deg, var(--a) 0 1%, transparent 0 2%)', 'repeating-radial-gradient(var(--a), var(--b))', 'repeating-conic-gradient(var(--a), var(--b))']) {
      expect(decl(`background-image: ${g}`)).toContain('gradient');
    }
    expect(decl('background: var(--hatch-exam)')).toEqual([]);
  });

  it('flags backdrop-filter', () => {
    expect(decl('backdrop-filter: blur(var(--space-2))')).toEqual(['backdrop-filter']);
    expect(decl('-webkit-backdrop-filter: none')).toEqual(['backdrop-filter']);
  });

  it('allows only var(--shadow-panel) or none as box-shadow', () => {
    expect(decl('box-shadow: var(--shadow-panel)')).toEqual([]);
    expect(decl('box-shadow: none')).toEqual([]);
    expect(decl('box-shadow: none !important')).toEqual([]);
    expect(decl('box-shadow: 0 0 0 var(--focus-w) var(--color-signal)')).toEqual(['raw-shadow']);
    expect(decl('box-shadow: 0 2px 4px black')).toEqual(['raw-shadow', 'raw-length', 'raw-length', 'raw-color-name']);
  });

  it('flags raw durations in transition and animation properties', () => {
    expect(decl('transition: opacity 200ms')).toEqual(['raw-duration']);
    expect(decl('transition-duration: .3s')).toEqual(['raw-duration']);
    expect(decl('animation: pop 1.5s var(--ease-out)')).toEqual(['raw-duration']);
    expect(decl('animation-delay: 2s')).toEqual(['raw-duration']);
    expect(decl('transition-delay: 40ms')).toEqual(['raw-duration']);
    expect(decl('animation-duration: 10s')).toEqual(['raw-duration']);
    expect(decl('--delay: 120ms')).toEqual(['raw-duration']);
    expect(decl('-webkit-transition: opacity 1s')).toEqual(['raw-duration']);
  });

  it('allows duration tokens, calc of tokens and zero', () => {
    expect(decl('transition: transform var(--dur-fast) var(--ease-out)')).toEqual([]);
    expect(decl('animation-delay: calc(var(--dur-draw) * 0.5 + var(--i) * var(--dur-fast) / 4)')).toEqual([]);
    expect(decl('transition-duration: 0s')).toEqual([]);
    expect(decl('--stagger: var(--dur-fast)')).toEqual([]);
    expect(decl('animation: mochi-blink2 var(--dur-idle) infinite')).toEqual([]);
  });

  it('flags raw easing functions anywhere', () => {
    expect(decl('transition-timing-function: cubic-bezier(.2,.7,.2,1)')).toEqual(['raw-easing']);
    expect(decl('animation-timing-function: steps(4, end)')).toEqual(['raw-easing']);
    expect(decl('--ease: cubic-bezier(0, 0, 1, 1)')).toEqual(['raw-easing']);
    expect(decl('transition-timing-function: var(--ease-spring)')).toEqual([]);
  });

  it('allows only z-index tokens, 0, 1, -1 and auto', () => {
    for (const ok of ['var(--z-panel)', '0', '1', '-1', 'auto', 'var(--z-toast) !important']) {
      expect(decl(`z-index: ${ok}`)).toEqual([]);
    }
    for (const bad of ['10', '999', '2', 'calc(var(--z-panel) + 1)']) {
      expect(decl(`z-index: ${bad}`)).toEqual(['raw-z-index']);
    }
  });
});

describe('lintCss: structure and positions', () => {
  it('reports exact line and column after comments', () => {
    const source = ['/* header', '   comment */', '.a {', '  /* note */ padding: var(--space-1) 12px;', '}', ''].join('\n');
    expect(lintCss(source)).toEqual([
      { line: 4, col: 38, rule: 'raw-length', message: expect.stringContaining('"12px"') as string },
    ]);
  });

  it('handles nesting, keyframes and at-rules inside rules', () => {
    const source = [
      '.a {',
      '  color: var(--color-ink);',
      '  &:hover { color: red; }',
      '  @media (min-width: 1080px) { padding: 8px; }',
      '}',
      '@keyframes pop { from { transform: scale(0); } 50% { opacity: .5; } to { transform: scale(1); } }',
      '@layer base, components;',
    ].join('\n');
    expect(lintCss(source).map((f) => [f.line, f.rule])).toEqual([
      [3, 'raw-color-name'],
      [4, 'raw-length'],
    ]);
  });

  it('accepts a clean component stylesheet', () => {
    const source = `
.route-map__card {
  position: absolute;
  z-index: var(--z-sticky);
  inline-size: min(var(--card-w), 80vw);
  border: var(--rule-strong) solid var(--color-ink);
  translate: -50% calc(-100% - var(--space-5));
  transition: transform var(--dur-fast) var(--ease-out);
  box-shadow: var(--shadow-panel);
  font-family: var(--font-mono);
}
@media (prefers-reduced-motion: reduce) {
  .route-map * { animation: none !important; }
}
@media (min-width: 720px) and (width < 1080px) {
  .route-map { display: grid; }
}`;
    expect(lintCss(source)).toEqual([]);
  });
});

describe('lintHtmlStyles', () => {
  it('scans <style> blocks and style attributes with exact positions', () => {
    const html = [
      '<!doctype html>',
      '<html><head><style>',
      '  body { color: #fff; }',
      '</style></head>',
      '<body><div style="padding: 4px">x</div><p style="color:var(--color-ink)">y</p></body></html>',
    ].join('\n');
    expect(lintHtmlStyles(html).map((f) => [f.line, f.col, f.rule])).toEqual([
      [3, 17, 'raw-color-hex'],
      [5, 28, 'raw-length'],
    ]);
  });

  it('ignores markup, scripts, comments and other attributes', () => {
    const html = '<meta name="theme-color" content="#f2f3ee"><!-- <style>a{color:red}</style> --><script>const a = "12px";</script>';
    expect(lintHtmlStyles(html)).toEqual([]);
  });
});

describe('lintTsTokens', () => {
  const ts = (source: string, file = 'x.tsx'): string[] => rules(lintTsTokens(source, file));

  it('flags strings that are entirely a hex color, not anchors', () => {
    expect(ts("const c = '#abc';")).toEqual(['raw-color-hex']);
    expect(ts('const c = "#A1B2C3";')).toEqual(['raw-color-hex']);
    expect(ts('const c = { color: "#a1b2c3d4" };')).toEqual(['raw-color-hex']);
    expect(ts('const c = <rect fill="#ffffff" />;')).toEqual(['raw-color-hex']);
    expect(ts("const c = <rect fill={on ? '#add' : 'none'} />;")).toEqual(['raw-color-hex']);
    expect(ts("const a = <a href='#main'>x</a>;")).toEqual([]);
    expect(ts("const a = 'Xem mục #abc bên dưới';")).toEqual([]);
    expect(ts("const a = '/su-kien#add';")).toEqual([]);
    expect(ts("const a = '#abcde';")).toEqual([]);
  });

  it('treats hex-shaped fragments, ids and selectors as anchors in TS', () => {
    expect(ts('const a = <a href="#add">Thêm</a>;')).toEqual([]);
    expect(ts("const a = <a href={'#fade'}>x</a>;")).toEqual([]);
    expect(ts('const a = <label htmlFor="#bad" />;')).toEqual([]);
    expect(ts('const a = <button aria-controls="#bead" />;')).toEqual([]);
    expect(ts("const l = { to: '#add' };")).toEqual([]);
    expect(ts("document.querySelector('#add');", 'x.ts')).toEqual([]);
    expect(ts("if (location.hash === '#add') go();", 'x.ts')).toEqual([]);
  });

  it('flags color functions in strings', () => {
    expect(ts("const c = 'rgb(0 0 0)';")).toEqual(['raw-color-function']);
    expect(ts('const c = `hsl(${h} 50% 50%)`;')).toEqual(['raw-color-function']);
    expect(ts("const c = 'rgba(0,0,0,.4)';")).toEqual(['raw-color-function']);
    expect(ts("const c = 'var(--color-ink)';")).toEqual([]);
  });

  it('flags px/rem lengths, including interpolated ones', () => {
    expect(ts("const s = '12px';")).toEqual(['raw-length']);
    expect(ts("const s = '1.5rem';")).toEqual(['raw-length']);
    expect(ts('const s = <svg strokeWidth="2px" />;')).toEqual(['raw-length']);
    expect(ts('const s = `${w}px`;')).toEqual(['raw-length']);
    expect(ts("const s = 'M0 0 L10 10';")).toEqual([]);
    expect(ts('const s = <svg viewBox="0 0 720 400" />;')).toEqual([]);
  });

  it('allows only the breakpoints in media-query strings', () => {
    expect(ts("matchMedia('(min-width: 1080px)');", 'x.ts')).toEqual([]);
    expect(ts("matchMedia('(width < 720px)');", 'x.ts')).toEqual([]);
    expect(ts("matchMedia('(min-width: 900px)');", 'x.ts')).toEqual(['raw-length']);
    expect(ts("const s = '1080px';", 'x.ts')).toEqual(['raw-length']);
  });

  it('flags font names in strings but not in module specifiers', () => {
    expect(ts("const f = 'Lexend';")).toEqual(['font-name']);
    expect(ts("const f = '16px Be Vietnam Pro, sans-serif';")).toEqual(['raw-length', 'font-name', 'font-name']);
    expect(ts("import '@fontsource-variable/lexend';\nimport x from '@fontsource/jetbrains-mono/500.css';\nvoid import('@fontsource-variable/bricolage-grotesque');", 'x.ts')).toEqual([]);
    expect(ts("const f = 'var(--font-mono)';")).toEqual([]);
    expect(ts("const t = 'interactive';")).toEqual([]);
  });

  it('flags named colors in JSX color attributes only', () => {
    expect(ts('const a = <path fill="white" />;')).toEqual(['raw-color-name']);
    expect(ts('const a = <path stroke="black" />;')).toEqual(['raw-color-name']);
    expect(ts('const a = <path fill="none" stroke="currentColor" />;')).toEqual([]);
    expect(ts('const a = <i className="red" />;')).toEqual([]);
    expect(ts("const a = <i style={{ '--lane-color': 'red' }} />;")).toEqual(['raw-color-name']);
    expect(ts("const a = <i style={{ '--lane-color': 'var(--line-ht)' }} />;")).toEqual([]);
    expect(ts("const a = { label: 'red' };")).toEqual([]);
  });

  it('ignores JSX text and reports exact positions', () => {
    expect(ts('const a = <p>Khoảng cách 12px</p>;')).toEqual([]);
    expect(lintTsTokens("const a = 1;\nconst s = 'pad 12px';\n", 'x.ts')).toEqual([
      { line: 2, col: 16, rule: 'raw-length', message: expect.stringContaining('"12px"') as string },
    ]);
  });
});
