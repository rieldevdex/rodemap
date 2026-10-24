import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ROUTES, seedDemo } from '../support/app';

const THEMES = ['light', 'dark'] as const;

for (const theme of THEMES) {
  for (const route of ROUTES) {
    test(`axe: ${route.name} (${theme})`, async ({ page }) => {
      await seedDemo(page);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(route.path);
      await expect(page.locator('#main-heading')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      const report = blocking.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join('\n  ')}`);
      expect(report, report.join('\n')).toEqual([]);
    });
  }
}

/** Every appearance mode (DESIGN.md §2.4) in light and dark, for a visitor and a student, with Giao diện open. */
const MODES = ['ruc-ro', 'ap-phich', 'diu-nhe'] as const;
const MODE_ROUTES = [
  { name: 'trang-chu', path: '/', visitor: true },
  { name: 'tong-quan', path: '/tong-quan', visitor: true },
  { name: 'tong-quan', path: '/tong-quan', visitor: false },
  { name: 'kham-pha', path: '/kham-pha', visitor: false },
  { name: 'lo-trinh', path: '/lo-trinh', visitor: false },
] as const;

for (const mode of MODES) {
  for (const theme of THEMES) {
    for (const route of MODE_ROUTES) {
      test(`axe: ${route.name}${route.visitor ? ' (khách)' : ''} · ${mode} (${theme})`, async ({ page }) => {
        await seedDemo(page, route.visitor ? { mode, profile: null, registrations: [], portfolio: [] } : { mode });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await page.goto(route.path);
        await expect(page.locator('#main-heading')).toBeVisible();
        await page.getByRole('button', { name: 'Giao diện' }).click();
        await expect(page.getByRole('group', { name: 'Giao diện' })).toBeVisible();
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        const report = blocking.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join('\n  ')}`);
        expect(report, report.join('\n')).toEqual([]);
      });
    }
  }
}

/** "Tối đa" adds the shortcut hint, the "Thử quỹ giờ" panel and the pressable legend. */
for (const route of [
  { name: 'tong-quan', path: '/tong-quan' },
  { name: 'kham-pha', path: '/kham-pha' },
  { name: 'lo-trinh', path: '/lo-trinh' },
] as const) {
  test(`axe: ${route.name} · Tối đa`, async ({ page }) => {
    await seedDemo(page, { interactivity: 'extreme' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route.path);
    await expect(page.locator('#main-heading')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    const report = blocking.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join('\n  ')}`);
    expect(report, report.join('\n')).toEqual([]);
  });
}
