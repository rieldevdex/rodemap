-- Rodemap · Mochi weekly question quota.
--
-- One row per week (the Monday, Asia/Ho_Chi_Minh) and bucket: 'total' for the whole site and
-- 'b:<32 hex>' for one browser, where the hex is a SHA-256 digest of the random id the browser
-- keeps. Nothing about the student and no network address is stored. Rows are written only for
-- allowed requests (at most total limit x requests per question per week). Old weeks are no
-- longer read; they can be cleared at any time with
--   delete from rodemap.mochi_usage where week < current_date - 14;
--
-- Only the Edge Function rodemap-mochi (service role) can call public.rodemap_mochi_take: the
-- function checks the caller's role and EXECUTE is revoked from everyone else. The table lives
-- in the private schema "rodemap", which the Data API does not expose and which grants nothing
-- to anon or authenticated.

create schema if not exists rodemap;

create table if not exists rodemap.mochi_usage (
  week date not null,
  bucket text not null check (bucket = 'total' or bucket ~ '^b:[0-9a-f]{32}$'),
  questions integer not null default 0 check (questions >= 0),
  requests integer not null default 0 check (requests >= 0),
  updated_at timestamptz not null default now(),
  primary key (week, bucket)
);

alter table rodemap.mochi_usage enable row level security;

comment on table rodemap.mochi_usage is 'Rodemap: weekly Mochi questions per hashed browser id and for the whole site.';

-- Counts one request atomically and says whether it may go to Claude.
--   p_question: true for a new student message, false for a tool round-trip.
--   A question needs a free question in both buckets; every request also needs a free request
--   (p_requests_per_question per question) so tool results cannot be used to bypass the quota.
create or replace function public.rodemap_mochi_take(
  p_week date,
  p_browser text,
  p_question boolean,
  p_browser_limit integer,
  p_total_limit integer,
  p_requests_per_question integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  browser_bucket constant text := 'b:' || p_browser;
  added integer := case when p_question then 1 else 0 end;
  t rodemap.mochi_usage;
  b_questions integer;
  b_requests integer;
  refused text;
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') <> 'service_role' then
    raise exception 'rodemap_mochi_take: not allowed' using errcode = '42501';
  end if;
  if p_week is null or p_question is null or p_browser is null or p_browser !~ '^[0-9a-f]{32}$'
     or coalesce(p_browser_limit, 0) < 1 or coalesce(p_total_limit, 0) < 1 or coalesce(p_requests_per_question, 0) < 1 then
    raise exception 'rodemap_mochi_take: invalid arguments' using errcode = '22023';
  end if;

  insert into rodemap.mochi_usage (week, bucket) values (p_week, 'total') on conflict do nothing;
  -- The site row is locked first and serialises every call, so a browser row is written only
  -- when the request is allowed: refused requests from new ids leave nothing behind.
  select * into strict t from rodemap.mochi_usage where week = p_week and bucket = 'total' for update;
  select questions, requests into b_questions, b_requests
  from rodemap.mochi_usage where week = p_week and bucket = browser_bucket for update;
  b_questions := coalesce(b_questions, 0);
  b_requests := coalesce(b_requests, 0);

  if p_question and b_questions >= p_browser_limit then
    refused := 'weekly_browser';
  elsif p_question and t.questions >= p_total_limit then
    refused := 'weekly_total';
  elsif b_requests >= p_browser_limit * p_requests_per_question then
    refused := 'weekly_browser';
  elsif t.requests >= p_total_limit * p_requests_per_question then
    refused := 'weekly_total';
  end if;

  if refused is not null then
    return jsonb_build_object('allowed', false, 'scope', refused, 'browser_questions', b_questions, 'total_questions', t.questions);
  end if;

  insert into rodemap.mochi_usage (week, bucket, questions, requests)
  values (p_week, browser_bucket, added, 1)
  on conflict (week, bucket) do update
  set questions = rodemap.mochi_usage.questions + excluded.questions,
      requests = rodemap.mochi_usage.requests + 1,
      updated_at = now();
  update rodemap.mochi_usage
  set questions = questions + added, requests = requests + 1, updated_at = now()
  where week = p_week and bucket = 'total';

  return jsonb_build_object('allowed', true, 'scope', null, 'browser_questions', b_questions + added, 'total_questions', t.questions + added);
end;
$$;

revoke execute on function public.rodemap_mochi_take(date, text, boolean, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.rodemap_mochi_take(date, text, boolean, integer, integer, integer) to service_role;

comment on function public.rodemap_mochi_take(date, text, boolean, integer, integer, integer) is
  'Rodemap: counts one Mochi request against the weekly quota (called by the Edge Function rodemap-mochi with the service role).';
