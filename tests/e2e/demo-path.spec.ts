import { expect, test, type Download, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { EVENTS } from '../../src/data/events';
import { SEED_REGISTRATIONS } from '../../src/data/seed';
import { toMillis } from '../../src/domain/dates';
import { escapeText } from '../../src/domain/ics';
import type { MochiResponse } from '../../src/mochi/protocol';
import { DEMO_TODAY, seedDemo, trackErrors } from '../support/app';

const today = toMillis(`${DEMO_TODAY}T12:00:00+07:00`);

/** Text of a downloaded .ics file with folded lines joined again (RFC 5545 §3.1). */
async function icsText(download: Download): Promise<string> {
  const path = await download.path();
  return (await readFile(path, 'utf8')).replace(/\r\n[ \t]/g, '');
}

async function expectOnRoute(page: Page, titles: string[]) {
  await expect(page).toHaveURL(/\/lo-trinh\?pham-vi=cua-toi/);
  await page.getByRole('button', { name: 'Xem dạng danh sách' }).click();
  for (const title of titles) await expect(page.getByRole('link', { name: title, exact: true }).first()).toBeVisible();
}

async function expectInCalendar(page: Page, titles: string[]) {
  await page.goto('/lich');
  await expect(page.getByRole('heading', { level: 2, name: 'Tháng 10/2026' })).toBeVisible();
  const agenda = page.getByRole('region', { name: 'Sự kiện trong tháng 10/2026' });
  for (const title of titles) await expect(agenda.getByRole('link', { name: title, exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất toàn bộ lịch' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`rodemap-lich-ca-nhan-${DEMO_TODAY}.ics`);
  const ics = await icsText(download);
  expect(ics).toContain('BEGIN:VCALENDAR');
  expect(ics).toContain('X-WR-TIMEZONE:Asia/Ho_Chi_Minh');
  for (const title of titles) expect(ics).toContain(`SUMMARY:${escapeText(title)}`);
  await expect(page.getByText(/^Đã tạo tệp rodemap-lich-ca-nhan/)).toBeVisible();
}

test.describe('demo path', () => {
  test('onboarding → first route → confirm → Lộ trình and Lịch → .ics', async ({ page }) => {
    const errors = trackErrors(page);
    await seedDemo(page, { profile: null, registrations: [], portfolio: [] });
    await page.goto('/thiet-lap');

    // Step 1 validates before moving on.
    await page.getByRole('button', { name: 'Tiếp tục' }).click();
    await expect(page.getByText('Vui lòng chọn khối.')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Khối 10' })).toBeFocused();
    await page.getByRole('radio', { name: 'Khối 11' }).check();
    await page.getByRole('textbox', { name: 'Lớp' }).fill('11a2');
    await page.getByRole('button', { name: 'Tiếp tục' }).click();

    // Step 2: interests, then ranking.
    await expect(page.getByRole('heading', { level: 2, name: 'Lĩnh vực quan tâm' })).toBeFocused();
    for (const name of ['Học thuật', 'Công nghệ – Sáng tạo', 'Tình nguyện – Cộng đồng']) {
      await page.getByRole('checkbox', { name: new RegExp(`^[A-Z]{2} ${name}`) }).check();
    }
    await page.getByRole('button', { name: 'Đưa Công nghệ – Sáng tạo lên' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: 'Ưu tiên 1' })).toContainText('Công nghệ – Sáng tạo');
    await page.getByRole('button', { name: 'Tiếp tục' }).click();

    // Step 3: goals.
    await page.getByRole('checkbox', { name: 'Phát triển năng lực công nghệ' }).check();
    await page.getByRole('button', { name: 'Tiếp tục' }).click();

    // Step 4: time; Mochi proposes the first route.
    await expect(page.getByText('Vui lòng chọn ít nhất một khoảng thời gian có thể tham gia để Mochi đề xuất lộ trình đầu tiên.')).toBeVisible();
    await page.getByRole('checkbox', { name: /Các ngày trong tuần/ }).check();
    await page.getByRole('checkbox', { name: /Cuối tuần/ }).check();
    await page.getByRole('slider', { name: 'Quỹ giờ mỗi tuần' }).fill('8');
    const route = page.getByRole('list', { name: 'Các sự kiện trong lộ trình đề xuất' });
    await expect(route.getByRole('listitem').first()).toBeVisible();
    const titles = await route.locator('.first-route__title').allTextContents();
    expect(titles.length).toBeGreaterThan(0);
    expect(titles.length).toBeLessThanOrEqual(4);
    // Nothing is registered before the student confirms.
    await expect(page.getByText(`Khi bạn xác nhận, Rodemap lưu hồ sơ và đăng ký ${String(titles.length)} sự kiện đã chọn.`)).toBeVisible();
    await page.getByRole('button', { name: 'Xác nhận lộ trình' }).click();

    await expectOnRoute(page, titles);
    const october = EVENTS.filter((e) => titles.includes(e.title) && e.start.startsWith('2026-10')).map((e) => e.title);
    expect(october.length).toBeGreaterThan(0);
    await expectInCalendar(page, october);
    expect(errors).toEqual([]);
  });

  /** An open October event the seeded student can still register for. */
  const target = EVENTS.find(
    (e) =>
      e.status === 'approved' &&
      e.start.startsWith('2026-10') &&
      toMillis(e.registrationDeadline) > today &&
      e.eligibleGrades.includes(11) &&
      e.seatsTaken < e.capacity &&
      e.format === 'in_person' &&
      !SEED_REGISTRATIONS.some((r) => r.eventId === e.id),
  );

  test('Mochi online (mocked API): recommendation → Xác nhận → Lộ trình and Lịch → .ics', async ({ page }) => {
    if (!target) throw new Error('Sample data has no open October event for the demo student');
    const errors = trackErrors(page);
    const bodies: string[] = [];
    await page.route('**/api/mochi', async (route) => {
      const body = route.request().postData() ?? '';
      bodies.push(body);
      const response: MochiResponse =
        bodies.length === 1
          ? {
              ok: true,
              model: 'test',
              stopReason: 'tool_use',
              content: [
                { type: 'text', text: 'Mochi đề xuất một sự kiện phù hợp với lĩnh vực bạn ưu tiên.' },
                { type: 'tool_use', id: 'toolu_test_1', name: 'propose_registration', input: { event_id: target.id, action: 'register' } },
              ],
            }
          : {
              ok: true,
              model: 'test',
              stopReason: 'end_turn',
              content: [{ type: 'text', text: 'Vui lòng kiểm tra thẻ xác nhận và nhấn “Xác nhận” nếu thông tin chính xác.' }],
            };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
    });
    await seedDemo(page);
    await page.goto('/tong-quan');
    await page.getByRole('button', { name: 'Hỏi Mochi' }).click();
    await page.getByRole('textbox', { name: 'Nhắn Mochi' }).fill('Gợi ý cho mình một sự kiện tuần này');
    await page.getByRole('button', { name: 'Gửi' }).click();

    const card = page.getByRole('region', { name: 'Thẻ xác nhận đăng ký' });
    await expect(card).toContainText(target.title);
    // The tool ran in the browser and its result went back to the API with the app snapshot.
    await expect.poll(() => bodies.length).toBe(2);
    expect(bodies[0]).toContain('du_lieu_rodemap');
    expect(bodies[1]).toContain('toolu_test_1');
    await card.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByText(`Đã đăng ký “${target.title}”`)).toBeVisible();
    await page.getByRole('button', { name: 'Đóng Mochi' }).click();

    await page.goto('/lo-trinh?pham-vi=cua-toi');
    await expectOnRoute(page, [target.title]);
    await expectInCalendar(page, [target.title]);
    expect(errors).toEqual([]);
  });

  test('Mochi offline: the rule-based mode proposes the registration and waits for Xác nhận', async ({ page }) => {
    if (!target) throw new Error('Sample data has no open October event for the demo student');
    const errors = trackErrors(page);
    await seedDemo(page, { mochiForcedOffline: true });
    await page.goto('/tong-quan');
    await page.getByRole('button', { name: 'Hỏi Mochi' }).click();
    await page.getByRole('textbox', { name: 'Nhắn Mochi' }).fill(`Đăng ký ${target.title}`);
    await page.getByRole('button', { name: 'Gửi' }).click();
    const card = page.getByRole('region', { name: 'Thẻ xác nhận đăng ký' });
    await expect(card).toContainText(target.title);

    // Nothing changes until the student confirms.
    await page.goto('/lich');
    await expect(page.getByRole('region', { name: 'Sự kiện trong tháng 10/2026' }).getByRole('link', { name: target.title, exact: true })).toHaveCount(0);
    await page.goBack();
    await page.getByRole('button', { name: 'Hỏi Mochi' }).click();
    await page.getByRole('textbox', { name: 'Nhắn Mochi' }).fill(`Đăng ký ${target.title}`);
    await page.getByRole('button', { name: 'Gửi' }).click();
    await page.getByRole('region', { name: 'Thẻ xác nhận đăng ký' }).last().getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByText(`Đã đăng ký “${target.title}”`)).toBeVisible();

    await expectInCalendar(page, [target.title]);
    expect(errors).toEqual([]);
  });
});
