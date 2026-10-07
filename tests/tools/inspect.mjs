/* eslint-disable no-console -- command-line tool */
// Page inspection for agents and humans: screenshots (390/1440 × light/dark), horizontal
// overflow and axe (serious/critical) for each path, against an already running preview.
//
//   npx vite build --outDir /tmp/<name>-dist
//   npx vite preview --outDir /tmp/<name>-dist --port <port> --strictPort &
//   node tests/tools/inspect.mjs --base http://localhost:<port> --out /tmp/<name>-shots /kham-pha /lo-trinh
//
// Options: --widths 390,1440  --themes light,dark  --no-axe  --demo-today 2026-10-07  --full (full-page shots)
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);
const valued = new Set(['--base', '--out', '--widths', '--themes', '--demo-today']);
const paths = args.filter((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
const base = opt('base', 'http://localhost:4173');
const out = opt('out', 'screenshots/inspect');
const widths = opt('widths', '390,1440').split(',').map(Number);
const themes = opt('themes', 'light,dark').split(',');
const demoToday = opt('demo-today', '2026-10-07');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
let problems = 0;
for (const path of paths.length ? paths : ['/']) {
  for (const width of widths) {
    for (const theme of themes) {
      const ctx = await browser.newContext({
        viewport: { width, height: width < 720 ? 844 : 900 },
        colorScheme: theme,
        reducedMotion: 'reduce',
        locale: 'vi-VN',
        timezoneId: 'Asia/Ho_Chi_Minh',
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await page.goto(base + path);
      // Pin the demo date through the app's own account menu state.
      await page.evaluate((today) => {
        try {
          const raw = localStorage.getItem('rodemap:v1');
          const s = raw ? JSON.parse(raw) : null;
          if (s && s.demoToday !== today) {
            s.demoToday = today;
            localStorage.setItem('rodemap:v1', JSON.stringify(s));
            location.reload();
          }
        } catch {
          /* storage unavailable: keep the real date */
        }
      }, demoToday);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      const name = `${path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}-${width}-${theme}`;
      await page.screenshot({ path: `${out}/${name}.png`, fullPage: flag('full') });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const offenders = overflow > 0
        ? await page.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5).slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${el.getAttribute('class') ?? ''}`))
        : [];
      let axe = [];
      if (!flag('no-axe')) {
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        axe = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      }
      const bad = overflow > 0 || axe.length || errors.length;
      if (bad) problems += 1;
      console.log(`${bad ? 'FAIL' : 'ok  '} ${name}.png${overflow > 0 ? ` overflow=${overflow}px [${offenders.join(', ')}]` : ''}${axe.length ? `\n     axe: ${axe.join('\n     axe: ')}` : ''}${errors.length ? `\n     console: ${errors.slice(0, 3).join(' / ')}` : ''}`);
      await ctx.close();
    }
  }
}
await browser.close();
console.log(problems ? `${problems} screen(s) with problems` : 'all screens clean');
process.exit(problems ? 1 : 0);
