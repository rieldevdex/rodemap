# Rodemap — architecture and contracts

Binding companion to `DESIGN.md` (visual) and `PROMPT.md` requirements. Every
module below has a fixed public signature so layers can be built in parallel.
If you must change a signature, change it here in the same commit.

## Layers

```
src/domain/      pure functions, no React/DOM/clock. 100 % unit-test coverage (enforced).
src/data/        typed illustrative sample data (each file starts with the illustrative comment).
src/state/       AppState, actions, reducer, selectors (pure, tested) + persistence + StoreProvider.
src/mochi/       system prompt, tool schemas, tool executors, offline engine, API client.
src/router/      tiny History-API router.
src/components/  atoms | molecules | organisms — presentational, props only.
src/pages/       one file per screen; may read the store through hooks from src/state/hooks.ts.
functions/api/   Cloudflare Pages Function for Mochi.
scripts/         token lint, copy lint, size check, service-worker build plugin (sw-plugin.ts).
tests/e2e        Playwright smoke, demo path, offline (service worker) + axe; tests/screens screenshots.
```

Rules:

- Components and pages never touch `localStorage`, `fetch`, `document.cookie`
  or the Mochi API client (ESLint enforces). Side effects live in
  `src/state/persistence.ts`, `src/state/effects.ts`, `src/mochi/client.ts`.
- Domain functions take the current time as an argument (`now: Millis`).
  Nothing in `src/domain` calls `Date.now()` or `new Date()` without arguments.
- All times are Asia/Ho_Chi_Minh. Use `src/domain/dates.ts` for every
  parse/format; never `toLocaleString` without `timeZone`.
- Imports use relative paths with no file extension (`'../domain/dates'`).

## Copy rules (enforced by `npm run lint:copy`)

Formal administrative Vietnamese (văn phong hành chính). Any string literal or
JSX text containing a Vietnamese diacritic is scanned. Banned:

- words: `làm ra`, `lo` (standalone), `chạy`, `người lớn`, `thật`
- structures: `… nào cũng …`, `cứ … lại …`, `chứ không phải`, slogan contrasts
  `, không phải …` / `không phải … mà là …`
- emoji (any Extended_Pictographic character)

Prefer: phát triển, vận hành, phụ trách, đảm bảo, triển khai, tổng hợp, đề xuất,
xác nhận, đăng ký. Link ideas with: nhằm, qua đó, đồng thời, góp phần.
Buttons are verbs: Đăng ký, Thêm vào lịch, Xuất hồ sơ, Gửi sự kiện, Phê duyệt.
Dates: `14/10/2026`, times `07:30`, weekdays `Thứ Tư` / short `Th 4`.
The product is **Rodemap** (never "Rode").

## Styling rules (enforced by `npm run lint:tokens`)

- Plain CSS, one file per component next to it (`StationCard.tsx` +
  `StationCard.css`, imported by the component). Page CSS next to the page.
- Class names: kebab-case BEM, block = component name in kebab case:
  `.station-card`, `.station-card__title`, `.station-card--compact`.
- Outside `src/styles/tokens.css`: no hex/rgb/hsl/oklch colors, no font
  names, no `px`/`rem` (except `@media (min-width: 720px)` /
  `(min-width: 1080px)` / `(width < 720px)` / `(width < 1080px)`), no
  gradients, no `backdrop-filter`, no raw `box-shadow` (only
  `var(--shadow-panel)` or `none`), no raw durations or `cubic-bezier`, no raw
  `z-index` other than 0/1/-1. Use `calc(var(--space-2) * 3)` etc. when needed.
- In TSX: inline `style` may only set custom properties (`style={{'--x': v}}`).
  SVG geometry is unitless user units; SVG colors come from CSS classes.
- Category color in CSS: `var(--line-ht)` … `var(--line-ts)`; components use
  the helper `lineVar(code)` from `src/components/atoms/lineVar.ts` →
  `'var(--line-ht)'`.
- Focus: `:focus-visible { outline: var(--focus-w) solid var(--color-signal); outline-offset: var(--focus-offset); }`
  is global in `base.css`; do not remove outlines.
- Every animation must be disabled or instant under
  `prefers-reduced-motion: reduce` (durations already collapse to 0 in tokens).

## Domain contracts (`src/domain/*.ts`)

```ts
// dates.ts — implemented. toMillis, vnParts, toIsoDate, toIsoDateTime, startOfVnDay,
// addDays, startOfIsoWeek, isoWeekKey, startOfVnMonth, startOfNextVnMonth, isSameVnDay,
// calendarDaysBetween, overlaps, overlapMinutes, durationHours, formatTime, formatDate,
// formatShortDate, weekdayLong, weekdayShort, formatDayLabel, formatLongDate,
// formatTimeRange, monthLabel, monthShortLabel, formatMonthYear, SCHOOL_YEAR, DAY_MS…

// text.ts
export function foldVietnamese(s: string): string;            // lowercase, strip diacritics, đ→d, collapse spaces
export function matchesQuery(haystack: string, query: string): boolean; // every folded query token appears
export function formatHours(hours: number): string;           // "2,5": two decimals at most, decimal comma

// profile.ts — onboarding (Thiết lập hồ sơ)
export const ONBOARDING_STEPS = ['class', 'interests', 'goals', 'time'] as const;
export const BUDGET_LIMITS = { min: 2, max: 12, step: 1 }; export const TOP_INTEREST_COUNT = 3;
export interface ProfileDraft { grade: Grade | null; className: string; interests: CategoryCode[]; goals: GoalId[];
  weekdayAfterSchool: boolean; weekend: boolean; weeklyHourBudget: number }
export function emptyDraft(): ProfileDraft;
export function stepErrors(draft, step): Partial<Record<'grade'|'className'|'interests'|'goals'|'availability', string>>;
//   class names: grade + one letter + ≤ 3 letters/digits ("11A2"), must start with the chosen grade.
export function firstIncompleteStep(draft): OnboardingStep | null;
export function toggleInterest(list, code) / moveInterest(list, code, -1 | 1) / toggleGoal(list, id);
export function clampBudget(hours): number;
export function draftToProfile(draft, now): Profile | null;    // null until every step is complete; topInterests = first 3

// news.ts — Bản tin Hội đồng Học sinh
export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string>; // Thông báo, Tin hoạt động, Câu lạc bộ, Hướng dẫn
export const NEWS_LIMITS; export const RESERVED_NEWS_SLUGS = ['soan-bai'];
export function sortNews(posts): NewsPost[];                  // newest first; same instant: later in the list first; last copy of a repeated id
export function publishedPosts(posts, now): NewsPost[];       // sortNews, publishedAt <= now; later ones are scheduled
export function leadPost(posts): NewsPost | undefined;        // newest pinned, else newest (ties keep input order)
export function issueNumber(ms): number; export function groupByIssue(posts): NewsIssue[]; // Số 1 = Tháng 9/2026
export function filterPosts(posts, { category, query }): NewsPost[];
export function relatedPosts(post, posts, limit = 3): NewsPost[]; // shared events/clubs ×2, same column ×1
export function postsAboutEvent(posts, eventId) / postsAboutClub(posts, clubId);
export function parseNewsBody(text): NewsBlock[]; export function bodyToText(blocks): string; // "## ", "- ", "> … — nguồn"
export function newsBodyText(blocks): string; export function readingMinutes(post): number;
export function validateNewsDraft(draft, knownEventIds): NewsDraftErrors;
export function uniqueNewsSlug(title, taken): string; export function postFromDraft(draft, { id, now, takenSlugs, clubOfEvent }): NewsPost;
export function groupThousands(n): string;                    // 6000 -> '6.000'

// calendar-view.ts — Lịch của tôi
export function monthGrid(ms): Millis[][];                    // Monday-first weeks covering the month
export function weekDays(ms): Millis[]; export function isInMonth(day, monthMs): boolean;
export function shiftMonth(ms, delta): Millis; export function shiftWeek(ms, delta): Millis;
export function eventsOnDay(events, day): SchoolEvent[];      // overlapping the VN day, by start
export function eventsBetween(events, from, to): SchoolEvent[];
export function periodOn(periods, day): CalendarPeriod | undefined; export function periodsBetween(periods, from, to): CalendarPeriod[];

// events.ts — event-level facts
export function eventStart(e: SchoolEvent): Millis;
export function eventEnd(e: SchoolEvent): Millis;
export function eventHours(e: SchoolEvent): number;           // durationHours
export function isRegistered(eventId: string, regs: Registration[]): boolean; // status registered|attended
export function seatsLeft(e: SchoolEvent, regs: Registration[]): number; // capacity - seatsTaken - (registered ? 1 : 0), min 0
export function isFull(e: SchoolEvent, regs: Registration[]): boolean;
export function isDeadlinePassed(e: SchoolEvent, now: Millis): boolean;
export function isPast(e: SchoolEvent, now: Millis): boolean;  // end <= now
export function isEligible(e: SchoolEvent, grade: Grade | null): boolean; // null grade → true
export function deadlineDaysLeft(e: SchoolEvent, now: Millis): number; // calendar days, negative if passed
export function fitsAvailability(e: SchoolEvent, a: Availability): boolean;
//   weekend (Sat/Sun) → a.weekend; weekday starting ≥ 16:30 → a.weekdayAfterSchool;
//   weekday during school hours → true only for category 'TS' (school-wide, scheduled by the school)
export function registrationState(e, regs, now): 'registered'|'attended'|'absent'|'open'|'full'|'closed'|'past';
export function sortByStart(events: SchoolEvent[]): SchoolEvent[]; // stable, start then id; returns a new array

// filters.ts
export type DateWindow = 'all' | 'this_week' | 'next_week' | 'this_month' | 'next_30_days';
export interface EventFilter {
  query?: string; categories?: CategoryCode[]; clubIds?: string[]; grades?: Grade[];
  window?: DateWindow; format?: EventFormat | 'all'; hasSeats?: boolean;
  deadline?: 'any' | 'open' | 'closing_7_days'; includePast?: boolean;
}
export function filterEvents(events, filter, ctx: { now: Millis; regs: Registration[]; clubs: Club[] }): SchoolEvent[];
//   query matches title, summary, location, tags (ids), club name/shortName (folded).
//   grades: event eligible for ANY selected grade. default excludes past events.
export function windowRange(window: DateWindow, now: Millis): { from: Millis; to: Millis } | null;
export function countActiveFilters(filter: EventFilter): number;

// conflicts.ts
export function findConflicts(target: SchoolEvent, others: SchoolEvent[]): Conflict[]; // excludes same id
export function allConflicts(events: SchoolEvent[]): Conflict[];       // pairwise, sorted
export function conflictIdsFor(eventId: string, conflicts: Conflict[]): string[];

// budget.ts
export function hoursByWeek(events: SchoolEvent[]): Map<string, number>; // isoWeekKey(start) → hours
export function weekHours(events: SchoolEvent[], weekKey: string): number;
export function wouldExceedBudget(candidate: SchoolEvent, plan: SchoolEvent[], budget: number): boolean;
export function budgetStatus(plan: SchoolEvent[], budget: number, now: Millis): { weekKey: string; used: number; budget: number; remaining: number };

// recommend.ts
export interface RecommendContext { profile: Profile | null; plan: SchoolEvent[]; regs: Registration[]; now: Millis; goals: Goal[] }
export function recommendEvents(events: SchoolEvent[], ctx: RecommendContext, opts?: { limit?: number; from?: Millis; to?: Millis; category?: CategoryCode }): Recommendation[];
//   hard filters: status approved, not past, deadline not passed, not registered, eligible, seats left > 0
//   score: top interest rank 1/2/3 → +6/+4/+3; other interest +2; goal tag match +2 (once);
//   fits availability +1 (else warning outside_availability, −3); category under-represented in plan
//   (count ≤ min count among interests) +1 balances_categories; deadline within 7 days +1 deadline_soon;
//   conflict with plan → warning conflict, −4; would exceed weekly budget → warning over_budget, −2;
//   seats left ≤ 5 → warning few_seats. grade_eligible is always listed last among reasons when profile set.
//   No profile → interests ignored, still filtered and sorted by start.
//   ties: earlier start, then id. Deterministic.

// planner.ts — powers onboarding's first route and Mochi's propose_calendar_plan
export interface PlanProposal {
  accepted: SchoolEvent[];
  dropped: { event: SchoolEvent; reason: 'conflict' | 'over_budget' | 'full' | 'closed' | 'ineligible'; conflictWith?: string }[];
  alternatives: { forEventId: string; event: SchoolEvent }[]; // same category, fits, ≤ 21 days away
  hoursByWeek: Record<string, number>;
}
export function proposePlan(candidates: SchoolEvent[], ctx: RecommendContext & { allEvents: SchoolEvent[]; budget: number }): PlanProposal;
export function firstRoute(events: SchoolEvent[], ctx: RecommendContext, size?: number): PlanProposal; // top recommendations → proposePlan, default 4

// route-layout.ts — geometry for the RouteMap (unitless SVG user units)
export type Orientation = 'horizontal' | 'vertical';
export interface RouteLayoutInput {
  events: SchoolEvent[]; myEventIds: string[]; periods: CalendarPeriod[];
  range: { from: Millis; to: Millis }; orientation: Orientation;
  pxPerDay: number; laneGap: number; padding: { start: number; end: number; cross: number };
  categories: CategoryCode[]; now: Millis;
}
export interface StationGeom { eventId: string; category: CategoryCode; x: number; y: number; mine: boolean; interchange: boolean; lane: number }
export interface RouteLayout {
  width: number; height: number;
  lanes: { category: CategoryCode; x1: number; y1: number; x2: number; y2: number }[];
  stations: StationGeom[];                      // sorted by start then id (keyboard order)
  interchanges: { eventIds: string[]; x1: number; y1: number; x2: number; y2: number }[]; // same-day stations on different lanes
  myRoute: { d: string; length: number };       // SVG path: horizontal runs + 45° bends between my stations
  months: { label: string; short: string; from: number; to: number; index: number }[]; // fare zones along the time axis
  weekTicks: number[];                          // positions of Mondays
  periods: { id: string; kind: 'exam'|'holiday'; label: string; from: number; to: number }[];
  today: number | null;                         // position, null if out of range
}
export function layoutRoute(input: RouteLayoutInput): RouteLayout;
export function timeToPos(t: Millis, input: Pick<RouteLayoutInput, 'range'|'pxPerDay'|'padding'>): number;
//   horizontal: x = time, y = lane; vertical: y = time, x = lane. Stations on the same lane closer than
//   12 units are nudged along the time axis to keep ≥ 12 units apart (order preserved).

// ics.ts
export function buildIcs(events: SchoolEvent[], opts: { now: Millis; clubs: Club[]; calendarName?: string; baseUrl?: string }): string;
//   RFC 5545: CRLF, lines folded at 75 octets (UTF-8 safe), TEXT escaping (\\ \; \, \n), VTIMEZONE
//   Asia/Ho_Chi_Minh (+0700, no DST), DTSTART/DTEND;TZID=Asia/Ho_Chi_Minh, UID `${event.id}@rodemap.app`
//   (stable), DTSTAMP from opts.now in UTC, SUMMARY, LOCATION, DESCRIPTION (summary + club + url),
//   CATEGORIES (category name), URL when baseUrl given. PRODID "-//Rodemap//Ban trinh dien//VI".
export function icsFileName(now: Millis): string; // "rodemap-lich-ca-nhan-2026-10-14.ics"

// gcal.ts
export function googleCalendarUrl(e: SchoolEvent, opts: { clubs: Club[]; baseUrl?: string }): string;
//   https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=YYYYMMDDTHHMMSS/…&ctz=Asia/Ho_Chi_Minh&details=…&location=…

// portfolio.ts
export function hoursByCategory(entries: PortfolioEntry[]): Record<CategoryCode, number>; // all 7 keys
export function totalHours(entries: PortfolioEntry[]): number;
export function groupByCategory(entries: PortfolioEntry[]): { category: CategoryCode; entries: PortfolioEntry[]; hours: number }[]; // CATEGORY_CODES order, non-empty only
export function entryFromEvent(e: SchoolEvent, opts: { id: string; now: Millis }): PortfolioEntry; // role "Thành viên tham gia", hours = eventHours, empty reflection
export function pendingAttendance(events: SchoolEvent[], regs: Registration[], entries: PortfolioEntry[], now: Millis): SchoolEvent[]; // past + registered (not attended/absent)
export function attendedWithoutEntry(events, regs, entries): SchoolEvent[];
export function portfolioJson(entries: PortfolioEntry[], events: SchoolEvent[], clubs: Club[], profile: Profile | null, now: Millis): object; // export shape, version 1, no personal data beyond grade/class

// moderation.ts
export type ValidationErrors = Partial<Record<keyof EventDraft, string>>; // formal Vietnamese messages
export function validateDraft(d: EventDraft, now: Millis): ValidationErrors;
//   title 8–120 chars; summary 40–400; description ≥ 80; start < end; end − start ≤ 12 h unless multi-day ok (≤ 3 days);
//   registrationDeadline ≤ start and > now; capacity 1–2000; eligibleGrades non-empty; location non-empty;
//   start within SCHOOL_YEAR.
export function applyReview(sub: Submission, status: EventStatus, action: ReviewAction, at: IsoDateTime, reason?: string): { submission: Submission; status: EventStatus };
//   submit/resubmit → pending; approve → approved; request_changes → changes_requested (reason required);
//   reject → rejected (reason required). Throws Error on invalid transition or missing reason.
export function canTransition(from: EventStatus, action: ReviewAction): boolean;
export function slugify(title: string): string; // folded, ascii, hyphenated, ≤ 60 chars
export function charCount(s: string): number;   // graphemes after trim (Intl.Segmenter), used by every length limit
```

## Data (`src/data/*.ts`)

```ts
categories.ts   export const CATEGORIES: Category[]; export function categoryByCode(c): Category
tags.ts         export const TAGS: Tag[]; export function tagLabel(id): string
goals.ts        export const GOALS: Goal[]
clubs.ts        export const CLUBS: Club[]           // 14, incl. Inkstep (id 'inkstep')
events.ts       export const EVENTS: SchoolEvent[]    // ~45 approved + 4–6 pending/changes_requested/rejected
calendar.ts     export const PERIODS: CalendarPeriod[]
seed.ts         export const SEED_PROFILE: Profile; SEED_REGISTRATIONS; SEED_PORTFOLIO; SEED_SUBMISSIONS
news.ts         export const NEWS: NewsPost[]; NEWS_DEPARTMENTS   // council articles (one scheduled), signed by a department
school.ts       export const SCHOOL = { name: '[Tên trường]', schoolYear: '2026–2027' }
```

## State (`src/state`)

```ts
export const STORAGE_KEY = 'rodemap:v1';
export interface AppState {
  version: 1;
  role: Role; activeClubId: string;
  profile: Profile | null;
  registrations: Registration[];
  portfolio: PortfolioEntry[];
  submittedEvents: SchoolEvent[];             // created via Cổng câu lạc bộ (status lives in moderation)
  moderation: Record<string, EventStatus>;    // status overrides for any event id
  submissions: Submission[];
  newsPosts: NewsPost[];                      // articles published through Soạn bài viết (v1 states without it migrate to [])
  theme: ThemePreference;
  demoToday: IsoDate | null;                  // overrides the clock for the demo
  mochiForcedOffline: boolean;
}
export type Action =
  | { type: 'profile/complete'; profile: Profile }
  | { type: 'profile/clear' }
  | { type: 'registration/register'; eventId: string; at: IsoDateTime }
  | { type: 'registration/unregister'; eventId: string }
  | { type: 'registration/markAttended'; eventId: string; entry: PortfolioEntry }
  | { type: 'registration/markAbsent'; eventId: string }
  | { type: 'portfolio/upsert'; entry: PortfolioEntry }
  | { type: 'portfolio/remove'; id: string }
  | { type: 'submission/create'; event: SchoolEvent; submission: Submission }
  | { type: 'submission/resubmit'; submissionId: string; event: SchoolEvent; at: IsoDateTime }
  | { type: 'moderation/review'; submissionId: string; action: 'approve'|'request_changes'|'reject'; reason?: string; at: IsoDateTime }
  | { type: 'news/publish'; post: NewsPost }    // refused when the id or slug exists or the slug is reserved
  | { type: 'news/remove'; id: string }         // only demo-published articles
  | { type: 'role/set'; role: Role }
  | { type: 'club/setActive'; clubId: string }
  | { type: 'theme/set'; theme: ThemePreference }
  | { type: 'demo/setToday'; date: IsoDate | null }
  | { type: 'demo/setMochiOffline'; offline: boolean }
  | { type: 'demo/reset' };
export function reducer(state: AppState, action: Action): AppState;  // pure; unknown/invalid → same state
export function createSeedState(): AppState;
// selectors.ts — pure, (state, now?) → value
selectAllEvents(state)             // EVENTS + submittedEvents with moderation overrides applied
selectPublicEvents(state)          // approved only, sorted by start
selectEventBySlug(state, slug) / selectEventById(state, id)
selectClub(state, id) / selectClubBySlug(state, slug)
selectMyEvents(state)              // public events with registration registered|attended, sorted
selectUpcomingMine(state, now)
selectConflictsInPlan(state)
selectRecommendations(state, now, opts?)
selectFirstRoute(state, now, size?)  // planner.firstRoute: best event of each top interest first, then by score
selectPlanBudget(state, now)
selectNews(state, now) / selectNewsBySlug(state, slug, now) / selectNewsSlugs(state)
//   sample articles published by now + every article published in the demo (the demo cannot schedule)
selectNewsForEvent(state, eventId, now) / selectNewsForClub(state, clubId, now)
selectDeadlinesThisWeek(state, now)
selectPendingAttendance(state, now)
selectSubmissionsForClub(state, clubId) / selectModerationQueue(state)
selectNow(state, realNow: Millis): Millis   // demoToday at 09:00 VN if set, else realNow
// persistence.ts
loadState(storage: Storage | null): AppState;   // try/catch, version check, migrate, fallback seed
saveState(storage: Storage | null, s: AppState): void;  // try/catch
// hooks.ts (React): useAppState(), useDispatch(), useSelector(fn), useNow()
// routeMemory.ts: "your route" as last seen on the Lộ trình map in this session; onboarding and
//   Mochi call rememberRouteBefore(ids) before registering, so the map grows to the new stations.
// effects.ts: applyTheme, downloadFile, printPage, newId, registerServiceWorker (production only),
//   copyText(text): Promise<boolean> (the only clipboard access; false when the browser refuses).
```

## Router (`src/router`)

```ts
export type RouteName = 'home'|'onboarding'|'dashboard'|'explore'|'event'|'route'|'calendar'
  |'portfolio'|'clubs'|'club'|'clubPortal'|'moderation'|'proposal'|'news'|'newsCompose'|'newsArticle'|'notFound';
export const ROUTES: { name: RouteName; path: string; title: string }[];
// paths: / · /thiet-lap · /tong-quan · /kham-pha · /su-kien/:slug · /lo-trinh · /lich · /ho-so
//        /cau-lac-bo · /cau-lac-bo/:slug · /cong-cau-lac-bo · /kiem-duyet · /de-an
//        /ban-tin · /ban-tin/soan-bai (before the slug route) · /ban-tin/:slug
export function matchRoute(pathname: string): { name: RouteName; params: Record<string, string> };
export function pathFor(name: RouteName, params?: Record<string, string>): string;
export function RouterProvider(props: { children: ReactNode }): JSX.Element;
export function useRoute(): { name: RouteName; params: Record<string, string>; search: URLSearchParams };
export function useNavigate(): (to: string, opts?: { replace?: boolean }) => void;
export function Link(props: AnchorHTMLAttributes & { to: string }): JSX.Element; // aria-current="page" when active
// On navigation: scroll to top, set document.title "<title> · Rodemap", move focus to #main-heading.
```

## Mochi (`src/mochi`)

Tools run in the browser against app state; propose_* tools never mutate.
Server function `functions/api/mochi.ts` holds the system prompt + tool
schemas (imported from `src/mochi/system-prompt.ts`, `src/mochi/tools/schemas.ts`)
and the API key (`ANTHROPIC_API_KEY`), model from `MOCHI_MODEL`
(default `claude-opus-5-5`). Eleven strict tools: search_events, get_event, get_club,
recommend_events, check_conflicts, propose_registration, propose_calendar_plan,
summarize_events, draft_portfolio_entry, export_calendar, list_news (published
articles of the Bản tin Hội đồng Học sinh, shown as a `news` card). The offline
engine answers the same intents, including `news`.
