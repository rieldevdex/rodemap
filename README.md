# vsmcclubs

vsmcclubs tổng hợp sự kiện của các câu lạc bộ vào một nền tảng duy nhất, phân loại theo lĩnh vực và sắp xếp trên dòng thời gian, đồng thời hỗ trợ học sinh xây dựng lộ trình cá nhân và hồ sơ năng lực. Trợ lý Mochi hỗ trợ học sinh lựa chọn sự kiện, đăng ký tham gia và sắp xếp lịch cá nhân.

> vsmcclubs do Hội đồng Học sinh Vinschool Smart City vận hành. Trang chỉ hiển thị dữ liệu chính thức: 20 câu lạc bộ theo danh sách của nhà trường (cập nhật ngày 03/11/2026), các sự kiện câu lạc bộ đã công bố và hai bài hướng dẫn của Bản tin. Dữ liệu mẫu dùng cho kiểm thử nằm riêng trong `src/testing/` và không bao giờ được đưa lên trang.

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

vsmcclubs được triển khai dưới dạng một Cloudflare Worker kèm tài nguyên tĩnh: bản dựng trong thư mục `dist/` được phục vụ trực tiếp, còn `worker/index.ts` chỉ tiếp nhận các yêu cầu `/api/*` (Mochi tại `/api/mochi`). Toàn bộ cấu hình nằm trong `wrangler.toml`.

1. Đưa mã nguồn lên GitHub.
2. Trong Cloudflare: **Workers & Pages → Create → Import a repository**, chọn kho mã.
3. Đặt tên Worker trùng với giá trị `name` trong `wrangler.toml` (`rodemap`). Giữ nguyên *Deploy command* mặc định `npx wrangler deploy`; không cần khai báo *Build command* vì lệnh này tự thực hiện `npm run build` (mục `[build]` trong `wrangler.toml`).
4. Khóa API Claude được lưu trong Supabase: Edge Function `rodemap-mochi` (thư mục `supabase/functions/rodemap-mochi`) đọc secret `RODEMAP_ANTHROPIC_API_KEY`, hoặc `ANTHROPIC_API_KEY` dùng chung của dự án, và sử dụng mô hình Claude Haiku 5.5 (`claude-haiku-5-5`). Worker chuyển tiếp `/api/mochi` tới địa chỉ `MOCHI_RELAY_URL` khai báo trong `wrangler.toml`; không cần khai báo khóa trên Cloudflare. Để cập nhật Edge Function sau khi thay đổi mã Mochi, thực hiện `npm run build:supabase` rồi triển khai tệp `dist-supabase/rodemap-mochi/index.ts` làm `index.ts` của function (Supabase CLI hoặc trang quản trị, bật kiểm tra JWT). Tùy chọn: khai báo secret `RODEMAP_MOCHI_MODEL` hoặc `RODEMAP_MOCHI_EFFORT` (`low`, `medium`, `high`; mặc định `low`) trong Supabase để thay đổi mô hình hoặc mức suy luận; khai báo secret `ANTHROPIC_API_KEY` trực tiếp trên Worker nếu muốn Worker gọi Claude mà không qua Supabase.
5. Triển khai. Khóa API chỉ nằm trên máy chủ và không bao giờ được gửi tới trình duyệt.

### Tên miền vsmcclubs.site

Trang được phục vụ tại **https://vsmcclubs.site**. Tên Worker, Edge Function, schema và các secret vẫn giữ tên cũ (`rodemap`, `rodemap-mochi`, `RODEMAP_*`) vì Workers Builds và Mochi đang gắn với các tên này; người dùng không nhìn thấy chúng. Để gắn tên miền:

1. Nếu tên miền chưa được quản lý bởi Cloudflare: trong trang quản trị Cloudflare chọn **Add a domain**, nhập `vsmcclubs.site`, chọn gói Free, rồi đổi nameserver tại nhà đăng ký tên miền theo hai nameserver Cloudflare cung cấp (thường có hiệu lực sau vài phút đến vài giờ). Bỏ qua bước này nếu tên miền được mua qua Cloudflare Registrar.
2. **Workers & Pages** → Worker `rodemap` → **Settings** → **Domains & Routes** → **Add** → **Custom domain** → nhập `vsmcclubs.site`. Cloudflare tự tạo bản ghi DNS và chứng chỉ HTTPS.
3. Thêm tiếp custom domain `www.vsmcclubs.site`, hoặc tạo quy tắc chuyển hướng từ `www` về `vsmcclubs.site` (**Rules** → **Redirect Rules**).
4. Kiểm tra: mở https://vsmcclubs.site, gửi một câu hỏi cho Mochi và tải tệp .ics từ trang Lịch (đường dẫn sự kiện trong tệp dùng tên miền đang truy cập).

Địa chỉ `*.workers.dev` cũ vẫn hoạt động; có thể tắt tại **Domains & Routes** sau khi tên miền mới chạy ổn định.

**Giới hạn câu hỏi của Mochi.** Mỗi trình duyệt được hỏi Mochi 20 câu mỗi tuần, toàn bộ vsmcclubs tối đa 500 câu mỗi tuần; tuần tính từ 00:00 Thứ Hai đến hết Chủ nhật (giờ Việt Nam). Một câu hỏi là một tin nhắn của học sinh; các lượt Mochi tra cứu dữ liệu sau đó không bị tính thêm nhưng được giới hạn tối đa năm lượt cho mỗi câu hỏi. Khi hết lượt, Mochi thông báo cho học sinh và tiếp tục trả lời ở chế độ ngoại tuyến đến 00:00 Thứ Hai tuần sau; phía dưới ô nhập hiển thị số câu hỏi còn lại trong tuần.
- Bộ đếm nằm trong cơ sở dữ liệu Supabase: bảng `rodemap.mochi_usage` và hàm `public.rodemap_mochi_take` (tệp `supabase/migrations/20261013120000_rodemap_mochi_usage.sql`). Bảng chỉ lưu mã băm SHA-256 của một mã ngẫu nhiên do trình duyệt tạo ra cùng số lượt theo tuần; không lưu địa chỉ IP hay thông tin của học sinh. Có thể xóa các tuần cũ bằng lệnh ghi trong tệp migration.
- Đổi giới hạn bằng secret `RODEMAP_MOCHI_WEEKLY_PER_BROWSER` và `RODEMAP_MOCHI_WEEKLY_TOTAL` của Edge Function, không cần sửa mã.
- Nếu không kiểm tra được bộ đếm, Mochi từ chối yêu cầu thay vì bỏ qua giới hạn.
- Nên đặt thêm giới hạn chi tiêu hằng tháng cho workspace chứa khóa API trong Claude Console để chặn chi phí ở mức tài khoản.

Ngoài ra, mỗi trình duyệt được gửi tối đa 40 yêu cầu và mỗi địa chỉ mạng tối đa 400 yêu cầu trong 10 phút, nhằm tránh gửi dồn dập mà không chặn cả lớp dùng chung mạng của trường. Tùy chọn: để giới hạn ngắn hạn này bền vững giữa các máy chủ của Worker, tạo một KV namespace và gắn với tên `MOCHI_RATE_LIMIT` (xem `wrangler.toml`). Khi Worker gọi Claude trực tiếp (secret `ANTHROPIC_API_KEY` trên Worker), chỉ có giới hạn ngắn hạn được áp dụng.

## 4. Trước một buổi giới thiệu vsmcclubs

1. Mở trang đã triển khai trên máy dùng để trình chiếu **ít nhất một lần khi có kết nối mạng**: service worker lưu toàn bộ ứng dụng vào bộ nhớ đệm, nhờ đó các trang vẫn mở được khi mạng tại hội trường gián đoạn và Mochi tự động trả lời ở chế độ ngoại tuyến.
2. Mở **Tài khoản thử nghiệm** (góc trên bên phải) → **Xóa dữ liệu trên trình duyệt này** → **Xác nhận xóa** để đưa ứng dụng về trạng thái của người dùng mới (khách dùng thử, chưa có hồ sơ).
3. Tùy chọn trong cùng trình đơn:
   - **Ngày hiển thị**: cố định "hôm nay" (ví dụ ngày giới thiệu) để bảng tin, hạn đăng ký và lộ trình hiển thị ổn định;
   - **Chuyển Mochi sang chế độ ngoại tuyến**: Mochi sử dụng phản hồi chuẩn bị sẵn, không phụ thuộc mạng.
4. Thực hiện thử luồng chính: Trang chủ → Bắt đầu thiết lập lộ trình → hoàn tất bốn bước → nhận đề xuất của Mochi → Xác nhận đăng ký → kiểm tra sự kiện trên Lộ trình và Lịch của tôi → Xuất toàn bộ lịch.

## 5. Cập nhật dữ liệu

Dữ liệu chính thức nằm trong `src/data/`: `clubs.ts`, `events.ts`, `calendar.ts` (các đợt kiểm tra định kỳ và ngày nghỉ; đang để trống cho tới khi nhà trường công bố lịch), `school.ts` (tên trường: Vinschool Smart City), `news.ts` (bài viết của Bản tin Hội đồng Học sinh, ký tên một ban, không ghi họ tên học sinh; hiện có hai bài hướng dẫn), `proposals.ts` (đề xuất mẫu: để trống). Nội dung trang **Giới thiệu** (`/gioi-thieu`; đường dẫn cũ `/de-an` vẫn mở trang này), gồm kế hoạch triển khai theo giai đoạn, nằm trong `src/content/about.ts`. Sau khi cập nhật, thực hiện `npm run check` để đảm bảo dữ liệu hợp lệ.

Dữ liệu mẫu (sự kiện của Hội đồng Học sinh và Phòng Cố vấn Học tập, bài Bản tin, đề xuất, lịch kiểm tra và hồ sơ học sinh lớp 11) chỉ phục vụ kiểm thử: `src/testing/sample-content.ts`. Kiểm thử đơn vị nạp dữ liệu này qua `src/testing/setup.ts`; kiểm thử trình duyệt nạp sự kiện mẫu vào trình duyệt kiểm thử. Ứng dụng không nhập các tệp này.

Đơn vị đăng tin và cuộc thi ngoài trường:

- Mỗi mục trong `clubs.ts` có trường `kind`: `'club'` (câu lạc bộ), `'council'` (Hội đồng Học sinh, phụ trách sự kiện toàn trường) hoặc `'office'` (Phòng Cố vấn Học tập, mã `co-van-hoc-tap`). Danh sách câu lạc bộ và sự kiện của câu lạc bộ được tổng hợp từ Phòng Công tác Học sinh.
- `clubs.ts` hiện chứa 20 câu lạc bộ thật theo danh sách của nhà trường. Mỗi câu lạc bộ chỉ ghi phần giới thiệu (viết lại theo văn phong hành chính, ngôi thứ ba), lĩnh vực, địa chỉ thư điện tử của câu lạc bộ (`email`) và trang mạng xã hội công khai (`links`: Facebook, Instagram, TikTok). Không ghi họ tên, lớp hay địa chỉ thư cá nhân của học sinh chủ trì và giáo viên cố vấn, cũng không ghi đường dẫn kế hoạch hoạt động nội bộ. Câu lạc bộ chưa gửi giới thiệu (SMC Enterprise, Vinschool Business) hiển thị "Thông tin giới thiệu câu lạc bộ đang được cập nhật."
- Sự kiện mới chỉ có ngày tổ chức được ghi với `dateOnly: true`: `start` và `end` là 00:00 của ngày đó và 00:00 ngày hôm sau, `location` để trống, `capacity` bằng 0. vsmcclubs hiển thị "Đang cập nhật" cho giờ, địa điểm, hình thức, khối, số chỗ và hạn đăng ký, chưa mở đăng ký, không tính vào quỹ giờ, không báo trùng lịch và không đưa vào gợi ý của Mochi. Khi câu lạc bộ có đủ thông tin, bỏ `dateOnly` và điền đầy đủ các trường (hoặc câu lạc bộ gửi lại sự kiện qua Cổng câu lạc bộ). Hiện có hai sự kiện như vậy: Hội nghị SEIA khu vực mùa xuân 2027 (23/01/2027, Hanoi Vinschool SEIA) và Chung kết VBIS Innovation Challenge (30/01/2027, Young Business Creators).
- Dữ liệu đã lưu trên trình duyệt trước ngày 03/11/2026 có thể trỏ tới câu lạc bộ và sự kiện mẫu cũ; khi tải trang, vsmcclubs tự bỏ các đăng ký, mục hồ sơ, bài gửi kiểm duyệt và đề xuất hợp tác liên quan đến các câu lạc bộ, sự kiện không còn tồn tại (`dropRetiredReferences` trong `src/state/schema.ts`).
- Các cuộc thi học thuật ngoài trường (ví dụ cuộc thi do trường đại học tổ chức), trước đây đăng trên Google Site của Phòng Cố vấn Học tập, là các sự kiện trong `events.ts` có `clubId: 'co-van-hoc-tap'` và trường `organizer` ghi đơn vị tổ chức bên ngoài. vsmcclubs hiển thị nhãn "Cuộc thi ngoài trường", đơn vị tổ chức và nguồn thông tin là Phòng Cố vấn Học tập; sau khi học sinh đăng ký trên vsmcclubs, Phòng tổng hợp danh sách và hướng dẫn các bước nộp hồ sơ theo quy định của đơn vị tổ chức. Hiện chưa có cuộc thi nào được đăng.
- Phòng Cố vấn Học tập tự cập nhật cuộc thi qua **Cổng câu lạc bộ** (Tài khoản thử nghiệm → vai trò **Câu lạc bộ** → **Đơn vị đại diện**: Phòng Cố vấn Học tập); biểu mẫu khi đó có thêm trường bắt buộc **Đơn vị tổ chức**. Chỉ các câu lạc bộ (`kind: 'club'`) tham gia trang Đề xuất (câu lạc bộ phù hợp, câu lạc bộ đối tác).

## 6. Hồ sơ học sinh và khối lớp

vsmcclubs dành cho học sinh từ khối 6 đến khối 12 (trung học cơ sở và trung học phổ thông). Học sinh có thể **dùng thử** trước khi thiết lập hồ sơ: trang Tổng quan dành cho khách cho phép chọn khối và lĩnh vực quan tâm để xem gợi ý sự kiện (lựa chọn chỉ được lưu trên trình duyệt và được điền sẵn khi thiết lập hồ sơ); các trang Khám phá, Chi tiết sự kiện, Lộ trình, Câu lạc bộ, Bản tin và Đề xuất (chỉ xem) đều mở cho khách. Hồ sơ gồm bốn bước (khối và lớp, lĩnh vực quan tâm, mục tiêu, thời gian có thể tham gia) và cần thiết để đăng ký sự kiện, gửi hoặc ủng hộ đề xuất, sử dụng Lịch, Hồ sơ năng lực, Mochi và các trang của vai trò trình diễn; khi đó vsmcclubs chuyển tới trang Thiết lập hồ sơ rồi trở lại trang trước đó. Mỗi sự kiện ghi rõ các khối được phép tham gia (`eligibleGrades` trong `src/data/events.ts`); sự kiện dành cho mọi khối được hiển thị là "Khối 6–12 (toàn trường)".

### Giao diện và mật độ nội dung

Nút **Giao diện** (biểu tượng bảng màu trên thanh tiêu đề) cho phép chọn chế độ màu (Lộ trình, Rực rỡ, Áp phích, Dịu nhẹ), độ sáng (Theo hệ thống, Sáng, Tối), mật độ nội dung (Đầy đủ, Gọn, Tối giản) và mức độ tương tác bằng thanh trượt (Không, Nhẹ, Vừa, Tối đa; mức càng cao càng sử dụng nhiều tài nguyên của thiết bị). Mức Vừa thêm tô sáng tuyến trên bản đồ; mức Tối đa thêm chuyển tiếp từ thẻ sang trang sự kiện, phím tắt J và K, ô thử quỹ giờ trên trang Tổng quan và rung phản hồi trên điện thoại Android. Lựa chọn được áp dụng ngay và lưu trên trình duyệt; bản in luôn dùng chế độ Lộ trình sáng. Quy cách của từng chế độ nằm trong `DESIGN.md` §2.4 và §10.

## 7. Bản tin Hội đồng Học sinh

Trang **Bản tin** (`/ban-tin`) trình bày các bài viết của Hội đồng Học sinh theo từng số hằng tháng. Để đăng bài: mở **Tài khoản thử nghiệm** → chọn vai trò **HĐHS** → **Bản tin** → **Soạn bài viết**. Bài viết được hiển thị ngay sau khi nhấn **Đăng bài**, đồng thời xuất hiện tại trang Tổng quan, trang của các sự kiện được liên kết và trang của câu lạc bộ tổ chức các sự kiện đó. Mochi có thể giới thiệu bài viết khi học sinh hỏi về thông báo mới. Ở phiên bản hiện tại, bài viết được lưu trên trình duyệt đã đăng (chưa có cơ sở dữ liệu dùng chung), luôn hiển thị dù ngày hiển thị được đặt là ngày nào, và có thể gỡ bằng nút **Gỡ bài viết**.

## 8. Đề xuất hoạt động và đề xuất hợp tác

Trang **Đề xuất** (`/de-xuat`) thay đổi theo vai trò trong **Tài khoản thử nghiệm**:

- **Học sinh** gửi đề xuất hoạt động hoặc sự kiện tới Hội đồng Học sinh (tên hoạt động, lĩnh vực, khối dự kiến tham gia, câu lạc bộ phù hợp nếu có, nội dung). Đề xuất chỉ hiển thị khối của người gửi, không ghi họ tên; biểu mẫu từ chối nội dung có số điện thoại hoặc địa chỉ thư điện tử. Học sinh có thể ủng hộ đề xuất của học sinh khác, lọc theo trạng thái và rút đề xuất của mình khi chưa được phản hồi.
- **HĐHS** xem xét đề xuất của học sinh: **Tiếp nhận** (có thể giao câu lạc bộ phụ trách) hoặc **Không tiếp nhận** (bắt buộc nêu lý do). Trang Kiểm duyệt hiển thị số đề xuất đang chờ xem xét.
- **Câu lạc bộ** gửi **đề xuất hợp tác** tới câu lạc bộ khác (câu lạc bộ đối tác, tháng dự kiến, nội dung và phân công), đồng ý hoặc từ chối đề xuất nhận được (bắt buộc nêu lý do khi từ chối), và theo dõi đề xuất của học sinh nêu tên hoặc được giao cho câu lạc bộ. Sau khi hai bên thống nhất, câu lạc bộ chủ trì gửi sự kiện qua Cổng câu lạc bộ để Hội đồng Học sinh kiểm duyệt.

Ở phiên bản hiện tại, đề xuất và phản hồi được lưu trên trình duyệt (chưa có cơ sở dữ liệu dùng chung); thanh điều hướng hiển thị mục **Đề xuất** với vai trò Học sinh, còn với vai trò Câu lạc bộ hoặc HĐHS trang được mở từ Cổng CLB hoặc Kiểm duyệt.

## 9. Không gian HĐHS (nội bộ)

Trang **Không gian HĐHS** (`/hdhs`, liên kết ở chân trang) là nơi thành viên Hội đồng Học sinh theo dõi công việc theo Masterplan nhiệm kỳ 2026–2027: **Việc của tôi** (việc được giao, việc cần duyệt, việc của ban chưa có người thực hiện), **Công việc các ban** (việc phụ trách chính và phối hợp của từng ban), **Phiếu yêu cầu** (yêu cầu giữa các ban; ban nhận tiếp nhận thành công việc hoặc không tiếp nhận kèm lý do) và **Thành viên**.

- Đăng nhập bằng tài khoản Google của trường (`@stu.vinschool.edu.vn`). Chỉ địa chỉ đã được Ban điều hành hoặc Ban Nhân sự thêm vào danh sách thành viên mới vào được; lần đăng nhập đầu tiên tự liên kết tài khoản với thành viên.
- Phân quyền: Ban điều hành quản lý mọi ban; trưởng ban và phó ban giao việc, duyệt và chấm chất lượng (1–5) trong ban mình; thành viên nộp sản phẩm (đường dẫn) và báo trễ hạn trước ít nhất 24 giờ; Ban điều hành và Ban Nhân sự quản lý danh sách thành viên và xem địa chỉ thư điện tử.
- Dữ liệu nằm trong schema `hdhs` của dự án Supabase, không mở trực tiếp ra Data API; trình duyệt chỉ gọi các hàm `public.hdhs_*`, mỗi hàm kiểm tra người gọi (`supabase/migrations/20261104130000_hdhs_workspace.sql`). Danh sách thành viên và các đầu việc Masterplan được nhập thẳng vào cơ sở dữ liệu, không lưu trong mã nguồn.
- Công thức điểm tháng theo Masterplan (A–E, điểm cộng tối đa +15 mỗi tháng, hỗ trợ ban khác tối đa +6, không thấp hơn 0, xếp loại) nằm trong `src/domain/workspace.ts` (`monthlyScore`); phần điểm danh và bảng điểm hằng tháng thuộc giai đoạn tiếp theo.

### Bật đăng nhập Google (thực hiện một lần)

1. Tại Google Cloud Console, tạo **OAuth client ID** loại *Web application*; mục *Authorized redirect URIs* thêm `https://zanfzylebhprtkgdwvpd.supabase.co/auth/v1/callback`.
2. Tại Supabase → **Authentication → Sign In / Providers → Google**: bật Google, dán Client ID và Client Secret.
3. Tại Supabase → **Authentication → URL Configuration**: *Site URL* là `https://vsmcclubs.site`; *Redirect URLs* thêm `https://vsmcclubs.site/hdhs` (và `http://localhost:5173/hdhs` khi phát triển trên máy cá nhân).
4. Tài khoản học sinh dưới 18 tuổi của Google Workspace for Education có thể bị chặn đăng nhập vào ứng dụng bên ngoài cho tới khi quản trị viên của trường cho phép. Nếu đăng nhập báo bị chặn, đề nghị bộ phận CNTT của trường thêm OAuth client ID ở bước 1 vào danh sách ứng dụng được tin cậy.
5. Thêm địa chỉ thư điện tử của thành viên đầu tiên thuộc Ban điều hành bằng SQL (Supabase → SQL Editor): `update hdhs.members set email = 'ten@stu.vinschool.edu.vn' where full_name = '…';`. Sau đó thành viên này thêm địa chỉ cho những người còn lại tại thẻ Thành viên.

## 10. Cấu trúc mã nguồn

Xem `docs/ARCHITECTURE.md` (kiến trúc và giao kèo giữa các lớp) và `DESIGN.md` (hệ thống thiết kế).
