-- Rodemap · Mochi weekly question quota.
--
-- One row per week (the Monday, Asia/Ho_Chi_Minh) and bucket: 'total' for the whole site and
-- 'b:<32 hex>' for one browser, where the hex is a SHA-256 digest of the random id the browser
-- keeps. Nothing about the student and no network address is stored. Old weeks are no longer
-- read; they can be cleared at any time with
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
  b rodemap.mochi_usage;
  refused text;
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') <> 'service_role' then
    raise exception 'rodemap_mochi_take: not allowed' using errcode = '42501';
  end if;
  if p_week is null or p_question is null or p_browser is null or p_browser !~ '^[0-9a-f]{32}$'
     or coalesce(p_browser_limit, 0) < 1 or coalesce(p_total_limit, 0) < 1 or coalesce(p_requests_per_question, 0) < 1 then
    raise exception 'rodemap_mochi_take: invalid arguments' using errcode = '22023';
  end if;

  insert into rodemap.mochi_usage (week, bucket)
  values (p_week, 'total'), (p_week, browser_bucket)
  on conflict do nothing;

  -- Always lock the site row first, then the browser row, so concurrent calls cannot deadlock.
  select * into strict t from rodemap.mochi_usage where week = p_week and bucket = 'total' for update;
  select * into strict b from rodemap.mochi_usage where week = p_week and bucket = browser_bucket for update;

  if p_question and b.questions >= p_browser_limit then
    refused := 'weekly_browser';
  elsif p_question and t.questions >= p_total_limit then
    refused := 'weekly_total';
  elsif b.requests >= p_browser_limit * p_requests_per_question then
    refused := 'weekly_browser';
  elsif t.requests >= p_total_limit * p_requests_per_question then
    refused := 'weekly_total';
  end if;

  if refused is not null then
    return jsonb_build_object('allowed', false, 'scope', refused, 'browser_questions', b.questions, 'total_questions', t.questions);
  end if;

  update rodemap.mochi_usage
  set questions = questions + added, requests = requests + 1, updated_at = now()
  where week = p_week and bucket in ('total', browser_bucket);

  return jsonb_build_object('allowed', true, 'scope', null, 'browser_questions', b.questions + added, 'total_questions', t.questions + added);
end;
$$;

revoke execute on function public.rodemap_mochi_take(date, text, boolean, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.rodemap_mochi_take(date, text, boolean, integer, integer, integer) to service_role;

comment on function public.rodemap_mochi_take(date, text, boolean, integer, integer, integer) is
  'Rodemap: counts one Mochi request against the weekly quota (called by the Edge Function rodemap-mochi with the service role).';
