-- Retire team/role API access without deleting personal or historical team data.
-- Safe to run again, and safe on projects that never enabled team roles.
begin;
do $$
declare object_name text; signature text; routine regprocedure;
begin
  foreach object_name in array array[
    'planning_teams','planning_team_members','planning_team_plans',
    'planning_team_submissions','planning_team_decisions',
    'planning_team_chat_audit','planning_membership_audit'
  ] loop
    if to_regclass('public.' || object_name) is not null then
      execute format('revoke all privileges on table public.%I from public, anon, authenticated', object_name);
    end if;
  end loop;
  foreach signature in array array[
    'public.set_planning_team_member(uuid,uuid,text)',
    'public.submit_planning_team_plan(uuid,text)',
    'public.record_planning_team_decision(uuid,uuid,text,text,text,text,text)',
    'planning_private.team_role(uuid)',
    'planning_private.valid_adjustments(jsonb)'
  ] loop
    routine := to_regprocedure(signature);
    if routine is not null then
      execute format('revoke all privileges on function %s from public, anon, authenticated', routine);
    end if;
  end loop;
  if exists (select 1 from pg_namespace where nspname = 'planning_private') then
    revoke all on schema planning_private from public, anon, authenticated;
  end if;
end;
$$;
commit;
-- Historical team rows remain available to the trusted project database owner.
-- planning_plans, planning_decisions, planning_chat_audit and Auth are unchanged.
