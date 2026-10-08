# Rodemap — Design System

The single source of truth for every visual decision in Rodemap.
All raw values live in `src/styles/tokens.css`. No other stylesheet may contain a
raw color, a font name, or a `px`/`rem` value outside the two breakpoints
(720 px and 1080 px, see §4). `npm run lint:tokens` fails the build if one
appears. The lint also rejects gradients, `backdrop-filter`, raw shadows, raw
durations and raw easing curves outside `tokens.css`.

---

## 1. Brand idea

**Rodemap = road map.** A student's school year is drawn as a route map: each activity
category is a line, each event is a station, and the student's own plan is the
journey they take across the lines. The site should feel like a well-made
transit authority or civic service — calm, exact, trustworthy — with one warm
character, **Mochi**, riding along.

Three rules carry the whole identity:

1. **Lines and stations.** Timelines, progress, onboarding steps and the
   portfolio all use the same visual grammar: a 4 px route line, round stations,
   interchange rings where two categories meet. Never a generic vertical
   timeline with cards on alternating sides.
2. **Labels beat color.** Every category color is always paired with its
   two-letter code and Vietnamese name. Color is never the only signal.
3. **Mochi is the only soft thing.** Everything else is precise: hard rules,
   tabular numbers, square-ish corners. Mochi carries the warmth, so the rest
   of the interface does not need to.

What Rodemap must never look like: a purple-to-blue gradient SaaS hero, glassmorphism
cards, emoji section markers, a centered stock "AI assistant" chat bubble, cream
paper with a serif headline (that belongs to Inkstep), or a dashboard of
identical rounded white cards.

---

## 2. Color

### Core

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-ground` | `#F2F3EE` | `#0F1216` | Page background ("chalk") |
| `--color-surface` | `#FFFFFF` | `#171B21` | Panels, drawers, inputs |
| `--color-surface-2` | `#E8EAE3` | `#1F242C` | Hover, selected rows, quiet fills |
| `--color-ink` | `#14181F` | `#E9ECEF` | Text, icons, route lines |
| `--color-ink-2` | `#535B67` | `#9AA3AF` | Secondary text (≥ 4.5:1 on ground and surface) |
| `--color-rule` | `#D5D8CF` | `#2A3038` | Hairlines, table rules |
| `--color-signal` | `#1E47C8` | `#7A9BFF` | Primary actions, links, focus, "your route" |
| `--color-signal-ink` | `#FFFFFF` | `#0F1216` | Text on signal fills |
| `--color-ok` | `#1B6F46` | `#5CC48E` | Confirmed, registered |
| `--color-warn` | `#8F5400` | `#E0A845` | Deadline soon, near capacity |
| `--color-stop` | `#B3261E` | `#F2867E` | Conflict, closed, rejected |
| `--color-scrim` | ink at 40 % | black at 60 % | Backdrop behind bottom sheets and dialogs only |

Status colors always come with an icon and a word (Đã đăng ký, Sắp hết hạn,
Trùng lịch). They are not accents and never decorate.

> Changed 2026-10-07: light `--color-ok` (was `#1F7A4D`, 4.38:1) and
> `--color-warn` (was `#9A5B00`, 4.47:1) failed 4.5:1 on `--color-surface-2`.
> The new values pass on ground, surface and surface-2 (≥ 5.0:1).
> `--line-tn` keeps `#1F7A4D`; route lines only need 3:1.

### Category lines

Seven route colors, chosen to differ in lightness as well as hue, each with a
fixed two-letter code. Light / dark values:

| Code | Category (UI label) | Token | Light | Dark |
|---|---|---|---|---|
| HT | Học thuật | `--line-ht` | `#1E47C8` | `#7A9BFF` |
| NT | Nghệ thuật – Văn hóa | `--line-nt` | `#B0306A` | `#F07AB0` |
| TT | Thể thao | `--line-tt` | `#C2410C` | `#FB8A4F` |
| TN | Tình nguyện – Cộng đồng | `--line-tn` | `#1F7A4D` | `#5CC48E` |
| KN | Kỹ năng – Hướng nghiệp | `--line-kn` | `#7A5A00` | `#D9B44A` |
| CN | Công nghệ – Sáng tạo | `--line-cn` | `#0E7490` | `#4CC3DD` |
| TS | Sự kiện toàn trường | `--line-ts` | `#14181F` | `#E9ECEF` |

Rules: a category color appears as a line, a station ring, a 4 px chip edge or
a code badge, never as a large background fill. Text on a category color uses
`--color-surface` and must pass 4.5:1; check every pair.

### Mochi

| Token | Light | Dark | Use |
|---|---|---|---|
| `--mochi-body` | `#FFFDF8` | `#F4F0E8` | Mochi's body fill |
| `--mochi-blush` | `#F2B8B0` | `#E59A90` | Cheeks and inner ears only |
| `--mochi-outline` | `#14181F` | `#14181F` | Mochi's outline, same in both themes |

Mochi's colors are used for Mochi and nothing else.

---

## 3. Typography

All faces must include the **Vietnamese** subset. Verify on Google Fonts before
use; if a face lacks it, fall back to Be Vietnam Pro for that role and note it.

| Token | Family | Use |
|---|---|---|
| `--font-display` | Bricolage Grotesque 600/800 | Page titles, hero, section heads, big numbers |
| `--font-body` | Lexend 400/500/600 | All running text and UI |
| `--font-mono` | JetBrains Mono 500 | Times, dates, codes (HT, NT…), counters |

Scale (fluid): `--text-xs` 12 · `--text-sm` 14 · `--text-md` 16 ·
`--text-lg` 19 · `--text-xl` 24 · `--text-2xl` 30→44 · `--text-3xl` 40→76 ·
`--text-display` 56→128.

- Display headings: weight 800, `--tracking-tight` (−0.03em), `text-wrap: balance`.
- Body: 16 px minimum, line-height 1.6, measure 62ch.
- Times and dates are always mono and tabular: `07:30`, `Th 4 · 14/10`.
- Vietnamese diacritics need room: never set line-height below 1.1 on display
  type, and never clip text with `overflow: hidden` on a single line.

---

## 4. Space, size, shape

- Spacing `--space-1…10`: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px.
- Gutter `--gutter`: clamp(16 px, 5vw, 56 px). Max width `--max-w`: 1320 px.
- Grid: 12 columns, 24 px gap on desktop; 4 columns on phones.
- Radius: `--radius-0` (tables, rails), `--radius-sm` 4 px (cards, inputs),
  `--radius-md` 10 px (drawers, Mochi panel), `--radius-pill` (chips, buttons).
- Route line `--route-w`: 4 px. Station `--station`: 14 px; interchange 20 px with
  a 3 px ring.
- Rules: `--rule-hair` 1 px, `--rule-strong` 2 px.
- Touch target `--size-touch`: 48 px minimum.
- **Breakpoints** (the only raw `px` allowed outside `tokens.css`, because
  custom properties cannot be used in media queries): `720px` (phone → tablet,
  4 → 8 columns) and `1080px` (tablet → desktop, 12 columns, filter rail
  appears). Write them as `@media (min-width: 720px)` / `(min-width: 1080px)`
  or the range form `(width < 720px)`.
- Your route `--route-w-you`: 8 px (the "thicker" signal line).
- Fixed widths: filter rail `--rail-w` 240 px; Mochi dock `--dock-size` 56 px;
  Mochi side panel `--panel-w` 400 px; station card `--card-w` 320 px.
- Type rhythm: `--leading-display` 1.1, `--leading-snug` 1.3, `--leading-body`
  1.6; measure `--measure` 62ch; tracking `--tracking-tight` −0.03em,
  `--tracking-caps` 0.08em (mono codes and eyebrows).
- Focus: `--focus-w` 2 px, `--focus-offset` 2 px.
- Mochi stroke `--mochi-stroke` 2.5 px.
- Layers `--z-base` 0, `--z-sticky` 10, `--z-dock` 40, `--z-panel` 50,
  `--z-overlay` 60, `--z-toast` 70.
- Misc: chip category edge `--chip-edge` 4 px; icons `--size-icon` 20 px /
  `--size-icon-sm` 16 px; header `--header-h` 64 px; RouteMap user unit
  `--map-unit` 1 px (the horizontal map renders its geometry 1:1); grid gap `--grid-gap`
  24 px (`--grid-gap-phone` 16 px).
- Exam zones on the RouteMap ("Kiểm tra định kỳ") are a diagonal hatch built
  from `--color-rule` (`--hatch-exam`), never a new color.
- Elevation: one shadow token only, `--shadow-panel`
  (`0 12px 32px` of ink at 18 % in light, black at 50 % in dark), for the Mochi
  panel and modal sheets. Cards have no shadow; they are separated by rules.

---

## 5. Signature components

- **RouteMap**: the timeline. Horizontal on desktop (months as fare zones,
  weeks as ticks), vertical on phones. Category lines run in parallel; the
  student's registered events are joined by a thicker `--color-signal` line,
  "your route". Hovering or focusing a station opens a station card.
- **StationCard**: event summary. Code badge + category, title, club, mono
  date/time, place, seats left, deadline, one-line summary by Mochi, actions.
- **LineBadge**: two-letter code on a category color, used everywhere a
  category appears.
- **DepartureBoard**: the "Sắp diễn ra" list on the dashboard, styled like a
  departure board: time, code, title, place, status, in tabular columns.
- **PortfolioSheet**: the portfolio as a printable A4 document with a route
  summary at the top, then entries grouped by category.
- **MochiDock**: Mochi lives at the bottom-right as a 56 px figure (not a
  generic chat bubble). Opening it slides a side panel (desktop) or a bottom
  sheet (phone). Mochi's states: idle (slow blink), listening, thinking
  (ears twitch), answering, celebrating (small hop), error (one ear down).

### Mochi, the character

An original rabbit drawn from simple geometry, defined in one SVG component:

- Body: a soft rounded "mochi" shape, wider at the bottom, `--mochi-body` fill,
  2.5 px `--mochi-outline` stroke.
- Ears: two tall rounded ears, **drawn as two parallel lane lines** that echo
  the route map; the left ear bends forward at the tip. Inner ear `--mochi-blush`.
- Face: two small solid oval eyes, small blush ovals, a small, simple curved
  smile. No cross-shaped mouth, no bow, no clothing.
- Accessory: a small route-station badge on the chest in `--color-signal`.
- It must not resemble any existing character (Miffy, My Melody, Cinnamoroll,
  Judy Hopps, Bugs Bunny, Usagi, etc.). If in doubt, simplify further.
- Every state is a small transform of the same parts (ear rotation, eye scale,
  body squash). No sprite sheets, no emoji, no GIFs.

---

## 6. Motion

`--dur-fast` 140 ms · `--dur-med` 320 ms · `--dur-slow` 700 ms ·
`--dur-draw` 1600 ms (route line draw-in) · `--dur-idle` 5200 ms (Mochi blink
cycle) ·
`--ease-out` cubic-bezier(.2,.7,.2,1) · `--ease-spring` cubic-bezier(.3,1.5,.5,1).

- One orchestrated moment per screen. On the landing page: route lines draw
  in, stations pop on, Mochi hops onto the last station.
- When Mochi adds an event to the plan, the "your route" line extends to the
  new station. This is the product's key moment; make it feel good.
- Everything respects `prefers-reduced-motion: reduce` (instant states, no
  hopping, no line drawing). Content is fully visible without JavaScript
  animations finishing.

---

## 7. Layout and placement

- Header: wordmark left, primary nav (Tổng quan, Khám phá, Lộ trình, Lịch, Hồ
  sơ, Câu lạc bộ, Bản tin), right side: search (⌘K / Ctrl K), theme toggle,
  account. When the demo role is Câu lạc bộ the nav adds "Cổng CLB"; when it is
  HĐHS it adds "Kiểm duyệt". (Tổng quan added 2026-10-07: the dashboard needs a
  permanent entry point. Bản tin added 2026-10-08 for the council's newsletter;
  from 1080 units up the search control shows its icon only, keeping its name
  and the Ctrl K shortcut, so eight sections fit.)
- Bản tin Hội đồng Học sinh reads as a wall newspaper: the page head is a
  nameplate between double rules, issues are numbered by month (Số 1 = Tháng
  9/2026), articles sit in ruled columns, the lead story faces "Trong số N",
  and quotes carry a thick signal rule. Articles are signed by a council
  department, never by a student.
- Landing hero: left 7 columns for the headline and actions; right 5 columns a
  live, animated RouteMap fragment with real sample events. No stock imagery.
- App screens: a left filter rail (240 px) on desktop that becomes a bottom
  sheet on phones; content in the remaining columns; MochiDock always available.
- Sections alternate ground and surface bands separated by hairlines, not by
  shadows or gradients.

---

## 8. Voice (UI copy)

All UI copy is **formal, administrative Vietnamese** (văn phong hành chính).

- Prefer Sino-Vietnamese formal vocabulary: phát triển, vận hành, phụ trách,
  đảm bảo, triển khai, tổng hợp, đăng ký, xác nhận.
- Avoid colloquial words ("làm ra", "lo", "chạy", "người lớn"), spoken
  structures ("…nào cũng…", "cứ… lại…", "…chứ không phải…"), and translated
  slogan contrasts ("X, không phải Y"). Do not repeat the word "thật".
- Link ideas with: nhằm, qua đó, đồng thời, góp phần.
- Buttons are verbs: Đăng ký, Thêm vào lịch, Xuất hồ sơ, Gửi sự kiện, Phê duyệt.
- Mochi speaks politely and warmly but still formally: refers to itself as
  "Mochi", addresses the user as "bạn", no slang, no emoji.
- Numbers and dates follow Vietnamese conventions: `14/10/2026`, `07:30`,
  `Thứ Tư`.

---

## 9. Accessibility (WCAG 2.1 AA)

- Contrast ≥ 4.5:1 for text, 3:1 for large text, icons and route lines.
- Every control is a real `<button>`, `<a>` or form element with a visible
  label; toggles expose `aria-pressed` / `aria-expanded`.
- RouteMap has a full list/table alternative ("Xem dạng danh sách") with the
  same data; keyboard users can move between stations with arrow keys.
- Mochi's panel is a labelled dialog/complementary region; new messages are
  announced with `aria-live="polite"`; focus returns to the dock on close.
- Focus is always visible: 2 px `--color-signal` outline with 2 px offset.
- `lang="vi"` on the document; mixed English terms get `lang="en"`.
