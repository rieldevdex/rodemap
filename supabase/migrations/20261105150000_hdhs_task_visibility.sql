-- vsmcclubs: members see only the work that concerns them, and collaborations stay few.
-- Tasks: BĐH sees everything; everyone sees the tasks their department leads or takes part in and the
-- tasks assigned to them; the heads of Ban Nhân sự see every department but BĐH; a follower of Ban Nhân sự
-- sees the departments they follow. Request slips follow the same rule. A department takes part in at most
-- 3 open tasks of other departments (slips excluded); anything more goes through a request slip.
-- Mirrors canSeeTask, canSeeRequest, collaborationLoad and validateTaskDraft in src/domain/workspace.ts.

create function hdhs.can_see_task(m hdhs.members, t hdhs.tasks) returns boolean
language sql stable set search_path = '' as $$
  select m.id is not null and (
    m.department_id = 'bdh'
    or t.assignee_id = m.id
    or t.department_id = m.department_id
    or m.department_id = any(t.collaborators)
    or (t.department_id <> 'bdh' and (hdhs.is_hr_lead(m) or hdhs.follows(m, t.department_id))));
$$;

create function hdhs.can_see_request(m hdhs.members, r hdhs.requests) returns boolean
language sql stable set search_path = '' as $$
  select m.id is not null and (
    m.department_id = 'bdh'
    or r.from_department = m.department_id
    or r.to_department = m.department_id
    or (r.from_department <> 'bdh' and r.to_department <> 'bdh'
        and (hdhs.is_hr_lead(m) or hdhs.follows(m, r.from_department) or hdhs.follows(m, r.to_department))));
$$;

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
    'tasks', (select coalesce(jsonb_agg(hdhs.task_json(t) order by t.due_at nulls last, t.created_at), '[]')
      from hdhs.tasks t where hdhs.can_see_task(me, t)),
    'requests', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id, 'fromMember', r.from_member, 'fromDepartment', r.from_department, 'toDepartment', r.to_department,
        'title', r.title, 'description', r.description, 'dueAt', r.due_at, 'status', r.status,
        'answerNote', r.answer_note, 'answeredBy', r.answered_by, 'answeredAt', r.answered_at, 'taskId', r.task_id,
        'createdAt', r.created_at) order by r.created_at desc), '[]')
      from hdhs.requests r where hdhs.can_see_request(me, r)),
    'hrAssignments', (select coalesce(jsonb_agg(jsonb_build_object('memberId', a.member_id, 'departmentId', a.department_id)
        order by a.member_id, a.department_id), '[]')
      from hdhs.hr_assignments a join hdhs.members m on m.id = a.member_id where m.department_id = 'hr'),
    'progressNotes', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', n.id, 'departmentId', n.department_id, 'week', n.week, 'authorId', n.author_id, 'body', n.body,
        'createdAt', n.created_at, 'updatedAt', n.updated_at) order by n.week desc, n.updated_at desc), '[]')
      from hdhs.progress_notes n where hdhs.can_read_progress(me, n.department_id))
  );
end $$;

/* Create or edit a task: BĐH for any department, a head or deputy head for their own; at most 3 open collaborations per department. */
create or replace function public.hdhs_save_task(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me hdhs.members := hdhs.require_member();
  target uuid := nullif(p ->> 'id', '')::uuid;
  dept text := p ->> 'departmentId';
  old hdhs.tasks;
  t hdhs.tasks;
  collab text[] := coalesce(array(select distinct jsonb_array_elements_text(coalesce(p -> 'collaborators', '[]'))), '{}');
begin
  if not hdhs.can_manage(me, dept) then raise exception 'forbidden' using errcode = '42501'; end if;
  if target is not null then
    select * into old from hdhs.tasks where id = target;
    if old.id is null or not hdhs.can_manage(me, old.department_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  end if;
  if dept = any(collab) then raise exception 'invalid_collaborators'; end if;
  -- Only newly added collaborators are counted, so existing work can still be edited.
  if exists (
    select 1 from unnest(collab) c
    where not (c = any(coalesce(old.collaborators, '{}')))
      and (select count(*) from hdhs.tasks x
           where x.id is distinct from target and x.source <> 'request' and x.status not in ('done', 'cancelled')
             and c = any(x.collaborators)) >= 3) then
    raise exception 'too_many_collaborations';
  end if;
  if target is null then
    insert into hdhs.tasks (title, description, output, department_id, collaborators, assignee_id, due_at, source, created_by)
    values (trim(p ->> 'title'), coalesce(p ->> 'description', ''), coalesce(p ->> 'output', ''), dept, collab,
            nullif(p ->> 'assigneeId', '')::uuid, nullif(p ->> 'dueAt', '')::timestamptz, 'manual', me.id)
    returning * into t;
    insert into hdhs.task_log (task_id, member_id, action) values (t.id, me.id, 'create');
  else
    update hdhs.tasks set title = trim(p ->> 'title'), description = coalesce(p ->> 'description', ''), output = coalesce(p ->> 'output', ''),
      department_id = dept, collaborators = collab, assignee_id = nullif(p ->> 'assigneeId', '')::uuid,
      due_at = nullif(p ->> 'dueAt', '')::timestamptz, updated_at = now()
    where id = target returning * into t;
    insert into hdhs.task_log (task_id, member_id, action) values (t.id, me.id, 'edit');
  end if;
  return hdhs.task_json(t);
end $$;

revoke all on function hdhs.can_see_task(hdhs.members, hdhs.tasks), hdhs.can_see_request(hdhs.members, hdhs.requests)
  from public, anon, authenticated;
