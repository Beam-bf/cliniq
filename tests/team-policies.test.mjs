import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('PostgreSQL enforces team roles, immutable submissions and tenant isolation', async t => {
  const db = new PGlite();
  const ids = Array.from({ length: 5 }, (_, index) => `00000000-0000-0000-0000-00000000000${index + 1}`);
  const [admin, planner, reviewer, outsider, secondAdmin] = ids;
  const team = '10000000-0000-0000-0000-000000000001';
  const other = '10000000-0000-0000-0000-000000000002';
  const changes = { 'alpha:psychiatry': { waitingWeeks: 4.6, freeHours: 18, referrals: 38 } };
  let submission;
  async function asUser(id, sql, params = []) {
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    try { return await db.query(sql, params); }
    finally { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub','',false)"); }
  }
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;`);
    for (const id of ids) await db.query('insert into auth.users values($1,now())', [id]);
    await db.exec(readFileSync(new URL('../supabase/migrations/202611090001_planning_workspace.sql', import.meta.url), 'utf8'));
    await db.query("insert into public.planning_plans(user_id,stage) values($1,'baseline')", [admin]);
    await db.exec(readFileSync(new URL('../supabase/migrations/202611100001_team_roles.sql', import.meta.url), 'utf8'));
    await db.query("insert into public.planning_teams(id,name) values($1,'Team A'),($2,'Team B')", [team, other]);
    for (const [user, role] of [[admin,'admin'],[planner,'planner'],[reviewer,'reviewer']]) await db.query('insert into public.planning_team_members(team_id,user_id,role) values($1,$2,$3)', [team, user, role]);
    await db.query("insert into public.planning_team_members(team_id,user_id,role) values($1,$2,'admin')", [other, outsider]);

    await t.test('trusted bootstrap assigns only the chosen confirmed account and rejects duplicate setup', async () => {
      const confirmed = '00000000-0000-0000-0000-000000000006';
      const unconfirmed = '00000000-0000-0000-0000-000000000007';
      await db.query('insert into auth.users values($1,now()),($2,null)', [confirmed, unconfirmed]);
      const setup = readFileSync(new URL('../supabase/setup/create_first_team.sql', import.meta.url), 'utf8');
      await assert.rejects(() => db.exec(setup.replace('REPLACE_WITH_YOUR_USER_UID', unconfirmed)), /email-confirmed/);
      await db.exec(setup.replace('REPLACE_WITH_YOUR_USER_UID', confirmed));
      assert.equal((await asUser(confirmed, 'select role from public.planning_team_members where user_id=$1', [confirmed])).rows[0].role, 'admin');
      await assert.rejects(() => db.exec(setup.replace('REPLACE_WITH_YOUR_USER_UID', confirmed)), /already administers/);
    });

    await t.test('migration preserves personal data and anonymous users cannot read team data', async () => {
      assert.equal((await asUser(admin, 'select * from public.planning_plans')).rows.length, 1);
      await db.exec('set role anon');
      try { await assert.rejects(() => db.query('select * from public.planning_teams'), /permission denied/); }
      finally { await db.exec('reset role'); }
    });
    await t.test('members see only their own teams; signup cannot create an Admin or mutate membership', async () => {
      assert.deepEqual((await asUser(admin, 'select id from public.planning_teams')).rows.map(row => row.id), [team]);
      assert.equal((await asUser(outsider, 'select * from public.planning_team_members where team_id=$1', [team])).rows.length, 0);
      await assert.rejects(() => asUser(planner, "insert into public.planning_team_members values($1,$2,'admin',now())", [team, planner]), /permission denied/);
      await assert.rejects(() => asUser(planner, "insert into public.planning_teams(name) values('Self-promoted')"), /permission denied/);
      await assert.rejects(() => asUser(planner, "select public.set_planning_team_member($1,$2,'admin')", [team, planner]), /Only a team admin/);
      await asUser(planner, "select set_config('request.jwt.claims','{\"user_role\":\"admin\"}',false)");
      await assert.rejects(() => asUser(planner, "select public.set_planning_team_member($1,$2,'admin')", [team, planner]), /Only a team admin/);
    });
    await t.test('planners save applied inputs; reviewers and other teams cannot edit them', async () => {
      await asUser(planner, "insert into public.planning_team_plans(team_id,stage,adjustments) values($1,'baseline',$2)", [team, changes]);
      assert.deepEqual((await asUser(reviewer, 'select adjustments from public.planning_team_plans where team_id=$1', [team])).rows[0].adjustments, changes);
      await assert.rejects(() => asUser(reviewer, "insert into public.planning_team_plans(team_id,stage) values($1,'winter-surge')", [team]), /row-level security/);
      assert.equal((await asUser(reviewer, "update public.planning_team_plans set adjustments='{}' where team_id=$1 returning stage", [team])).rows.length, 0);
      assert.equal((await asUser(outsider, 'select * from public.planning_team_plans where team_id=$1', [team])).rows.length, 0);
      await assert.rejects(() => asUser(planner, "insert into public.planning_team_plans(team_id,stage,adjustments) values($1,'winter-surge',$2)", [team, { 'alpha:psychiatry': { waitingWeeks: 1, freeHours: -1, referrals: 2 } }]), /check constraint/);
    });
    await t.test('submission copies saved values server-side and cannot be changed later', async () => {
      submission = (await asUser(planner, "select public.submit_planning_team_plan($1,'baseline') as id", [team])).rows[0].id;
      await asUser(planner, "update public.planning_team_plans set adjustments='{}',updated_by=$2 where team_id=$1", [team, planner]);
      assert.deepEqual((await asUser(reviewer, 'select adjustments from public.planning_team_submissions where id=$1', [submission])).rows[0].adjustments, changes);
      await assert.rejects(() => asUser(admin, "update public.planning_team_submissions set adjustments='{}' where id=$1", [submission]), /permission denied/);
      await assert.rejects(() => asUser(reviewer, "select public.submit_planning_team_plan($1,'baseline')", [team]), /Only planners/);
      await assert.rejects(() => asUser(outsider, "select public.submit_planning_team_plan($1,'baseline')", [team]), /Only planners/);
    });
    await t.test('only Reviewer/Admin may record a decision on a submission in their own team', async () => {
      const sql = "select public.record_planning_team_decision($1,$2,'forecast','approved','Fictional review','Visible summary','Scenario evidence')";
      await assert.rejects(() => asUser(planner, sql, [team, submission]), /Only reviewers/);
      await assert.rejects(() => asUser(outsider, sql, [team, submission]), /Only reviewers/);
      await assert.rejects(() => asUser(outsider, sql, [other, submission]), /Submission not found/);
      await asUser(reviewer, sql, [team, submission]);
      const rows = (await asUser(planner, 'select * from public.planning_team_decisions')).rows;
      assert.equal(rows.length, 1); assert.equal(rows[0].user_id, reviewer); assert.equal(rows[0].stage, 'baseline');
      await assert.rejects(() => asUser(reviewer, 'delete from public.planning_team_decisions'), /permission denied/);
    });
    await t.test('team chat notes stay private to their author and cannot cite unverified sources', async () => {
      await asUser(planner, "insert into public.planning_team_chat_audit(id,team_id,stage,question,summary,mode) values(gen_random_uuid(),$1,'baseline','What hours are free?','Visible answer','offline')", [team]);
      assert.equal((await asUser(planner, 'select * from public.planning_team_chat_audit')).rows.length, 1);
      assert.equal((await asUser(reviewer, 'select * from public.planning_team_chat_audit')).rows.length, 0);
      assert.equal((await asUser(admin, 'select * from public.planning_team_chat_audit')).rows.length, 0);
      await assert.rejects(() => asUser(planner, "insert into public.planning_team_chat_audit(id,team_id,stage,question,summary,mode,source_ids) values(gen_random_uuid(),$1,'baseline','What?','Answer','offline',array['U1'])", [team]), /check constraint/);
    });
    await t.test('Admin can add/remove members; revoked access is immediately enforced', async () => {
      await asUser(admin, "select public.set_planning_team_member($1,$2,'planner')", [team, outsider]);
      assert.equal((await asUser(outsider, 'select * from public.planning_team_submissions where team_id=$1', [team])).rows.length, 1);
      await asUser(admin, 'select public.set_planning_team_member($1,$2,null)', [team, outsider]);
      assert.equal((await asUser(outsider, 'select * from public.planning_team_submissions where team_id=$1', [team])).rows.length, 0);
      assert.equal((await asUser(admin, 'select * from public.planning_membership_audit')).rows.length, 2);
      assert.equal((await asUser(planner, 'select * from public.planning_membership_audit')).rows.length, 0);
    });
    await t.test('the last Admin cannot be removed/demoted; role changes use database membership', async () => {
      await assert.rejects(() => asUser(admin, "select public.set_planning_team_member($1,$2,'planner')", [team, admin]), /at least one admin/);
      await assert.rejects(() => asUser(admin, 'select public.set_planning_team_member($1,$2,null)', [team, admin]), /at least one admin/);
      await asUser(admin, "select public.set_planning_team_member($1,$2,'admin')", [team, secondAdmin]);
      await asUser(admin, "select public.set_planning_team_member($1,$2,'planner')", [team, admin]);
      await assert.rejects(() => asUser(admin, "select public.set_planning_team_member($1,$2,'admin')", [team, admin]), /Only a team admin/);
      await assert.rejects(() => asUser(secondAdmin, 'select public.set_planning_team_member($1,$2,null)', [team, secondAdmin]), /at least one admin/);
    });
  } finally { await db.close(); }
});
