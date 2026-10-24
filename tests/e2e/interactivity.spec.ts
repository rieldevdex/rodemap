import { expect, test } from '@playwright/test';
import { seedDemo, trackErrors } from '../support/app';

test.describe('Mức độ tương tác', () => {
  test('the slider sets the level, warns about performance and persists', async ({ page }) => {
    const errors = trackErrors(page);
    await seedDemo(page);
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-interactivity', 'medium');
    await page.getByRole('button', { name: 'Giao diện' }).click();
    const slider = page.getByRole('slider', { name: 'Mức độ tương tác' });
    await expect(slider).toHaveAttribute('aria-valuetext', /^Vừa\./);
    await expect(page.getByText('Mức tương tác càng cao, trang càng sử dụng nhiều tài nguyên xử lý', { exact: false })).toBeVisible();
    await slider.focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(html).toHaveAttribute('data-interactivity', 'none');
    await expect(slider).toHaveAttribute('aria-valuetext', /^Không\./);
    await page.keyboard.press('End');
    await expect(html).toHaveAttribute('data-interactivity', 'extreme');
    await page.reload();
    await expect(html).toHaveAttribute('data-interactivity', 'extreme');
    expect(errors).toEqual([]);
  });

  test('Không: nothing moves and the map legend stays a plain list', async ({ page }) => {
    await seedDemo(page, { interactivity: 'none', density: 'full' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('#main-heading')).toBeVisible();
    await expect(page.locator('#main-heading .split-lines__line')).toHaveCount(0);
    await expect(page.locator('.marquee__track')).toHaveCSS('animation-name', 'none');
    await page.goto('/lo-trinh');
    await expect(page.locator('.route-map__lane')).toHaveCount(7);
    await expect(page.locator('.route-map__legend-button')).toHaveCount(0);
  });

  test('Vừa: a legend line highlights its line on the map and dims the others', async ({ page }) => {
    await seedDemo(page);
    await page.goto('/lo-trinh');
    const ht = page.getByRole('button', { name: /^HT\s*Học thuật/ }).first();
    await ht.click();
    await expect(ht).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.route-map__lane--dim')).toHaveCount(6);
    await page.mouse.move(0, 0);
    await ht.press('Escape');
    await expect(ht).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.route-map__lane--dim')).toHaveCount(0);
  });

  test('Tối đa: J and K move through events, Enter carries the card into its page', async ({ page }) => {
    const errors = trackErrors(page);
    await seedDemo(page, { interactivity: 'extreme' });
    await page.goto('/kham-pha');
    await expect(page.getByText('Phím tắt:', { exact: false })).toBeVisible();
    const links = page.locator('.station-card__link');
    await page.keyboard.press('j');
    await expect(links.nth(0)).toBeFocused();
    await page.keyboard.press('j');
    await expect(links.nth(1)).toBeFocused();
    await page.keyboard.press('k');
    await expect(links.nth(0)).toBeFocused();
    const title = (await links.nth(0).textContent()) ?? '';
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/su-kien\//);
    await expect(page.locator('#main-heading')).toHaveText(title);
    // The transition cleans up after itself.
    await expect(page.locator('html')).not.toHaveClass(/vt-morph/);
    // Typing in the search field is never taken for a shortcut.
    await page.goto('/kham-pha?tim=1');
    await page.getByRole('searchbox').fill('jk');
    await expect(page.getByRole('searchbox')).toHaveValue('jk');
    expect(errors).toEqual([]);
  });

  test('Tối đa: "Thử quỹ giờ" recomputes the suggestions live and saves only on request', async ({ page }) => {
    await seedDemo(page, { interactivity: 'extreme' });
    await page.goto('/tong-quan');
    const slider = page.getByRole('slider', { name: 'Thử quỹ giờ mỗi tuần' });
    await expect(page.getByText('Kéo thanh trượt để xem đề xuất của Mochi thay đổi theo quỹ giờ', { exact: false })).toBeVisible();
    await slider.focus();
    await page.keyboard.press('Home');
    await expect(page.getByText(/^Với 2 giờ mỗi tuần: còn /)).toBeVisible();
    await expect(page.getByText('Đề xuất đang được tính với quỹ thử nghiệm 2 giờ mỗi tuần.')).toBeVisible();
    await page.getByRole('button', { name: 'Khôi phục' }).click();
    await expect(page.getByText('Đề xuất đang được tính với quỹ thử nghiệm', { exact: false })).toHaveCount(0);
    await slider.focus();
    await page.keyboard.press('End');
    await page.getByRole('button', { name: 'Lưu quỹ giờ này' }).click();
    const saved = await page.evaluate(() => (JSON.parse(window.localStorage.getItem('rodemap:v1') ?? '{}') as { profile: { weeklyHourBudget: number } }).profile.weeklyHourBudget);
    expect(saved).toBe(12);
  });
});
