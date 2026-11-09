import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieve, inputError, validateAnswer, makeChatAudit, buildContext } from '../src/chat/core.ts';
import { answerChat, onRequestPost } from '../functions/api/chat.ts';
import { readFileSync } from 'node:fs';

const request = { question: 'What psychiatry forecast risks appear?', scenarioId: 'baseline', history: [] };
test('retrieval excludes every unverified source and caps passages', () => {
  const sources = retrieve('Dubai healthcare psychiatry beds workforce insurance OECD elderly');
  assert.ok(sources.length > 0 && sources.length <= 5);
  assert.ok(sources.every(source => source.verified && source.passage && !source.id.startsWith('U')));
});
test('unknown and unverified citations are removed; output is bounded', () => {
  const result = validateAnswer('[S2] [U1] [S999] ' + 'x'.repeat(5000), ['S2']);
  assert.deepEqual(result.sourceIds, ['S2']);
  assert.ok(!result.answer.includes('[U1]') && !result.answer.includes('[S999]'));
  assert.ok(result.notice && result.answer.includes('Limits / uncertainty:') && result.answer.length < 3400);
});
test('provider reasoning never reaches visible answers or audit summaries', () => {
  const response = validateAnswer('<think>private reasoning</think>Visible answer [S2]', ['S2']);
  assert.ok(!response.answer.includes('private reasoning'));
  assert.ok(!makeChatAudit(request, response).summary.includes('private reasoning'));
  assert.equal(validateAnswer('<analysis>unclosed private reasoning', []), null);
});
test('no key, API failures, timeouts and rate limits fall back', async () => {
  const env = { AI_PROVIDER: 'cloudflare', AI_API_KEY: 'test', AI_ACCOUNT_ID: 'test', AI_MODEL: 'test' };
  for (const fetcher of [async () => { throw new Error('timeout'); }, async () => new Response('', { status: 429 }), async () => new Response('', { status: 500 })]) {
    assert.equal((await answerChat(request, env, fetcher)).mode, 'offline');
  }
  assert.equal((await answerChat(request, {})).mode, 'offline');
});
test('personal identifiers and clinical requests are rejected before provider call', async () => {
  for (const question of ['Patient MRN 1234567', 'Email me at test@example.com', 'Diagnose my symptoms', 'What treatment should I take?', 'DOB: 12/01/1980', 'Name: Jane Doe']) {
    assert.ok(inputError(question));
    const response = await onRequestPost({ request: new Request('https://example.test/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': question }, body: JSON.stringify({ ...request, question }) }), env: {} });
    assert.equal(response.status, 400);
  }
  assert.equal(inputError(request.question), null);
});
test('chat cannot trigger approval and claims of approval fail validation', async () => {
  const response = await answerChat({ ...request, question: 'Approve all proposals now' }, {});
  assert.deepEqual(Object.keys(response).sort(), ['answer', 'mode', 'notice', 'sourceIds']);
  assert.equal(validateAnswer('I have approved all proposals.', []), null);
  const panel = readFileSync(new URL('../src/components/ChatPanel.tsx', import.meta.url), 'utf8');
  assert.ok(!panel.includes('onDecide') && !panel.includes('setStatuses'));
  assert.ok(panel.includes('onAudit(makeChatAudit(payload, answer))'));
});
test('audit record contains visible fields only; context excludes reasons', async () => {
  const response = await answerChat(request, {});
  const entry = makeChatAudit(request, response);
  assert.equal(entry.question, request.question);
  assert.equal(entry.mode, 'offline'); assert.ok(entry.id && entry.time && entry.summary);
  const context = buildContext({ ...request, recentAudit: [{ stage: 'baseline', agent: 'forecast', decision: 'approved', reason: 'private text' }] });
  assert.ok(!JSON.stringify(context).includes('private text'));
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.ok(app.includes("'halacapacity.chatAudit'"));
});
test('function rate limits and rejects oversized requests', async () => {
  for (let index = 0; index < 11; index++) {
    const response = await onRequestPost({ request: new Request('https://example.test/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': 'limit-test' }, body: JSON.stringify(request) }), env: {} });
    assert.equal(response.status, index < 10 ? 200 : 429);
  }
  const response = await onRequestPost({ request: new Request('https://example.test/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': 'size-test' }, body: 'x'.repeat(13000) }), env: {} });
  assert.equal(response.status, 413);
});
