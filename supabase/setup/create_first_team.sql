-- Run only in the trusted Supabase SQL Editor, AFTER the team migration.
-- Replace the UID below with the confirmed account shown in Authentication > Users.
-- This does not change or copy any existing personal plans/history.
do $$
declare
  first_admin uuid := 'REPLACE_WITH_YOUR_USER_UID'::uuid;
  new_team uuid;
begin
  if not exists (select 1 from auth.users where id = first_admin and email_confirmed_at is not null) then
    raise exception 'Choose an existing, email-confirmed HalaCapacity account.';
  end if;
  if exists (select 1 from public.planning_team_members where user_id = first_admin and role = 'admin') then
    raise exception 'This account already administers a team. Use that team or deliberately create a different one.';
  end if;
  insert into public.planning_teams(name) values('HalaCapacity Team') returning id into new_team;
  insert into public.planning_team_members(team_id,user_id,role) values(new_team,first_admin,'admin');
  insert into public.planning_membership_audit(team_id,actor_id,member_id,previous_role,next_role)
    values(new_team,first_admin,first_admin,null,'admin');
end;
$$;
