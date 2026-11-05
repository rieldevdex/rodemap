-- vsmcclubs: progress follow-up by Ban Nhân sự. Ban điều hành assigns each member of Ban Nhân sự to the
-- departments they follow; the follower sees those departments' score rows and writes one progress note a
-- week per department. E-mail addresses, the member list and the whole score sheet now belong to BĐH and
-- the heads (trưởng ban, phó ban) of Ban Nhân sự only. Rules mirror src/domain/workspace.ts and scores.ts.

create table hdhs.hr_assignments (
  member_id uuid not null references hdhs.members(id) on delete cascade,
  department_id text not null references hdhs.departments(id) check (department_id <> 'bdh'),
  assigned_by uuid references hdhs.members(id),
  assigned_at timestamptz not null default now(),
  primary key (member_id, department_id)
);

create table hdhs.progress_notes (
  id uuid primary key default gen_random_uuid(),
  department_id text not null references hdhs.departments(id) check (department_id <> 'bdh'),
  week text not null check (week ~ '^\d{4}-W\d{2}$'),
  author_id uuid not null references hdhs.members(id),
  body text not null check (length(trim(body)) between 10 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, week, author_id)
);

alter table hdhs.hr_assignments enable row level security;
alter table hdhs.progress_notes enable row level security;

/* Mirrors isHrLead. */
create function hdhs.is_hr_lead(m hdhs.members) returns boolean
language sql immutable set search_path = '' as $$
  select m.id is not null and m.department_id = 'hr' and m.position in ('truong_ban', 'pho_ban');
$$;

/* Mirrors followedDepartments(...).includes(dept): only while the member is still in Ban Nhân sự. */
create function hdhs.follows(m hdhs.members, dept text) returns boolean
language sql stable security definer set search_path = '' as $$
  select m.id is not null and m.department_id = 'hr'
    and exists (select 1 from hdhs.hr_assignments a where a.member_id = m.id and a.department_id = dept);
$$;

/* Mirrors canReadProgress. */
create function hdhs.can_read_progress(m hdhs.members, dept text) returns boolean
language sql stable set search_path = '' as $$
  select hdhs.can_manage(m, dept) or hdhs.is_hr_lead(m) or hdhs.follows(m, dept);
$$;

/* ── Snapshot: e-mail for BĐH and the heads of Nhân sự; assignments; readable progress notes ── */

create or replace function public.hdhs_snapshot() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  sees_mail boolean := me.department_id = 'bdh' or hdhs.is_hr_lead(me);
begin
  return jsonb_build_object(
    'me', me.id,
    'departments', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'shortName', d.short_name) order by d.sort), '[]') from hdhs.departments d),
    'members', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'fullName', m.full_name, 'className', m.class_name, 'departmentId', m.department_id,
        'position', m.position, 'status', m.status, 'joinedOn', m.joined_on,
        'email', case when sees_mail then m.email else null end,
        'linked', m.user_id is not null) order by m.full_name), '[]') from hdhs.members m),
    'tasks', (select coalesce(jsonb_agg(hdhs.task_json(t) order by t.due_at nulls last, t.created_at), '[]') from hdhs.tasks t),
    'requests', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id, 'fromMember', r.from_member, 'fromDepartment', r.from_department, 'toDepartment', r.to_department,
        'title', r.title, 'description', r.description, 'dueAt', r.due_at, 'status', r.status,
        'answerNote', r.answer_note, 'answeredBy', r.answered_by, 'answeredAt', r.answered_at, 'taskId', r.task_id,
        'createdAt', r.created_at) order by r.created_at desc), '[]') from hdhs.requests r),
    'hrAssignments', (select coalesce(jsonb_agg(jsonb_build_object('memberId', a.member_id, 'departmentId', a.department_id)
        order by a.member_id, a.department_id), '[]')
      from hdhs.hr_assignments a join hdhs.members m on m.id = a.member_id where m.department_id = 'hr'),
    'progressNotes', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', n.id, 'departmentId', n.department_id, 'week', n.week, 'authorId', n.author_id, 'body', n.body,
        'createdAt', n.created_at, 'updatedAt', n.updated_at) order by n.week desc, n.updated_at desc), '[]')
      from hdhs.progress_notes n where hdhs.can_read_progress(me, n.department_id))
  );
end $$;

/* The member database: BĐH and the heads of Ban Nhân sự. */
create or replace function public.hdhs_save_member(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  target uuid := nullif(p ->> 'id', '')::uuid;
  mail text := nullif(lower(trim(coalesce(p ->> 'email', ''))), '');
begin
  if not (me.department_id = 'bdh' or hdhs.is_hr_lead(me)) then raise exception 'forbidden' using errcode = '42501'; end if;
  if target is null then
    insert into hdhs.members (full_name, class_name, department_id, position, email, status)
    values (trim(p ->> 'fullName'), upper(trim(p ->> 'className')), p ->> 'departmentId', p ->> 'position', mail, coalesce(p ->> 'status', 'active'))
    returning id into target;
  else
    update hdhs.members set
      full_name = trim(p ->> 'fullName'), class_name = upper(trim(p ->> 'className')), department_id = p ->> 'departmentId',
      position = p ->> 'position', status = coalesce(p ->> 'status', status),
      -- Changing the address unlinks the old account.
      user_id = case when email is distinct from mail then null else user_id end,
      email = mail, updated_at = now()
    where id = target;
  end if;
  return target;
end $$;

/* The score sheet: the whole of it for BĐH and the heads of Nhân sự; followed departments for their follower. */
create or replace function public.hdhs_scores(p_month text) returns jsonb
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
        me.department_id = 'bdh' or hdhs.is_hr_lead(me)
        or hdhs.can_score(me, m)
        or hdhs.follows(me, m.department_id)
        or (s.member_id = me.id and coalesce(sh.status, 'draft') <> 'draft'))));
end $$;

/* BĐH sets the departments a member of Ban Nhân sự follows (replaces the previous set). */
create function public.hdhs_set_hr_assignments(p_member uuid, p_departments text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  t hdhs.members;
begin
  if me.department_id <> 'bdh' then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into t from hdhs.members where id = p_member;
  if t.id is null or t.department_id <> 'hr' then raise exception 'not_found' using errcode = 'P0002'; end if;
  if exists (select 1 from unnest(coalesce(p_departments, '{}')) d
      where d = 'bdh' or not exists (select 1 from hdhs.departments x where x.id = d)) then
    raise exception 'invalid_assignment';
  end if;
  delete from hdhs.hr_assignments where member_id = t.id;
  insert into hdhs.hr_assignments (member_id, department_id, assigned_by)
  select t.id, d, me.id from (select distinct unnest(coalesce(p_departments, '{}')) d) x;
  return (select coalesce(jsonb_agg(a.department_id order by a.department_id), '[]') from hdhs.hr_assignments a where a.member_id = t.id);
end $$;

/* The follower (or a head of Ban Nhân sự) writes this week's progress note for a department; one per author and week. */
create function public.hdhs_save_progress_note(p_department text, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  wk text := to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'IYYY-"W"IW');
  n hdhs.progress_notes;
begin
  if p_department is null or p_department = 'bdh' or not (hdhs.is_hr_lead(me) or hdhs.follows(me, p_department)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_body, ''))) not between 10 and 2000 then raise exception 'note_required'; end if;
  insert into hdhs.progress_notes (department_id, week, author_id, body)
  values (p_department, wk, me.id, trim(p_body))
  on conflict (department_id, week, author_id) do update set body = excluded.body, updated_at = now()
  returning * into n;
  return jsonb_build_object('id', n.id, 'departmentId', n.department_id, 'week', n.week, 'authorId', n.author_id,
    'body', n.body, 'createdAt', n.created_at, 'updatedAt', n.updated_at);
end $$;

revoke all on function public.hdhs_set_hr_assignments(uuid, text[]), public.hdhs_save_progress_note(text, text) from public, anon;
grant execute on function public.hdhs_set_hr_assignments(uuid, text[]), public.hdhs_save_progress_note(text, text) to authenticated;
revoke all on function hdhs.is_hr_lead(hdhs.members), hdhs.follows(hdhs.members, text), hdhs.can_read_progress(hdhs.members, text)
  from public, anon, authenticated;
