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
