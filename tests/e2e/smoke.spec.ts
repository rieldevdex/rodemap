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

  test('the footer names the council, and no page reads as a demo or a campaign', async ({ page }) => {
    await seedDemo(page);
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await expect(footer).toContainText('Do Hội đồng Học sinh vận hành');
    for (const path of ['/', '/gioi-thieu', '/cau-lac-bo', '/ban-tin']) {
      await page.goto(path);
      await expect(page.getByText(/trình diễn|minh họa|tranh cử|ứng cử/i), path).toHaveCount(0);
    }
    // The old campaign address opens Giới thiệu.
    await page.goto('/de-an');
    await expect(page.locator('#main-heading')).toHaveText('Giới thiệu vsmcclubs');
    await footer.getByRole('link', { name: 'Giới thiệu' }).click();
    await expect(page).toHaveURL('/gioi-thieu');
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
        const raw = JSON.parse(window.localStorage.getItem('vsmcclubs:v1') ?? '{}') as Record<string, unknown>;
        window.localStorage.setItem('vsmcclubs:v1', JSON.stringify({ ...raw, density: value }));
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

test.describe('real clubs', () => {
  test('a club page lists only the club address and public pages', async ({ page }) => {
    const errors = trackErrors(page);
    await seedDemo(page);
    await page.goto('/cau-lac-bo/green-guardian');
    await expect(page.locator('#main-heading')).toHaveText('Green Guardian');
    const contact = page.getByRole('list', { name: 'Liên hệ' });
    await expect(contact.getByRole('link', { name: 'greenguardian.clb@gmail.com' })).toHaveAttribute('href', 'mailto:greenguardian.clb@gmail.com');
    const facebook = contact.getByRole('link', { name: /^Facebook/ });
    await expect(facebook).toHaveAttribute('href', 'https://www.facebook.com/profile.php?id=61593971978293');
    await expect(facebook).toHaveAttribute('target', '_blank');
    await expect(facebook).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(contact.getByRole('link', { name: /^Instagram/ })).toHaveAttribute('href', 'https://www.instagram.com/greenguardian.clb/');
    // A club that published nothing says so.
    await page.goto('/cau-lac-bo/vprc');
    await expect(page.getByText('Câu lạc bộ chưa công bố thông tin liên hệ.')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('an event announced by date only shows its date, says the rest is pending and does not open registration', async ({ page }) => {
    const errors = trackErrors(page);
    await seedDemo(page);
    await page.goto('/su-kien/chung-ket-vbis-innovation-challenge-2027');
    await expect(page.locator('#main-heading')).toHaveText('Chung kết Cuộc thi khởi nghiệp cấp trường VBIS Innovation Challenge');
    await expect(page.getByText('Thứ Bảy, 30/01/2027').first()).toBeVisible();
    await expect(page.getByText('Thời gian và địa điểm: đang cập nhật')).toBeVisible();
    await expect(page.getByText('Chưa mở đăng ký.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng ký', exact: true })).toHaveCount(0);
    const facts = page.locator('.event-detail__facts');
    await expect(facts).toContainText('Giờ tổ chức: đang cập nhật');
    await expect(facts).toContainText('Đang cập nhật (chưa mở đăng ký)');
    await expect(facts).not.toContainText('00:00');
    expect(errors).toEqual([]);
  });
});
