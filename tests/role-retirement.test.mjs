import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { loadAccountContext } from '../functions/_lib/accountContext.ts';
import { onRequestPost } from '../functions/api/chat.ts';

const personalMigration = readFileSync(new URL('../supabase/migrations/202611090001_planning_workspace.sql',import.meta.url),'utf8');
const historicalTeamMigration = readFileSync(new URL('../supabase/migrations/202611100001_team_roles.sql',import.meta.url),'utf8');
const retire = readFileSync(new URL('../supabase/migrations/202611100002_retire_team_roles.sql',import.meta.url),'utf8');
const owner='00000000-0000-0000-0000-000000000001';
const other='00000000-0000-0000-0000-000000000002';
const team='10000000-0000-0000-0000-000000000001';
const submission='20000000-0000-0000-0000-000000000001';
const teamTables=['planning_teams','planning_team_members','planning_team_plans','planning_team_submissions','planning_team_decisions','planning_team_chat_audit','planning_membership_audit'];
async function setup(db) {
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  await db.query('insert into auth.users values($1,now()),($2,now())',[owner,other]);
  await db.exec(personalMigration);
}
async function asUser(db,id,query,parameters=[]) {
  await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  try{return await db.query(query,parameters);}finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");}
}

test('retiring roles preserves data and removes every ordinary-client team privilege',async t=>{
  const db=new PGlite();
  try {
    await setup(db);
    const values={'alpha:psychiatry':{waitingWeeks:4.6,freeHours:18,referrals:38}};
    await db.query("insert into planning_plans(user_id,stage,adjustments) values($1,'baseline',$2)",[owner,values]);
    await db.exec(historicalTeamMigration);
    await db.query("insert into planning_teams(id,name) values($1,'Historical team')",[team]);
    await db.query("insert into planning_team_members(team_id,user_id,role) values($1,$2,'admin')",[team,owner]);
    await db.query("insert into planning_team_plans(team_id,stage,adjustments,updated_by) values($1,'baseline',$2,$3)",[team,values,owner]);
    await db.query("insert into planning_team_submissions(id,team_id,stage,adjustments,submitted_by) values($1,$2,'baseline',$3,$4)",[submission,team,values,owner]);
    await db.query("insert into planning_team_decisions(team_id,submission_id,stage,agent,decision,reason,summary,evidence,user_id) values($1,$2,'baseline','forecast','approved','Historical review','Visible summary','Evidence',$3)",[team,submission,owner]);
    await db.query("insert into planning_team_chat_audit(id,team_id,user_id,stage,question,summary,mode) values(gen_random_uuid(),$1,$2,'baseline','What hours are free?','Visible answer','offline')",[team,owner]);
    await db.query("insert into planning_membership_audit(team_id,actor_id,member_id,next_role) values($1,$2,$2,'admin')",[team,owner]);
    assert.equal((await asUser(db,owner,'select * from planning_teams')).rows.length,1);
    await db.exec(retire);

    await t.test('the same planner account can still read and save its personal plan',async()=>{
      assert.deepEqual((await asUser(db,owner,'select adjustments from planning_plans')).rows[0].adjustments,values);
      assert.equal((await asUser(db,other,'select * from planning_plans')).rows.length,0);
      await asUser(db,owner,"insert into planning_plans(user_id,stage) values($1,'winter-surge')",[owner]);
      assert.equal((await asUser(db,owner,'select * from planning_plans')).rows.length,2);
      assert.equal((await db.query('select * from auth.users')).rows.length,2);
    });
    await t.test('old Admin membership no longer grants team reads or writes',async()=>{
      for(const table of teamTables) await assert.rejects(()=>asUser(db,owner,`select * from public.${table}`),/permission denied/);
      await assert.rejects(()=>asUser(db,owner,"insert into planning_team_plans(team_id,stage) values($1,'winter-surge')",[team]),/permission denied/);
      await db.exec('set role anon');
      try {await assert.rejects(()=>db.query('select * from planning_teams'),/permission denied/);}finally{await db.exec('reset role');}
    });
    await t.test('old membership, submission, review and private helper entry points are blocked',async()=>{
      for(const [query,parameters] of [
        ["select public.set_planning_team_member($1,$2,'admin')",[team,other]],
        ["select public.submit_planning_team_plan($1,'baseline')",[team]],
        ["select public.record_planning_team_decision($1,$2,'forecast','approved','Reason','Summary','Evidence')",[team,submission]],
        ['select planning_private.team_role($1)',[team]],
      ]) await assert.rejects(()=>asUser(db,owner,query,parameters),/permission denied/);
    });
    await t.test('historical records are retained, and retirement is safe to repeat',async()=>{
      await db.exec(retire);
      for(const table of teamTables) assert.equal((await db.query(`select count(*)::int as count from public.${table}`)).rows[0].count,1);
    });
  } finally {await db.close();}
});

test('role retirement also works on a personal-only installation',async()=>{
  const db=new PGlite();
  try {await setup(db);await db.exec(retire);await db.exec(retire);assert.equal((await db.query('select count(*)::int as count from auth.users')).rows[0].count,2);}
  finally {await db.close();}
});

test('legacy team chat requests fail clearly without fetching team data or model output',async()=>{
  const body={question:'What does the forecast show?',scenarioId:'baseline',history:[],teamId:team,submissionId:submission};
  let calls=0;
  await assert.rejects(()=>loadAccountContext(new Request('https://app.test'),body,{},async()=>{calls++;throw new Error('Must not fetch');}),error=>error.status===409);
  const response=await onRequestPost({request:new Request('https://app.test/api/chat',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'retired-team-test'},body:JSON.stringify(body)}),env:{}},async()=>{calls++;throw new Error('Must not fetch');});
  assert.equal(response.status,409);assert.equal(calls,0);assert.ok((await response.json()).error.includes('retired'));
});
