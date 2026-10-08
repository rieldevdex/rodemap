# Rodemap

Rodemap tổng hợp sự kiện của các câu lạc bộ vào một nền tảng duy nhất, phân loại theo lĩnh vực và sắp xếp trên dòng thời gian, đồng thời hỗ trợ học sinh xây dựng lộ trình cá nhân và hồ sơ năng lực. Trợ lý Mochi hỗ trợ học sinh lựa chọn sự kiện, đăng ký tham gia và sắp xếp lịch cá nhân.

> **Bản trình diễn · Dữ liệu minh họa.** Toàn bộ câu lạc bộ, sự kiện và hồ sơ trong ứng dụng là dữ liệu minh họa phục vụ đề xuất tranh cử Hội đồng Học sinh nhiệm kỳ 2026–2027 (riêng câu lạc bộ Inkstep là câu lạc bộ có thật).

## 1. Yêu cầu

- Node.js 20 trở lên (khuyến nghị Node.js 22) và npm.
- Tài khoản Cloudflare (gói miễn phí) để triển khai.
- Khóa API Claude (không bắt buộc). Khi không có khóa, Mochi tự động hoạt động ở **chế độ ngoại tuyến**.

## 2. Cài đặt và sử dụng trên máy cá nhân

```bash
npm install
npm run dev          # máy chủ phát triển tại http://localhost:5173
```

Để thử Mochi với khóa API trên máy cá nhân:

```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .dev.vars   # tệp này không được đưa lên Git
npm run build
npm run dev:api      # Pages Function tại http://localhost:8788 (Vite chuyển tiếp /api tới đây)
```

Các lệnh kiểm tra chất lượng:

| Lệnh | Nội dung |
|---|---|
| `npm run check` | Thực hiện toàn bộ các bước bên dưới |
| `npm run lint` | ESLint (TypeScript nghiêm ngặt) |
| `npm run lint:tokens` | Kiểm tra giá trị thiết kế chỉ lấy từ `src/styles/tokens.css` |
| `npm run lint:copy` | Kiểm tra văn phong tiếng Việt (từ ngữ khẩu ngữ, cấu trúc khẩu hiệu, biểu tượng cảm xúc) |
| `npm test` | Kiểm thử đơn vị (Vitest) |
| `npm run e2e` | Kiểm thử luồng trình diễn (thiết lập hồ sơ → lộ trình → lịch → tệp .ics; Mochi trực tuyến và ngoại tuyến), hoạt động khi không có mạng và khả năng tiếp cận (Playwright + axe) |
| `npm run size` | Kiểm tra dung lượng JavaScript tải lần đầu (giới hạn 200 KB sau nén gzip) |
| `npm run screens` | Chụp ảnh màn hình mọi trang ở 390 px và 1440 px, giao diện sáng và tối |

## 3. Triển khai lên Cloudflare Pages

1. Đưa mã nguồn lên GitHub.
2. Trong Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**, chọn kho mã.
3. Cấu hình bản dựng: *Build command* `npm run build`, *Build output directory* `dist`.
4. Mục **Settings → Variables and Secrets**:
   - thêm **Secret** `ANTHROPIC_API_KEY` (khóa API Claude);
   - tùy chọn biến `MOCHI_MODEL` (mặc định `claude-opus-5-5`) và `MOCHI_EFFORT` (`low`, `medium` hoặc `high`, mặc định `low`).
5. Triển khai. Thư mục `functions/` được Cloudflare tự động triển khai thành Pages Function `/api/mochi`. Khóa API chỉ nằm trên máy chủ và không bao giờ được gửi tới trình duyệt.

Tùy chọn: để giới hạn tần suất truy cập Mochi một cách bền vững giữa các máy chủ, tạo một KV namespace và gắn với tên `MOCHI_RATE_LIMIT` (xem `wrangler.toml`).

## 4. Chuẩn bị trước Ngày bầu cử

1. Mở trang đã triển khai trên máy dùng để trình chiếu **ít nhất một lần khi có kết nối mạng**: service worker lưu toàn bộ ứng dụng vào bộ nhớ đệm, nhờ đó các trang vẫn mở được khi mạng tại hội trường gián đoạn và Mochi tự động trả lời ở chế độ ngoại tuyến.
2. Mở **Tài khoản minh họa** (góc trên bên phải) → **Khôi phục dữ liệu minh họa** → **Xác nhận** để đưa dữ liệu về trạng thái ban đầu.
3. Tùy chọn trong cùng trình đơn:
   - **Ngày minh họa**: cố định "hôm nay" (ví dụ ngày bầu cử) để bảng tin, hạn đăng ký và lộ trình hiển thị ổn định;
   - **Chuyển Mochi sang chế độ ngoại tuyến**: Mochi sử dụng phản hồi chuẩn bị sẵn, không phụ thuộc mạng.
4. Thực hiện thử luồng trình diễn: Trang chủ → Bắt đầu thiết lập lộ trình → hoàn tất bốn bước → nhận đề xuất của Mochi → Xác nhận đăng ký → kiểm tra sự kiện trên Lộ trình và Lịch của tôi → Xuất toàn bộ lịch.

## 5. Thay dữ liệu minh họa bằng dữ liệu thật

Dữ liệu nằm trong `src/data/` (mỗi tệp đều ghi chú là dữ liệu minh họa): `clubs.ts`, `events.ts`, `calendar.ts` (các đợt kiểm tra định kỳ, ngày nghỉ), `seed.ts` (hồ sơ minh họa), `school.ts` (tên trường), `news.ts` (các bài viết của Bản tin Hội đồng Học sinh; mỗi bài viết ký tên một ban, không ghi họ tên học sinh). Thông tin ứng cử viên (`[Họ và tên]`, `[Lớp]`, `[Vị trí ứng tuyển]`, `[Thông điệp tranh cử]`) và thời gian dự kiến của từng giai đoạn trên trang Đề án nằm trong `src/content/proposal.ts`. Sau khi thay, thực hiện `npm run check` để đảm bảo dữ liệu hợp lệ.

## 6. Bản tin Hội đồng Học sinh

Trang **Bản tin** (`/ban-tin`) trình bày các bài viết của Hội đồng Học sinh theo từng số hằng tháng. Để đăng bài trong bản trình diễn: mở **Tài khoản minh họa** → chọn vai trò **HĐHS** → **Bản tin** → **Soạn bài viết**. Bài viết hiển thị ngay sau khi nhấn **Đăng bài**, xuất hiện tại trang Tổng quan, trang các sự kiện được liên kết, và Mochi có thể giới thiệu bài viết khi học sinh hỏi về thông báo mới. Bài viết đăng trong bản trình diễn được lưu trên trình duyệt và có thể gỡ bằng nút **Gỡ bài viết**.

## 7. Cấu trúc mã nguồn

Xem `docs/ARCHITECTURE.md` (kiến trúc và giao kèo giữa các lớp) và `DESIGN.md` (hệ thống thiết kế).
