import { expect, test } from '@playwright/test';
import { seedDemo } from '../support/app';

test.describe('voting day without a network', () => {
  test.use({ serviceWorkers: 'allow' });

  test('after one visit, Rodemap opens offline and Mochi answers in its offline mode', async ({ page, context }) => {
    await seedDemo(page);
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

    await context.setOffline(true);
    await page.goto('/lo-trinh');
    await expect(page.locator('#main-heading')).toHaveText('Lộ trình');
    await page.goto('/lich');
    await expect(page.locator('#main-heading')).toHaveText('Lịch của tôi');

    await page.getByRole('button', { name: 'Hỏi Mochi' }).click();
    await page.getByRole('textbox', { name: 'Nhắn Mochi' }).fill('Gợi ý sự kiện tuần tới');
    await page.getByRole('button', { name: 'Gửi' }).click();
    await expect(page.getByText('Kết nối tới Mochi tạm thời gián đoạn, vì vậy Mochi trả lời ở chế độ ngoại tuyến.')).toBeVisible();
    await expect(page.getByText('Mochi · ngoại tuyến').first()).toBeVisible();
  });
});
