-- vsmcclubs: Không gian HĐHS (Student Council workspace), applied to the Supabase project on 04/11/2026.
-- Tables live in schema hdhs, which is not exposed to the Data API: the app reaches them only through the
-- public.hdhs_* functions, each of which checks who is calling (school Google account linked to an active
-- member). The member list and the Masterplan tasks are entered in the database, never in this repository.
create schema if not exists hdhs;
revoke all on schema hdhs from public, anon, authenticated;

create table hdhs.departments (id text primary key, name text not null, short_name text not null, sort smallint not null);

create table hdhs.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 2 and 80),
  class_name text not null check (class_name ~ '^(6|7|8|9|10|11|12)[A-Z][0-9]{0,2}$'),
  department_id text not null references hdhs.departments(id),
  position text not null check (position in ('chu_tich', 'pho_chu_tich', 'thu_ky', 'truong_ban', 'pho_ban', 'thanh_vien')),
  email text unique check (email is null or email ~ '^[a-z0-9._%+-]+@stu\.vinschool\.edu\.vn$'),
  user_id uuid unique references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'pending', 'inactive')),
  joined_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table hdhs.requests (
  id uuid primary key default gen_random_uuid(),
  from_member uuid not null references hdhs.members(id),
  from_department text not null references hdhs.departments(id),
  to_department text not null references hdhs.departments(id),
  title text not null check (length(trim(title)) between 5 and 160),
  description text not null check (length(trim(description)) between 10 and 2000),
  due_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'accepted', 'declined')),
  answer_note text not null default '',
  answered_by uuid references hdhs.members(id),
  answered_at timestamptz,
  task_id uuid,
  created_at timestamptz not null default now()
);

create table hdhs.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 200),
  description text not null default '',
  output text not null default '',
  department_id text not null references hdhs.departments(id),
  collaborators text[] not null default '{}',
  assignee_id uuid references hdhs.members(id) on delete set null,
  due_at timestamptz,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'submitted', 'changes_requested', 'done', 'cancelled')),
  link text not null default '',
  quality smallint check (quality between 1 and 5),
  revision_count smallint not null default 0,
  submitted_at timestamptz,
  completed_at timestamptz,
  late_notice_at timestamptz,
  late_notice_reason text not null default '',
  late_approved boolean not null default false,
  source text not null default 'manual' check (source in ('masterplan', 'request', 'manual')),
  request_id uuid references hdhs.requests(id),
  created_by uuid references hdhs.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table hdhs.requests add constraint requests_task_fk foreign key (task_id) references hdhs.tasks(id);
create index tasks_department_idx on hdhs.tasks(department_id);
create index tasks_assignee_idx on hdhs.tasks(assignee_id);

create table hdhs.task_log (
  id bigint generated always as identity primary key,
  task_id uuid not null references hdhs.tasks(id) on delete cascade,
  member_id uuid references hdhs.members(id),
  action text not null,
  note text not null default '',
  at timestamptz not null default now()
);
create index task_log_task_idx on hdhs.task_log(task_id);

-- Defence in depth: RLS on and no policies, so even an accidental grant exposes nothing.
alter table hdhs.departments enable row level security;
alter table hdhs.members enable row level security;
alter table hdhs.requests enable row level security;
alter table hdhs.tasks enable row level security;
alter table hdhs.task_log enable row level security;

insert into hdhs.departments (id, name, short_name, sort) values
  ('bdh', 'Ban điều hành', 'BĐH', 1), ('pr', 'Ban Truyền thông (PR)', 'PR', 2), ('hr', 'Ban Nhân sự', 'Nhân sự', 3),
  ('tai-chinh', 'Ban Tài chính', 'Tài chính', 4), ('design', 'Ban Design', 'Design', 5), ('su-kien', 'Ban Sự kiện', 'Sự kiện', 6);

/* ── helpers (not callable from the API) ─────────────────────────── */

create function hdhs.current_member() returns hdhs.members
language sql stable security definer set search_path = '' as $$
  select m.* from hdhs.members m where m.user_id = auth.uid() and m.status = 'active' limit 1;
$$;

create function hdhs.is_bdh(m hdhs.members) returns boolean
language sql immutable set search_path = '' as $$ select m.id is not null and m.department_id = 'bdh'; $$;

/* BĐH manages every department; a head or deputy head manages their own (mirrors canManage). */
create function hdhs.can_manage(m hdhs.members, dept text) returns boolean
language sql immutable set search_path = '' as $$
  select m.id is not null and (m.department_id = 'bdh' or (m.department_id = dept and m.position in ('truong_ban', 'pho_ban')));
$$;

create function hdhs.require_member() returns hdhs.members
language plpgsql stable security definer set search_path = '' as $$
declare m hdhs.members;
begin
  m := hdhs.current_member();
  if m.id is null then raise exception 'not_member' using errcode = '42501'; end if;
  return m;
end $$;

create function hdhs.task_json(t hdhs.tasks) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'title', t.title, 'description', t.description, 'output', t.output,
    'departmentId', t.department_id, 'collaborators', to_jsonb(t.collaborators), 'assigneeId', t.assignee_id,
    'dueAt', t.due_at, 'status', t.status, 'link', t.link, 'quality', t.quality, 'revisionCount', t.revision_count,
    'submittedAt', t.submitted_at, 'completedAt', t.completed_at, 'lateNoticeAt', t.late_notice_at,
    'lateNoticeReason', t.late_notice_reason, 'lateApproved', t.late_approved, 'source', t.source,
    'requestId', t.request_id, 'createdBy', t.created_by, 'createdAt', t.created_at, 'updatedAt', t.updated_at);
$$;

/* A delay may be announced once per task (mirrors canNotifyLate). */
create function hdhs.check_late_notice() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.late_notice_at is not null and new.late_notice_at is distinct from old.late_notice_at then
    raise exception 'invalid_transition';
  end if;
  return new;
end $$;

create trigger tasks_late_notice_once before update of late_notice_at on hdhs.tasks
for each row execute function hdhs.check_late_notice();

/* ── API ──────────────────────────────────────────────────────────── */

/* Who am I? Links the signed-in school account to its member row on first call. */
create function public.hdhs_me() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  mail text := lower(coalesce(auth.jwt() ->> 'email', ''));
  m hdhs.members;
begin
  if auth.uid() is null then return jsonb_build_object('status', 'signed_out'); end if;
  if mail !~ '@stu\.vinschool\.edu\.vn$' then return jsonb_build_object('status', 'wrong_domain', 'email', mail); end if;
  update hdhs.members set user_id = auth.uid(), updated_at = now() where email = mail and user_id is null;
  select * into m from hdhs.members where user_id = auth.uid() limit 1;
  if m.id is null then return jsonb_build_object('status', 'not_member', 'email', mail); end if;
  if m.status <> 'active' then return jsonb_build_object('status', m.status, 'email', mail); end if;
  return jsonb_build_object('status', 'ok', 'memberId', m.id);
end $$;

/* Everything the workspace shows, in one call. E-mail addresses only for BĐH and Nhân sự. */
create function public.hdhs_snapshot() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  sees_mail boolean := me.department_id in ('bdh', 'hr');
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
        'createdAt', r.created_at) order by r.created_at desc), '[]') from hdhs.requests r)
  );
end $$;

/* Add or edit a member (BĐH and Ban Nhân sự keep the member database). */
create function public.hdhs_save_member(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  target uuid := nullif(p ->> 'id', '')::uuid;
  mail text := nullif(lower(trim(coalesce(p ->> 'email', ''))), '');
begin
  if me.department_id not in ('bdh', 'hr') then raise exception 'forbidden' using errcode = '42501'; end if;
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

/* Create or edit a task: BĐH for any department, a head or deputy head for their own. */
create function public.hdhs_save_task(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  target uuid := nullif(p ->> 'id', '')::uuid;
  dept text := p ->> 'departmentId';
  old hdhs.tasks;
  t hdhs.tasks;
  collab text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p -> 'collaborators', '[]'))), '{}');
begin
  if not hdhs.can_manage(me, dept) then raise exception 'forbidden' using errcode = '42501'; end if;
  if target is null then
    insert into hdhs.tasks (title, description, output, department_id, collaborators, assignee_id, due_at, source, created_by)
    values (trim(p ->> 'title'), coalesce(p ->> 'description', ''), coalesce(p ->> 'output', ''), dept, collab,
            nullif(p ->> 'assigneeId', '')::uuid, nullif(p ->> 'dueAt', '')::timestamptz, 'manual', me.id)
    returning * into t;
    insert into hdhs.task_log (task_id, member_id, action) values (t.id, me.id, 'create');
  else
    select * into old from hdhs.tasks where id = target;
    if old.id is null or not hdhs.can_manage(me, old.department_id) then raise exception 'forbidden' using errcode = '42501'; end if;
    update hdhs.tasks set title = trim(p ->> 'title'), description = coalesce(p ->> 'description', ''), output = coalesce(p ->> 'output', ''),
      department_id = dept, collaborators = collab, assignee_id = nullif(p ->> 'assigneeId', '')::uuid,
      due_at = nullif(p ->> 'dueAt', '')::timestamptz, updated_at = now()
    where id = target returning * into t;
    insert into hdhs.task_log (task_id, member_id, action) values (t.id, me.id, 'edit');
  end if;
  return hdhs.task_json(t);
end $$;

/*
 * Move a task through its workflow (mirrors availableActions in src/domain/workspace.ts):
 * start / submit / notify_late by the assignee; request_changes / complete / approve_late / cancel / reopen by a manager.
 */
create function public.hdhs_task_action(p_task uuid, p_action text, p_link text default '', p_quality int default null, p_note text default '')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  t hdhs.tasks;
  manager boolean;
  assignee boolean;
begin
  select * into t from hdhs.tasks where id = p_task for update;
  if t.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  manager := hdhs.can_manage(me, t.department_id);
  assignee := t.assignee_id = me.id;
  case p_action
    when 'start' then
      if not (assignee or manager) or t.status not in ('todo', 'changes_requested') then raise exception 'invalid_transition'; end if;
      update hdhs.tasks set status = 'in_progress', updated_at = now() where id = t.id returning * into t;
    when 'submit' then
      if not (assignee or manager) or t.status not in ('todo', 'in_progress', 'changes_requested') then raise exception 'invalid_transition'; end if;
      if length(trim(coalesce(p_link, ''))) < 8 then raise exception 'link_required'; end if;
      update hdhs.tasks set status = 'submitted', link = trim(p_link), submitted_at = now(), updated_at = now() where id = t.id returning * into t;
    when 'notify_late' then
      if not assignee or t.status in ('submitted', 'done', 'cancelled') or t.due_at is null then raise exception 'invalid_transition'; end if;
      if now() > t.due_at - interval '24 hours' then raise exception 'notice_too_late'; end if;
      if length(trim(coalesce(p_note, ''))) < 10 then raise exception 'note_required'; end if;
      update hdhs.tasks set late_notice_at = now(), late_notice_reason = trim(p_note), late_approved = false, updated_at = now() where id = t.id returning * into t;
    when 'approve_late' then
      if not manager or t.late_notice_at is null or t.late_approved then raise exception 'invalid_transition'; end if;
      update hdhs.tasks set late_approved = true, updated_at = now() where id = t.id returning * into t;
    when 'request_changes' then
      if not manager or t.status <> 'submitted' then raise exception 'invalid_transition'; end if;
      if length(trim(coalesce(p_note, ''))) < 10 then raise exception 'note_required'; end if;
      update hdhs.tasks set status = 'changes_requested', revision_count = revision_count + 1, updated_at = now() where id = t.id returning * into t;
    when 'complete' then
      if not manager or t.status <> 'submitted' then raise exception 'invalid_transition'; end if;
      if p_quality is null or p_quality not between 1 and 5 then raise exception 'quality_required'; end if;
      update hdhs.tasks set status = 'done', quality = p_quality, completed_at = now(), updated_at = now() where id = t.id returning * into t;
    when 'cancel' then
      if not manager or t.status in ('done', 'cancelled') then raise exception 'invalid_transition'; end if;
      update hdhs.tasks set status = 'cancelled', updated_at = now() where id = t.id returning * into t;
    when 'reopen' then
      if not manager or t.status not in ('done', 'cancelled') then raise exception 'invalid_transition'; end if;
      update hdhs.tasks set status = 'in_progress', quality = null, completed_at = null, updated_at = now() where id = t.id returning * into t;
    else
      raise exception 'unknown_action';
  end case;
  insert into hdhs.task_log (task_id, member_id, action, note) values (t.id, me.id, p_action, coalesce(trim(p_note), ''));
  return hdhs.task_json(t);
end $$;

/* A request slip from one department to another ("phiếu yêu cầu"). Any active member may send one. */
create function public.hdhs_create_request(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  rid uuid;
begin
  insert into hdhs.requests (from_member, from_department, to_department, title, description, due_at)
  values (me.id, me.department_id, p ->> 'toDepartment', trim(p ->> 'title'), trim(p ->> 'description'), (p ->> 'dueAt')::timestamptz)
  returning id into rid;
  return rid;
end $$;

/* The receiving department (head, deputy head or BĐH) accepts, turning it into a task, or declines with a reason. */
create function public.hdhs_answer_request(p_request uuid, p_accept boolean, p_assignee uuid default null, p_note text default '')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  r hdhs.requests;
  t hdhs.tasks;
begin
  select * into r from hdhs.requests where id = p_request for update;
  if r.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not hdhs.can_manage(me, r.to_department) or r.status <> 'open' then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_accept then
    insert into hdhs.tasks (title, description, department_id, collaborators, assignee_id, due_at, source, request_id, created_by)
    values (r.title, r.description, r.to_department, array[r.from_department], p_assignee, r.due_at, 'request', r.id, me.id)
    returning * into t;
    insert into hdhs.task_log (task_id, member_id, action, note) values (t.id, me.id, 'create_from_request', coalesce(trim(p_note), ''));
    update hdhs.requests set status = 'accepted', answer_note = coalesce(trim(p_note), ''), answered_by = me.id, answered_at = now(), task_id = t.id where id = r.id;
  else
    if length(trim(coalesce(p_note, ''))) < 10 then raise exception 'note_required'; end if;
    update hdhs.requests set status = 'declined', answer_note = trim(p_note), answered_by = me.id, answered_at = now() where id = r.id;
  end if;
  return jsonb_build_object('status', case when p_accept then 'accepted' else 'declined' end, 'taskId', t.id);
end $$;

revoke all on function public.hdhs_me(), public.hdhs_snapshot(), public.hdhs_save_member(jsonb), public.hdhs_save_task(jsonb),
  public.hdhs_task_action(uuid, text, text, int, text), public.hdhs_create_request(jsonb),
  public.hdhs_answer_request(uuid, boolean, uuid, text) from public, anon;
grant execute on function public.hdhs_me(), public.hdhs_snapshot(), public.hdhs_save_member(jsonb), public.hdhs_save_task(jsonb),
  public.hdhs_task_action(uuid, text, text, int, text), public.hdhs_create_request(jsonb),
  public.hdhs_answer_request(uuid, boolean, uuid, text) to authenticated;
revoke all on function hdhs.current_member(), hdhs.require_member(), hdhs.is_bdh(hdhs.members), hdhs.can_manage(hdhs.members, text), hdhs.task_json(hdhs.tasks) from public, anon, authenticated;
