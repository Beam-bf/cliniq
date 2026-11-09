import { POLICY_SOURCES } from '@/data/policySources';
import { searchPolicySources } from '@/policy/policyMatching';
import { runAllAgents } from '@/agents';
import { coordinateStage } from '@/agents/coordinator';
import type { StageId } from '@/types';
import { applyAdjustments, summarizeStage } from '@/planning/scenarioPlanning';
import type { ScenarioAdjustments } from '@/planning/scenarioPlanning';
import type { TeamRole } from '@/teams/types';

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
  teamId?: string;
  submissionId?: string;
  teamRole?: TeamRole;
}
export interface ChatAnswer { answer: string; sourceIds: string[]; mode: 'live' | 'offline'; notice?: string }
export const LIMITS = 'Limits / uncertainty: fictional scenario data; fixed rules and short policy extracts only. No medical advice or action taken.';

// Conservative screening, not a comprehensive personal-data detector.
export function inputError(question: unknown): string | null {
  if (typeof question !== 'string' || !question.trim() || question.length > 600)
    return 'Enter a planning question of 1–600 characters.';
  if (/\b(patient|mrn|emirates\s*id|passport|date of birth|dob|diagnos\w*|treat\w*|prescri\w*|symptoms?|dosage)\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d\s()-]{6,}\d|\b(?:my|his|her) name is\b|\b(?:name|address|phone)\s*:/i.test(question))
    return 'Use fictional aggregate planning questions only. Do not enter personal identifiers or ask for diagnosis or treatment.';
  return null;
}

export function retrieve(question: string) {
  const terms = [...new Set(question.toLowerCase().match(/[a-z-]{3,}/g) ?? [])]
    .filter(term => !['what', 'which', 'does', 'this', 'that', 'with', 'from', 'have', 'about', 'the', 'and', 'are'].includes(term));
  return POLICY_SOURCES.filter(source => source.verified && source.passage)
    .map(source => ({ source, score: terms.filter(term => searchPolicySources(term).some(item => item.id === source.id)).length }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score)
    .slice(0, 5).map(item => item.source);
}

export function buildContext(request: ChatRequest) {
  const stage = applyAdjustments(request.scenarioId, request.adjustments ?? {});
  if (!stage) throw new Error('Unknown scenario');
  const report = coordinateStage(stage, runAllAgents(stage));
  return {
    label: 'FICTIONAL scenario data', stage,
    currentView: ['overview', 'planner', 'decisions', 'evidence', 'history', 'team', 'help', 'account'].includes(request.currentView ?? '') ? request.currentView : 'overview',
    workspace: { kind: request.teamId ? 'team' : 'personal', teamId: request.teamId,
      role: ['admin','planner','reviewer'].includes(request.teamRole ?? '') ? request.teamRole : undefined,
      submissionId: request.submissionId, note: 'Recorded decisions are reviews of saved submissions, never actions on real schedules.' },
    summary: summarizeStage(stage),
    whatIfChanges: request.adjustments ?? {},
    agents: report.proposals, conflicts: report.conflicts, gaps: report.gaps,
    // Browser decisions are untrusted context; never send free-text reasons.
    recentAudit: (request.recentAudit ?? []).slice(0, 5).filter(entry =>
      entry && ['baseline', 'winter-surge', 'specialist-leave'].includes(entry.stage) &&
      ['forecast', 'routing', 'task-shifting', 'tele-pooling'].includes(entry.agent) &&
      ['approved', 'rejected', 'changes_requested'].includes(entry.decision))
      .map(({ stage, agent, decision }) => ({ stage, agent, decision })),
    passages: retrieve(request.question).map(({ id, title, passage, locator }) => ({ id, title, passage, locator })),
  };
}

export function offlineAnswer(request: ChatRequest, notice = 'Live service unavailable.'): ChatAnswer {
  const context = buildContext(request);
  const question = request.question.toLowerCase();
  const agents = context.agents.filter(agent => question.includes(agent.agent) ||
    (agent.agent === 'forecast' && /wait|risk|pressure/.test(question)) ||
    (agent.agent === 'task-shifting' && /delegat|routine/.test(question)));
  let text = `Scenario data — ${context.stage.label}: ${context.stage.description}`;
  if (/^(hi|hello|hey|help)[!?.\s]*$/.test(question.trim())) text = `Hello, I'm Hala. I can explain ${context.stage.label.replace(/^Stage \d /, '')} and its rule-based findings. Try “What does the forecast show?” or open Planner to adjust fictional clinic figures.`;
  else if (/approve|reject|request changes|sign in|log in/.test(question)) text = 'I cannot take actions. Open Decisions to review a proposal and enter a reason, or Account to sign in. Approval records a decision only; schedules are unchanged.';
  else if (/conflict|gap|coordinat/.test(question)) text += '\n' + ([...context.conflicts, ...context.gaps].slice(0, 3).join('\n') || 'No coordinator conflicts or evidence gaps were flagged for this scenario.');
  else if (agents.length) text += '\n' + agents.map(agent => `${agent.agent}: ${agent.summary}\n${agent.evidence.slice(0, 2).join('\n')}`).join('\n');
  else if (/hours|referrals|overview|summary/.test(question)) text += `\n${context.summary.freeHours} free specialist hours/week; ${context.summary.referrals} referrals/week; average current wait ${context.summary.averageWait.toFixed(1)} weeks. Open Planner to inspect or edit one clinic and specialty.`;
  else text += '\nThe requested explanation is not available in the offline templates. Ask about forecast, routing, task-shifting, tele-pooling or conflicts.';
  const passages = context.passages.slice(0, 3);
  text = text.slice(0, 2200);
  if (passages.length) text += '\nRelated extracts (keyword matches, not proof of applicability):\n' + passages.map(source => `[${source.id}] ${source.passage}`).join('\n');
  else text += '\nNo verified policy passage matched this question.';
  return { answer: `${text}\n\n${LIMITS}`, sourceIds: passages.map(source => source.id), mode: 'offline', notice };
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
  return { id: crypto.randomUUID(), time: new Date().toISOString(), stage: request.scenarioId,
    question: request.question, sourceIds: response.sourceIds, summary: response.answer.slice(0, 350), mode: response.mode };
}
