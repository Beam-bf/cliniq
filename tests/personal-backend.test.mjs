import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = name => readFileSync(new URL(`../supabase/${name}`, import.meta.url), 'utf8');
const alice = '00000000-0000-0000-0000-000000000001';
const bob = '00000000-0000-0000-0000-000000000002';
const decision = '10000000-0000-0000-0000-000000000001';
const chat = '20000000-0000-0000-0000-000000000001';

test('personal database enforces owner isolation and append-only history', async t => {
  const db = new PGlite();
  async function asUser(id, query, params = []) {
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    try { return await db.query(query, params); }
    finally { await db.exec('reset role'); }
  }
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
    await db.query('insert into auth.users values($1),($2)', [alice, bob]);
    await db.exec(sql('migrations/202611090001_planning_workspace.sql'));
    await db.exec(sql('migrations/202611100002_retire_team_roles.sql'));

    await t.test('plans, decisions and chat can be saved and reloaded by their owner', async () => {
      await asUser(alice, "insert into planning_plans(stage) values('baseline')");
      await asUser(alice, "update planning_plans set adjustments = '{\"alpha:psychiatry\":{\"waitingWeeks\":4.6,\"freeHours\":19,\"referrals\":38}}' where stage='baseline'");
      await asUser(alice, `insert into planning_decisions(id,stage,agent,proposal_id,summary,evidence,decision,reason)
        values($1,'baseline','forecast','baseline:forecast','Summary','Evidence','approved','Reviewed fictional inputs')`, [decision]);
      await asUser(alice, `insert into planning_chat_audit(id,stage,question,summary,mode)
        values($1,'baseline','What hours are available?','Template answer','offline')`, [chat]);
      assert.equal((await asUser(alice, 'select adjustments from planning_plans')).rows[0].adjustments['alpha:psychiatry'].freeHours, 19);
      for (const table of ['planning_decisions', 'planning_chat_audit']) assert.equal((await asUser(alice, `select * from ${table}`)).rows.length, 1);
    });

    await t.test('another account cannot read, insert or change the owner records', async () => {
      for (const table of ['planning_plans', 'planning_decisions', 'planning_chat_audit']) {
        assert.equal((await asUser(bob, `select * from ${table}`)).rows.length, 0);
      }
      assert.equal((await asUser(bob, "update planning_plans set adjustments='{}'")).affectedRows, 0);
      await assert.rejects(() => asUser(bob, "insert into planning_plans(user_id,stage) values($1,'winter-surge')", [alice]), /row-level security/);
      await asUser(bob, "insert into planning_plans(stage) values('baseline')");
      await assert.rejects(() => asUser(bob, 'update planning_plans set user_id=$1', [alice]), /row-level security/);
      for (const [table, id] of [['planning_decisions', decision], ['planning_chat_audit', chat]]) {
        await assert.rejects(() => asUser(bob, `insert into ${table} select * from json_populate_record(null::${table},$1::json)`,
          [JSON.stringify(table === 'planning_decisions'
            ? { id, user_id: alice, stage: 'baseline', agent: 'forecast', proposal_id: 'test', plan_revision: 'original', summary: 'Test', evidence: 'Test', decision: 'approved', reason: 'Test', created_at: new Date().toISOString() }
            : { id, user_id: alice, stage: 'baseline', question: 'Test?', source_ids: [], summary: 'Test', mode: 'offline', created_at: new Date().toISOString() })]), /row-level security/);
      }
    });

    await t.test('history cannot be edited or deleted, including by its owner', async () => {
      for (const table of ['planning_decisions', 'planning_chat_audit']) {
        await assert.rejects(() => asUser(alice, `update ${table} set summary='Changed'`), /permission denied/);
        await assert.rejects(() => asUser(alice, `delete from ${table}`), /permission denied/);
      }
      await assert.rejects(() => asUser(alice, 'delete from planning_plans'), /permission denied/);
    });

    await t.test('anonymous clients cannot read or write personal records', async () => {
      await db.exec('set role anon');
      try {
        for (const table of ['planning_plans', 'planning_decisions', 'planning_chat_audit']) {
          await assert.rejects(() => db.query(`select * from ${table}`), /permission denied/);
          await assert.rejects(() => db.query(`delete from ${table}`), /permission denied/);
        }
      } finally { await db.exec('reset role'); }
    });

    await t.test('read-only verification detects correct setup and permission drift', async () => {
      const verify = sql('verify_backend.sql');
      assert.ok(Object.values((await db.query(verify)).rows[0]).every(value => value === true));
      await db.exec('grant select on planning_plans to anon');
      assert.equal((await db.query(verify)).rows[0].anonymous_access_denied, false);
      await db.exec('revoke select on planning_plans from anon');
      assert.ok(Object.values((await db.query(verify)).rows[0]).every(value => value === true));
    });
  } finally { await db.close(); }
});
