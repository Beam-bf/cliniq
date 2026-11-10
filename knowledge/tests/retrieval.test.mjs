import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DOCUMENTS } from '../manifest.ts';
import { openKnowledge } from '../store.ts';
import { extractChunks, fetchVerifiedPdf, chunkExact } from '../ingest.ts';
import { disposeEmbeddings } from '../embeddings.ts';
import { assessPolicy, verifyCitations } from '../policyAgent.ts';
import { policyRequest } from '../api.ts';
import { coordinateStage } from '../../src/agents/coordinator.ts';
import { runAllAgents } from '../../src/agents/index.ts';
import { SCENARIO_STAGES } from '../../src/data/scenario.ts';
import { validateEvidence } from '../../src/policy/retrievalClient.ts';
import { onRequestPost } from '../../functions/api/policy.ts';

let store;
const chunksByDocument = new Map();
before(async () => {
  store = await openKnowledge(':memory:');
  for (const document of DOCUMENTS) {
    const chunks = await extractChunks(document, await fetchVerifiedPdf(document, true));
    chunksByDocument.set(document.id, chunks);
    await store.ingest(document, chunks);
  }
}, { timeout: 120000 });
after(async () => { if (store) await store.close(); await disposeEmbeddings(); });

test('real PostgreSQL pgvector stores 384-dimensional neural vectors and idempotent verified documents', async () => {
  const status = await store.status();
  assert.equal(status.engine, 'pgvector');
  assert.equal(status.dimensions, 384);
  assert.equal(status.extensionVersion, '0.8.7');
  assert.equal(status.documents.length, 4);
  assert.equal(status.chunkCount, 44);
  const repeat = await store.ingest(DOCUMENTS[0], chunksByDocument.get(DOCUMENTS[0].id));
  assert.equal(repeat.unchanged, true);
  assert.equal((await store.status()).chunkCount, 44);
  assert.equal((await store.status()).kbRevision, status.kbRevision);
});

test('semantic retrieval returns attributable regulatory, planning and strategy passages', async () => {
  const cases = [
    ['telehealth nurses direction clinical supervision treating physician', 'DHA-TELEHEALTH-4', 37],
    ['clinical privileges scope of practice professional license specialty', 'DHA-PRIVILEGING-2', undefined],
    ['non acute long term care beds undersupply', 'DHA-CAPACITY-2022-2033', 54],
    ['national artificial intelligence governance regulation cybersecurity', 'UAE-AI-2031', 22],
  ];
  for (const [query, id, page] of cases) {
    const results = await store.search(query);
    assert.ok(results.length, query);
    assert.equal(results[0].documentId, id, query);
    if (page) assert.equal(results[0].pdfPage, page);
    assert.ok(validateEvidence(results));
    for (const hit of results) {
      const original = chunksByDocument.get(hit.documentId).find(chunk => chunk.id === hit.id);
      assert.equal(hit.passage, original.passage);
      assert.equal(hit.endOffset - hit.startOffset, hit.passage.length);
      assert.ok(hit.publisher && hit.version && hit.verifiedOn && hit.sourceSha256);
    }
  }
});

test('unsupported questions abstain and unpublished or inapplicable editions are excluded', async () => {
  assert.deepEqual(await store.search('What is the orbital period of Neptune?'), []);
  assert.deepEqual(await store.search('How do I repair a motorcycle carburetor?'), []);
  assert.deepEqual(await store.search('telehealth licensed physician', { asOf: '2025-01-01' }), []);
  assert.deepEqual(await store.search('telehealth licensed physician', { documentIds: ['NOT-INGESTED'] }), []);
  const strategy = await store.search('governance regulation artificial intelligence', { classification: 'government-strategy' });
  assert.ok(strategy.length && strategy.every(hit => hit.classification === 'government-strategy'));
});

test('inaccurate citations, altered quotations and invalid provenance are rejected', async () => {
  const evidence = await store.search('telehealth clinical supervision');
  const hit = evidence[0];
  assert.ok(verifyCitations(evidence, [{ id: hit.id, quote: hit.passage.slice(0, 60) }]));
  assert.equal(verifyCitations(evidence, [{ id: 'fabricated-id', quote: hit.passage.slice(0, 60) }]), false);
  assert.equal(verifyCitations(evidence, [{ id: hit.id, quote: 'The law permits unlicensed nurses to practice independently.' }]), false);
  assert.equal(validateEvidence([{ ...hit, sourceSha256: '' }]), false);
  assert.equal(validateEvidence([{ ...hit, url: 'https://example.test/fake.pdf' }]), false);
  assert.equal(validateEvidence([{ ...hit, endOffset: hit.endOffset + 1 }]), false);
  assert.equal(validateEvidence([{ ...hit, id: 'invented:123' }]), false);
});

test('conflicting recommendations reach Coordinator while original healthcare calculations remain unchanged', async () => {
  const stage = SCENARIO_STAGES.baseline;
  const original = runAllAgents(stage);
  const conflict = await assessPolicy(store, 'baseline', 'original', { licensed: false, privileged: false, physicianLed: false, supervision: false, patientConsent: false, referralMode: 'electronic' });
  assert.equal(conflict.findings.find(f => f.agent === 'tele-pooling').status, 'conflict');
  assert.equal(conflict.findings.find(f => f.agent === 'task-shifting').status, 'conflict');
  assert.equal(conflict.findings.find(f => f.agent === 'routing').status, 'conflict');
  const coordinated = coordinateStage(stage, original, conflict);
  assert.ok(coordinated.conflicts.some(text => text.includes('policy prerequisite')));
  assert.deepEqual(runAllAgents(stage), original);
  for (const proposal of coordinated.proposals) {
    assert.equal(proposal.policyReview.automaticAuthorization, false);
    const source = original.find(result => result.agent === proposal.agent);
    assert.deepEqual(proposal.transfers, source.transfers);
    assert.equal(proposal.recommendation, source.recommendation);
  }
  const inPerson = await assessPolicy(store, 'baseline', 'original', { patientConsent: false, referralMode: 'in-person' });
  assert.notEqual(inPerson.findings.find(f => f.agent === 'routing').status, 'conflict', 'Electronic referral rule cannot automatically apply to in-person routing');
});

test('true or client-forged prerequisite claims never automatically authorize clinical activity', async () => {
  const reviewed = await assessPolicy(store, 'baseline', 'original', { licensed: true, privileged: true, physicianLed: true, supervision: true, patientConsent: true });
  assert.ok(reviewed.findings.every(f => f.status === 'human-review' && f.automaticAuthorization === false));
  const result = await policyRequest(store, { action: 'assess', stageId: 'baseline', adjustments: {}, checks: { licensed: true }, evidence: [{ id: 'forged' }], automaticAuthorization: true });
  assert.ok(result.assessment.findings.find(f => f.agent === 'tele-pooling').flags.some(flag => flag.includes('licence has not been established')));
  const unavailable = coordinateStage(SCENARIO_STAGES['winter-surge'], runAllAgents(SCENARIO_STAGES['winter-surge']), reviewed);
  assert.ok(unavailable.proposals.every(p => p.policyReview.status === 'unavailable'), 'Stale scenario evidence must not be reused');
});

test('source checksum changes fail ingestion and exact chunk offsets/overlap retain the source text', async () => {
  const original = await fetchVerifiedPdf(DOCUMENTS[0], true);
  const changed = new Uint8Array(original); changed[200] ^= 1;
  await assert.rejects(() => extractChunks(DOCUMENTS[0], changed), /hash mismatch/);
  const text = 'alpha\n beta  gamma\n delta epsilon zeta eta theta';
  const chunks = chunkExact(text, 0, 4, 1);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => text.slice(chunk.startOffset, chunk.endOffset) === chunk.passage));
  assert.ok(chunks[0].passage.endsWith('delta') && chunks[1].passage.startsWith('delta'));
  assert.throws(() => chunkExact(text, 0, 4, 4));
});

test('query audit records identify real vector results and malformed requests cannot mutate the corpus', async () => {
  const before = await store.status();
  const result = await policyRequest(store, { action: 'search', query: 'DHA telehealth clinical privileges' });
  assert.equal(result.engine, 'pgvector');
  assert.ok(result.evidence.length && result.retrievalId && result.kbRevision);
  const recorded = await store.auditSnapshot(result.retrievalId);
  assert.deepEqual(recorded.evidence, result.evidence);
  assert.equal(recorded.kbRevision, result.kbRevision);
  for (const input of [{ action: 'erase' }, { action: 'search', query: '' }, { action: 'search', query: 'MRN: 12345' }, { action: 'search', query: 'Patient: fictional example' }, { action: 'assess', stageId: 'other' }, { action: 'assess', stageId: 'baseline', adjustments: { fake: {} } }]) {
    await assert.rejects(() => policyRequest(store, input));
  }
  assert.equal((await store.status()).kbRevision, before.kbRevision);
  assert.equal((await store.status()).chunkCount, before.chunkCount);
});

test('Pages proxy keeps service credentials server-side and rejects origin/configuration/body failures', async () => {
  const request = () => new Request('https://capacity.test/api/policy', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer user-token' }, body: JSON.stringify({ action: 'search', query: 'telehealth scope', accountToken: 'must-not-forward' }) });
  assert.equal((await onRequestPost({ request: request(), env: {} })).status, 503);
  const env = { POLICY_SERVICE_URL: 'https://policy.test', POLICY_SERVICE_TOKEN: 'server-test-token' };
  let called = false;
  const response = await onRequestPost({ request: request(), env }, async (url, options) => {
    called = true; assert.equal(String(url), 'https://policy.test/api/policy');
    assert.equal(options.headers.Authorization, 'Bearer server-test-token');
    assert.ok(!options.body.includes('must-not-forward') && !options.body.includes('user-token'));
    return Response.json({ engine: 'pgvector', evidence: [] });
  });
  assert.equal(response.status, 200); assert.ok(called);
  const cross = new Request('https://capacity.test/api/policy', { method: 'POST', headers: { Origin: 'https://evil.test' } });
  assert.equal((await onRequestPost({ request: cross, env })).status, 403);
  assert.equal((await onRequestPost({ request: request(), env: { ...env, POLICY_SERVICE_URL: 'http://policy.test' } })).status, 503);
});

test('expanded consent, retention, staffing and rotation questions return exact passages in reviewed sections', async () => {
  for (const [query,pages] of [
    ['What are DHA telehealth patient consent requirements?', [40,41,42,43]],
    ['How long must DHA telehealth records be retained?', [46]],
    ['What does DHA say about staffing face-to-face services during telehealth?', [33]],
    ['Which DHA framework covers cross-facility staff rotation?', [5,24]],
  ]) {
    const result=await policyRequest(store,{action:'search',query});
    assert.equal(result.coverage.status,'applicability-unresolved');assert.ok(result.evidence.length,query);
    assert.ok(result.evidence.every(hit=>pages.includes(hit.pdfPage)));
    for(const hit of result.evidence)assert.equal(hit.passage,chunksByDocument.get(hit.documentId).find(c=>c.id===hit.id).passage);
    assert.ok(validateEvidence(result.evidence));
  }
});

test('in-domain unsupported questions abstain despite vector similarity, including misleading follow-ups', async () => {
  for(const query of ['Which DHA policy mandates an eight-week specialist waiting target?','Which DHA regulation permits independent prescribing?','Which law permits cross-border health data transfers?','What are the actual 2033 bed gaps?','How do I repair a motorcycle carburetor?']){
    const result=await policyRequest(store,{action:'search',query,previousQuery:'What are DHA telehealth consent requirements?'});
    assert.equal(result.coverage.status,'insufficient-evidence',query);assert.deepEqual(result.evidence,[]);
  }
  const result=await policyRequest(store,{action:'search',query:'Does that mandate an eight-week waiting target?',previousQuery:'Which DHA licensing requirements apply?'});
  assert.deepEqual(result.evidence,[]);assert.equal(result.resolvedQuery,'Does that mandate an eight-week waiting target?');
});

test('policy follow-ups retain source context while explicit topic changes retrieve new evidence', async () => {
  const previousQuery='What are DHA telehealth consent requirements?';
  const initial=await policyRequest(store,{action:'search',query:previousQuery});
  const followup=await policyRequest(store,{action:'search',query:'Which page is that on?',previousQuery});
  assert.equal(followup.resolvedQuery,previousQuery);assert.deepEqual(followup.evidence.map(h=>h.id),initial.evidence.map(h=>h.id));
  const next=await policyRequest(store,{action:'search',query:'What about record retention?',previousQuery});
  assert.ok(next.evidence.length&&next.evidence.every(h=>h.pdfPage===46));
  await assert.rejects(()=>policyRequest(store,{action:'search',query:'Which page is that on?',previousQuery:'MRN: 12345'}),/identifiers/);
});

test('an unrelated regulatory passage cannot establish a missing prerequisite or authorize work', async () => {
  const unrelated=await store.search('telehealth applicability exclusions',{documentIds:['DHA-TELEHEALTH-4'],pdfPages:[21]});
  assert.ok(unrelated.length);
  const assessment=await assessPolicy({status:()=>store.status(),search:async()=>unrelated},'baseline','original',{patientConsent:false,referralMode:'electronic'});
  const routing=assessment.findings.find(f=>f.agent==='routing');assert.notEqual(routing.status,'conflict');
  assert.ok(routing.flags.some(f=>f.includes("No retrieved clause establishes the 'patientConsent'")));
  assert.ok(assessment.findings.every(f=>f.automaticAuthorization===false));
  const actual=await policyRequest(store,{action:'assess',stageId:'baseline',adjustments:{}});
  assert.ok(actual.assessment.findings.every(f=>f.summary.includes('Applicability unresolved')));
});
