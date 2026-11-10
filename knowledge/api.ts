import { assessPolicy } from './policyAgent.ts';
import type { KnowledgeStore } from './store.ts';
import { planRevision, validateAdjustments } from '../src/planning/scenarioPlanning.ts';
import type { StageId } from '../src/types.ts';
import { resolvePolicyQuestion } from '../src/policy/coverage.ts';
import { containsPolicyInstructions } from '../src/policy/retrievalClient.ts';

function validatePublicQuestion(query: unknown): asserts query is string {
  if (typeof query !== 'string' || !query.trim() || query.length > 600) throw new Error('Enter a policy question of 1–600 characters');
  if (/\b(mrn|passport|emirates\s*id|dob)\b|\b(?:my|our|this) patient\b|\bpatient\s*(?:name|id|number)\b|\bpatient\s*:|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(name|phone|address)\s*:/i.test(query)) throw new Error('Use public policy questions without personal identifiers');
}

export async function policyRequest(store: KnowledgeStore, input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('JSON object required');
  const body = input as Record<string, unknown>;
  if (body.action === 'search') {
    validatePublicQuestion(body.query);
    if (body.previousQuery !== undefined) validatePublicQuestion(body.previousQuery);
    const status = await store.status();
    const { resolvedQuery, topic } = resolvePolicyQuestion(body.query, body.previousQuery as string | undefined);
    const candidates = await store.search(topic ? `${topic.query}; ${resolvedQuery}`.slice(0, 600) : resolvedQuery,
      topic ? { documentIds: topic.documents, pdfPages: topic.pages, limit: 5 } : { limit: 5 });
    const evidence = topic ? candidates.filter(hit => topic.anchor.test(hit.passage) && !containsPolicyInstructions([hit.passage, hit.title, hit.section, hit.sourceNote].join(' '))) : [];
    const coverage = { status: evidence.length ? 'applicability-unresolved' : 'insufficient-evidence', topic: topic?.label ?? null,
      reason: evidence.length ? 'Related passages were retrieved within a reviewed topic. They do not establish applicability, individual permissions or compliance. Human review is required.'
        : 'The reviewed corpus does not establish an answer to this question. Similarity alone is not support. Human review is required.' };
    const result = { engine: 'pgvector', kbRevision: status.kbRevision, embeddingModel: status.model,
      query: body.query, resolvedQuery, coverage, evidence, humanReviewRequired: true };
    return { ...result, retrievalId: await store.recordAudit('search', { ...result, retrievedCandidates: candidates }) };
  }
  if (body.action === 'assess') {
    if (!['baseline', 'winter-surge', 'specialist-leave'].includes(String(body.stageId))) throw new Error('Invalid healthcare scenario');
    const stageId = body.stageId as StageId;
    let adjustments;
    try { adjustments = validateAdjustments(stageId, body.adjustments ?? {}); }
    catch { throw new Error('Invalid what-if values'); }
    // Ignore client-supplied evidence, scores, credential checks and decisions.
    // Actual professional/facility prerequisites remain unknown and require review.
    const assessment = await assessPolicy(store, stageId, planRevision(adjustments));
    await store.recordAudit('assessment', assessment, assessment.id);
    return { assessment };
  }
  throw new Error('Unknown policy action');
}
