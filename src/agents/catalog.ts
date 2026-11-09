import type { AgentId } from '@/types';

export interface AgentInfo {
  name: string;
  purpose: string;
  rule: string;
}

export const AGENT_CATALOG: Record<AgentId, AgentInfo> = {
  forecast: {
    name: 'Forecast',
    purpose: 'Estimates when each clinic and specialty pair reaches the 8-week waiting limit.',
    rule: 'Linear trend over the last 6 weeks, times a seasonal factor.',
  },
  routing: {
    name: 'Routing',
    purpose: 'Ranks clinics by waiting time for the specialty under most pressure.',
    rule: 'Shortest current wait first, among clinics with free hours.',
  },
  'task-shifting': {
    name: 'Task-shifting',
    purpose: 'Totals specialist hours on routine tasks nurses or GPs could take over.',
    rule: 'Sums hours on tasks marked delegable.',
  },
  'tele-pooling': {
    name: 'Tele-pooling',
    purpose: 'Matches free specialist hours at one clinic to the longest queues elsewhere.',
    rule: 'Queues of 4+ weeks receive up to 4 hours per week from clinics with free hours.',
  },
};
