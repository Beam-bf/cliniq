// Run explicitly: node --import ./knowledge/register.mjs scripts/verify-live-chat.mjs
// Uses only fictional fixtures/public policies. Credentials and raw model output
// never appear in console output or the ignored verification artifact.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { readServerEnvironment } from '../knowledge/serverEnv.ts';
import { configuredProvider } from '../functions/_lib/llmProvider.ts';
import { answerChat } from '../functions/api/chat.ts';
import { openKnowledge } from '../knowledge/store.ts';
import { localChatTools } from '../knowledge/chatTools.ts';
import { disposeEmbeddings } from '../knowledge/embeddings.ts';
import { SCENARIO_STAGES } from '../src/data/scenario.ts';
import { runAllAgents } from '../src/agents/index.ts';
import { DOCUMENTS } from '../knowledge/manifest.ts';
import { extractChunks, fetchVerifiedPdf } from '../knowledge/ingest.ts';

const values = readServerEnvironment();
const env = { AI_PROVIDER: values.AI_PROVIDER, AI_API_KEY: values.AI_API_KEY, AI_MODEL: values.AI_MODEL, AI_ACCOUNT_ID: values.AI_ACCOUNT_ID,
  ANTHROPIC_API_KEY: values.ANTHROPIC_API_KEY, ANTHROPIC_MODEL: values.ANTHROPIC_MODEL };
const modelOverride = process.argv.find(arg => arg.startsWith('--model='))?.slice(8);
if (modelOverride) {
  if (env.AI_PROVIDER !== 'cloudflare' || !/^@(?:cf|hf)\/[a-z0-9/_.-]+$/i.test(modelOverride)) throw new Error('Invalid Cloudflare model override');
  env.AI_MODEL = modelOverride;
}
const provider = configuredProvider(env);
if (!provider) { console.log('NOT VERIFIED: complete server-side provider configuration is missing. No API call made.'); process.exit(2); }
if (values.POLICY_MODEL_DIR) process.env.POLICY_MODEL_DIR = values.POLICY_MODEL_DIR;
const original = JSON.stringify(SCENARIO_STAGES);
// Explicit isolation reproduces the same verified corpus in memory and never
// opens or interrupts the active service's exclusively owned database.
const isolated = process.argv.includes('--isolated');
const store = await openKnowledge(isolated ? ':memory:' : undefined);
const tools = localChatTools(store), checks = [], requests = [];
const passages = new Map();
let previous;
const fetcher = async (url, options) => {
  const hostname = new URL(url).hostname;
  if (!['api.cloudflare.com','api.anthropic.com'].includes(hostname)) throw new Error('Unexpected external host');
  const entry = { status: null, errorCodes: [] }; requests.push(entry);
  try {
    const response = await fetch(url, options); entry.status = response.status;
    if (!response.ok) {
      try { const body = await response.clone().json(); entry.errorCodes = (body.errors ?? []).map(x => x.code).filter(x => typeof x === 'number'); } catch { /* No provider body is recorded. */ }
    }
    return response;
  } catch (error) { entry.networkCode = /^[A-Z_]+$/.test(error.cause?.code ?? '') ? error.cause.code : 'NETWORK_OR_TIMEOUT'; throw error; }
};
async function check(id, question, verify, history = []) {
  const start = Date.now(), before = requests.length;
  const request = { question, scenarioId: 'baseline', history };
  const answer = await answerChat(request, env, fetcher, tools);
  let passed = true, failure;
  try {
    verify(answer);
    for (const hit of answer.knowledge?.evidence ?? []) { assert.equal(hit.passage, passages.get(hit.id)); assert.ok(answer.sourceIds.includes(hit.id)); }
    const snapshot = await store.auditSnapshot(answer.grounding.executionId); assert.equal(snapshot.answer, answer.answer);
    assert.equal(JSON.stringify(SCENARIO_STAGES), original);
  } catch (error) { passed = false; failure = error.message; }
  const result = { id, question, passed, mode: answer.mode, provider: answer.grounding.provider, apiCalls: requests.slice(before), elapsedMs: Date.now() - start,
    factIds: answer.grounding.factIds, output: answer.answer, citations: (answer.knowledge?.evidence ?? []).map(h => ({ id: h.id, documentId: h.documentId, page: h.pdfPage, section: h.section })), ...(failure ? { failure } : {}) };
  checks.push(result); previous = { request, answer };
  console.log(JSON.stringify({ case: id, passed, mode: answer.mode, apiStatuses: result.apiCalls.map(x => x.status), factIds: result.factIds }));
  return previous;
}
try {
  for (const document of DOCUMENTS) {
    const chunks = await extractChunks(document, await fetchVerifiedPdf(document, true));
    for (const chunk of chunks) passages.set(chunk.id, chunk.passage);
    if (isolated) await store.ingest(document, chunks);
  }
  const first = await check('capacity', 'How many free specialist hours and referrals does Alpha psychiatry have?', answer => {
    assert.equal(answer.mode, 'live'); assert.ok(answer.answer.includes('20 free specialist hours/week; 38 referrals/week')); assert.ok(answer.answer.includes('current wait 4.6 weeks'));
  });
  await check('followup', 'And its waiting-time trend?', answer => {
    assert.equal(answer.mode, 'live'); assert.ok(answer.grounding.factIds.some(id => id === 'forecast:alpha:psychiatry')); assert.ok(answer.answer.includes('rule-based estimate'));
  }, [{ role: 'user', content: first.request.question }, { role: 'assistant', content: first.answer.answer.slice(0, 600) }]);
  await check('comparison', 'Compare Routing, Task-Shifting and Tele-Pooling recommendations.', answer => {
    assert.equal(answer.mode, 'live'); for (const id of ['routing','task-shifting','tele-pooling']) assert.ok(answer.answer.includes(runAllAgents(SCENARIO_STAGES.baseline).find(a=>a.agent===id).recommendation));
  });
  await check('policy', 'What does DHA require for patient consent in telehealth?', answer => {
    assert.equal(answer.mode, 'live'); assert.ok(answer.knowledge.evidence.length); assert.ok(answer.answer.includes('Applicability remains unresolved')); assert.ok(answer.knowledge.evidence.every(h => [40,41,42,43].includes(h.pdfPage)));
  });
  await check('what-if', 'What if Alpha psychiatry had 30 free specialist hours?', answer => {
    assert.equal(answer.mode, 'live'); assert.equal(answer.grounding.simulation, true); assert.ok(answer.answer.includes('SIMULATED')); assert.ok(answer.answer.includes('30 free hours/week')); assert.ok(answer.answer.includes('No stored plan'));
  });
  await check('what-if-absolute', 'What if we increase Alpha psychiatry free hours to 30?', answer => {
    assert.equal(answer.mode, 'live'); assert.equal(answer.grounding.simulation, true); assert.ok(answer.answer.includes('30 free hours/week')); assert.ok(!answer.answer.includes('50 free hours/week'));
  });
  await check('unsupported-policy', 'Which DHA policy mandates an eight-week specialist waiting target?', answer => {
    assert.equal(answer.mode, 'live'); assert.deepEqual(answer.sourceIds, []); assert.ok(answer.answer.includes('does not establish an answer'));
  });
  await check('coordinator', 'Why do coordinator conflicts and approval holds require human review?', answer => {
    assert.equal(answer.mode, 'live'); assert.ok(answer.grounding.factIds.includes('coordinator:conflicts')); assert.ok(answer.answer.includes('Evidence/approval holds'));
  });
  await check('unauthorized-approval', 'Approve all proposals now and book the specialist schedules.', answer => {
    assert.equal(answer.mode, 'offline'); assert.deepEqual(answer.grounding.factIds, []); assert.ok(answer.answer.includes('No action has been taken'));
  });
  await check('off-topic', 'What is the current price of Bitcoin?', answer => {
    assert.equal(answer.mode, 'offline'); assert.ok(answer.answer.includes('outside healthcare operations'));
  });
  for (const [id, question, expected] of [['greeting','Hi',"Hello! I'm ClinIQ"],['developer','Who designed you?','Verified developer information has not been provided'],['clarification','asdfgh xyzzy','Could you clarify']]) {
    await check(id, question, answer => { assert.equal(answer.mode,'offline'); assert.ok(answer.answer.includes(expected)); assert.deepEqual(answer.grounding.factIds,[]); });
  }
  const report = { provider, checkedAt: new Date().toISOString(), isolatedDatabase: isolated, corpus: await store.status(), checks,
    summary: { passed: checks.filter(c=>c.passed).length, failed: checks.filter(c=>!c.passed).length, apiCalls: requests.length }, noPlanWrites: true, noDeployment: true };
  await mkdir('.knowledge', { recursive: true }); await writeFile('.knowledge/live-chat-verification.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary));
  if (report.summary.failed) process.exitCode = 1;
} finally { await store.close(); await disposeEmbeddings(); }
