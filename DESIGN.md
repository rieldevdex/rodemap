# Rodemap — Design System

The single source of truth for every visual decision in Rodemap.
All raw values live in `src/styles/tokens.css`. No other stylesheet may contain a
raw color, a font name, or a `px`/`rem` value outside the two breakpoints
(720 px and 1080 px, see §4). `npm run lint:tokens` fails the build if one
appears. The lint also rejects gradients, `backdrop-filter`, raw shadows, raw
durations and raw easing curves outside `tokens.css`.

> Revised 2026-10-24 after studying the eight resources listed in §12
> (Uiverse, trending.design, Durves, Awwwards, Endless Tools, Design Spells,
> type.today). Every new mode, interaction and typeface below names the resource
> it comes from. The owner asked for a more colourful, more interactive site with
> appearance modes and text-density modes; the transit-map identity stays.
>
> Revised again the same day under the owner's design principles: no AI design
> slop (no generic purple gradients, standard hero layouts or repetitive card
> grids), motion built with React Bits and GSAP, and high-contrast palettes
> tailored to Rodemap's own identity. The new modes, type and motion follow the
> house rules of the **Taste skill** (§12); the first draft of "Rực rỡ" (cream
> ground, violet signal, violet-to-orange CTA gradient) was withdrawn because it
> was exactly that slop. Where Rodemap's existing brand keeps a device Taste bans
> (monospace times, eyebrows and hairline rules in "Lộ trình"), §12 says why.

---

## 1. Brand idea

**Rodemap = road map.** A student's school year is drawn as a route map: each activity
category is a line, each event is a station, and the student's own plan is the
journey they take across the lines. The site should feel like a well-made
transit authority or civic service — exact and trustworthy — with one warm
character, **Mochi**, riding along. Students can now choose how lively it looks
(§2.4), but every mode keeps the same grammar.

Three rules carry the whole identity, in every appearance mode:

1. **Lines and stations.** Timelines, progress, onboarding steps and the
   portfolio all use the same visual grammar: a 4 px route line, round stations,
   interchange rings where two categories meet. Never a generic vertical
   timeline with cards on alternating sides.
2. **Labels beat color.** Every category color is always paired with its
   two-letter code and Vietnamese name. Color is never the only signal.
3. **Mochi is the warmest thing.** The interface stays precise (rules, tabular
   numbers); modes may add colour blocks, textures and softer corners, but
   Mochi stays the only character.

What Rodemap must never look like: a purple-to-blue gradient SaaS hero, glassmorphism
cards (Uiverse's glass cards were reviewed and rejected: text contrast cannot be
guaranteed over a moving backdrop), emoji section markers, a centered stock "AI
assistant" chat bubble, cream paper with a serif headline (that belongs to Inkstep),
or a dashboard of identical rounded white cards.

---

## 2. Color

### 2.1 Core (mode "Lộ trình", the default)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-ground` | `#F2F3EE` | `#0F1216` | Page background ("chalk") |
| `--color-surface` | `#FFFFFF` | `#171B21` | Panels, drawers, inputs |
| `--color-surface-2` | `#E8EAE3` | `#1F242C` | Hover, selected rows, quiet fills |
| `--color-ink` | `#14181F` | `#E9ECEF` | Text, icons, route lines |
| `--color-ink-2` | `#535B67` | `#9AA3AF` | Secondary text (≥ 4.5:1 on ground and surface) |
| `--color-rule` | `#D5D8CF` | `#2A3038` | Hairlines, table rules |
| `--color-signal` | `#1E47C8` | `#7A9BFF` | Primary actions, focus, "your route" |
| `--color-link` | signal | signal | Links (ink in modes whose signal is a red, §2.4) |
| `--color-signal-ink` | `#FFFFFF` | `#0F1216` | Text on signal fills |
| `--color-ok` | `#1B6F46` | `#5CC48E` | Confirmed, registered |
| `--color-warn` | `#8F5400` | `#E0A845` | Deadline soon, near capacity |
| `--color-stop` | `#B3261E` | `#F2867E` | Conflict, closed, rejected |
| `--color-scrim` | ink at 40 % | black at 60 % | Backdrop behind bottom sheets and dialogs only |
| `--color-block-a/b/c` | `#DCE5FB` / `#F7E1EB` / `#DDEFE5` | `#1B2647` / `#3B1F2C` / `#16301F` | Colour-block bands (one per page, §11) |
| `--color-block-a/b/c-ink` | ink | ink | Each block's own text colour (≥ 4.5:1 on its block) |
| `--color-pattern` | ink at 16 % | ink at 16 % | The DotRoad's dots (decorative only) |
| `--preview-{mode}-1/2/3` | per mode | per mode | Giao diện swatches: each mode's ground, signal and block a |

Status colors always come with an icon and a word (Đã đăng ký, Sắp hết hạn,
Trùng lịch). They are not accents and never decorate. Each mode tunes `ok`,
`warn` and `stop` to its own grounds (§2.4); `npm run lint:contrast` checks them
on every ground and surface (≥ 4.5:1).

> Changed 2026-10-07: light `--color-ok` (was `#1F7A4D`, 4.38:1) and
> `--color-warn` (was `#9A5B00`, 4.47:1) failed 4.5:1 on `--color-surface-2`.
> The new values pass on ground, surface and surface-2 (≥ 5.0:1).
> `--line-tn` keeps `#1F7A4D`; route lines only need 3:1.

### 2.2 Category lines

Seven route colors, chosen to differ in lightness as well as hue, each with a
fixed two-letter code. Light / dark values (the same in every mode, except
`--line-ts`, which always follows the mode's ink):

| Code | Category (UI label) | Token | Light | Dark |
|---|---|---|---|---|
| HT | Học thuật | `--line-ht` | `#1E47C8` | `#7A9BFF` |
| NT | Nghệ thuật – Văn hóa | `--line-nt` | `#B0306A` | `#F07AB0` |
| TT | Thể thao | `--line-tt` | `#C2410C` | `#FB8A4F` |
| TN | Tình nguyện – Cộng đồng | `--line-tn` | `#1F7A4D` | `#5CC48E` |
| KN | Kỹ năng – Hướng nghiệp | `--line-kn` | `#7A5A00` | `#D9B44A` |
| CN | Công nghệ – Sáng tạo | `--line-cn` | `#0E7490` | `#4CC3DD` |
| TS | Sự kiện toàn trường | `--line-ts` | mode ink | mode ink |

Rules: a category color appears as a line, a station ring, a 4 px chip edge, a
code badge, a marquee label (§6.2) or a registration spark (§6.2), never as a
large background fill. Text on a category color uses `--line-text` (the surface)
and must pass 4.5:1; every line keeps 3:1 against every mode's ground.
`npm run lint:contrast` (`scripts/contrast-check.ts`) checks every pair.

### 2.3 Mochi

| Token | Light | Dark | Use |
|---|---|---|---|
| `--mochi-body` | `#FFFDF8` | `#F4F0E8` | Mochi's body fill |
| `--mochi-blush` | `#F2B8B0` | `#E59A90` | Cheeks and inner ears only |
| `--mochi-outline` | `#14181F` | `#14181F` | Mochi's outline, same in every theme |

Mochi's colors are used for Mochi and nothing else, in every mode.

### 2.4 Appearance modes ("Chế độ màu")

Four modes, each a full set of colour, type and shape tokens for light and dark,
chosen in the Giao diện panel (§7.3). The mode is `data-mode` on `<html>`;
light/dark stays `data-theme` (Theo hệ thống / Sáng / Tối). Modes change tokens
only — never layout, content or behaviour — and apply on screens only: print
always uses Lộ trình light.

Each mode is built from one thing in Rodemap's own world (the Taste skill's
"idea" rule: the look comes from the subject, never from the category), keeps
one ground, one ink and one accent, and uses no gradient, glow or violet.

**Lộ trình** (`lo-trinh`, default) — the transit map of §2.1 and §2.2.

**Rực rỡ** (`ruc-ro`) — *transit signage.* Flat colour fields in signage yellow,
pink and cobalt on white, black type, and the student's route in map red ("you
are here"). *Sources: Awwwards' colour blocking (bold flat colours, two- and
three-colour palettes); the Taste skill's "full warm field used flat and with
conviction" and its ban on violet and gradients.*

| Token | Light | Dark |
|---|---|---|
| ground / surface / surface-2 | `#FFFFFF` / `#F4F4F1` / `#EAEAE5` | `#0B0B0B` / `#161616` / `#212121` |
| ink / ink-2 / rule | `#0B0B0B` / `#45453F` / `#D6D6CF` | `#F5F5F2` / `#B5B5AE` / `#2E2E2E` |
| signal / signal-ink | `#D0021B` / `#FFFFFF` | `#FF5468` / `#0B0B0B` |
| ok / warn / stop | `#17683F` / `#8A4B00` / `#9E1A1A` | `#4FCB8A` / `#F0B04A` / `#FF8A80` |
| block a / b / c (ink) | `#FFD23F` (ink) / `#FFA3C8` (ink) / `#0039A6` (white) | the same fields at full strength |
| link | ink (the signal is a red) | ink |

**Áp phích** (`ap-phich`) — *the wall newspaper.* Bản tin Hội đồng Học sinh as
the whole interface: two inks (black and newspaper red) on stone paper,
condensed headlines, square corners. *Sources: trending.design's typographic
posters, Awwwards' two-colour sites, type.today's condensed grotesques (Druk,
Gregory Grotesk Condensed); Taste's "strictly two-tone" scheme.*

| Token | Light | Dark |
|---|---|---|
| ground / surface / surface-2 | `#EEEBE4` / `#F8F6F1` / `#E2DED5` | `#141414` / `#1C1C1A` / `#272623` |
| ink / ink-2 / rule | `#141414` / `#4A463F` / `#CFC9BE` | `#EEEBE4` / `#ADA89E` / `#353330` |
| signal / signal-ink | `#BD1029` / `#FFFFFF` | `#FF5A4E` / `#141414` |
| ok / warn / stop | `#1B6640` / `#7F4A00` / `#8E1B12` | `#5CC48E` / `#E0A845` / `#FF9A8F` |
| block a / b / c (ink) | `#141414` (stone) / `#BD1029` (white) / `#E2DED5` (ink) | `#EEEBE4` (ink) / `#FF5A4E` (ink) / `#272623` (stone) |
| link | ink | ink |

**Dịu nhẹ** (`diu-nhe`) — *the quiet hours of the school day.* Putty paper and
deep green ink, one soft type family, rounded cards. *Sources: type.today's
width-family grotesques (Halvar), Endless Tools' toon shading (flat two- and
three-tone shapes), Uiverse's soft cards and toggles; Taste: warmth from a
low-chroma ground and a deep green ink, never beige.*

| Token | Light | Dark |
|---|---|---|
| ground / surface / surface-2 | `#F1F3EF` / `#FFFFFF` / `#E4E8E2` | `#121513` / `#1A1E1B` / `#232924` |
| ink / ink-2 / rule | `#18201B` / `#4E5951` / `#CDD5CC` | `#E4E9E4` / `#A2ACA4` / `#2F3731` |
| signal / signal-ink | `#1D6A4E` / `#FFFFFF` | `#7FD3AE` / `#121513` |
| ok / warn / stop | `#1D6A4E` (the accent is green) / `#855000` / `#A42A22` | `#7FD3AE` / `#E3B15A` / `#F2958C` |
| block a / b / c (ink) | `#DCE9E0` / `#DEE7EE` / `#ECE7DA` (ink) | `#1D3327` / `#1E2A33` / `#2F2B20` (ink) |

**High contrast, checked.** Every mode in light and dark passes, measured by
`npm run lint:contrast` (part of `npm run check`): ink **7:1** on ground,
surface and surface-2; ink-2, signal, ok, warn and stop 4.5:1 on all three;
signal-ink on signal and each block's ink on its block 4.5:1; route lines and
the focus ring 3:1 on the ground; every line badge's code 4.5:1. The script also
proves that "Theo hệ thống" resolves to exactly the colours of the explicit
Sáng / Tối choice. A mode that fails is not shipped.

---

## 3. Typography

All faces must include the **Vietnamese** subset (Fontsource `vietnamese`
files: ă, đ, ĩ, ũ, ơ, ư and U+1EA0–1EF9; â, ê, ô are in `latin`). A face is
downloaded only when a mode uses it (`unicode-range`).

*Source: type.today's width-system grotesques (Halvar's Breitschrift /
Mittelschrift / Engschrift, Gregory Grotesk Condensed, Druk). They are
commercial, so each role uses a free variable font with a width axis in the same
spirit; both were checked for the Vietnamese subset in their Fontsource
metadata. Taste: two typefaces at most per mode, numbers in tabular figures.*

| Mode | `--font-display` | `--font-body` | Times and codes (`--font-mono`) |
|---|---|---|---|
| Lộ trình | Bricolage Grotesque Variable 800 | Lexend Variable 400/500/600 | JetBrains Mono 500 (the departure board, §12) |
| Rực rỡ | Anybody Variable 800, `--display-stretch` 125 % (wide, like Halvar Breitschrift) | Mona Sans Variable | the body face, tabular figures |
| Áp phích | Anybody Variable 800, `--display-stretch` 62 % (condensed, like Druk) | Mona Sans Variable | the body face, tabular figures |
| Dịu nhẹ | Mona Sans Variable 700, `--display-stretch` 112 % | Mona Sans Variable | the body face, tabular figures |

- The wordmark keeps Bricolage (`--font-brand`, `--tracking-brand`) in every mode.
- Scale (fluid): `--text-xs` 12 · `--text-sm` 14 · `--text-md` 16 ·
  `--text-lg` 19 · `--text-xl` 24 · `--text-2xl` 30→44 · `--text-3xl` 40→76 ·
  `--text-display` 56→128.
- Display headings: `--weight-display`, `--tracking-tight` (−0.03em; −0.02em
  wide, +0.01em condensed), `--word-space-display` (wide and condensed faces
  need more room between words), `font-stretch: var(--display-stretch)`,
  `text-wrap: balance`.
- Short labels (eyebrows, codes) are upper case with `--tracking-caps` in Lộ
  trình and sentence case with no tracking in the other modes (`--case-caps`;
  Taste bans tiny tracked capitals).
- Body: 16 px minimum, line-height 1.6, measure 62ch.
- Times and dates are always tabular: `07:30`, `Th 4 · 14/10`.
- Vietnamese diacritics need room: display line-height is at least **1.15**
  (stacked marks such as Ấ, Ể, Ỗ collide below that), 1.2 for condensed
  display. Never clip text with `overflow: hidden` on a single line; line masks
  for motion add 0.14em above and below (§6.2 #12). Fit long strings with width,
  not a smaller size.
- Kinetic display text is split by line, never by letter, so diacritics and
  screen-reader output stay whole (§6.2).

---

## 4. Space, size, shape

- Spacing `--space-1…10`: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px.
- Gutter `--gutter`: clamp(16 px, 5vw, 56 px). Max width `--max-w`: 1320 px.
- Grid: 12 columns, 24 px gap on desktop; 4 columns on phones. Modular grids
  follow the Swiss grid books trending.design recommends (Müller-Brockmann,
  Vignelli): one column under 720 px, two from 720, four from 1080.
- Radius: `--radius-0` (tables, rails), `--radius-sm` 4 px (cards, inputs),
  `--radius-md` 10 px (drawers, panels), `--radius-pill` (chips, buttons).
  Rực rỡ and Áp phích square sm/md (0, signage and print); Dịu nhẹ softens them
  to 14 / 22 px. Buttons stay pills in every mode (Taste: square or round,
  decided once).
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
  Mochi side panel `--panel-w` 400 px; station card `--card-w` 320 px;
  Giao diện panel `--picker-w` 360 px.
- Type rhythm: `--leading-display` 1.15 (1.2 in Áp phích), `--leading-snug` 1.3,
  `--leading-body` 1.6; measure `--measure` 62ch.
- Focus: `--focus-w` 2 px, `--focus-offset` 2 px.
- Mochi stroke `--mochi-stroke` 2.5 px.
- Layers `--z-base` 0, `--z-sticky` 10, `--z-dock` 40, `--z-panel` 50,
  `--z-overlay` 60, `--z-toast` 70.
- Misc: chip category edge `--chip-edge` 4 px; icons `--size-icon` 20 px /
  `--size-icon-sm` 16 px; header `--header-h` 64 px; RouteMap user unit
  `--map-unit` 1 px; grid gap `--grid-gap` 24 px (`--grid-gap-phone` 16 px).
- Exam zones on the RouteMap ("Kiểm tra định kỳ") are a diagonal hatch built
  from `--color-rule` (`--hatch-exam`), never a new color. (Taste's app rules
  use the same hatch for a kind of booking.)
- Elevation: `--shadow-panel` only, for what truly floats (the Mochi panel,
  modal sheets, the Giao diện panel). Nothing at rest has a shadow; surfaces are
  separated by rules or a tone step (Taste).

---

## 5. Signature components

- **RouteMap**: the timeline. Horizontal on desktop (months as fare zones,
  weeks as ticks), vertical on phones. Category lines run in parallel; the
  student's registered events are joined by a thicker `--color-signal` line,
  "your route". Hovering or focusing a station opens a station card.
- **StationCard**: event summary. Code badge + category, title, club, mono
  date/time, place, seats left, deadline, one-line summary by Mochi, actions.
  An external competition (published by Phòng Cố vấn Học tập) adds a line
  "Đơn vị tổ chức: …" under the publisher and a neutral StatusTag "Cuộc thi
  ngoài trường" (icon `external`) before its status; the event page repeats
  the tag and explains the office's role in a ground box with an ink edge.
  (Added 2026-10-13.) Hover and focus darken its edge (§6.2 #3).
- **LineBadge**: two-letter code on a category color, used everywhere a
  category appears.
- **DepartureBoard**: the "Sắp diễn ra" list on the dashboard, styled like a
  departure board: time, code, title, place, status, in tabular columns.
- **ProposalCard**: one proposal on Đề xuất. Code badge + category and a
  status tag (Đang xem xét / Đã tiếp nhận / Chưa tiếp nhận, or Chờ phản hồi /
  Đã đồng ý hợp tác / Đã từ chối for collaborations), title, description,
  facts (grades, club, planned month), mono sender line (a student is shown by
  grade only), the answer in a surface-2 box with an ink edge, then support
  count and role actions under a hairline. (Added 2026-10-13.)
- **PortfolioSheet**: the portfolio as a printable A4 document with a route
  summary at the top, then entries grouped by category.
- **MochiDock**: Mochi lives at the bottom-right as a 56 px figure (not a
  generic chat bubble). Opening it slides a side panel (desktop) or a bottom
  sheet (phone). Mochi's states: idle (slow blink), listening, thinking
  (ears twitch), answering, celebrating (small hop), error (one ear down).
- **AppearancePicker** ("Giao diện"): see §7.3.
- **QuickPicks** ("Gợi ý nhanh"): the visitor's grade and fields on Tổng quan
  (§7.2): grade as a radio row (Chưa chọn, then Khối 6 … Khối 12 grouped THCS /
  THPT), fields as toggle chips with the category edge; suggestions update as
  soon as a pick changes.
- **SetupInvite**: shown to a visitor in place of an action that needs a
  profile: a heading, one sentence saying what the profile unlocks, and
  "Thiết lập hồ sơ" (which returns to the same page).
- **CategoryMarquee**: the seven category badges travelling across the home
  page's colour block (§6.2 #8), with a visible "Tạm dừng" button.
- **DotRoad**: a full-bleed strip of dots displaced along a wave, like a road
  seen from above, closing the home hero; filled with `--color-pattern`,
  `aria-hidden`, never behind text. *Source: Durves (dot matrix + wave
  amplitude/frequency, SVG export).*

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

## 6. Motion and interaction

### 6.1 Tokens and rules

Curves and durations follow the Taste skill's motion study (the latest 99
Awwwards Sites of the Day):

`--dur-fast` 140 ms (press) · `--dur-hover` 180 ms · `--dur-ui` 240 ms (menus,
panels) · `--dur-med` 320 ms · `--dur-slow` 700 ms (theme ripple) ·
`--dur-reveal` 800 ms (reveals, line rises) · `--dur-open` 1200 ms · `--dur-draw`
1600 ms (route line draw-in) · `--dur-idle` 5200 ms (Mochi blink) ·
`--dur-marquee` 40 s · `--dur-spark` 600 ms · `--dur-count` 1100 ms ·
`--stagger-line` 90 ms · `--stagger-item` 70 ms · `--rise` 24 px.
`--ease-out` cubic-bezier(.22,1,.36,1) (quint out, UI under 600 ms) ·
`--ease-expo` cubic-bezier(.16,1,.3,1) (reveals of 800 ms and more) ·
`--ease-in-out` cubic-bezier(.76,0,.24,1) (wipes, things that travel) ·
`--ease-exit` cubic-bezier(.55,.055,.675,.19) (leaving for good, short) ·
`--ease-spring` (Mochi only, never on interface elements) · `--ease-linear`.

- **One source of timing.** CSS uses the tokens; GSAP reads the same tokens at
  run time (`motionSeconds`, `motionEase` in `src/components/motion/gsap.ts`,
  which turns each cubic-bezier into a GSAP CustomEase). No duration or curve
  is typed in a component.
- Animate `transform` and `opacity` only. Micro-interactions stay under 300 ms.
- Everything respects `prefers-reduced-motion: reduce`: every duration token
  collapses to 0, GSAP effects do not run, loops stop, and the reduced page is
  the finished page.
- Nothing on the first screen waits for scroll; reveals fire once, below the
  fold, and nothing stays hidden longer than 900 ms in view. App screens
  (Tổng quan, Khám phá, Lộ trình…) never perform entrances: their motion is
  feedback only (press, hover, a panel opening, a row arriving). Taste.
- Anything shown on hover is also shown on `:focus-visible`, and is shown by
  default on touch screens (`@media (hover: none)`).
- Never: custom cursors, pointer-following elements, scroll-jacking or
  smooth-scroll libraries, magnetic buttons, preloaders, scramble or typewriter
  text, bounce on interface elements, flashing more than three times a second,
  or motion longer than 5 s without a pause control.
- When Mochi adds an event to the plan, the "your route" line extends to the
  new station. This is the product's key moment; make it feel good.

### 6.2 Interaction catalog

Built with **GSAP** (`gsap`, `@gsap/react`), components adapted from
**React Bits**, and **framer-motion** for the one layout animation.

| # | Name | Where | How | Reduced motion | Source |
|---|---|---|---|---|---|
| 1 | Press | every button, the Giao diện button | `:active` scales to 0.97 (`--dur-fast`, `--ease-out`); hover changes colour only | colour only | Taste press recipe; Uiverse buttons |
| 3 | Darker edge | StationCard | hover and `:focus-within` darken the border to ink; no lift, no shadow | same | Taste app rules (no lift on every card) |
| 4 | Swatch radio cards | Giao diện | real radios; the chosen card shows a tick and a ring, never colour alone | instant | Uiverse radio buttons |
| 5 | Brightness control | Giao diện | Theo hệ thống / Sáng / Tối as a segmented radio group with monitor, sun and moon icons | instant | Uiverse theme switch |
| 6 | Theme ripple | changing mode or brightness | View Transitions API: the new appearance grows as a circle from the control used (`--dur-slow`, `--ease-in-out`) | instant swap; also when unsupported | Design Spells: HackerRank's ripple; Awwwards transitions |
| 7 | Section entrance | home page pillars | `Reveal`: the parts of a section rise `--rise` and fade in, staggered `--stagger-item`, once, below the fold only (GSAP + IntersectionObserver) | shown as is | React Bits AnimatedContent; Taste reveal recipe |
| 8 | Category marquee | home page colour block (Đầy đủ) | seven badges loop sideways (`--dur-marquee`, linear); pauses on hover and focus; a visible "Tạm dừng" button (WCAG 2.2.2); the copy is `aria-hidden` | one still, wrapped row | Awwwards text marquee; Taste "one marquee per page" |
| 9 | Stacking steps | home page "Cách các bên cùng tham gia", under 1080 | sticky cards with a growing top offset | plain list | Awwwards stacking cards; Taste pinned story |
| 10 | Registration sparks | after "Xác nhận" registers an event | `SparkBurst`: twelve line sparks in the event's category colour fly out once (`--dur-spark`, GSAP), `aria-hidden`; the status text announces the result | nothing | React Bits ClickSpark; Design Spells confetti, kept small and formal |
| 12 | Headline line rise | home hero (on load), home section headings (once in view) | `SplitLines`: GSAP SplitText by line with masks, lines rise from 150 % (far enough to hide stacked diacritics), `--dur-reveal`, `--ease-expo`, `--stagger-line`; split before first paint, re-split on font load or resize | static | React Bits SplitText; Taste masked line reveal |
| 13 | Dot road | under the home hero | static DotRoad SVG, recoloured by the mode | static | Durves |
| 16 | Counting figures | home page colour block | `CountUp`: three figures counted from the sample data (open events, clubs, events in the year) count up once in view; the value is read out once, the digits are `aria-hidden` | the value | React Bits CountUp; Taste rolling figures |
| 17 | Suggestions settle | visitor Tổng quan | when a pick changes, suggestion rows slide to their new place and new rows fade in (framer-motion `layout`, `AnimatePresence`, `MotionConfig reducedMotion="user"`) | instant | framer-motion; Taste "a row arriving" |

Withdrawn after the Taste review: #2 CTA gradient sweep (gradients), #11 icon
nudges (the nav's existing route-segment hover is enough), #14 extruded
headline (stacked text shadows are ornament) and #15 illustrated empty states
(an empty block keeps its frame and one sentence).

One orchestrated moment per screen still applies: on the landing page the
headline rises and the route lines draw in, stations pop on and Mochi hops onto
the last station; the other effects are small.

---

## 7. Layout and placement

### 7.1 Header and pages

- Header: wordmark left, primary nav (Tổng quan, Khám phá, Lộ trình, Lịch, Hồ
  sơ, Câu lạc bộ, Bản tin), right side: search (⌘K / Ctrl K), **Giao diện**
  (§7.3), account. When the demo role is Câu lạc bộ the nav adds "Cổng CLB";
  when it is HĐHS it adds "Kiểm duyệt". (Tổng quan added 2026-10-07: the
  dashboard needs a permanent entry point. Bản tin added 2026-10-08 for the
  council's newsletter; from 1080 units up the search control shows its icon
  only, keeping its name and the Ctrl K shortcut, so eight sections fit. Đề
  xuất added 2026-10-13 for the student role only; with the club or HĐHS role
  /de-xuat is drawn as part of Cổng CLB or Kiểm duyệt, which link to it, so the
  nav never exceeds eight. Giao diện replaced the theme toggle on 2026-10-24.)
- Grades run from khối 6 to khối 12, grouped as Trung học cơ sở and Trung học
  phổ thông; an event open to every grade reads "Khối 6–12 (toàn trường)".
- Bản tin Hội đồng Học sinh reads as a wall newspaper: the page head is a
  nameplate closed by a double rule, issues are numbered by month (Số 1 = Tháng
  9/2026) and marked by an interchange station (ink ring; signal stays reserved
  for the student's own route), articles sit in ruled columns, the lead story
  faces "Trong số N", and quotes carry a thick signal rule. Articles are signed
  by a council department (body face, never mono), never by a student.
- Landing hero: the headline runs across the page (a full-width row, at most
  22ch); under it, five columns hold one supporting line and two actions and
  seven columns hold a live, animated RouteMap fragment with real sample events
  — the product is the hero, never stock imagery. The DotRoad closes the hero.
- App screens: a left filter rail (240 px) on desktop that becomes a bottom
  sheet on phones; content in the remaining columns; MochiDock always available
  once a profile exists.
- Sections alternate ground and surface bands separated by hairlines; one band
  per page may be a colour block (§11).

### 7.2 Visitors without a profile ("Dùng thử")

A visitor can try Rodemap before setting up a profile, to see events and
suggestions:

- Open without a profile: Trang chủ, Tổng quan (visitor version), Khám phá,
  Chi tiết sự kiện, Lộ trình (the whole school's map), Câu lạc bộ, Bản tin, Đề
  xuất (reading), Đề án, Thiết lập hồ sơ.
- Still need a profile: Lịch của tôi, Hồ sơ năng lực, and the demo role pages
  (Cổng CLB, Kiểm duyệt, Soạn bài viết). Opening one leads to Thiết lập hồ sơ
  and back afterwards. A visitor always sees the student version of the open
  pages, whatever demo role is set.
- Trang chủ for a visitor: "Dùng thử Rodemap" (primary, to Tổng quan) and
  "Thiết lập hồ sơ"; with a profile: "Về trang Tổng quan" and "Xem đề án".
- Tổng quan for a visitor: a "Dùng thử Rodemap" head with one sentence and a
  primary "Thiết lập hồ sơ" button, QuickPicks (§5) in the colour block, then
  "Gợi ý cho bạn" (up to 6 StationCards with their reasons, §6.2 #17) and "Hạn
  đăng ký tuần này". Without a grade the suggestions are listed by date with the
  line "Chọn khối để xem các sự kiện dành cho bạn." The time fit is never
  claimed for a visitor (no availability is known).
- Actions that need a profile never fail silently: "Đăng ký" becomes a
  secondary button "Thiết lập hồ sơ để đăng ký" that opens Thiết lập hồ sơ and
  returns to the same page; on Đề xuất a SetupInvite replaces the form and the
  support chips are hidden; "Hỏi Mochi" controls are hidden (MochiDock appears
  once the profile exists).
- The header shows the visitor nav (Tổng quan, Khám phá, Lộ trình, Câu lạc bộ,
  Bản tin, Đề xuất), search, Giao diện, account and a primary "Thiết lập hồ sơ"
  button (not on Thiết lập hồ sơ itself); on phones that button moves to the
  top of the Danh mục panel.
- The visitor's grade and fields are kept on this device only and prefill step
  1 and 2 of Thiết lập hồ sơ. Nothing else is asked.

### 7.3 Giao diện (appearance and density picker)

- A header button "Giao diện" (palette icon; the name is kept for screen readers
  and as a tooltip) for everyone, visitors included.
- It opens a non-modal panel (`--picker-w`, `--shadow-panel`; a sheet under the
  header below 720) labelled "Giao diện", with three fieldsets:
  1. **Chế độ màu** — four swatch radio cards (Lộ trình, Rực rỡ, Áp phích, Dịu
     nhẹ); each shows its ground, signal and first block side by side (colours
     are judged in pairs, as in the colour-interaction book trending.design
     lists) plus its name and a five-word description.
  2. **Độ sáng** — Theo hệ thống / Sáng / Tối (segmented radio group).
  3. **Mật độ nội dung** — Đầy đủ / Gọn / Tối giản (radios), each with a
     one-line description (§10).
- Arrow keys move within a group; Escape closes and returns focus to the
  button; a click outside or a navigation closes; the panel opens from its
  corner (`--dur-ui`, scale from 0.97).
- The choice applies at once (with the theme ripple, §6.2 #6) and is kept on
  this device (AppState, localStorage); `public/theme-init.js` applies it before
  the first paint. Print always uses Lộ trình light.

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
- Short copy (§10) is written, not cut: each compact text is its own formal
  sentence.
- Figures on the page are counted from the data, never typed in; no invented
  proof (Taste).

---

## 9. Accessibility (WCAG 2.1 AA)

- Contrast ≥ 4.5:1 for text (7:1 for ink), 3:1 for large text, icons and route
  lines, in every appearance mode and brightness (§2.4, `npm run lint:contrast`);
  axe runs on the open pages in every mode, light and dark, with Giao diện open.
- Every control is a real `<button>`, `<a>` or form element with a visible
  label; toggles expose `aria-pressed` / `aria-expanded`; the picker uses radio
  groups.
- RouteMap has a full list/table alternative ("Xem dạng danh sách") with the
  same data; keyboard users can move between stations with arrow keys.
- Mochi's panel is a labelled dialog/complementary region; new messages are
  announced with `aria-live="polite"`; focus returns to the dock on close.
- Focus is always visible: 2 px `--color-signal` outline with 2 px offset.
- Motion: see §6.1 (reduced motion, 2.2.2 pause control, 2.3.1 no flashing).
  Split headings keep an accessible name; counting figures are read once.
- Hidden-by-density content (§10) is removed from the accessibility tree too
  (`display: none`), never only visually hidden.
- `lang="vi"` on the document; mixed English terms get `lang="en"`.

---

## 10. Mật độ nội dung (text density)

The owner found the home page too wordy. Students choose how much text Rodemap
shows; the choice is `data-density` on `<html>` and a value in AppState. No
resource in §12 covers text density, so this section follows the owner's
request and the voice rules.

| Mode | Value | What it shows |
|---|---|---|
| Đầy đủ | `full` | Everything: eyebrow, leads, card summaries, helper paragraphs, explanations; the home page adds the problem and solution, Mochi, the marquee, the steps and the closing text. |
| **Gọn** (default) | `compact` | Page leads use their short version (one sentence); reasons and helper blocks stay; the home page shows the hero (headline, one line, two actions, the map), the counted figures, the four pillars with one short sentence each and the closing call to action. |
| Tối giản | `minimal` | Headings, facts (time, place, seats, deadline), statuses and actions only; leads, reasons and helper blocks are hidden; the home page shows the hero (headline, one line, two actions) and the route map. |

- Word budget for the home page (excluding the route map and the footer):
  Đầy đủ — the full content; Gọn ≤ 120 words; Tối giản ≤ 40 words. A browser
  test counts them.
- Implementation: content with a short version stores both (`PageHead` takes
  `lead` and `leadShort`; landing content has `short` fields); CSS helpers hide
  whole blocks: `.density-full-only` (only in Đầy đủ), `.density-compact-only`
  (only in Gọn), `.density-hide-full` (Gọn and Tối giản) and `.density-detail`
  (hidden in Tối giản). A lead without a short version carries facts and shows
  in every density.
- Density never hides: errors, statuses, legal and privacy notes, the demo
  label, form labels, or anything a student must read before pressing
  "Xác nhận".

---

## 11. Content rules for colour blocks and textures

- A colour block (`.band--block`) uses `--color-block-a` with its own
  `--color-block-a-ink`; links on blocks are underlined.
- The DotRoad is decorative, `aria-hidden`, and never sits behind text.
- Colour blocks appear at most once per page; the RouteMap and forms always sit
  on ground or surface.

---

## 12. Nguồn tham khảo

Direct access to these sites was blocked from the build environment, so the
eight design resources were studied through web search results (October 2026);
the Taste skill and React Bits were read from their source repositories. What
was taken from each:

| Resource | What it is (from the research) | Taken for Rodemap |
|---|---|---|
| [Uiverse](https://uiverse.io/) | MIT-licensed community library of CSS/Tailwind UI elements (buttons, toggle switches, radio buttons, cards, loaders, tooltips) | Press feedback (#1), swatch radio cards (#4), brightness control (#5); glass and neumorphic styles rejected for contrast |
| [trending.design](https://trending.design/) | Curated design products and inspiration (design books, graphic and branding inspiration, typographic and moving posters) | Swiss modular grid discipline (§4), judging colours in pairs (§7.3), poster typography for Áp phích |
| [Durves](https://www.durves.com/) | Free tool for dot patterns: dot matrix, wave amplitude/frequency, colour, SVG export ([GitHub](https://github.com/filipeedr/durves)) | DotRoad (§5, #13) |
| [Awwwards — Interaction design](https://www.awwwards.com/websites/interaction-design/) and [Awwwards](https://www.awwwards.com/) | Web design awards; interaction-design category and collections (stacking cards, text marquee, scroll animations, transitions, colour exploration) | Colour blocking (Rực rỡ, §2.4), section entrances (#7), marquee (#8), stacking steps (#9), theme transition (#6) |
| [Endless Tools](https://endlesstools.io/) | Browser-based no-code 3D design tool (type tool, materials, halftone, toon shading, post effects) | Toon-shaded flat tones for Dịu nhẹ; WebGL, halftone textures and 3D type not used (ornament) |
| [Design Spells](https://designspells.com/) | Curated gallery of micro-interactions and delightful details from real products | Theme ripple (#6), registration sparks (#10) |
| [type.today](https://type.today/en) | Type foundry and journal: width-system grotesques (Halvar, Gregory Grotesk, Druk), variable fonts | The width axis per mode (§3) with free equivalents: Anybody (wide and condensed) and Mona Sans, both with Vietnamese |
| [Taste skill](https://github.com/Leonxlnx/taste-skill) (MIT) | Anti-slop frontend art direction distilled from 247 gallery sites and 23 product screens; house rules, app-screen rules, motion study | The idea per mode (§2.4), no violet, no gradients, ink 7:1, two faces at most, sentence-case labels, no shadows at rest, motion tokens and rules (§6.1), entrances on pages only, line rise, reveal, rolling figures, press feedback |
| [React Bits](https://reactbits.dev/) (MIT + Commons Clause) | Animated React components (GSAP and motion based) | Adapted, with the copyright notice kept in each file: SplitText → `SplitLines`, AnimatedContent → `Reveal`, CountUp → `CountUp`, ClickSpark → `SparkBurst` (`src/components/motion/`) |
| [GSAP](https://gsap.com/) and [framer-motion](https://motion.dev/) | Animation libraries (GSAP with SplitText and CustomEase) | GSAP drives #7, #10, #12 and #16 from the motion tokens; framer-motion drives #17 |

**Taste rules Rodemap keeps differently, and why.** Lộ trình is the existing
brand and keeps three devices Taste bans on marketing pages: monospace times
and codes (the departure board is the product's identity; Taste's app rules
allow "every figure in a monospace as one style's decision"), eyebrows above
page titles (they carry the week or the issue number), and hairline rules
(tables, the departure board and route grids are real tables and timelines,
which Taste exempts). The three new modes follow the house rules in full.
