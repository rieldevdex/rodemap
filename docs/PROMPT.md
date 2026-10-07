> Original build brief, kept for reference. The product name is **Rodemap** (the brief says "Rode"; renamed on 2026-10-07).

# Prompt for Claude Code — build **Rode**

> Paste everything below into Claude Code (Opus 5.5) in an empty folder, and put
> `DESIGN.md` (provided alongside this prompt) in the project root first.

---

## 0. Your role and how to work

You are a senior product engineer and product designer building **Rode**, a
web app for students at a Vietnamese high school. You care about craft: this
must look and feel like a professional civic or transit product, not a
template or a generic AI-generated site.

Work in this order and do not skip steps:

1. Read `DESIGN.md` completely. It is binding. If something you need is not in
   it, add a token to `DESIGN.md` and `tokens.css` first, and tell me.
2. Reply with a short plan: file tree, data model, the list of screens, the
   Mochi tool list, and any question you cannot resolve from this prompt.
   **Wait for my approval before writing code.**
3. Build in the milestones in section 9. After each milestone, run lint, token
   lint, unit tests and the Playwright smoke test, take screenshots (phone
   390 px and desktop 1440 px, light and dark), look at them, fix what is
   broken, then summarise in 5 lines or fewer.
4. Never claim something works without running it.

---

## 1. Context

I am running for the Ban Điều hành of the Hội đồng Học sinh (HĐHS), term
2026–2027. Rode is the centrepiece of my campaign: I will demonstrate it on
Voting Day and show it in my video, poster and slides. The election guide asks
every proposal to be **cụ thể, khả thi, trung thực**: concrete, feasible within
the school's resources, and never exaggerated. The product and its copy must
respect that:

- This is a **working demo with sample data**. Show a small, permanent label
  "Bản trình diễn · Dữ liệu minh họa" in the footer and on the dashboard.
- No invented statistics ("hàng nghìn học sinh…"), no fake testimonials.
- Features that need school approval in a real rollout (Google Calendar
  account sync, real student accounts) are shown as the next phase in the
  proposal page, and the demo uses honest alternatives (see section 5).

### The problem (in my words, for you to understand)

Students receive a constant stream of information about events: club
activities, competitions, school-wide events. It is scattered across email,
Facebook and Instagram, so students miss what suits them, double-book
themselves, and have nothing organised to show for what they did.

### The solution

**Rode** (from "road") gathers every club's events in one place, classifies them
by category and club, places them on a timeline drawn as a route map, and helps
each student plan their own route through the year. **Mochi**, an AI companion
drawn as an original rabbit, goes along with the student: it recommends events
that fit their profile, registers them (with confirmation), builds their
calendar, summarises events, and helps assemble a portfolio of what they did.

---

## 2. Language rules (very important)

The entire interface, all sample data, Mochi's replies, error messages, empty
states and the proposal page are in **formal, administrative Vietnamese**
(văn phong hành chính – đề án, as if submitted to Phòng Công tác Học sinh):

- Prefer formal Sino-Vietnamese vocabulary: phát triển, vận hành, phụ trách,
  đảm bảo, triển khai, tổng hợp, đề xuất, xác nhận.
- Avoid colloquial words: "làm ra", "lo", "chạy", "người lớn".
- Avoid spoken structures: "…nào cũng…", "cứ… lại…", "…chứ không phải…".
- Avoid slogan-style contrasts translated from English ("X, không phải Y").
- Do not repeat the word "thật".
- Link ideas with: nhằm, qua đó, đồng thời, góp phần.
- Use correct diacritics everywhere; never strip accents in URLs shown to users
  (slugs may be ASCII).

Add an automated **copy lint** (`npm run lint:copy`) that scans all Vietnamese
strings (content files, components, Mochi's system prompt and offline replies)
for the banned words and structures above and fails the build if it finds one.

Reference copy for the landing page (use it as written, refine only if you
find an error):

- Eyebrow: **Đề xuất tranh cử Hội đồng Học sinh nhiệm kỳ 2026–2027**
- Headline: **Toàn bộ hoạt động ngoại khóa trên một lộ trình thống nhất.**
- Problem: *Mỗi ngày, học sinh tiếp nhận một lượng lớn thông tin về các hoạt
  động ngoại khóa. Tuy nhiên, thông tin được phân tán qua nhiều kênh như thư
  điện tử, Facebook và Instagram, khiến học sinh khó theo dõi và dễ bỏ lỡ
  những hoạt động phù hợp.*
- Solution: *Rode tổng hợp sự kiện của các câu lạc bộ vào một nền tảng duy
  nhất, phân loại theo lĩnh vực và sắp xếp trên dòng thời gian, đồng thời hỗ
  trợ học sinh xây dựng lộ trình cá nhân và hồ sơ năng lực.*
- Mochi: *Mochi là trợ lý đồng hành, hỗ trợ học sinh lựa chọn sự kiện phù hợp,
  đăng ký tham gia và sắp xếp lịch cá nhân, qua đó góp phần nâng cao hiệu quả
  tham gia hoạt động ngoại khóa.*

---

## 3. Users and roles

The demo has a role switcher in the account menu (clearly marked as a demo
feature):

1. **Học sinh** (default): explores, plans, registers, builds a portfolio.
2. **Câu lạc bộ** (club officer): submits and edits their club's events.
3. **HĐHS** (moderator): reviews submissions and approves or rejects them with
   a reason. Only approved events appear to students.

---

## 4. Screens

Use these Vietnamese labels.

1. **Trang chủ** (landing, `/`): the campaign pitch. Hero with headline and a
   live RouteMap fragment; problem → solution; the four pillars (Tổng hợp,
   Phân loại, Lộ trình, Hồ sơ năng lực); Mochi introduction with a short live
   demo exchange; how clubs and HĐHS take part; call to action "Bắt đầu thiết
   lập lộ trình".
2. **Thiết lập hồ sơ** (onboarding, 4 steps drawn as stations on a line):
   khối/lớp; lĩnh vực quan tâm (choose categories, then rank top 3); mục tiêu
   trong năm học (e.g. phát triển kỹ năng lãnh đạo, chuẩn bị hồ sơ du học,
   tham gia hoạt động tình nguyện, rèn luyện thể chất); thời gian có thể tham
   gia (weekdays after school / weekends, and a weekly hour budget). Mochi
   appears on the last step and proposes a first route. Collect nothing else:
   no phone number, no address, no personal sensitive data.
3. **Tổng quan** (dashboard): DepartureBoard "Sắp diễn ra", "Lộ trình của bạn"
   summary, deadlines this week, Mochi's suggestions with reasons, a weekly
   digest "Bản tin tuần" written by Mochi.
4. **Khám phá sự kiện**: searchable, filterable list/grid. Filters: lĩnh vực,
   câu lạc bộ, khối được tham gia, thời gian, hình thức (trực tiếp/trực tuyến),
   còn chỗ, hạn đăng ký. Each result is a StationCard.
5. **Chi tiết sự kiện**: full information, Mochi's 2–3 sentence summary, the
   club, seats, deadline, conflicts with the student's plan, actions (Đăng ký,
   Thêm vào lịch, Hỏi Mochi về sự kiện này).
6. **Lộ trình** (timeline): the RouteMap of the whole school year, Sept 2026 →
   May 2027, with category lines and "your route". Toggle "Toàn trường / Của
   tôi". List-view alternative.
7. **Lịch của tôi**: month and week views of registered events; conflict
   markers; export all as `.ics`; per-event "Thêm vào Google Calendar".
8. **Hồ sơ năng lực** (portfolio): entries created from attended events, grouped
   by category, each with role, hours, a short reflection (the student writes
   it; Mochi can propose a draft for them to edit), and evidence links. Summary
   at the top: hours per category drawn as a small route diagram. Export as a
   printable A4 page (print stylesheet) and as JSON.
9. **Câu lạc bộ**: directory and club pages (description, lines/categories,
   upcoming and past events).
10. **Cổng câu lạc bộ** (club role): form to submit an event with validation,
    status of submissions (Chờ duyệt, Đã duyệt, Cần chỉnh sửa).
11. **Kiểm duyệt** (HĐHS role): queue with approve / request changes / reject
    with a required reason.
12. **Đề án** (`/de-an`): the campaign proposal page, written in the formal
    register, following the election guide: Vấn đề, Giải pháp, Kế hoạch triển
    khai (Giai đoạn 1: thí điểm với một số câu lạc bộ; Giai đoạn 2: mở rộng toàn
    trường; Giai đoạn 3: đồng bộ Google Calendar và hoàn thiện hồ sơ năng lực,
    each with "[thời gian dự kiến]" placeholders for me to fill), Nguồn lực và
    tính khả thi, Bảo vệ dữ liệu học sinh, Cam kết. Candidate details are
    placeholders: `[Họ và tên]`, `[Lớp]`, `[Vị trí ứng tuyển]`, `[Thông điệp tranh cử]`.

---

## 5. Mochi (the AI companion)

### Behaviour

Mochi can:

- **Recommend** events for the student's profile and explain why ("Vì sao Mochi
  đề xuất": matching interests, grade eligibility, fits their free time,
  balances categories, deadline approaching).
- **Register / unregister** for events. Always show a confirmation card first
  (event, time, place, conflicts) and act only after the student presses
  "Xác nhận". Never act on its own.
- **Build the calendar**: add selected events, detect conflicts, propose
  alternatives, and respect the weekly hour budget.
- **Summarise**: one event, a club's events, this week, or the whole month.
- **Answer questions** about events, clubs, deadlines and the student's plan,
  using only Rode's data. If the data does not contain the answer, say so.
- **Draft portfolio reflections** for the student to edit; mark drafts
  clearly as "Bản nháp do Mochi đề xuất".

Mochi must not:

- Ask for or store sensitive personal information; users are mostly under 18.
- Discuss topics unrelated to school activities beyond a polite redirect.
- Invent events, dates, seats or deadlines.
- Write the student's reflections as if they were final.

Register: formal, polite and warm; refers to itself as "Mochi" and the student
as "bạn"; no slang, no emoji; short paragraphs; ends actions with a clear
next step.

### Architecture

- Mochi uses the **Claude API with tool use**, called only through a server
  function (`/api/mochi`, a Cloudflare Pages Function). The API key lives in an
  environment variable on the server and is never sent to the browser. Make
  the model name configurable via env var.
- The server function receives the conversation plus a compact snapshot of the
  relevant data (profile, candidate events, plan) and returns Mochi's reply and
  any tool calls. Tools execute **in the browser** against the app state, so
  the AI can never change data the student has not confirmed.
- Tools (JSON-schema typed, unit tested):
  `search_events`, `get_event`, `recommend_events`, `check_conflicts`,
  `propose_registration` (returns a confirmation card, does not register),
  `propose_calendar_plan`, `summarize_events`, `draft_portfolio_entry`,
  `export_calendar`.
- **Offline mode**: if the API is unavailable or no key is set, Mochi switches
  to a deterministic rule-based mode that handles the six core intents
  (gợi ý sự kiện, đăng ký, xem lịch, tóm tắt tuần, hỏi về sự kiện, hồ sơ năng
  lực) with prepared formal replies. Show a small badge "Chế độ ngoại tuyến".
  The Voting Day demo must never fail on stage because of the network.
- Rate-limit the server function per session and cap message length.
- Write Mochi's system prompt in `src/mochi/system-prompt.ts`, in Vietnamese,
  covering the rules above, and include it in the copy lint.

### Calendar in the demo

- Per-event "Thêm vào Google Calendar" uses Google's public event-template link
  (no login, no OAuth).
- "Xuất toàn bộ lịch" downloads a standards-compliant `.ics` file
  (Asia/Ho_Chi_Minh timezone, stable UIDs). Unit test the generator.
- Two-way Google Calendar sync is listed as Giai đoạn 3 on the proposal page.

---

## 6. Data

Create typed sample data in `src/data/` that I can replace later:

- `Club`: id, name, shortName, description, categories, contact placeholder.
- `Event`: id, title, clubId, category (HT, NT, TT, TN, KN, CN, TS), format,
  start, end, location, eligibleGrades, capacity, seatsTaken,
  registrationDeadline, summary, description, tags, status
  (draft/pending/approved/changes_requested/rejected).
- `Profile`, `Registration`, `PortfolioEntry`, `Submission`.

Volume: about 14 clubs and 45 events across Sept 2026 – May 2027, spread
realistically (more events near the middle of each semester, quiet during exam
weeks; mark exam weeks on the RouteMap as "Kiểm tra định kỳ" zones). Use
plausible but clearly generic club names (e.g. "CLB Tranh biện", "CLB Khoa học
Dữ liệu"); include **Inkstep** (CLB Phát triển Sản phẩm Học tập, building
Eighthundred) as one real club. All text in formal Vietnamese. Put a comment at
the top of each data file saying it is illustrative.

Persist the demo's state (profile, plan, portfolio, submissions) in
`localStorage` with a versioned schema, wrapped in try/catch, plus a "Khôi phục
dữ liệu minh họa" button for resetting before a presentation.

---

## 7. Engineering standards (carry these over from my previous project)

- **Stack**: Vite + React + TypeScript (strict). No UI kit, no Tailwind: plain
  CSS built only from `tokens.css` (see DESIGN.md). Deploy target: Cloudflare
  Pages with one Pages Function for Mochi.
- **Structure** (atomic, logic separated from presentation):
  - `src/domain/`: pure functions only, no React, no DOM: recommendation
    scoring, conflict detection, hour budgeting, timeline/route layout,
    `.ics` generation, filters, portfolio aggregation. 100 % unit tested.
  - `src/state/`: reducer + actions + selectors (pure), wired via React
    context. Every state change is a tested reducer case.
  - `src/components/atoms|molecules|organisms/`, `src/pages/`: presentational;
    components receive data via props and never call `localStorage`, `fetch`
    or the Mochi API directly.
  - `src/mochi/`: system prompt, tool schemas, tool executors (pure where
    possible), API client, offline intent engine.
- **Quality gates** (`npm run check` runs them all, in parallel where possible):
  ESLint (strict TS rules, no `any`), **token lint** (no raw colors, font
  names or px outside `tokens.css` except the two breakpoints), **copy lint**,
  Vitest unit tests, a Playwright smoke test (onboarding → recommendation →
  confirm registration → event appears on RouteMap and calendar → export
  `.ics`), and an axe accessibility check on every page.
- **Accessibility**: WCAG 2.1 AA as specified in DESIGN.md §9.
- **Performance**: first load under 200 KB JS gzipped; fonts with
  `display=swap` and the Vietnamese subset; images in WebP/AVIF.
- **Theming**: light and dark via tokens, following the system setting with a
  manual toggle.
- **No dead ends**: every empty state explains what to do next, in formal
  Vietnamese.

---

## 8. Design direction (summary — DESIGN.md is the full spec)

- Concept: the school year as a **route map**. Categories are coloured lines,
  events are stations, the student's plan is "your route" drawn in signal
  blue. Reuse this grammar everywhere (onboarding steps, timeline, portfolio
  summary, progress).
- Feel: a well-run public service: precise grid, hard hairlines, tabular mono
  times, generous whitespace, one strong accent. Mochi is the only soft,
  rounded element.
- Lessons from my previous site to keep: tokens-only styling with a lint that
  enforces it; one signature motif used sparingly; a big confident display
  headline with a live product fragment beside it (not stock images); alternating
  ground/surface bands separated by rules; content complete without waiting
  for animations; a single orchestrated animation per screen; real content
  instead of lorem ipsum.
- Avoid: gradients, glassmorphism, emoji, identical rounded white cards with
  shadows, centred-everything layouts, cream paper with a serif headline,
  generic chat-bubble bots, and any resemblance between Mochi and an existing
  character.

---

## 9. Milestones

1. **Foundation**: tokens, base styles, token/copy lints, layout shell,
   header/footer, theme toggle, routing, sample data, domain functions with
   tests.
2. **Explore and Route**: Khám phá sự kiện, Chi tiết sự kiện, Lộ trình
   (RouteMap + list alternative), Câu lạc bộ.
3. **Plan**: onboarding, dashboard, Lịch của tôi, registration flow,
   conflicts, `.ics` export, Google Calendar links.
4. **Mochi**: character SVG and states, MochiDock and panel, server function,
   tools, confirmation cards, offline mode.
5. **Portfolio and roles**: Hồ sơ năng lực with print export, Cổng câu lạc bộ,
   Kiểm duyệt.
6. **Pitch**: Trang chủ and Đề án pages, final copy review, full `npm run
   check`, screenshots of every page in both themes and both widths, and a
   README in Vietnamese explaining how to run, deploy (Cloudflare Pages +
   API key secret) and reset the demo before Voting Day.

---

## 10. Definition of done

- `npm run check` passes with no warnings.
- The Playwright demo path works both online and in offline Mochi mode.
- Every page passes axe with no serious or critical issues.
- No banned phrase appears anywhere (copy lint passes).
- The site reads as a coherent, professional product in formal Vietnamese,
  and every visual value traces back to DESIGN.md.
