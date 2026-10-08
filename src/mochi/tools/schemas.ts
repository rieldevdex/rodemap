/**
 * Mochi's tool definitions (JSON Schema). Shared by the Worker (worker/mochi.ts), which
 * sends them to the Claude API, and by the browser, which executes them.
 * The array order and content must stay stable within a conversation.
 */

export const CATEGORY_ENUM = ['HT', 'NT', 'TT', 'TN', 'KN', 'CN', 'TS'] as const;

export type ToolName =
  | 'search_events'
  | 'get_event'
  | 'get_club'
  | 'recommend_events'
  | 'check_conflicts'
  | 'propose_registration'
  | 'propose_calendar_plan'
  | 'summarize_events'
  | 'draft_portfolio_entry'
  | 'export_calendar';

export interface ToolDefinition {
  name: ToolName;
  description: string;
  strict: true;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
}

const date = { type: 'string', format: 'date', description: 'Calendar date YYYY-MM-DD (Asia/Ho_Chi_Minh).' };
const eventId = { type: 'string', description: 'Event id such as "ev-012", exactly as returned by another tool or the data snapshot.' };
const categories = {
  type: 'array',
  items: { type: 'string', enum: CATEGORY_ENUM },
  description: 'Category codes: HT Học thuật, NT Nghệ thuật – Văn hóa, TT Thể thao, TN Tình nguyện – Cộng đồng, KN Kỹ năng – Hướng nghiệp, CN Công nghệ – Sáng tạo, TS Sự kiện toàn trường.',
};

export const MOCHI_TOOLS: readonly ToolDefinition[] = [
  {
    name: 'search_events',
    description:
      'Search approved Rodemap events. Call this whenever the student asks about events matching a topic, category, club, date range or format, or when you need event ids. Returns at most `limit` events with id, title, category, club, start, end, location, seats left, registration deadline and the student\'s registration status. Never describe an event that no tool or the data snapshot returned.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free text matched against title, summary, location, tags and club names (accents optional).' },
        categories,
        club_id: { type: 'string', description: 'Club id or slug.' },
        from_date: date,
        to_date: date,
        format: { type: 'string', enum: ['in_person', 'online'] },
        has_seats: { type: 'boolean', description: 'Only events with seats left.' },
        eligible_only: { type: 'boolean', description: 'Only events open to the student\'s grade.' },
        limit: { type: 'integer', description: 'Maximum results, 1–10. Default 6.' },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'get_event',
    description:
      'Get full details of one event: description, Mochi summary, club, time, place, eligible grades, seats left, deadline, the student\'s registration status and any time conflicts with the student\'s plan. Call it before answering detailed questions about a specific event.',
    strict: true,
    input_schema: { type: 'object', properties: { event_id: eventId }, required: ['event_id'], additionalProperties: false },
  },
  {
    name: 'get_club',
    description: 'Get a club\'s description, categories and its upcoming and past events. Call it when the student asks about a club.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { club_id: { type: 'string', description: 'Club id or slug, or a club name.' } },
      required: ['club_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'recommend_events',
    description:
      'Recommend upcoming events for the student\'s profile, with reason codes (top_interest, interest, goal, fits_time, balances_categories, deadline_soon, grade_eligible) and warnings (conflict, over_budget, outside_availability, few_seats). Call it when the student asks what to join or wants suggestions. Explain the reasons to the student in plain formal Vietnamese under "Vì sao Mochi đề xuất".',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: '1–5. Default 3.' },
        from_date: date,
        to_date: date,
        category: { type: 'string', enum: CATEGORY_ENUM },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'check_conflicts',
    description:
      'Check the given events for time conflicts with each other and with the student\'s registered events, and for weeks where the weekly hour budget would be exceeded.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { event_ids: { type: 'array', items: eventId, description: '1–10 event ids.' } },
      required: ['event_ids'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_registration',
    description:
      'Show the student a confirmation card to register for, or cancel the registration of, one event. This does NOT change anything: the student must press "Xác nhận" on the card. Call it whenever the student asks to register or unregister. After calling it, tell the student to review the card and press "Xác nhận" if it is correct.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { event_id: eventId, action: { type: 'string', enum: ['register', 'unregister'] } },
      required: ['event_id', 'action'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_calendar_plan',
    description:
      'Build a proposed personal calendar from candidate events: keeps events that fit, drops those that conflict, are full, closed, ineligible or exceed the weekly hour budget (with reasons), and suggests alternatives. Shows a plan card; nothing is registered until the student presses "Xác nhận". Provide event_ids, or a date range to plan from recommendations.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        event_ids: { type: 'array', items: eventId },
        from_date: date,
        to_date: date,
        max_hours_per_week: { type: 'number', description: 'Defaults to the student\'s weekly hour budget.' },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'summarize_events',
    description:
      'Collect the facts needed to summarise one event, a club\'s events, a week or a month (scope). Returns structured facts; write the summary yourself from these facts only. For week/month, `date` is any day inside the period (default: today).',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['event', 'club', 'week', 'month'] },
        event_id: eventId,
        club_id: { type: 'string' },
        date,
      },
      required: ['scope'],
      additionalProperties: false,
    },
  },
  {
    name: 'draft_portfolio_entry',
    description:
      'Propose a draft portfolio reflection for an event the student attended. Write `draft_reflection` yourself (3–4 formal Vietnamese sentences in the first person, based only on the event facts; no invented achievements). The student sees it marked "Bản nháp do Mochi đề xuất" and must edit it before it counts as their own. Call get_event first if you need the facts.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        event_id: eventId,
        draft_reflection: { type: 'string' },
        role: { type: 'string', description: 'Suggested role, e.g. "Thành viên tham gia".' },
      },
      required: ['event_id', 'draft_reflection'],
      additionalProperties: false,
    },
  },
  {
    name: 'export_calendar',
    description:
      'Prepare the student\'s calendar export: a button to download an .ics file (all registered events or the given ones) and per-event "Thêm vào Google Calendar" links. The download happens only when the student presses the button.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['all', 'selected'] },
        event_ids: { type: 'array', items: eventId },
      },
      required: ['scope'],
      additionalProperties: false,
    },
  },
];

export const TOOL_NAMES: readonly ToolName[] = MOCHI_TOOLS.map((t) => t.name);
