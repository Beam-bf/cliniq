import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIO_STAGES } from '../src/data/scenario.ts';
import { applyAdjustments, validateAdjustments, planRevision, summarizeStage } from '../src/planning/scenarioPlanning.ts';
import { buildContext } from '../src/chat/core.ts';
import { answerChat } from '../functions/api/chat.ts';
import { loadAccountContext } from '../functions/_lib/accountContext.ts';
import { createWorkspaceRepository } from '../src/lib/workspaceRepository.ts';

const changes = { 'alpha:psychiatry': { waitingWeeks: 8.5, freeHours: 2, referrals: 50 } };
const question = { question: 'What psychiatry forecast risks appear?', scenarioId: 'baseline', history: [], adjustments: changes, currentView: 'planner' };

test('what-if changes recalculate actual scenario data without mutating fixtures or other scenarios', () => {
  const original = structuredClone(SCENARIO_STAGES.baseline);
  const stage = applyAdjustments('baseline', changes);
  assert.equal(stage.records[0].waitingWeeksHistory.at(-1), 8.5);
  assert.equal(stage.records[0].freeSpecialistHoursPerWeek, 2);
  assert.equal(summarizeStage(stage).freeHours, summarizeStage(original).freeHours - 18);
  assert.deepEqual(SCENARIO_STAGES.baseline, original);
  assert.equal(applyAdjustments('winter-surge').records.find(row => row.clinicId === 'alpha' && row.specialtyId === 'psychiatry').freeSpecialistHoursPerWeek, 20);
  const context = buildContext(question);
  assert.equal(context.stage.records[0].waitingWeeksHistory.at(-1), 8.5);
  assert.ok(context.agents.find(agent => agent.agent === 'forecast').evidence.some(text => text.includes('8.5')));
});
test('reject unknown pairs and invalid numeric adjustments before applying or saving', () => {
  for (const invalid of [{ bogus: changes['alpha:psychiatry'] }, { 'alpha:psychiatry': { waitingWeeks: NaN, freeHours: 2, referrals: 50 } }, { 'alpha:psychiatry': { waitingWeeks: 1, freeHours: -1, referrals: 50 } }, { 'alpha:psychiatry': { waitingWeeks: 1, freeHours: 2, referrals: 0.5 } }]) assert.throws(() => validateAdjustments('baseline', invalid));
});
test('review identity changes with inputs, is deterministic, and returns to original only for original inputs', () => {
  assert.equal(planRevision({}), 'original');
  assert.notEqual(planRevision(changes), 'original');
  assert.notEqual(planRevision(changes), planRevision({ 'alpha:psychiatry': { ...changes['alpha:psychiatry'], freeHours: 3 } }));
  assert.equal(planRevision({ a: changes['alpha:psychiatry'], b: changes['alpha:psychiatry'] }), planRevision({ b: changes['alpha:psychiatry'], a: changes['alpha:psychiatry'] }));
  assert.deepEqual(validateAdjustments('baseline', { 'alpha:psychiatry': { waitingWeeks: 4.6, freeHours: 20, referrals: 38 } }), {});
});
test('the LLM receives the guiding prompt, current view and adjusted scenario, without credentials in context', async () => {
  let sent;
  const answer = await answerChat(question, { AI_PROVIDER: 'cloudflare', AI_API_KEY: 'not-a-real-key', AI_ACCOUNT_ID: 'test', AI_MODEL: 'test' }, async (_url, options) => {
    sent = JSON.parse(options.body);
    return Response.json({ result: { response: 'Scenario data: Alpha psychiatry waits 8.5 weeks. [S2]' } });
  });
  assert.equal(answer.mode, 'live');
  assert.ok(sent.messages[0].content.includes('ROLE AND PRODUCT'));
  assert.ok(sent.messages[0].content.includes('No action tools are available'));
  const context = JSON.parse(sent.messages[1].content).CONTEXT;
  assert.equal(context.currentView, 'planner');
  assert.equal(context.stage.records[0].waitingWeeksHistory.at(-1), 8.5);
  assert.ok(!JSON.stringify(sent).includes('not-a-real-key'));
});

const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'public-test-key' };
const userId = '00000000-0000-0000-0000-000000000001';
test('account context rejects missing/invalid tokens and partial configuration', async () => {
  await assert.rejects(() => loadAccountContext(new Request('https://app.test'), question, env, async () => { throw new Error('must not fetch'); }), error => error.status === 401);
  await assert.rejects(() => loadAccountContext(new Request('https://app.test', { headers: { Authorization: 'Bearer invalid' } }), question, env, async () => new Response('', { status: 401 })), error => error.status === 401);
  await assert.rejects(() => loadAccountContext(new Request('https://app.test'), question, { SUPABASE_URL: env.SUPABASE_URL }, fetch), error => error.status === 503);
});
test('verified account context replaces client-supplied plans and audit, scoped to the authenticated user', async () => {
  const calls = [];
  const result = await loadAccountContext(new Request('https://app.test', { headers: { Authorization: 'Bearer test-session' } }), { ...question, recentAudit: [{ stage: 'baseline', agent: 'forecast', decision: 'approved' }] }, env, async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: userId });
    if (url.includes('planning_plans')) return Response.json([{ adjustments: {} }]);
    return Response.json([]);
  });
  assert.deepEqual(result.adjustments, {}); assert.deepEqual(result.recentAudit, []);
  assert.ok(calls.slice(1).every(call => call.url.includes(`user_id=eq.${userId}`) && call.url.includes('stage=eq.baseline') && call.options.headers.Authorization === 'Bearer test-session'));
});

function mockClient(failure = false) {
  const calls = [];
  return { calls, from(table) {
    const query = { select() { return query; }, eq(column, value) { calls.push({ table, column, value }); return query; }, order() { return query; }, limit() { return query; },
      then(resolve, reject) { return Promise.resolve({ error: failure ? { message: 'database error' } : null, data: [] }).then(resolve, reject); },
      insert(value) { calls.push({ table, insert: value }); return Promise.resolve({ error: failure ? { message: 'database error' } : null }); },
      upsert(value) { calls.push({ table, upsert: value }); return Promise.resolve({ error: failure ? { message: 'database error' } : null }); } };
    return query;
  } };
}
test('workspace reads and writes carry the owner ID, and real chat-audit rows are sent for persistence', async () => {
  const client = mockClient(); const repo = createWorkspaceRepository(client);
  await repo.load(userId);
  assert.equal(client.calls.filter(call => call.column === 'user_id' && call.value === userId).length, 3);
  await repo.savePlan(userId, 'baseline', changes);
  await repo.saveChat(userId, { id: 'chat-id', stage: 'baseline', question: 'What hours are free?', sourceIds: ['S2'], summary: 'Visible answer', mode: 'offline' });
  const chat = client.calls.find(call => call.table === 'planning_chat_audit' && call.insert);
  assert.equal(chat.insert.user_id, userId); assert.equal(chat.insert.summary, 'Visible answer');
  assert.deepEqual(chat.insert.source_ids, ['S2']);
});
test('database failures propagate; saves cannot silently succeed or fall back to demo storage', async () => {
  const repo = createWorkspaceRepository(mockClient(true));
  await assert.rejects(() => repo.load(userId), /could not be loaded/);
  await assert.rejects(() => repo.savePlan(userId, 'baseline', changes), /not saved/);
  await assert.rejects(() => repo.saveChat(userId, { id: 'chat', stage: 'baseline', question: 'test', sourceIds: [], summary: 'test', mode: 'offline' }), /not confirmed/);
});
