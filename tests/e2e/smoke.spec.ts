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

  test('Giao diện: mode, brightness and density apply at once and persist', async ({ page }) => {
    const errors = trackErrors(page);
    await seedDemo(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-mode', 'lo-trinh');
    await expect(html).toHaveAttribute('data-density', 'compact');

    const button = page.getByRole('button', { name: 'Giao diện' });
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const panel = page.getByRole('group', { name: 'Giao diện' });
    // Colour changes run inside a view transition, so the radio settles a frame after the click.
    await panel.getByRole('radio', { name: /Rực rỡ/ }).click();
    await expect(html).toHaveAttribute('data-mode', 'ruc-ro');
    await expect(panel.getByRole('radio', { name: /Rực rỡ/ })).toBeChecked();
    // Arrow keys move within the group (native radios).
    await page.keyboard.press('ArrowRight');
    await expect(html).toHaveAttribute('data-mode', 'ap-phich');
    await panel.getByRole('radio', { name: 'Tối', exact: true }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await panel.getByRole('radio', { name: /^Tối giản/ }).check();
    await expect(html).toHaveAttribute('data-density', 'minimal');

    // Escape closes the panel and returns focus to its button.
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(button).toBeFocused();

    await page.reload();
    await expect(html).toHaveAttribute('data-mode', 'ap-phich');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(html).toHaveAttribute('data-density', 'minimal');
    expect(errors).toEqual([]);
  });

  test('Mật độ nội dung keeps the home page within its word budget', async ({ page }) => {
    await seedDemo(page, { profile: null, registrations: [], portfolio: [] });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const budgets = { full: Infinity, compact: 120, minimal: 40 } as const;
    const counts: Record<string, number> = {};
    for (const [density, budget] of Object.entries(budgets)) {
      await page.goto('/');
      await page.evaluate((value) => {
        const raw = JSON.parse(window.localStorage.getItem('rodemap:v1') ?? '{}') as Record<string, unknown>;
        window.localStorage.setItem('rodemap:v1', JSON.stringify({ ...raw, density: value }));
      }, density);
      await page.reload();
      // Words a reader sees in the page body, without the route map (event titles) and the footer.
      const words = await page.locator('main').evaluate((main) => {
        const copy = main.cloneNode(true) as HTMLElement;
        copy.querySelectorAll('figure').forEach((el) => {
          el.remove();
        });
        document.body.append(copy);
        const text = copy.innerText;
        copy.remove();
        return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
      });
      counts[density] = words;
      expect(words, `${density}: ${String(words)} words`).toBeLessThanOrEqual(budget);
    }
    expect(counts.full).toBeGreaterThan(counts.compact ?? 0);
    expect(counts.compact).toBeGreaterThan(counts.minimal ?? 0);
  });
});
