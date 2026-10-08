import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { EVENTS } from '../../src/data/events';
import { NEWS } from '../../src/data/news';
import { addDays, toIsoDate, toMillis } from '../../src/domain/dates';
import { DEMO_TODAY, seedDemo, trackErrors } from '../support/app';

const today = toMillis(`${DEMO_TODAY}T09:00:00+07:00`);
const visible = NEWS.filter((p) => toMillis(p.publishedAt) <= today);
const scheduled = NEWS.find((p) => toMillis(p.publishedAt) > today);
const upcomingEvent = EVENTS.find((e) => e.status === 'approved' && toMillis(e.start) > today);
const [firstArticle, secondArticle] = [...NEWS].sort((a, b) => toMillis(a.publishedAt) - toMillis(b.publishedAt));

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
    await expect(summary).toContainText('Nội dung cần có từ 120 đến 6.000 ký tự.');

    // A later failed attempt focuses the summary again, and what the user types next stays in the field.
    const title = 'Thông báo lịch sinh hoạt câu lạc bộ tuần cuối tháng 10';
    await page.getByLabel('Tiêu đề', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Đăng bài' }).click();
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('Bài viết còn 2 nội dung cần điều chỉnh');
    const summaryField = page.getByLabel('Tóm tắt', { exact: true });
    await summaryField.click();
    await page.keyboard.type('Hội đồng Học sinh');
    await expect(summaryField).toBeFocused();
    await expect(summaryField).toHaveValue('Hội đồng Học sinh');

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
    const preview = page.getByRole('complementary', { name: 'Xem trước' });
    await expect(preview).toContainText(title);
    // Draft section headings sit under "Xem trước" in the outline.
    await expect(preview.getByRole('heading', { level: 3, name: 'Lịch sinh hoạt' })).toBeVisible();
    expect(await axe(page)).toEqual([]);

    // Adding or removing a related event keeps keyboard focus in the fieldset.
    const picker = page.getByLabel('Chọn sự kiện');
    await picker.selectOption(upcomingEvent.id);
    await page.getByRole('button', { name: 'Thêm sự kiện' }).click();
    await expect(picker).toBeFocused();
    const removeEvent = page.getByRole('button', { name: `Bỏ sự kiện “${upcomingEvent.title}”` });
    await removeEvent.click();
    await expect(removeEvent).toHaveCount(0);
    await expect(picker).toBeFocused();
    await picker.selectOption(upcomingEvent.id);
    await page.getByRole('button', { name: 'Thêm sự kiện' }).click();
    await expect(removeEvent).toBeVisible();
    await page.getByRole('button', { name: 'Đăng bài' }).click();

    await expect(page).toHaveURL(/\/ban-tin\/thong-bao-lich-sinh-hoat-cau-lac-bo/);
    await expect(page.locator('#main-heading')).toHaveText(title);
    await expect(page.getByRole('heading', { level: 2, name: 'Lịch sinh hoạt' })).toBeVisible();
    await expect(page.getByText('Ban Phong trào, Hội đồng Học sinh').first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Sự kiện được nhắc đến' })).toContainText(upcomingEvent.title);
    await page.getByRole('button', { name: 'Sao chép liên kết' }).click();
    await expect(page.locator('.news-article__status')).toHaveText(/^(Đã sao chép liên kết bài viết\.|Trình duyệt không cho phép sao chép; .+)$/);

    // The newest article leads Tổng quan's council panel and the event page links back to it.
    await page.goto('/tong-quan');
    await expect(page.getByRole('region', { name: 'Bản tin Hội đồng Học sinh' }).getByRole('link', { name: title })).toBeVisible();
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

  test('with only one published article the index shows it as the lead, without an empty-state message', async ({ page }) => {
    if (!firstArticle || !secondArticle) throw new Error('The sample newsletter needs two articles');
    const day = toIsoDate(addDays(toMillis(secondArticle.publishedAt), -1));
    test.skip(toMillis(firstArticle.publishedAt) > toMillis(`${day}T09:00:00+07:00`), 'the first two sample articles share a day');
    await seedDemo(page, { demoToday: day });
    await page.goto('/ban-tin');
    await expect(page.getByRole('link', { name: firstArticle.title, exact: true }).first()).toBeVisible();
    await expect(page.getByText('1 bài viết đã phát hành')).toBeVisible();
    await expect(page.getByText('Chưa có bài viết phù hợp')).toHaveCount(0);
    await expect(page.getByText('chưa phát hành bài viết nào')).toHaveCount(0);
  });

  test('an empty search offers the whole newsletter and keeps keyboard focus on the page', async ({ page }) => {
    await seedDemo(page);
    await page.goto('/ban-tin');
    await page.getByRole('searchbox', { name: 'Tìm kiếm bài viết' }).fill('không có bài viết nào khớp từ khóa này');
    const count = page.getByRole('status').filter({ hasText: 'phù hợp với từ khóa tìm kiếm' });
    await expect(count).toHaveText('0 bài viết phù hợp với từ khóa tìm kiếm');
    await page.getByRole('button', { name: 'Xem toàn bộ Bản tin' }).click();
    await expect(page.getByText(`${String(visible.length)} bài viết đã phát hành`)).toBeFocused();
  });

  test('Mochi offline lists the newsletter and links to the article', async ({ page }) => {
    const errors = trackErrors(page);
    const newest = [...visible].sort((a, b) => toMillis(b.publishedAt) - toMillis(a.publishedAt))[0];
    if (!newest) throw new Error('The sample newsletter has no published article');
    await seedDemo(page, { mochiForcedOffline: true });
    await page.goto('/tong-quan');
    await page.getByRole('button', { name: 'Hỏi Mochi' }).click();
    const mochi = page.getByRole('dialog', { name: /Mochi/ });
    await mochi.getByRole('list', { name: 'Gợi ý câu hỏi' }).getByRole('button', { name: 'Bản tin Hội đồng Học sinh' }).click();
    await expect(mochi.getByText(`Bản tin Hội đồng Học sinh hiện có ${String(visible.length)} bài viết đã phát hành.`)).toBeVisible();
    const card = mochi.getByRole('region', { name: 'Bản tin Hội đồng Học sinh' });
    await expect(card.getByRole('link', { name: 'Xem toàn bộ Bản tin' })).toBeVisible();
    await card.getByRole('link', { name: newest.title, exact: true }).click();
    await expect(page).toHaveURL(`/ban-tin/${newest.slug}`);
    await expect(page.locator('#main-heading')).toHaveText(newest.title);
    expect(errors).toEqual([]);
  });

  test('students see the compose page as a role gate', async ({ page }) => {
    await seedDemo(page);
    await page.goto('/ban-tin/soan-bai');
    await expect(page.getByRole('button', { name: 'Chuyển sang vai trò HĐHS' })).toBeVisible();
    await expect(page.getByLabel('Tiêu đề', { exact: true })).toHaveCount(0);
  });
});
