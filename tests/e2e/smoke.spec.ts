import { expect, test } from '@playwright/test';
import { ROUTES, seedDemo, trackErrors } from '../support/app';

test.describe('shell', () => {
  test('every route renders a heading without console errors', async ({ page }) => {
    const errors = trackErrors(page);
    await seedDemo(page);
    for (const route of ROUTES) {
      await page.goto(route.path);
      await expect(page.locator('#main-heading'), route.path).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test('the demo label is always visible in the footer', async ({ page }) => {
    await seedDemo(page);
    await page.goto('/');
    await expect(page.getByRole('contentinfo')).toContainText('Bản trình diễn · Dữ liệu minh họa');
  });

  test('theme toggle switches and persists', async ({ page }) => {
    await seedDemo(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Giao diện tối' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
