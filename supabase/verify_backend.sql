-- Read-only setup check. Run in the Supabase SQL Editor; no records are changed.
-- All checks should return true. This checks configuration, not email delivery
-- or authenticated end-to-end behavior in the hosted application.
with personal as (
  select c.oid, c.relrowsecurity, c.relname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('planning_plans', 'planning_decisions', 'planning_chat_audit')
), team as (
  select c.oid from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in (
    'planning_teams', 'planning_team_members', 'planning_team_plans',
    'planning_team_submissions', 'planning_team_decisions',
    'planning_team_chat_audit', 'planning_membership_audit'
  )
), retired_routines as (
  select to_regprocedure(signature) as oid from unnest(array[
    'public.set_planning_team_member(uuid,uuid,text)',
    'public.submit_planning_team_plan(uuid,text)',
    'public.record_planning_team_decision(uuid,uuid,text,text,text,text,text)',
    'planning_private.team_role(uuid)', 'planning_private.valid_adjustments(jsonb)'
  ]) as signature
)
select
  (select count(*) = 3 and bool_and(relrowsecurity) from personal) as personal_rls_enabled,
  not exists (select 1 from personal where has_table_privilege('anon', oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) as anonymous_access_denied,
  (select count(*) = 3 and bool_and(
    has_table_privilege('authenticated', oid, 'SELECT')
    and has_table_privilege('authenticated', oid, 'INSERT')
    and (has_table_privilege('authenticated', oid, 'UPDATE') = (relname = 'planning_plans'))
    and not has_table_privilege('authenticated', oid, 'DELETE,TRUNCATE,REFERENCES,TRIGGER')
  ) from personal) as personal_grants_correct,
  not exists (select 1 from team where
    has_table_privilege('anon', oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    or has_table_privilege('authenticated', oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  ) as team_tables_disabled,
  not exists (select 1 from retired_routines where oid is not null and (
    has_function_privilege('anon', oid, 'EXECUTE')
    or has_function_privilege('authenticated', oid, 'EXECUTE')
  )) as team_functions_disabled;
