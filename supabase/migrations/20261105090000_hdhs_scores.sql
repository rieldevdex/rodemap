-- vsmcclubs: Bảng điểm tháng of Không gian HĐHS (Masterplan, "Hệ thống điểm thành viên").
-- The heads enter attendance, cooperation (or the five head criteria), bonuses and penalties with their
-- evidence; the points themselves are computed by src/domain/scores.ts. The task figures behind A, B and C
-- are frozen here when the sheet is published and again when it is finalised. Rules mirror scores.ts.

create table hdhs.score_sheets (
  month text primary key check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  status text not null default 'draft' check (status in ('draft', 'published', 'final')),
  published_at timestamptz,
  published_by uuid references hdhs.members(id),
  finalized_at timestamptz,
  finalized_by uuid references hdhs.members(id)
);

create table hdhs.scores (
  month text not null references hdhs.score_sheets(month),
  member_id uuid not null references hdhs.members(id) on delete cascade,
  framework text not null check (framework in ('member', 'lead')),
  att_present smallint check (att_present >= 0),
  att_excused smallint check (att_excused >= 0),
  att_required smallint check (att_required between 0 and 60),
  cooperation numeric(3, 1) check (cooperation between 0 and 10),
  lead jsonb,
  bonuses jsonb not null default '[]',
  penalties jsonb not null default '[]',
  note text not null default '' check (length(note) <= 1000),
  scored_by uuid references hdhs.members(id),
  scored_at timestamptz,
  stats jsonb,
  feedback text not null default '' check (length(feedback) <= 1000),
  feedback_at timestamptz,
  decision text not null default '' check (length(decision) <= 1000),
  decided_by uuid references hdhs.members(id),
  decided_at timestamptz,
  primary key (month, member_id)
);

alter table hdhs.score_sheets enable row level security;
alter table hdhs.scores enable row level security;

/* ── helpers ──────────────────────────────────────────────────────── */

create function hdhs.check_month(p_month text) returns text
language plpgsql immutable set search_path = '' as $$
begin
  if p_month is null or p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'invalid_month'; end if;
  return p_month;
end $$;

/* The month as a range of instants, Vietnam time. */
create function hdhs.month_range(p_month text) returns tstzrange
language sql immutable set search_path = '' as $$
  select tstzrange(
    ((p_month || '-01')::date)::timestamp at time zone 'Asia/Ho_Chi_Minh',
    (((p_month || '-01')::date + interval '1 month'))::timestamp at time zone 'Asia/Ho_Chi_Minh', '[)');
$$;

/* Mirrors frameworkFor. */
create function hdhs.framework_for(m hdhs.members) returns text
language sql immutable set search_path = '' as $$
  select case when m.department_id = 'bdh' or m.position = 'truong_ban' then 'lead' else 'member' end;
$$;

/* Mirrors canScore: BĐH scores anyone but themselves; a head their deputies and members; a deputy the members. */
create function hdhs.can_score(me hdhs.members, t hdhs.members) returns boolean
language sql immutable set search_path = '' as $$
  select me.id is not null and t.id is not null and me.id <> t.id and (
    me.department_id = 'bdh'
    or (me.department_id = t.department_id and me.position = 'truong_ban' and t.position in ('pho_ban', 'thanh_vien'))
    or (me.department_id = t.department_id and me.position = 'pho_ban' and t.position = 'thanh_vien'));
$$;

/* Mirrors taskStats over memberTasksInMonth. */
create function hdhs.task_stats(p_member uuid, p_month text) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'assigned', count(*),
    'done', count(*) filter (where t.status = 'done'),
    'qualitySum', coalesce(sum(t.quality) filter (where t.status = 'done' and t.quality is not null), 0),
    'qualityCount', count(*) filter (where t.status = 'done' and t.quality is not null),
    'onTimeCredit', coalesce(sum(case
      when t.submitted_at is null or t.status not in ('done', 'submitted') then 0
      when t.submitted_at <= t.due_at then 1
      when t.late_approved then 0.5
      else 0 end), 0))
  from hdhs.tasks t
  where t.assignee_id = p_member and t.status <> 'cancelled' and t.due_at is not null and t.due_at <@ hdhs.month_range(p_month);
$$;

create function hdhs.score_json(s hdhs.scores) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'memberId', s.member_id, 'framework', s.framework,
    'attendance', case when s.att_required is null then null
      else jsonb_build_object('present', s.att_present, 'excused', s.att_excused, 'required', s.att_required) end,
    'cooperation', s.cooperation, 'lead', s.lead, 'bonuses', s.bonuses, 'penalties', s.penalties, 'note', s.note,
    'scoredBy', s.scored_by, 'scoredAt', s.scored_at, 'stats', s.stats,
    'feedback', s.feedback, 'feedbackAt', s.feedback_at,
    'decision', s.decision, 'decidedBy', s.decided_by, 'decidedAt', s.decided_at);
$$;

/* A number in [0, max] on the half-point scale. */
create function hdhs.half_step(v jsonb, max numeric) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(v) = 'number' and (v::text)::numeric between 0 and max and ((v::text)::numeric * 2) % 1 = 0;
$$;

/* ── API ──────────────────────────────────────────────────────────── */

/* The sheet of a month with the rows the caller may see (mirrors visibleRows). */
create function public.hdhs_scores(p_month text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  mon text := hdhs.check_month(p_month);
  sh hdhs.score_sheets;
begin
  select * into sh from hdhs.score_sheets where month = mon;
  return jsonb_build_object(
    'month', mon,
    'status', coalesce(sh.status, 'draft'),
    'publishedAt', sh.published_at,
    'finalizedAt', sh.finalized_at,
    'scores', (select coalesce(jsonb_agg(hdhs.score_json(s)), '[]')
      from hdhs.scores s join hdhs.members m on m.id = s.member_id
      where s.month = mon and (
        me.department_id in ('bdh', 'hr')
        or hdhs.can_score(me, m)
        or (s.member_id = me.id and coalesce(sh.status, 'draft') <> 'draft'))));
end $$;

/*
 * Score a member (mirrors canEditScore and validateScoreDraft): the scorers while the sheet is a draft,
 * BĐH only once published, nobody once final. The framework follows the member's position.
 */
create function public.hdhs_save_score(p_month text, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  mon text := hdhs.check_month(p_month);
  t hdhs.members;
  st text;
  fw text;
  att jsonb := p -> 'attendance';
  ld jsonb := p -> 'lead';
  bon jsonb := coalesce(p -> 'bonuses', '[]');
  pen jsonb := coalesce(p -> 'penalties', '[]');
  s hdhs.scores;
begin
  select * into t from hdhs.members where id = nullif(p ->> 'memberId', '')::uuid;
  if t.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into hdhs.score_sheets (month) values (mon) on conflict (month) do nothing;
  select status into st from hdhs.score_sheets where month = mon for update;
  if st = 'final' or (st = 'published' and me.department_id <> 'bdh') then raise exception 'sheet_locked'; end if;
  if not hdhs.can_score(me, t) then raise exception 'forbidden' using errcode = '42501'; end if;
  fw := hdhs.framework_for(t);

  if jsonb_typeof(bon) <> 'array' or jsonb_array_length(bon) > 20 or exists (
    select 1 from jsonb_array_elements(bon) b
    where b ->> 'kind' is null or b ->> 'kind' not in ('event_lead', 'initiative', 'excellent', 'overtime', 'support')
      or length(trim(coalesce(b ->> 'note', ''))) not between 10 and 300) then raise exception 'invalid_score'; end if;
  if jsonb_typeof(pen) <> 'array' or jsonb_array_length(pen) > 10 or exists (
    select 1 from jsonb_array_elements(pen) x
    where jsonb_typeof(x -> 'points') <> 'number' or (x ->> 'points')::numeric not in (5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)
      or length(trim(coalesce(x ->> 'reason', ''))) not between 10 and 300) then raise exception 'invalid_score'; end if;
  if length(coalesce(p ->> 'note', '')) > 1000 then raise exception 'invalid_score'; end if;

  if fw = 'member' then
    if att is null or not (
      jsonb_typeof(att -> 'present') = 'number' and jsonb_typeof(att -> 'excused') = 'number' and jsonb_typeof(att -> 'required') = 'number'
      and (att ->> 'present')::numeric % 1 = 0 and (att ->> 'excused')::numeric % 1 = 0 and (att ->> 'required')::numeric % 1 = 0
      and (att ->> 'present')::numeric >= 0 and (att ->> 'excused')::numeric >= 0 and (att ->> 'required')::numeric <= 60
      and (att ->> 'present')::numeric + (att ->> 'excused')::numeric <= (att ->> 'required')::numeric)
      or not hdhs.half_step(p -> 'cooperation', 10) then
      raise exception 'invalid_score';
    end if;
  elsif ld is null or not (hdhs.half_step(ld -> 'results', 35) and hdhs.half_step(ld -> 'quality', 20) and hdhs.half_step(ld -> 'team', 20)
      and hdhs.half_step(ld -> 'coordination', 15) and hdhs.half_step(ld -> 'attendance', 10)) then
    raise exception 'invalid_score';
  end if;

  insert into hdhs.scores as sc (month, member_id, framework, att_present, att_excused, att_required, cooperation, lead,
    bonuses, penalties, note, scored_by, scored_at)
  values (mon, t.id, fw,
    case when fw = 'member' then (att ->> 'present')::smallint end,
    case when fw = 'member' then (att ->> 'excused')::smallint end,
    case when fw = 'member' then (att ->> 'required')::smallint end,
    case when fw = 'member' then (p ->> 'cooperation')::numeric end,
    case when fw = 'lead' then jsonb_build_object('results', ld -> 'results', 'quality', ld -> 'quality', 'team', ld -> 'team',
      'coordination', ld -> 'coordination', 'attendance', ld -> 'attendance') end,
    (select coalesce(jsonb_agg(jsonb_build_object('kind', b ->> 'kind', 'note', trim(b ->> 'note'))), '[]') from jsonb_array_elements(bon) b),
    (select coalesce(jsonb_agg(jsonb_build_object('points', (x ->> 'points')::int, 'reason', trim(x ->> 'reason'))), '[]') from jsonb_array_elements(pen) x),
    coalesce(trim(p ->> 'note'), ''), me.id, now())
  on conflict (month, member_id) do update set
    framework = excluded.framework, att_present = excluded.att_present, att_excused = excluded.att_excused,
    att_required = excluded.att_required, cooperation = excluded.cooperation, lead = excluded.lead,
    bonuses = excluded.bonuses, penalties = excluded.penalties, note = excluded.note,
    scored_by = excluded.scored_by, scored_at = excluded.scored_at
  returning * into s;
  return hdhs.score_json(s);
end $$;

/* A member responds to their published score within 3 days (mirrors canSendFeedback). */
create function public.hdhs_score_feedback(p_month text, p_text text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  mon text := hdhs.check_month(p_month);
  sh hdhs.score_sheets;
  s hdhs.scores;
begin
  select * into sh from hdhs.score_sheets where month = mon;
  if sh.status is distinct from 'published' or now() >= sh.published_at + interval '3 days' then raise exception 'feedback_closed'; end if;
  if length(trim(coalesce(p_text, ''))) not between 10 and 1000 then raise exception 'note_required'; end if;
  update hdhs.scores set feedback = trim(p_text), feedback_at = now() where month = mon and member_id = me.id returning * into s;
  if s.member_id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  return hdhs.score_json(s);
end $$;

/* BĐH answers a member's feedback while the sheet is published (mirrors canDecide). */
create function public.hdhs_score_decision(p_month text, p_member uuid, p_text text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  mon text := hdhs.check_month(p_month);
  st text;
  s hdhs.scores;
begin
  if me.department_id <> 'bdh' or me.id = p_member then raise exception 'forbidden' using errcode = '42501'; end if;
  select status into st from hdhs.score_sheets where month = mon;
  if st is distinct from 'published' then raise exception 'sheet_locked'; end if;
  if length(trim(coalesce(p_text, ''))) not between 10 and 1000 then raise exception 'note_required'; end if;
  update hdhs.scores set decision = trim(p_text), decided_by = me.id, decided_at = now()
  where month = mon and member_id = p_member and feedback <> '' returning * into s;
  if s.member_id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  return hdhs.score_json(s);
end $$;

/*
 * BĐH publishes the sheet (every active member scored; the task figures are frozen and each member sees
 * their score) or finalises it (the figures are frozen again, nothing changes afterwards).
 */
create function public.hdhs_score_sheet(p_month text, p_action text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  mon text := hdhs.check_month(p_month);
  st text;
begin
  if me.department_id <> 'bdh' then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into hdhs.score_sheets (month) values (mon) on conflict (month) do nothing;
  select status into st from hdhs.score_sheets where month = mon for update;
  if p_action = 'publish' then
    if st <> 'draft' then raise exception 'sheet_locked'; end if;
    if exists (select 1 from hdhs.members m where m.status = 'active'
        and not exists (select 1 from hdhs.scores s where s.month = mon and s.member_id = m.id and s.scored_at is not null)) then
      raise exception 'unscored';
    end if;
    update hdhs.scores set stats = case when framework = 'member' then hdhs.task_stats(member_id, mon) end where month = mon;
    update hdhs.score_sheets set status = 'published', published_at = now(), published_by = me.id where month = mon;
  elsif p_action = 'finalize' then
    if st <> 'published' then raise exception 'sheet_locked'; end if;
    update hdhs.scores set stats = case when framework = 'member' then hdhs.task_stats(member_id, mon) end where month = mon;
    update hdhs.score_sheets set status = 'final', finalized_at = now(), finalized_by = me.id where month = mon;
  else
    raise exception 'unknown_action';
  end if;
  return public.hdhs_scores(mon);
end $$;

revoke all on function public.hdhs_scores(text), public.hdhs_save_score(text, jsonb), public.hdhs_score_feedback(text, text),
  public.hdhs_score_decision(text, uuid, text), public.hdhs_score_sheet(text, text) from public, anon;
grant execute on function public.hdhs_scores(text), public.hdhs_save_score(text, jsonb), public.hdhs_score_feedback(text, text),
  public.hdhs_score_decision(text, uuid, text), public.hdhs_score_sheet(text, text) to authenticated;
revoke all on function hdhs.check_month(text), hdhs.month_range(text), hdhs.framework_for(hdhs.members), hdhs.can_score(hdhs.members, hdhs.members),
  hdhs.task_stats(uuid, text), hdhs.score_json(hdhs.scores), hdhs.half_step(jsonb, numeric) from public, anon, authenticated;
