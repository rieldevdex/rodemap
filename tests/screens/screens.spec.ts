import { expect, test } from '@playwright/test';
import { ROUTES, seedDemo } from '../support/app';

/** Full-page screenshots of every route: phone 390 px and desktop 1440 px, light and dark. */
const LABEL = process.env.SCREENS_LABEL ?? 'latest';
const WIDTHS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;
const THEMES = ['light', 'dark'] as const;
const ONLY = process.env.SCREENS_ONLY?.split(',');

for (const route of ROUTES.filter((r) => !ONLY || ONLY.includes(r.name))) {
  for (const size of WIDTHS) {
    for (const theme of THEMES) {
      test(`${route.name} ${size.name} ${theme}`, async ({ page }) => {
        await seedDemo(page);
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await page.goto(route.path);
        await expect(page.locator('#main-heading')).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `horizontal overflow on ${route.path} at ${size.width}px`).toBeLessThanOrEqual(0);
        await page.screenshot({ path: `screenshots/${LABEL}/${route.name}-${size.name}-${theme}.png`, fullPage: true });
      });
    }
  }
}
