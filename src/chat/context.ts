import { POLICY_SOURCES } from '@/data/policySources';
import { searchPolicySources } from '@/policy/policyMatching';
import { runAllAgents } from '@/agents';
import { coordinateStage } from '@/agents/coordinator';
import { applyAdjustments, summarizeStage } from '@/planning/scenarioPlanning';
import type { PolicyAssessment } from '@/policy/knowledgeTypes';

import type { ChatRequest } from './core';

export const LIMITS = 'Limits / uncertainty: fictional scenario data; fixed rules and short policy extracts only. No medical advice or action taken.';

// Conservative screening, not a comprehensive personal-data detector.
export function inputError(question: unknown): string | null {
  if (typeof question !== 'string' || !question.trim() || question.length > 600)
    return 'Enter a planning question of 1 to 600 characters.';
  if (/\b(mrn|emirates\s*id|passport|date of birth|dob|diagnos\w*|treat\w*|prescri\w*|symptoms?|dosage)\b|\b(?:my|our|this) patient\b|\bpatient\s*(?:name|id|number)\b|\bpatient\s*:|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d\s()-]{6,}\d|\b(?:my|his|her) name is\b|\b(?:name|address|phone)\s*:/i.test(question))
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

export function buildContext(request: ChatRequest, policy?: PolicyAssessment) {
  const stage = applyAdjustments(request.scenarioId, request.adjustments ?? {});
  if (!stage) throw new Error('Unknown scenario');
  const report = coordinateStage(stage, runAllAgents(stage), policy);
  return {
    label: 'FICTIONAL scenario data', stage,
    currentView: ['overview', 'planner', 'decisions', 'evidence', 'history', 'help', 'account'].includes(request.currentView ?? '') ? request.currentView : 'overview',
    summary: summarizeStage(stage),
    whatIfChanges: request.adjustments ?? {},
    agents: report.proposals, conflicts: report.conflicts, gaps: report.gaps,
    // Browser decisions are untrusted context; never send free-text reasons.
    recentAudit: (request.recentAudit ?? []).slice(0, 5).filter(entry =>
      entry && ['baseline', 'winter-surge', 'specialist-leave'].includes(entry.stage) &&
      ['forecast', 'routing', 'task-shifting', 'tele-pooling'].includes(entry.agent) &&
      ['approved', 'rejected', 'changes_requested'].includes(entry.decision))
      .map(({ stage, agent, decision }) => ({ stage, agent, decision })),
    // Keyword matches are a source catalogue, not evidence for an answer.
    // Policy chat uses the separately verified pgvector tool only.
    passages: [],
  };
}

