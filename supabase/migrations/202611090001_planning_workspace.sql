-- Apply once to your Supabase project after review. No existing tables are dropped.
begin;

create table public.planning_plans (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  stage text not null check (stage in ('baseline', 'winter-surge', 'specialist-leave')),
  adjustments jsonb not null default '{}'::jsonb check (jsonb_typeof(adjustments) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, stage)
);
create table public.planning_decisions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  stage text not null check (stage in ('baseline', 'winter-surge', 'specialist-leave')),
  agent text not null check (agent in ('forecast', 'routing', 'task-shifting', 'tele-pooling')),
  proposal_id text not null check (length(proposal_id) <= 3000),
  plan_revision text not null default 'original' check (length(plan_revision) <= 2500),
  summary text not null check (length(summary) <= 4000),
  evidence text not null check (length(evidence) <= 12000),
  decision text not null check (decision in ('approved', 'rejected', 'changes_requested')),
  reason text not null check (length(trim(reason)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table public.planning_chat_audit (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  stage text not null check (stage in ('baseline', 'winter-surge', 'specialist-leave')),
  question text not null check (length(question) between 1 and 600),
  source_ids text[] not null default '{}' check (source_ids <@ array['S1','S2','S3','S4','S5']::text[]),
  summary text not null check (length(summary) <= 350),
  mode text not null check (mode in ('live', 'offline')),
  created_at timestamptz not null default now()
);
create index planning_decisions_owner_time on public.planning_decisions(user_id, created_at desc);
create index planning_chat_owner_time on public.planning_chat_audit(user_id, created_at desc);

alter table public.planning_plans enable row level security;
alter table public.planning_decisions enable row level security;
alter table public.planning_chat_audit enable row level security;
revoke all on public.planning_plans, public.planning_decisions, public.planning_chat_audit from public, anon, authenticated;
grant select, insert, update on public.planning_plans to authenticated;
grant select, insert on public.planning_decisions, public.planning_chat_audit to authenticated;

create policy plans_read on public.planning_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy plans_insert on public.planning_plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy plans_update on public.planning_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy decisions_read on public.planning_decisions for select to authenticated using ((select auth.uid()) = user_id);
create policy decisions_insert on public.planning_decisions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy chat_read on public.planning_chat_audit for select to authenticated using ((select auth.uid()) = user_id);
create policy chat_insert on public.planning_chat_audit for insert to authenticated with check ((select auth.uid()) = user_id);
-- No client update/delete grants or policies for recorded decisions and chat history.
-- These are user-entered records, not a certified or tamper-proof operational audit.
commit;
