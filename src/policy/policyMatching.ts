import { POLICY_SOURCES } from '@/data/policySources';
import type { AgentId, PolicySource } from '@/types';

export interface PolicyPassageMatch {
  source: PolicySource;
  matchedKeywords: string[];
}

const AGENT_POLICY_KEYWORDS: Record<AgentId, string[]> = {
  forecast: ['long-term care', 'beds', 'shortage', 'undersupply', 'gap'],
  routing: ['outpatient', 'facilities', 'clinic'],
  'task-shifting': ['workforce', 'nursing', 'fte'],
  'tele-pooling': ['continuity', 'monitor', 'psychiatry', 'pediatrics', 'facilities'],
};

function searchableText(source: PolicySource) {
  return [
    source.id,
    source.title,
    source.publisher,
    source.documentType,
    source.summary,
    source.passage ?? '',
    source.locator ?? '',
    source.note ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

export function searchPolicySources(query: string): PolicySource[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return POLICY_SOURCES;
  return POLICY_SOURCES.filter((source) => {
    const text = searchableText(source);
    return terms.every((term) => text.includes(term));
  });
}

export function passagesForAgent(agent: AgentId): PolicyPassageMatch[] {
  const keywords = AGENT_POLICY_KEYWORDS[agent];
  return POLICY_SOURCES.filter((source) => source.verified && source.passage !== null)
    .map((source) => {
      const text = (source.passage ?? '').toLowerCase();
      return { source, matchedKeywords: keywords.filter((keyword) => text.includes(keyword)) };
    })
    .filter((match) => match.matchedKeywords.length > 0);
}
