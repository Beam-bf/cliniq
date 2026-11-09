import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAccountContext } from '../functions/_lib/accountContext.ts';
import { createTeamRepository } from '../src/teams/repository.ts';
import { canEditTeam, canReviewTeam, teamProposalId } from '../src/teams/types.ts';

const userId = '00000000-0000-0000-0000-000000000001';
const teamId = '10000000-0000-0000-0000-000000000001';
const submissionId = '20000000-0000-0000-0000-000000000001';
const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'public-test' };
const request = new Request('https://app.test/api/chat', { headers: { Authorization: 'Bearer synthetic-session' } });
const body = { question: 'What does the forecast show?', scenarioId: 'baseline', history: [], teamId, submissionId, teamRole: 'admin', adjustments: { 'alpha:psychiatry': { waitingWeeks: 20, freeHours: 5, referrals: 10 } } };

test('team chat verifies membership, reads the selected team snapshot and replaces forged role/inputs', async () => {
  const urls = [];
  const result = await loadAccountContext(request, body, env, async url => {
    urls.push(url);
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: userId });
    if (url.includes('planning_team_members')) return Response.json([{ role: 'reviewer' }]);
    if (url.includes('planning_team_submissions')) return Response.json([{ adjustments: {} }]);
    return Response.json([]);
  });
  assert.equal(result.teamRole, 'reviewer'); assert.deepEqual(result.adjustments, {});
  assert.ok(urls.find(url => url.includes('planning_team_members')).includes(`user_id=eq.${userId}`));
  assert.ok(urls.find(url => url.includes('planning_team_submissions')).includes(`id=eq.${submissionId}`));
  assert.ok(urls.filter(url => url.includes('/rest/')).every(url => url.includes(`team_id=eq.${teamId}`)));
});
test('nonmembers and mismatched submissions cannot supply team context to the model', async () => {
  let dataReads = 0;
  await assert.rejects(() => loadAccountContext(request, body, env, async url => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: userId });
    if (url.includes('planning_team_members')) return Response.json([]);
    dataReads++; return Response.json([]);
  }), error => error.status === 403);
  assert.equal(dataReads, 0);
  await assert.rejects(() => loadAccountContext(request, body, env, async url => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: userId });
    if (url.includes('planning_team_members')) return Response.json([{ role: 'reviewer' }]);
    return Response.json([]);
  }), error => error.status === 403);
  await assert.rejects(() => loadAccountContext(new Request('https://app.test'), body, {}, fetch), error => error.status === 503);
});
test('role helpers grant Planner editing, Reviewer decisions, and Admin both', () => {
  assert.ok(canEditTeam('planner') && !canReviewTeam('planner'));
  assert.ok(!canEditTeam('reviewer') && canReviewTeam('reviewer'));
  assert.ok(canEditTeam('admin') && canReviewTeam('admin'));
  assert.ok(!canEditTeam() && !canReviewTeam());
  assert.notEqual(teamProposalId(submissionId, 'forecast'), teamProposalId(teamId, 'forecast'));
});
test('the team repository sends role changes and submissions only through guarded RPCs', async () => {
  const calls = [];
  const repository = createTeamRepository({ rpc: async (name, parameters) => { calls.push({ name, parameters }); return { data: submissionId, error: null }; } });
  await repository.submit(teamId, 'baseline');
  await repository.setMember(teamId, userId, 'reviewer');
  await repository.decide(teamId, submissionId, { agent: 'forecast', decision: 'approved', reason: 'Fictional review', summary: 'Summary', evidence: 'Evidence' });
  assert.equal(calls[0].name, 'submit_planning_team_plan');
  assert.deepEqual(calls[0].parameters, { p_team_id: teamId, p_stage: 'baseline' });
  assert.equal(calls[1].name, 'set_planning_team_member');
  assert.equal(calls[2].parameters.p_submission_id, submissionId);
  assert.ok(!('user_id' in calls[2].parameters));
});
