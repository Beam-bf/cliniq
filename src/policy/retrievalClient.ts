import type { ChatAnswer } from '@/chat/core';
import type { PolicyEvidence } from './knowledgeTypes';
import { policyEvidenceMatches } from './coverage';

export function containsPolicyInstructions(text: string) {
  return /ignore.{0,60}(?:previous|system|assistant|instruction)|(?:system|assistant|developer)\s*(?:message|prompt|role)\s*:|reveal.{0,40}(?:secret|api.?key|system prompt)|(?:override|bypass).{0,40}(?:safety|instruction|system|guardrail)|<\/?(?:system|assistant|developer)>/i.test(text);
}

export function validateEvidence(input: unknown): input is PolicyEvidence[] {
  if (!Array.isArray(input) || input.length > 8) return false;
  return input.every(hit => {
    if (!hit || typeof hit !== 'object') return false;
    let url: URL;
    try { url = new URL(hit.url); } catch { return false; }
    return url.protocol === 'https:' && ['dha.gov.ae', 'www.dha.gov.ae', 'ai.gov.ae'].includes(url.hostname) &&
      ['regulatory-standard', 'regulatory-policy', 'planning-guidance', 'government-strategy', 'research'].includes(hit.classification) &&
      typeof hit.id === 'string' && hit.id.startsWith(`${hit.documentId}:`) &&
      typeof hit.passage === 'string' && hit.passage.length > 0 && hit.passage.length <= 1400 &&
      !containsPolicyInstructions([hit.passage, hit.title, hit.section, hit.sourceNote].join(' ')) &&
      Number.isInteger(hit.pdfPage) && hit.pdfPage > 0 && typeof hit.section === 'string' &&
      Number.isInteger(hit.startOffset) && Number.isInteger(hit.endOffset) && hit.startOffset >= 0 && hit.endOffset - hit.startOffset === hit.passage.length &&
      typeof hit.title === 'string' && typeof hit.publisher === 'string' && typeof hit.version === 'string' && typeof hit.jurisdiction === 'string' &&
      typeof hit.printedPage === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(hit.verifiedOn) && /^[a-f0-9]{64}$/.test(hit.sourceSha256) &&
      (hit.sourceNote === undefined || (typeof hit.sourceNote === 'string' && hit.sourceNote.length <= 1200)) &&
      Number.isFinite(hit.score) && hit.score >= 0.4 && hit.score <= 1.001;
  });
}

export async function searchPolicyKnowledge(question: string, previousQuery?: string): Promise<ChatAnswer> {
  const response = await fetch('/api/policy', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'search', query: question, previousQuery }), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new TypeError('Policy knowledge service unavailable');
  const body = await response.json();
  if (body.engine !== 'pgvector' || !/^[a-f0-9]{64}$/.test(body.kbRevision) || !validateEvidence(body.evidence) || !policyEvidenceMatches(question, previousQuery, body.evidence) || typeof body.retrievalId !== 'string' ||
      !['applicability-unresolved', 'insufficient-evidence'].includes(body.coverage?.status) || typeof body.coverage?.reason !== 'string' || typeof body.resolvedQuery !== 'string' ||
      (body.coverage.status === 'insufficient-evidence' && body.evidence.length)) throw new TypeError('Invalid policy retrieval response');
  return { mode: 'offline', sourceIds: body.evidence.map((hit: PolicyEvidence) => hit.id),
    answer: body.evidence.length
      ? `I retrieved ${body.evidence.length} candidate passages about ${body.coverage.topic}. Applicability remains unresolved. These passages do not establish permission for a particular clinic or staffing action. Review the exact clauses below and check applicable exceptions.`
      : 'No relevant verified policy evidence was found in the reviewed corpus. It does not establish an answer to this question; missing evidence does not prove the claim is false. I cannot establish policy support.',
    notice: `Local neural embeddings and real pgvector search; no generative model used. Retrieval record ${body.retrievalId}. Human review required.`,
    knowledge: { retrievalId: body.retrievalId, kbRevision: body.kbRevision, embeddingModel: body.embeddingModel, evidence: body.evidence, resolvedQuery: body.resolvedQuery } };
}
