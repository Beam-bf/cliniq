import { POLICY_SOURCES } from '../data/policySources';
import { LIMITS } from './context';
import type { StageId } from '../types';
import type { ScenarioAdjustments } from '../planning/scenarioPlanning';
import { prepareOfflineChat, renderCheckedAnswer } from './checkedTools';
export { inputError, retrieve, buildContext, LIMITS } from './context';

export interface ChatTurn { role: 'user' | 'assistant'; content: string }
export interface ChatAudit {
  id: string; time: string; stage: StageId; question: string;
  sourceIds: string[]; summary: string; mode: 'live' | 'offline';
}
export interface ChatRequest {
  question: string; scenarioId: StageId; history: ChatTurn[];
  recentAudit?: { stage: StageId; agent: string; decision: string }[];
  adjustments?: ScenarioAdjustments;
  currentView?: string;
  previousPolicyQuery?: string;
}
export interface ChatAnswer { answer: string; sourceIds: string[]; mode: 'live' | 'offline'; notice?: string;
  grounding?: { provider: 'anthropic' | 'cloudflare' | 'none'; factIds: string[]; basePlanRevision: string; planRevision: string; simulation: boolean; executionId?: string };
  knowledge?: { retrievalId: string; kbRevision: string; embeddingModel: string; evidence: import('@/policy/knowledgeTypes').PolicyEvidence[]; resolvedQuery?: string } }
export function offlineAnswer(request: ChatRequest, notice = 'Offline deterministic templates; no cloud model used.'): ChatAnswer {
  const prepared = prepareOfflineChat(request);
  return renderCheckedAnswer(prepared, prepared.defaults, 'offline', notice);
}

export function validateAnswer(raw: string, allowedIds: string[]): ChatAnswer | null {
  // Never display or audit provider reasoning blocks, including an unclosed block.
  raw = raw.replace(/<(think|thinking|analysis)\b[^>]*>[\s\S]*?(?:<\/\1>|$)/gi, '').trim();
  if (!raw.trim() || /\bI (?:have |already )?(?:approved|rejected|modified|changed|booked)|\b(?:you should take|diagnosis is|prescribe)\b/i.test(raw)) return null;
  let invalid = false;
  const answer = raw.slice(0, 3000).replace(/\[([^\]\n]{1,40})\]/g, (citation, id: string) => {
    if (allowedIds.includes(id) && POLICY_SOURCES.some(source => source.id === id && source.verified)) return citation;
    invalid = true;
    return '[unsupported citation removed]';
  });
  return {
    answer: `Scenario data and retrieved context:\n${answer}\n\n${LIMITS}`,
    sourceIds: allowedIds.filter(id => answer.includes(`[${id}]`)), mode: 'live',
    ...(invalid ? { notice: 'An unsupported citation was removed. Check the remaining claims against the source cards.' } : {}),
  };
}

export function makeChatAudit(request: ChatRequest, response: ChatAnswer): ChatAudit {
  const trace = response.grounding ? `Checked tools${response.grounding.simulation ? ' (isolated simulation)' : ''}${response.grounding.executionId ? `; execution ${response.grounding.executionId}` : ''}. ` : '';
  const summary = trace + (response.knowledge ? `Vector KB ${response.knowledge.kbRevision}; retrieval ${response.knowledge.retrievalId}. ${response.answer}` : response.answer);
  return { id: crypto.randomUUID(), time: new Date().toISOString(), stage: request.scenarioId,
    question: request.question, sourceIds: response.sourceIds, summary: summary.slice(0, 350), mode: response.mode };
}
