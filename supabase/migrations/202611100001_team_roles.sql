-- Additive migration: personal planning tables and existing records are untouched.
begin;

create schema if not exists planning_private;
revoke all on schema planning_private from public, anon, authenticated;
grant usage on schema planning_private to authenticated;

create function planning_private.valid_adjustments(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item record; weeks numeric; hours numeric; referrals numeric;
begin
  if jsonb_typeof(value) is distinct from 'object' then return false; end if;
  for item in select * from jsonb_each(value) loop
    if item.key !~ '^(alpha|bravo|charlie|delta|echo|foxtrot):(psychiatry|pediatrics|respiratory|long-term-care)$'
      or jsonb_typeof(item.value) is distinct from 'object'
      or jsonb_typeof(item.value->'waitingWeeks') is distinct from 'number'
      or jsonb_typeof(item.value->'freeHours') is distinct from 'number'
      or jsonb_typeof(item.value->'referrals') is distinct from 'number'
    then return false; end if;
    if (select count(*) from jsonb_object_keys(item.value)) <> 3 then return false; end if;
    weeks := (item.value->>'waitingWeeks')::numeric;
    hours := (item.value->>'freeHours')::numeric;
    referrals := (item.value->>'referrals')::numeric;
    if weeks < 0 or weeks > 52 or hours < 0 or hours > 168
      or referrals < 0 or referrals > 10000 or referrals <> trunc(referrals)
    then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function planning_private.valid_adjustments(jsonb) from public, anon;
grant execute on function planning_private.valid_adjustments(jsonb) to authenticated;

create table public.planning_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);
create table public.planning_team_members (
  team_id uuid not null references public.planning_teams(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('admin', 'planner', 'reviewer')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index planning_team_members_user on public.planning_team_members(user_id);

create function planning_private.team_role(target_team uuid)
returns text language sql stable security definer set search_path = '' as $$
  select member.role from public.planning_team_members member
  where member.team_id = target_team and member.user_id = (select auth.uid());
$$;
revoke all on function planning_private.team_role(uuid) from public, anon;
grant execute on function planning_private.team_role(uuid) to authenticated;

create table public.planning_team_plans (
  team_id uuid not null references public.planning_teams(id),
  stage text not null check (stage in ('baseline','winter-surge','specialist-leave')),
  adjustments jsonb not null default '{}'::jsonb check (planning_private.valid_adjustments(adjustments)),
  updated_by uuid not null references auth.users(id) default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (team_id, stage)
);
create table public.planning_team_submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.planning_teams(id),
  stage text not null check (stage in ('baseline','winter-surge','specialist-leave')),
  adjustments jsonb not null check (planning_private.valid_adjustments(adjustments)),
  submitted_by uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  rules_version text not null default 'v1' check (rules_version = 'v1'),
  unique (id, team_id)
);
create table public.planning_team_decisions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.planning_teams(id),
  submission_id uuid not null,
  stage text not null check (stage in ('baseline','winter-surge','specialist-leave')),
  agent text not null check (agent in ('forecast','routing','task-shifting','tele-pooling')),
  decision text not null check (decision in ('approved','rejected','changes_requested')),
  reason text not null check (length(trim(reason)) between 1 and 2000),
  summary text not null check (length(summary) <= 4000),
  evidence text not null check (length(evidence) <= 12000),
  user_id uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (submission_id, team_id) references public.planning_team_submissions(id, team_id)
);
create table public.planning_team_chat_audit (
  id uuid primary key,
  team_id uuid not null references public.planning_teams(id),
  user_id uuid not null references auth.users(id) default auth.uid(),
  stage text not null check (stage in ('baseline','winter-surge','specialist-leave')),
  question text not null check (length(question) between 1 and 600),
  source_ids text[] not null default '{}' check (source_ids <@ array['S1','S2','S3','S4','S5']::text[]),
  summary text not null check (length(summary) <= 350),
  mode text not null check (mode in ('live','offline')),
  created_at timestamptz not null default now()
);
create table public.planning_membership_audit (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.planning_teams(id),
  actor_id uuid not null references auth.users(id),
  member_id uuid not null references auth.users(id),
  previous_role text,
  next_role text,
  created_at timestamptz not null default now()
);
create index planning_team_submissions_time on public.planning_team_submissions(team_id,created_at desc);
create index planning_team_decisions_time on public.planning_team_decisions(team_id,created_at desc);
create index planning_team_chat_time on public.planning_team_chat_audit(team_id,user_id,created_at desc);

alter table public.planning_teams enable row level security;
alter table public.planning_team_members enable row level security;
alter table public.planning_team_plans enable row level security;
alter table public.planning_team_submissions enable row level security;
alter table public.planning_team_decisions enable row level security;
alter table public.planning_team_chat_audit enable row level security;
alter table public.planning_membership_audit enable row level security;
revoke all on public.planning_teams,public.planning_team_members,public.planning_team_plans,
  public.planning_team_submissions,public.planning_team_decisions,public.planning_team_chat_audit,
  public.planning_membership_audit from public,anon,authenticated;
grant select on public.planning_teams,public.planning_team_members,public.planning_team_plans,
  public.planning_team_submissions,public.planning_team_decisions,public.planning_team_chat_audit,
  public.planning_membership_audit to authenticated;
grant insert,update on public.planning_team_plans to authenticated;
grant insert on public.planning_team_chat_audit to authenticated;
grant update(name) on public.planning_teams to authenticated;

create policy teams_read on public.planning_teams for select to authenticated
  using (planning_private.team_role(id) is not null);
create policy teams_rename on public.planning_teams for update to authenticated
  using (planning_private.team_role(id) = 'admin') with check (planning_private.team_role(id) = 'admin');
create policy members_read on public.planning_team_members for select to authenticated
  using (planning_private.team_role(team_id) is not null);
create policy team_plans_read on public.planning_team_plans for select to authenticated
  using (planning_private.team_role(team_id) is not null);
create policy team_plans_insert on public.planning_team_plans for insert to authenticated
  with check (planning_private.team_role(team_id) in ('admin','planner') and updated_by = (select auth.uid()));
create policy team_plans_update on public.planning_team_plans for update to authenticated
  using (planning_private.team_role(team_id) in ('admin','planner'))
  with check (planning_private.team_role(team_id) in ('admin','planner') and updated_by = (select auth.uid()));
create policy submissions_read on public.planning_team_submissions for select to authenticated
  using (planning_private.team_role(team_id) is not null);
create policy team_decisions_read on public.planning_team_decisions for select to authenticated
  using (planning_private.team_role(team_id) is not null);
create policy team_chat_read on public.planning_team_chat_audit for select to authenticated
  using (planning_private.team_role(team_id) is not null and user_id = (select auth.uid()));
create policy team_chat_insert on public.planning_team_chat_audit for insert to authenticated
  with check (planning_private.team_role(team_id) is not null and user_id = (select auth.uid()));
create policy membership_audit_read on public.planning_membership_audit for select to authenticated
  using (planning_private.team_role(team_id) = 'admin');

-- Roles are looked up in the database on every call, not taken from signup metadata.
create function public.set_planning_team_member(p_team_id uuid,p_user_id uuid,p_role text)
returns void language plpgsql security definer set search_path = '' as $$
declare old_role text; actor uuid := auth.uid();
begin
  perform 1 from public.planning_teams where id = p_team_id for update;
  if planning_private.team_role(p_team_id) is distinct from 'admin' then
    raise exception 'Only a team admin can manage membership.' using errcode = '42501'; end if;
  if p_role is not null and p_role not in ('admin','planner','reviewer') then raise exception 'Invalid role.'; end if;
  select role into old_role from public.planning_team_members where team_id = p_team_id and user_id = p_user_id;
  if old_role = 'admin' and p_role is distinct from 'admin'
    and (select count(*) from public.planning_team_members where team_id = p_team_id and role = 'admin') <= 1
  then raise exception 'A team must keep at least one admin.'; end if;
  if p_role is null then
    delete from public.planning_team_members where team_id = p_team_id and user_id = p_user_id;
  else
    insert into public.planning_team_members(team_id,user_id,role) values(p_team_id,p_user_id,p_role)
      on conflict(team_id,user_id) do update set role = excluded.role;
  end if;
  insert into public.planning_membership_audit(team_id,actor_id,member_id,previous_role,next_role)
    values(p_team_id,actor,p_user_id,old_role,p_role);
end;
$$;

create function public.submit_planning_team_plan(p_team_id uuid,p_stage text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid; snapshot jsonb;
begin
  -- Shared row lock serializes submissions and membership changes.
  perform 1 from public.planning_teams where id = p_team_id for update;
  if planning_private.team_role(p_team_id) not in ('admin','planner')
    or planning_private.team_role(p_team_id) is null then
    raise exception 'Only planners and admins can submit a plan.' using errcode = '42501'; end if;
  select adjustments into snapshot from public.planning_team_plans where team_id = p_team_id and stage = p_stage for share;
  if not found then raise exception 'Save this team scenario before submitting it.'; end if;
  insert into public.planning_team_submissions(team_id,stage,adjustments,submitted_by)
    values(p_team_id,p_stage,snapshot,auth.uid()) returning id into new_id;
  return new_id;
end;
$$;

create function public.record_planning_team_decision(
  p_team_id uuid,p_submission_id uuid,p_agent text,p_decision text,p_reason text,p_summary text,p_evidence text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare source_stage text; new_id uuid;
begin
  perform 1 from public.planning_teams where id = p_team_id for update;
  if planning_private.team_role(p_team_id) not in ('admin','reviewer')
    or planning_private.team_role(p_team_id) is null then
    raise exception 'Only reviewers and admins can record team decisions.' using errcode = '42501'; end if;
  select stage into source_stage from public.planning_team_submissions where id = p_submission_id and team_id = p_team_id;
  if not found then raise exception 'Submission not found in this team.' using errcode = '42501'; end if;
  insert into public.planning_team_decisions(team_id,submission_id,stage,agent,decision,reason,summary,evidence,user_id)
    values(p_team_id,p_submission_id,source_stage,p_agent,p_decision,p_reason,p_summary,p_evidence,auth.uid()) returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.set_planning_team_member(uuid,uuid,text),
  public.submit_planning_team_plan(uuid,text),
  public.record_planning_team_decision(uuid,uuid,text,text,text,text,text) from public,anon;
grant execute on function public.set_planning_team_member(uuid,uuid,text),
  public.submit_planning_team_plan(uuid,text),
  public.record_planning_team_decision(uuid,uuid,text,text,text,text,text) to authenticated;
commit;
