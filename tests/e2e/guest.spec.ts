import { expect, test } from '@playwright/test';
import { seedDemo, trackErrors } from '../support/app';

test.describe('Dùng thử (visitor without a profile)', () => {
  test.beforeEach(async ({ page }) => {
    await seedDemo(page, { profile: null, registrations: [], portfolio: [] });
  });

  test('a visitor tries Rodemap from the home page, picks a grade and a field, and sees suggestions', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await page.getByRole('link', { name: 'Dùng thử Rodemap' }).click();
    await expect(page).toHaveURL('/tong-quan');
    await expect(page.locator('#main-heading')).toHaveText('Dùng thử Rodemap');
    await expect(page.getByText('Chọn khối để xem các sự kiện dành cho bạn.')).toBeVisible();

    const picks = page.getByRole('region', { name: 'Gợi ý nhanh' });
    await picks.getByRole('radio', { name: 'Khối 7' }).check();
    await picks.getByRole('button', { name: 'Nghệ thuật – Văn hóa' }).click();
    await expect(picks.getByRole('button', { name: 'Nghệ thuật – Văn hóa' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Các sự kiện còn mở đăng ký dành cho khối 7, ưu tiên lĩnh vực bạn đã chọn.')).toBeVisible();
    const suggestions = page.getByRole('region', { name: 'Gợi ý cho bạn' }).getByRole('listitem').filter({ has: page.locator('.station-card') });
    await expect(suggestions.first()).toBeVisible();
    // Rows that leave fade out first (framer-motion), so wait for the list to settle.
    await expect.poll(() => suggestions.count()).toBeLessThanOrEqual(6);

    // Registering needs a profile: the button says so and comes back here afterwards.
    await page.getByRole('link', { name: 'Thiết lập hồ sơ để đăng ký' }).first().click();
    await expect(page).toHaveURL('/thiet-lap?tiep-theo=%2Ftong-quan');
    // The visitor's picks prefill steps 1 and 2; nothing else is asked again.
    await expect(page.getByRole('radio', { name: 'Khối 7' })).toBeChecked();
    await page.getByRole('textbox', { name: 'Lớp' }).fill('7a1');
    await page.getByRole('button', { name: 'Tiếp tục' }).click();
    await expect(page.getByRole('checkbox', { name: /^[A-Z]{2} Nghệ thuật – Văn hóa/ })).toBeChecked();
    expect(errors).toEqual([]);
  });

  test('open pages work without a profile; personal pages and Mochi wait for one', async ({ page }) => {
    const errors = trackErrors(page);
    for (const path of ['/kham-pha', '/lo-trinh', '/cau-lac-bo', '/ban-tin', '/de-xuat']) {
      await page.goto(path);
      await expect(page, path).toHaveURL(path);
      await expect(page.locator('#main-heading'), path).toBeVisible();
    }
    // Đề xuất: proposals can be read; sending and supporting wait for the profile.
    await expect(page.getByRole('heading', { name: 'Thiết lập hồ sơ để gửi đề xuất' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Ủng hộ/ })).toHaveCount(0);
    // Mochi is not offered to a visitor.
    await expect(page.getByRole('button', { name: /Mochi/ })).toHaveCount(0);
    await page.goto('/cong-cau-lac-bo');
    await expect(page).toHaveURL('/thiet-lap?tiep-theo=%2Fcong-cau-lac-bo');
    expect(errors).toEqual([]);
  });
});
