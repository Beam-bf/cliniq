import type { AgentId, StageId } from '@/types';

export type LegalClassification = 'regulatory-standard' | 'regulatory-policy' | 'planning-guidance' | 'government-strategy' | 'research';
export interface PolicyEvidence {
  id: string; documentId: string; title: string; publisher: string; url: string;
  jurisdiction: string; classification: LegalClassification; version: string;
  verifiedOn: string; effectiveOn: string | null; sourceSha256: string;
  pdfPage: number; printedPage: string; section: string;
  passage: string; startOffset: number; endOffset: number; score: number;
  sourceNote?: string;
}
export interface PolicyFinding {
  agent: AgentId; status: 'human-review' | 'conflict' | 'unsupported' | 'unavailable';
  summary: string; flags: string[]; evidence: PolicyEvidence[];
  retrievalQuery: string; automaticAuthorization: false;
}
export interface PolicyAssessment {
  id: string; evaluatedAt: string; asOf: string; stageId: StageId; planRevision: string;
  kbRevision: string; embeddingModel: string; engine: 'pgvector' | 'unavailable';
  findings: PolicyFinding[];
}
export function unavailablePolicyFinding(agent: AgentId): PolicyFinding {
  return { agent, status: 'unavailable', summary: 'No current Policy Agent assessment is attached; policy support has not been established.',
    flags: ['Human policy review is required. Check the current Policy Agent evidence in Decisions. Existing catalogue extracts are contextual evidence, not authorization.'],
    evidence: [], retrievalQuery: '', automaticAuthorization: false };
}
