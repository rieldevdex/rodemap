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
npm run dev:api      # Worker tại http://localhost:8788, tự thực hiện npm run build (Vite chuyển tiếp /api tới đây)
```

Các lệnh kiểm tra chất lượng:

| Lệnh | Nội dung |
|---|---|
| `npm run check` | Thực hiện toàn bộ các bước bên dưới |
| `npm run lint` | ESLint (TypeScript nghiêm ngặt) |
| `npm run lint:tokens` | Kiểm tra giá trị thiết kế chỉ lấy từ `src/styles/tokens.css` |
| `npm run lint:copy` | Kiểm tra văn phong tiếng Việt (từ ngữ khẩu ngữ, cấu trúc khẩu hiệu, biểu tượng cảm xúc) |
| `npm run lint:contrast` | Kiểm tra độ tương phản của bốn chế độ màu ở giao diện sáng và tối |
| `npm test` | Kiểm thử đơn vị (Vitest) |
| `npm run e2e` | Kiểm thử luồng trình diễn (dùng thử → thiết lập hồ sơ → lộ trình → lịch → tệp .ics; Mochi trực tuyến và ngoại tuyến; bảng Giao diện và mật độ nội dung), hoạt động khi không có mạng và khả năng tiếp cận ở mọi chế độ màu (Playwright + axe) |
| `npm run size` | Kiểm tra dung lượng JavaScript tải lần đầu (giới hạn 200 KB sau nén gzip) |
| `npm run screens` | Chụp ảnh màn hình mọi trang ở 390 px và 1440 px, giao diện sáng và tối |

## 3. Triển khai lên Cloudflare Workers

Rodemap được triển khai dưới dạng một Cloudflare Worker kèm tài nguyên tĩnh: bản dựng trong thư mục `dist/` được phục vụ trực tiếp, còn `worker/index.ts` chỉ tiếp nhận các yêu cầu `/api/*` (Mochi tại `/api/mochi`). Toàn bộ cấu hình nằm trong `wrangler.toml`.

1. Đưa mã nguồn lên GitHub.
2. Trong Cloudflare: **Workers & Pages → Create → Import a repository**, chọn kho mã.
3. Đặt tên Worker trùng với giá trị `name` trong `wrangler.toml` (`rodemap`). Giữ nguyên *Deploy command* mặc định `npx wrangler deploy`; không cần khai báo *Build command* vì lệnh này tự thực hiện `npm run build` (mục `[build]` trong `wrangler.toml`).
4. Khóa API Claude được lưu trong Supabase: Edge Function `rodemap-mochi` (thư mục `supabase/functions/rodemap-mochi`) đọc secret `RODEMAP_ANTHROPIC_API_KEY`, hoặc `ANTHROPIC_API_KEY` dùng chung của dự án, và sử dụng mô hình Claude Haiku 5.5 (`claude-haiku-5-5`). Worker chuyển tiếp `/api/mochi` tới địa chỉ `MOCHI_RELAY_URL` khai báo trong `wrangler.toml`; không cần khai báo khóa trên Cloudflare. Để cập nhật Edge Function sau khi thay đổi mã Mochi, thực hiện `npm run build:supabase` rồi triển khai tệp `dist-supabase/rodemap-mochi/index.ts` làm `index.ts` của function (Supabase CLI hoặc trang quản trị, bật kiểm tra JWT). Tùy chọn: khai báo secret `RODEMAP_MOCHI_MODEL` hoặc `RODEMAP_MOCHI_EFFORT` (`low`, `medium`, `high`; mặc định `low`) trong Supabase để thay đổi mô hình hoặc mức suy luận; khai báo secret `ANTHROPIC_API_KEY` trực tiếp trên Worker nếu muốn Worker gọi Claude mà không qua Supabase.
5. Triển khai. Khóa API chỉ nằm trên máy chủ và không bao giờ được gửi tới trình duyệt.

**Giới hạn câu hỏi của Mochi.** Mỗi trình duyệt được hỏi Mochi 20 câu mỗi tuần, toàn bộ Rodemap tối đa 500 câu mỗi tuần; tuần tính từ 00:00 Thứ Hai đến hết Chủ nhật (giờ Việt Nam). Một câu hỏi là một tin nhắn của học sinh; các lượt Mochi tra cứu dữ liệu sau đó không bị tính thêm nhưng được giới hạn tối đa năm lượt cho mỗi câu hỏi. Khi hết lượt, Mochi thông báo cho học sinh và tiếp tục trả lời ở chế độ ngoại tuyến đến 00:00 Thứ Hai tuần sau; phía dưới ô nhập hiển thị số câu hỏi còn lại trong tuần.
- Bộ đếm nằm trong cơ sở dữ liệu Supabase: bảng `rodemap.mochi_usage` và hàm `public.rodemap_mochi_take` (tệp `supabase/migrations/20261013120000_rodemap_mochi_usage.sql`). Bảng chỉ lưu mã băm SHA-256 của một mã ngẫu nhiên do trình duyệt tạo ra cùng số lượt theo tuần; không lưu địa chỉ IP hay thông tin của học sinh. Có thể xóa các tuần cũ bằng lệnh ghi trong tệp migration.
- Đổi giới hạn bằng secret `RODEMAP_MOCHI_WEEKLY_PER_BROWSER` và `RODEMAP_MOCHI_WEEKLY_TOTAL` của Edge Function, không cần sửa mã.
- Nếu không kiểm tra được bộ đếm, Mochi từ chối yêu cầu thay vì bỏ qua giới hạn.
- Nên đặt thêm giới hạn chi tiêu hằng tháng cho workspace chứa khóa API trong Claude Console để chặn chi phí ở mức tài khoản.

Ngoài ra, mỗi trình duyệt được gửi tối đa 40 yêu cầu và mỗi địa chỉ mạng tối đa 400 yêu cầu trong 10 phút, nhằm tránh gửi dồn dập mà không chặn cả lớp dùng chung mạng của trường. Tùy chọn: để giới hạn ngắn hạn này bền vững giữa các máy chủ của Worker, tạo một KV namespace và gắn với tên `MOCHI_RATE_LIMIT` (xem `wrangler.toml`). Khi Worker gọi Claude trực tiếp (secret `ANTHROPIC_API_KEY` trên Worker), chỉ có giới hạn ngắn hạn được áp dụng.

## 4. Chuẩn bị trước Ngày bầu cử

1. Mở trang đã triển khai trên máy dùng để trình chiếu **ít nhất một lần khi có kết nối mạng**: service worker lưu toàn bộ ứng dụng vào bộ nhớ đệm, nhờ đó các trang vẫn mở được khi mạng tại hội trường gián đoạn và Mochi tự động trả lời ở chế độ ngoại tuyến.
2. Mở **Tài khoản minh họa** (góc trên bên phải) → **Xóa dữ liệu trên trình duyệt này** → **Xác nhận xóa** để đưa ứng dụng về trạng thái của người dùng mới (khách dùng thử, chưa có hồ sơ).
3. Tùy chọn trong cùng trình đơn:
   - **Ngày minh họa**: cố định "hôm nay" (ví dụ ngày bầu cử) để bảng tin, hạn đăng ký và lộ trình hiển thị ổn định;
   - **Chuyển Mochi sang chế độ ngoại tuyến**: Mochi sử dụng phản hồi chuẩn bị sẵn, không phụ thuộc mạng.
4. Thực hiện thử luồng trình diễn: Trang chủ → Bắt đầu thiết lập lộ trình → hoàn tất bốn bước → nhận đề xuất của Mochi → Xác nhận đăng ký → kiểm tra sự kiện trên Lộ trình và Lịch của tôi → Xuất toàn bộ lịch.

## 5. Thay dữ liệu minh họa bằng dữ liệu thật

Dữ liệu nằm trong `src/data/` (mỗi tệp đều ghi chú là dữ liệu minh họa): `clubs.ts`, `events.ts`, `calendar.ts` (các đợt kiểm tra định kỳ, ngày nghỉ), `seed.ts` (hồ sơ học sinh minh họa, chỉ dùng cho kiểm thử và ảnh chụp màn hình), `school.ts` (tên trường: Vinschool Smart City), `news.ts` (các bài viết của Bản tin Hội đồng Học sinh; mỗi bài viết ký tên một ban, không ghi họ tên học sinh), `proposals.ts` (đề xuất hoạt động của học sinh, chỉ ghi khối của người gửi; đề xuất hợp tác giữa các câu lạc bộ và các phản hồi minh họa). Thông tin ứng cử viên (họ và tên, lớp, vị trí ứng tuyển, thông điệp tranh cử; hiển thị trên trang Đề án) và thời gian dự kiến của từng giai đoạn trên trang Đề án nằm trong `src/content/proposal.ts`. Sau khi thay, thực hiện `npm run check` để đảm bảo dữ liệu hợp lệ.

Đơn vị đăng tin và cuộc thi ngoài trường:

- Mỗi mục trong `clubs.ts` có trường `kind`: `'club'` (câu lạc bộ), `'council'` (Hội đồng Học sinh, phụ trách sự kiện toàn trường) hoặc `'office'` (Phòng Cố vấn Học tập, mã `co-van-hoc-tap`). Danh sách câu lạc bộ và sự kiện của câu lạc bộ được tổng hợp từ Phòng Công tác Học sinh.
- Các cuộc thi học thuật ngoài trường (ví dụ cuộc thi do trường đại học tổ chức), trước đây đăng trên Google Site của Phòng Cố vấn Học tập, là các sự kiện trong `events.ts` có `clubId: 'co-van-hoc-tap'` và trường `organizer` ghi đơn vị tổ chức bên ngoài. Rodemap hiển thị nhãn "Cuộc thi ngoài trường", đơn vị tổ chức và nguồn thông tin là Phòng Cố vấn Học tập; sau khi học sinh đăng ký trên Rodemap, Phòng tổng hợp danh sách và hướng dẫn các bước nộp hồ sơ theo quy định của đơn vị tổ chức. Dữ liệu minh họa chỉ dùng tên đơn vị chung (ví dụ "Trường đại học đối tác").
- Phòng Cố vấn Học tập tự cập nhật cuộc thi qua **Cổng câu lạc bộ** (Tài khoản minh họa → vai trò **Câu lạc bộ** → **Đơn vị đại diện**: Phòng Cố vấn Học tập); biểu mẫu khi đó có thêm trường bắt buộc **Đơn vị tổ chức**. Chỉ các câu lạc bộ (`kind: 'club'`) tham gia trang Đề xuất (câu lạc bộ phù hợp, câu lạc bộ đối tác).

## 6. Hồ sơ học sinh và khối lớp

Rodemap dành cho học sinh từ khối 6 đến khối 12 (trung học cơ sở và trung học phổ thông). Học sinh có thể **dùng thử** trước khi thiết lập hồ sơ: trang Tổng quan dành cho khách cho phép chọn khối và lĩnh vực quan tâm để xem gợi ý sự kiện (lựa chọn chỉ được lưu trên trình duyệt và được điền sẵn khi thiết lập hồ sơ); các trang Khám phá, Chi tiết sự kiện, Lộ trình, Câu lạc bộ, Bản tin và Đề xuất (chỉ xem) đều mở cho khách. Hồ sơ gồm bốn bước (khối và lớp, lĩnh vực quan tâm, mục tiêu, thời gian có thể tham gia) và cần thiết để đăng ký sự kiện, gửi hoặc ủng hộ đề xuất, sử dụng Lịch, Hồ sơ năng lực, Mochi và các trang của vai trò trình diễn; khi đó Rodemap chuyển tới trang Thiết lập hồ sơ rồi trở lại trang trước đó. Mỗi sự kiện ghi rõ các khối được phép tham gia (`eligibleGrades` trong `src/data/events.ts`); sự kiện dành cho mọi khối được hiển thị là "Khối 6–12 (toàn trường)".

### Giao diện và mật độ nội dung

Nút **Giao diện** (biểu tượng bảng màu trên thanh tiêu đề) cho phép chọn chế độ màu (Lộ trình, Rực rỡ, Áp phích, Dịu nhẹ), độ sáng (Theo hệ thống, Sáng, Tối) và mật độ nội dung (Đầy đủ, Gọn, Tối giản). Lựa chọn được áp dụng ngay và lưu trên trình duyệt; bản in luôn dùng chế độ Lộ trình sáng. Quy cách của từng chế độ nằm trong `DESIGN.md` §2.4 và §10.

## 7. Bản tin Hội đồng Học sinh

Trang **Bản tin** (`/ban-tin`) trình bày các bài viết của Hội đồng Học sinh theo từng số hằng tháng. Để đăng bài trong bản trình diễn: mở **Tài khoản minh họa** → chọn vai trò **HĐHS** → **Bản tin** → **Soạn bài viết**. Bài viết được hiển thị ngay sau khi nhấn **Đăng bài**, đồng thời xuất hiện tại trang Tổng quan, trang của các sự kiện được liên kết và trang của câu lạc bộ tổ chức các sự kiện đó. Mochi có thể giới thiệu bài viết khi học sinh hỏi về thông báo mới. Bài viết đăng trong bản trình diễn được lưu trên trình duyệt, luôn hiển thị dù ngày minh họa được đặt là ngày nào, và có thể gỡ bằng nút **Gỡ bài viết**.

## 8. Đề xuất hoạt động và đề xuất hợp tác

Trang **Đề xuất** (`/de-xuat`) thay đổi theo vai trò trong **Tài khoản minh họa**:

- **Học sinh** gửi đề xuất hoạt động hoặc sự kiện tới Hội đồng Học sinh (tên hoạt động, lĩnh vực, khối dự kiến tham gia, câu lạc bộ phù hợp nếu có, nội dung). Đề xuất chỉ hiển thị khối của người gửi, không ghi họ tên; biểu mẫu từ chối nội dung có số điện thoại hoặc địa chỉ thư điện tử. Học sinh có thể ủng hộ đề xuất của học sinh khác, lọc theo trạng thái và rút đề xuất của mình khi chưa được phản hồi.
- **HĐHS** xem xét đề xuất của học sinh: **Tiếp nhận** (có thể giao câu lạc bộ phụ trách) hoặc **Không tiếp nhận** (bắt buộc nêu lý do). Trang Kiểm duyệt hiển thị số đề xuất đang chờ xem xét.
- **Câu lạc bộ** gửi **đề xuất hợp tác** tới câu lạc bộ khác (câu lạc bộ đối tác, tháng dự kiến, nội dung và phân công), đồng ý hoặc từ chối đề xuất nhận được (bắt buộc nêu lý do khi từ chối), và theo dõi đề xuất của học sinh nêu tên hoặc được giao cho câu lạc bộ. Sau khi hai bên thống nhất, câu lạc bộ chủ trì gửi sự kiện qua Cổng câu lạc bộ để Hội đồng Học sinh kiểm duyệt.

Đề xuất và phản hồi trong bản trình diễn được lưu trên trình duyệt; thanh điều hướng hiển thị mục **Đề xuất** với vai trò Học sinh, còn với vai trò Câu lạc bộ hoặc HĐHS trang được mở từ Cổng CLB hoặc Kiểm duyệt.

## 9. Cấu trúc mã nguồn

Xem `docs/ARCHITECTURE.md` (kiến trúc và giao kèo giữa các lớp) và `DESIGN.md` (hệ thống thiết kế).
