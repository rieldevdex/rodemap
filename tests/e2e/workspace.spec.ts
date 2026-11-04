import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import type { WsSnapshot, WsTask } from '../../src/domain/workspace';
import { SESSION_STORAGE_KEY, SUPABASE_URL } from '../../src/workspace/config';
import { trackErrors } from '../support/app';

/** Fictional council (never the real member list). */
const ME = 'm-head';

function task(overrides: Partial<WsTask>): WsTask {
  return {
    id: 't-0',
    title: 'Viết caption bài đăng',
    description: '',
    output: 'Caption đã duyệt',
    departmentId: 'pr',
    collaborators: ['design'],
    assigneeId: 'm-member',
    dueAt: '2099-11-20T16:59:00+00:00',
    status: 'todo',
    link: '',
    quality: null,
    revisionCount: 0,
    submittedAt: null,
    completedAt: null,
    lateNoticeAt: null,
    lateNoticeReason: '',
    lateApproved: false,
    source: 'masterplan',
    requestId: null,
    createdBy: null,
    createdAt: '2026-11-04T09:00:00+00:00',
    updatedAt: '2026-11-04T09:00:00+00:00',
    ...overrides,
  };
}

function snapshot(): WsSnapshot {
  return {
    me: ME,
    departments: [
      { id: 'bdh', name: 'Ban điều hành', shortName: 'BĐH' },
      { id: 'pr', name: 'Ban Truyền thông (PR)', shortName: 'PR' },
      { id: 'hr', name: 'Ban Nhân sự', shortName: 'Nhân sự' },
      { id: 'tai-chinh', name: 'Ban Tài chính', shortName: 'Tài chính' },
      { id: 'design', name: 'Ban Design', shortName: 'Design' },
      { id: 'su-kien', name: 'Ban Sự kiện', shortName: 'Sự kiện' },
    ],
    members: [
      { id: ME, fullName: 'Trưởng ban Thử nghiệm', className: '11A1', departmentId: 'pr', position: 'truong_ban', status: 'active', joinedOn: '2026-11-04', email: null, linked: true },
      { id: 'm-member', fullName: 'Thành viên Thử nghiệm', className: '10A2', departmentId: 'pr', position: 'thanh_vien', status: 'active', joinedOn: '2026-11-04', email: null, linked: false },
      { id: 'm-design', fullName: 'Thiết kế Thử nghiệm', className: '9A3', departmentId: 'design', position: 'truong_ban', status: 'active', joinedOn: '2026-11-04', email: null, linked: false },
    ],
    tasks: [
      task({ id: 't-1', title: 'Lên ý tưởng truyền thông 20/11', assigneeId: ME }),
      task({ id: 't-2', title: 'Viết caption bài chào mừng', status: 'submitted', link: 'https://example.com/caption', submittedAt: '2026-11-05T09:00:00+00:00' }),
      task({ id: 't-3', title: 'Đăng bài lịch chụp ảnh', assigneeId: null, dueAt: null }),
    ],
    requests: [
      {
        id: 'r-1',
        fromMember: 'm-design',
        fromDepartment: 'design',
        toDepartment: 'pr',
        title: 'Gửi nội dung chữ cho bài 20/11',
        description: 'Ban Design cần nội dung chữ để hoàn thiện thiết kế bài đăng 20/11.',
        dueAt: '2099-11-12T16:59:00+00:00',
        status: 'open',
        answerNote: '',
        answeredBy: null,
        answeredAt: null,
        taskId: null,
        createdAt: '2026-11-04T09:00:00+00:00',
      },
    ],
  };
}

/** A signed-in school session in this browser and a mocked database API that records the calls. */
async function signedIn(page: Page): Promise<{ calls: { fn: string; body: unknown }[] }> {
  const calls: { fn: string; body: unknown }[] = [];
  const user = { id: 'u-1', aud: 'authenticated', role: 'authenticated', email: 'thu.nghiem@stu.vinschool.edu.vn', app_metadata: {}, user_metadata: {}, created_at: '2026-11-04T00:00:00Z' };
  const session = { access_token: 'test-token', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'test-refresh', user };
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [SESSION_STORAGE_KEY, JSON.stringify(session)] as const,
  );
  let data = snapshot();
  await page.route(`${SUPABASE_URL}/**`, async (route: Route) => {
    const url = new URL(route.request().url());
    const fn = url.pathname.replace('/rest/v1/rpc/', '');
    const body: unknown = route.request().postDataJSON();
    calls.push({ fn, body });
    if (fn === 'hdhs_me') return route.fulfill({ json: { status: 'ok', memberId: ME } });
    if (fn === 'hdhs_snapshot') return route.fulfill({ json: data });
    if (fn === 'hdhs_task_action') {
      const { p_task: id, p_action: action } = body as { p_task: string; p_action: string };
      data = { ...data, tasks: data.tasks.map((t) => (t.id === id && action === 'complete' ? { ...t, status: 'done', quality: 4 } : t)) };
      return route.fulfill({ json: {} });
    }
    return route.fulfill({ json: {} });
  });
  return { calls };
}

test.describe('Không gian HĐHS', () => {
  test('a visitor sees the school sign-in, not the council data', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/hdhs');
    await expect(page.locator('#main-heading')).toHaveText('Không gian HĐHS');
    await expect(page.getByRole('button', { name: 'Đăng nhập bằng tài khoản trường' })).toBeVisible();
    await expect(page.getByRole('tablist')).toHaveCount(0);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('a head reviews a submitted task, answers a request slip and browses the departments', async ({ page }) => {
    const errors = trackErrors(page);
    const { calls } = await signedIn(page);
    await page.goto('/hdhs');
    await expect(page.locator('.workspace__whoami')).toContainText('Trưởng ban Thử nghiệm');
    const tabs = page.getByRole('tablist', { name: 'Không gian HĐHS' });
    await expect(tabs.getByRole('tab', { name: /Việc của tôi/ })).toHaveAttribute('aria-selected', 'true');
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);

    // Review: completing needs a quality rating from 1 to 5.
    const review = page.getByRole('region', { name: 'Cần bạn duyệt' });
    await review.getByRole('button', { name: 'Duyệt hoàn thành' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Duyệt hoàn thành' })).toBeDisabled();
    await dialog.getByRole('radio', { name: '4' }).check();
    await dialog.getByRole('button', { name: 'Duyệt hoàn thành' }).click();
    await expect(page.getByRole('region', { name: 'Cần bạn duyệt' })).toHaveCount(0);
    expect(calls.find((c) => c.fn === 'hdhs_task_action')?.body).toEqual({ p_task: 't-2', p_action: 'complete', p_link: '', p_quality: 4, p_note: '' });

    // Unassigned work of the department is listed for the head.
    await expect(page.getByRole('region', { name: 'Việc của ban chưa có người thực hiện' })).toContainText('Đăng bài lịch chụp ảnh');

    // Request slips: arrow keys move between tabs.
    await tabs.getByRole('tab', { name: /Việc của tôi/ }).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(tabs.getByRole('tab', { name: /Phiếu yêu cầu/ })).toBeFocused();
    await page.keyboard.press('Enter');
    const incoming = page.getByRole('region', { name: /Gửi tới ban của tôi/ });
    await expect(incoming).toContainText('Gửi nội dung chữ cho bài 20/11');
    await incoming.getByRole('button', { name: 'Không tiếp nhận' }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Không tiếp nhận' })).toBeDisabled();
    await page.getByRole('dialog').getByRole('button', { name: 'Quay lại' }).click();

    // A slip to the department itself is refused before sending.
    const form = page.getByRole('form', { name: 'Gửi phiếu yêu cầu' });
    await form.getByRole('button', { name: 'Gửi phiếu yêu cầu' }).click();
    await expect(form.getByText('Tên yêu cầu cần có từ 5 đến 160 ký tự.')).toBeVisible();

    // Board: other departments are read-only for a PR head.
    await tabs.getByRole('tab', { name: 'Công việc các ban' }).click();
    await expect(page.getByRole('button', { name: 'Thêm công việc' })).toBeVisible();
    await page.getByRole('group', { name: 'Chọn ban' }).getByRole('button', { name: 'Design' }).click();
    await expect(page.getByRole('button', { name: 'Thêm công việc' })).toHaveCount(0);

    // Members: names by department; no e-mail column for a PR head.
    await tabs.getByRole('tab', { name: 'Thành viên' }).click();
    await expect(page.getByRole('table', { name: 'Thành viên Ban Truyền thông (PR)' })).toContainText('Thành viên Thử nghiệm');
    await expect(page.getByRole('columnheader', { name: 'Đăng nhập' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
