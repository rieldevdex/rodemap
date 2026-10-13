import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { ACTIVITY_PROPOSALS, COLLABORATIONS, PROPOSAL_RESPONSES } from '../../src/data/proposals';
import { STORAGE_KEY } from '../../src/state/schema';
import { seedDemo, trackErrors } from '../support/app';

async function axe(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

function card(page: Page, title: string): Locator {
  return page.locator('article.proposal-card', { has: page.getByRole('heading', { name: title, exact: true }) });
}

/** The visible confirmation under the section heading (the same text is also announced in a status region). */
function notice(page: Page): Locator {
  return page.locator('.ideas__status');
}

/** Changes the demo role in storage and reloads, as the account menu would. */
async function switchRole(page: Page, role: 'student' | 'club' | 'moderator'): Promise<void> {
  await page.evaluate(
    ([key, next]) => {
      const raw = window.localStorage.getItem(key);
      if (raw) window.localStorage.setItem(key, JSON.stringify({ ...(JSON.parse(raw) as object), role: next }));
    },
    [STORAGE_KEY, role] as const,
  );
  await page.reload();
}

const pendingSeed = ACTIVITY_PROPOSALS.filter((p) => PROPOSAL_RESPONSES[p.id] === undefined);
const [firstPending, secondPending] = pendingSeed;
const incoming = COLLABORATIONS.find((c) => c.toClubId === 'inkstep' && PROPOSAL_RESPONSES[c.id] === undefined);

test.describe('Đề xuất hoạt động và đề xuất hợp tác', () => {
  test('a student sends a proposal, supports another, filters and withdraws their own', async ({ page }) => {
    if (!firstPending) throw new Error('Sample data has no pending proposal');
    const errors = trackErrors(page);
    await seedDemo(page);
    await page.goto('/tong-quan');
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Đề xuất' }).click();
    await expect(page).toHaveURL('/de-xuat');
    await expect(page.locator('#main-heading')).toHaveText('Đề xuất hoạt động');
    await expect(page).toHaveTitle('Đề xuất · Rodemap');
    expect(await axe(page)).toEqual([]);

    // Validation: the summary takes focus and lists the fields to fix.
    const form = page.getByRole('form', { name: 'Gửi đề xuất hoạt động' });
    await form.getByRole('button', { name: 'Gửi đề xuất' }).click();
    const summary = form.getByRole('alert');
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('Tên hoạt động cần có từ 8 đến 100 ký tự.');
    await expect(summary).toContainText('Vui lòng chọn lĩnh vực.');
    await expect(summary).toContainText('Phần mô tả cần có từ 40 đến 600 ký tự.');
    // The student's own grade is ticked by default.
    await expect(form.getByRole('checkbox', { name: 'Khối 11' })).toBeChecked();

    const title = 'Ngày hội trao đổi sách cũ giữa các khối lớp';
    const description = 'Đề xuất tổ chức ngày hội trao đổi sách tham khảo và truyện đã đọc giữa học sinh các khối, giúp tiết kiệm chi phí và khuyến khích đọc sách.';
    await form.getByLabel('Tên hoạt động hoặc sự kiện đề xuất').fill(title);
    await form.getByLabel('Lĩnh vực').selectOption('NT');
    await form.getByRole('checkbox', { name: 'Khối 10' }).check();
    await form.getByLabel(/^Nội dung và mục đích/).fill(`${description} Liên hệ 0912345678.`);
    await form.getByRole('button', { name: 'Gửi đề xuất' }).click();
    await expect(summary).toContainText('Vui lòng không ghi số điện thoại, địa chỉ thư điện tử hoặc thông tin cá nhân.');

    await form.getByLabel(/^Nội dung và mục đích/).fill(description);
    await form.getByRole('button', { name: 'Gửi đề xuất' }).click();
    await expect(notice(page)).toContainText(`Đã gửi đề xuất “${title}”.`);
    await expect(form.getByLabel('Tên hoạt động hoặc sự kiện đề xuất')).toHaveValue('');
    const mine = page.getByRole('region', { name: 'Đề xuất bạn đã gửi' });
    await expect(mine.locator('article.proposal-card', { hasText: title })).toContainText('Đề xuất của bạn');
    await expect(card(page, title)).toContainText('Khối 10, 11');
    await expect(card(page, title)).toContainText('Đang xem xét');

    // Support another student's proposal: the count goes up and the toggle is pressed.
    const other = card(page, firstPending.title);
    const support = other.getByRole('button', { name: `Ủng hộ đề xuất “${firstPending.title}”` });
    await expect(support).toHaveAttribute('aria-pressed', 'false');
    await support.click();
    await expect(support).toHaveAttribute('aria-pressed', 'true');
    await expect(other).toContainText(`${String(firstPending.supporters + 1)} học sinh ủng hộ`);

    // Filter by status.
    const filters = page.getByRole('group', { name: 'Lọc theo trạng thái' });
    await filters.getByRole('button', { name: /^Đã tiếp nhận/ }).click();
    const accepted = ACTIVITY_PROPOSALS.filter((p) => PROPOSAL_RESPONSES[p.id]?.status === 'accepted');
    for (const p of accepted) await expect(card(page, p.title)).toBeVisible();
    await expect(card(page, firstPending.title)).toHaveCount(0);

    // Withdraw the student's own proposal.
    await card(page, title).getByRole('button', { name: 'Rút đề xuất' }).click();
    const dialog = page.getByRole('dialog', { name: 'Rút đề xuất' });
    await dialog.getByRole('button', { name: 'Rút đề xuất' }).click();
    await expect(card(page, title)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Đề xuất bạn đã gửi' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('HĐHS declines with a reason and accepts with a club in charge; students see both answers', async ({ page }) => {
    if (!firstPending || !secondPending) throw new Error('Sample data needs two pending proposals');
    const errors = trackErrors(page);
    await seedDemo(page, { role: 'moderator' });
    await page.goto('/kiem-duyet');
    await page.getByRole('link', { name: `Đề xuất của học sinh: ${String(pendingSeed.length)} đề xuất đang chờ xem xét` }).click();
    await expect(page).toHaveURL('/de-xuat');
    await expect(page.getByText(`${String(pendingSeed.length)} đề xuất đang chờ xem xét`)).toBeVisible();
    // With the HĐHS role, /de-xuat belongs to Kiểm duyệt in the nav.
    await expect(page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Kiểm duyệt' })).toHaveAttribute('aria-current', 'true');
    expect(await axe(page)).toEqual([]);

    // A decline needs a reason.
    await card(page, firstPending.title).getByRole('button', { name: `Không tiếp nhận đề xuất “${firstPending.title}”` }).click();
    const decline = page.getByRole('dialog', { name: 'Không tiếp nhận đề xuất' });
    await decline.getByRole('button', { name: 'Không tiếp nhận', exact: true }).click();
    await expect(decline.getByText('Vui lòng nêu lý do, tối thiểu 10 ký tự.')).toBeVisible();
    const reason = 'Nhà trường đã có chương trình tương tự trong học kỳ I.';
    await decline.getByLabel('Lý do (bắt buộc)').fill(reason);
    await decline.getByRole('button', { name: 'Không tiếp nhận', exact: true }).click();
    await expect(notice(page)).toContainText(`Đã phản hồi chưa tiếp nhận đề xuất “${firstPending.title}”.`);

    // Accept, handing the proposal to the club the student named (or another one).
    await card(page, secondPending.title).getByRole('button', { name: `Tiếp nhận đề xuất “${secondPending.title}”`, exact: true }).click();
    const accept = page.getByRole('dialog', { name: 'Tiếp nhận đề xuất' });
    await accept.getByLabel('Đơn vị phụ trách triển khai').selectOption({ label: 'CLB Hướng nghiệp' });
    await accept.getByRole('button', { name: 'Tiếp nhận', exact: true }).click();
    await expect(notice(page)).toContainText(`Đã tiếp nhận đề xuất “${secondPending.title}” và giao CLB Hướng nghiệp phụ trách.`);
    await expect(page.getByText(`${String(pendingSeed.length - 2)} đề xuất đang chờ xem xét`)).toBeVisible();

    // Students read the answers after a reload (the answers are saved).
    await switchRole(page, 'student');
    await expect(page.locator('#main-heading')).toHaveText('Đề xuất hoạt động');
    await expect(card(page, firstPending.title)).toContainText('Chưa tiếp nhận');
    await expect(card(page, firstPending.title)).toContainText(reason);
    await expect(card(page, secondPending.title)).toContainText('Câu lạc bộ phụ trách: CLB Hướng nghiệp');
    await expect(card(page, secondPending.title).getByRole('link', { name: 'Xem CLB Hướng nghiệp' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('clubs propose a collaboration, the partner declines it, and incoming ones are accepted', async ({ page }) => {
    if (!incoming) throw new Error('Sample data has no pending collaboration for Inkstep');
    const errors = trackErrors(page);
    await seedDemo(page, { role: 'club', activeClubId: 'inkstep' });
    await page.goto('/cong-cau-lac-bo');
    await page.getByRole('link', { name: 'Mở trang Đề xuất hợp tác' }).click();
    await expect(page).toHaveURL('/de-xuat');
    await expect(page.locator('#main-heading')).toHaveText('Đề xuất hợp tác');
    expect(await axe(page)).toEqual([]);

    // Accept the incoming proposal: the next step points to Cổng CLB.
    const received = card(page, incoming.title);
    await received.getByRole('button', { name: `Đồng ý hợp tác “${incoming.title}”` }).click();
    await page.getByRole('dialog', { name: 'Đồng ý hợp tác' }).getByRole('button', { name: 'Đồng ý hợp tác' }).click();
    await expect(received).toContainText('Đã đồng ý hợp tác');
    await expect(received.getByRole('link', { name: 'Gửi sự kiện qua Cổng CLB' })).toBeVisible();

    // Validation, then a new proposal to CLB Robotics.
    const form = page.getByRole('form', { name: 'Gửi đề xuất hợp tác' });
    await form.getByRole('button', { name: 'Gửi đề xuất hợp tác' }).click();
    const summary = form.getByRole('alert');
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('Biểu mẫu còn 5 nội dung cần điều chỉnh');
    await expect(form.getByLabel('Câu lạc bộ đối tác').locator('option', { hasText: 'Inkstep' })).toHaveCount(0);

    const title = 'Cuộc thi thiết kế trò chơi điều khiển robot';
    await form.getByLabel('Câu lạc bộ đối tác').selectOption({ label: 'CLB Robotics' });
    await form.getByLabel('Thời gian dự kiến').selectOption({ label: 'Tháng 1/2027' });
    await form.getByLabel('Tên hoạt động phối hợp').fill(title);
    await form.getByLabel('Lĩnh vực').selectOption('CN');
    await form
      .getByLabel(/^Nội dung hợp tác/)
      .fill('Inkstep phụ trách phần mềm điều khiển, Câu lạc bộ Robotics phụ trách phần cứng và sân thi đấu cho các đội học sinh.');
    await form.getByRole('button', { name: 'Gửi đề xuất hợp tác' }).click();
    await expect(notice(page)).toContainText(`Đã gửi đề xuất hợp tác “${title}” tới CLB Robotics.`);
    await expect(card(page, title)).toContainText('Gửi tới CLB Robotics');
    await expect(card(page, title)).toContainText('Thời gian dự kiến: Tháng 1/2027');

    // CLB Robotics receives it and declines with a reason.
    await page.getByLabel('Câu lạc bộ đại diện').selectOption({ label: 'CLB Robotics' });
    await expect(card(page, title)).toContainText('Từ Inkstep');
    await card(page, title).getByRole('button', { name: `Từ chối đề xuất “${title}”` }).click();
    const decline = page.getByRole('dialog', { name: 'Từ chối đề xuất hợp tác' });
    await decline.getByLabel('Lý do (bắt buộc)').fill('Câu lạc bộ đang chuẩn bị cho giải đấu khu vực trong tháng 1/2027.');
    await decline.getByRole('button', { name: 'Từ chối' }).click();
    await expect(card(page, title)).toContainText('Đã từ chối');

    // Back to Inkstep: the answer is shown on the proposal it sent.
    await page.getByLabel('Câu lạc bộ đại diện').selectOption({ label: 'Inkstep' });
    await expect(card(page, title)).toContainText('CLB Robotics phản hồi ngày');
    await expect(card(page, title)).toContainText('giải đấu khu vực');
    await expect(card(page, title).getByRole('button', { name: 'Rút đề xuất' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
