import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { EVENTS } from '../../src/data/events';
import { NEWS } from '../../src/data/news';
import { toMillis } from '../../src/domain/dates';
import { DEMO_TODAY, seedDemo, trackErrors } from '../support/app';

const today = toMillis(`${DEMO_TODAY}T09:00:00+07:00`);
const visible = NEWS.filter((p) => toMillis(p.publishedAt) <= today);
const scheduled = NEWS.find((p) => toMillis(p.publishedAt) > today);
const upcomingEvent = EVENTS.find((e) => e.status === 'approved' && toMillis(e.start) > today);

async function axe(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

test.describe('Bản tin Hội đồng Học sinh', () => {
  test('students read the newsletter, filter by column and open an article', async ({ page }) => {
    const errors = trackErrors(page);
    await seedDemo(page);
    await page.goto('/ban-tin');
    await expect(page.locator('#main-heading')).toHaveText('Bản tin Hội đồng Học sinh');
    await expect(page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Bản tin' })).toHaveAttribute('aria-current', 'page');

    // Every published article is reachable from the index; scheduled ones are not.
    for (const p of visible) await expect(page.getByRole('link', { name: p.title, exact: true }).first()).toBeVisible();
    if (scheduled) await expect(page.getByRole('link', { name: scheduled.title, exact: true })).toHaveCount(0);

    await page.getByRole('group', { name: 'Lọc theo chuyên mục' }).getByRole('button', { name: 'Hướng dẫn' }).click();
    const guides = visible.filter((p) => p.category === 'guide');
    await expect(page.getByText(`${String(guides.length)} bài viết thuộc chuyên mục Hướng dẫn`)).toBeVisible();
    for (const p of visible.filter((x) => x.category !== 'guide')) {
      await expect(page.getByRole('link', { name: p.title, exact: true })).toHaveCount(0);
    }

    const article = guides[0] ?? visible[0];
    if (!article) throw new Error('The sample newsletter has no published article');
    await page.getByRole('link', { name: article.title, exact: true }).first().click();
    await expect(page).toHaveURL(`/ban-tin/${article.slug}`);
    await expect(page.locator('#main-heading')).toHaveText(article.title);
    await expect(page.getByText(article.summary)).toBeVisible();
    await expect(page).toHaveTitle(`${article.title} · Rodemap`);
    expect(await axe(page)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('a scheduled article stays hidden until its date', async ({ page }) => {
    test.skip(!scheduled, 'no scheduled article in the sample data');
    await seedDemo(page);
    await page.goto(`/ban-tin/${scheduled?.slug ?? ''}`);
    await expect(page.locator('#main-heading')).toHaveText('Không tìm thấy bài viết');
  });

  test('the council writes, publishes and removes an article; students see it on Tổng quan', async ({ page }) => {
    if (!upcomingEvent) throw new Error('Sample data has no upcoming event');
    const errors = trackErrors(page);
    await seedDemo(page, { role: 'moderator' });
    await page.goto('/ban-tin');
    await page.getByRole('link', { name: 'Soạn bài viết' }).click();
    await expect(page.locator('#main-heading')).toHaveText('Soạn bài viết');
    expect(await axe(page)).toEqual([]);

    // Validation first: the summary takes focus and lists every field.
    await page.getByRole('button', { name: 'Đăng bài' }).click();
    const summary = page.getByRole('alert');
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('Tiêu đề cần có từ 8 đến 120 ký tự.');
    await expect(summary).toContainText('Phần tóm tắt cần có từ 40 đến 300 ký tự.');

    const title = 'Thông báo lịch sinh hoạt câu lạc bộ tuần cuối tháng 10';
    await page.getByLabel('Tiêu đề', { exact: true }).fill(title);
    await page.getByLabel('Chuyên mục', { exact: true }).selectOption({ label: 'Thông báo' });
    await page.getByLabel('Ban phụ trách', { exact: true }).selectOption({ label: 'Ban Phong trào' });
    await page.getByLabel('Tóm tắt', { exact: true }).fill('Hội đồng Học sinh thông báo lịch sinh hoạt của các câu lạc bộ trong tuần cuối tháng 10/2026.');
    await page.getByLabel('Nội dung', { exact: true }).fill(
      [
        '## Lịch sinh hoạt',
        'Các câu lạc bộ duy trì lịch sinh hoạt định kỳ theo kế hoạch đã đăng ký với Hội đồng Học sinh, đồng thời cập nhật sự kiện trên Rodemap trước ngày diễn ra.',
        '- Học sinh theo dõi lịch tại trang Lịch của tôi.',
        '- Học sinh đăng ký tham gia tại trang chi tiết sự kiện.',
        '> Hội đồng Học sinh đề nghị các câu lạc bộ cập nhật thông tin đầy đủ. — Ban Phong trào, Hội đồng Học sinh',
      ].join('\n\n'),
    );
    await expect(page.getByRole('complementary', { name: 'Xem trước' })).toContainText(title);
    await page.getByLabel('Chọn sự kiện').selectOption(upcomingEvent.id);
    await page.getByRole('button', { name: 'Thêm sự kiện' }).click();
    await expect(page.getByRole('button', { name: `Bỏ sự kiện “${upcomingEvent.title}”` })).toBeVisible();
    await page.getByRole('button', { name: 'Đăng bài' }).click();

    await expect(page).toHaveURL(/\/ban-tin\/thong-bao-lich-sinh-hoat-cau-lac-bo/);
    await expect(page.locator('#main-heading')).toHaveText(title);
    await expect(page.getByRole('heading', { level: 2, name: 'Lịch sinh hoạt' })).toBeVisible();
    await expect(page.getByText('Ban Phong trào, Hội đồng Học sinh').first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Sự kiện được nhắc đến' })).toContainText(upcomingEvent.title);

    // The newest article leads Tổng quan's council panel and the event page links back to it.
    await page.goto('/tong-quan');
    await expect(page.getByRole('region', { name: 'Từ Hội đồng Học sinh' }).getByRole('link', { name: title })).toBeVisible();
    await page.goto(`/su-kien/${upcomingEvent.slug}`);
    await expect(page.getByRole('link', { name: title })).toBeVisible();

    // Only the council can remove what it published in the demo.
    await page.getByRole('link', { name: title }).click();
    await page.getByRole('button', { name: 'Gỡ bài viết' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Gỡ bài viết' }).click();
    await expect(page).toHaveURL('/ban-tin');
    await expect(page.getByRole('link', { name: title })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('students see the compose page as a role gate', async ({ page }) => {
    await seedDemo(page);
    await page.goto('/ban-tin/soan-bai');
    await expect(page.getByRole('button', { name: 'Chuyển sang vai trò HĐHS' })).toBeVisible();
    await expect(page.getByLabel('Tiêu đề', { exact: true })).toHaveCount(0);
  });
});
