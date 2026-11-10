import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuditEntry, ProposalStatus, StageId } from '@/types';
import type { ChatAudit } from '@/chat/core';
import { validateAdjustments } from '@/planning/scenarioPlanning';
import type { SavedAdjustments, ScenarioAdjustments } from '@/planning/scenarioPlanning';

export interface WorkspaceData {
  adjustments: SavedAdjustments; statuses: Record<string, ProposalStatus>; audit: AuditEntry[]; chatAudit: ChatAudit[];
}
export const emptyWorkspace = (): WorkspaceData => ({ adjustments: {}, statuses: {}, audit: [], chatAudit: [] });

export function createWorkspaceRepository(client: SupabaseClient) {
  return {
    async load(userId: string): Promise<WorkspaceData> {
      const [plans, decisions, chats] = await Promise.all([
        client.from('planning_plans').select('stage,adjustments').eq('user_id', userId),
        client.from('planning_decisions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
        client.from('planning_chat_audit').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
      ]);
      const failure = plans.error ?? decisions.error ?? chats.error;
      if (failure) throw new Error('Saved workspace could not be loaded. Check the connection and database setup, then retry.');
      const result = emptyWorkspace();
      for (const plan of plans.data ?? []) result.adjustments[plan.stage as StageId] = validateAdjustments(plan.stage, plan.adjustments);
      result.audit = (decisions.data ?? []).map(row => ({ id: row.id, time: row.created_at, stage: row.stage,
        agent: row.agent, summary: row.summary, evidence: row.evidence, reason: row.reason, decision: row.decision,
        proposalId: row.proposal_id, planRevision: row.plan_revision }));
      for (const row of result.audit) {
        const id = row.proposalId ?? `${row.stage}:${row.agent}`;
        if (!(id in result.statuses)) result.statuses[id] = row.decision;
      }
      result.chatAudit = (chats.data ?? []).map(row => ({ id: row.id, time: row.created_at, stage: row.stage,
        question: row.question, sourceIds: row.source_ids, summary: row.summary, mode: row.mode }));
      return result;
    },
    async savePlan(userId: string, stage: StageId, adjustments: ScenarioAdjustments) {
      const { error } = await client.from('planning_plans').upsert({ user_id: userId, stage,
        adjustments: validateAdjustments(stage, adjustments), updated_at: new Date().toISOString() }, { onConflict: 'user_id,stage' });
      if (error) throw new Error('The scenario save could not be confirmed. Your displayed plan has not changed. Refresh your workspace before retrying.');
    },
    async saveDecision(userId: string, entry: AuditEntry) {
      const { error } = await client.from('planning_decisions').insert({ id: entry.id, user_id: userId, stage: entry.stage,
        agent: entry.agent, proposal_id: entry.proposalId ?? `${entry.stage}:${entry.agent}`, plan_revision: entry.planRevision ?? 'original',
        summary: entry.summary, evidence: entry.evidence, decision: entry.decision, reason: entry.reason });
      if (error) throw new Error('The decision was not confirmed as saved. Refresh History before retrying.');
    },
    async saveChat(userId: string, entry: ChatAudit) {
      const { error } = await client.from('planning_chat_audit').insert({ id: entry.id, user_id: userId, stage: entry.stage,
        question: entry.question, source_ids: entry.sourceIds, summary: entry.summary, mode: entry.mode });
      if (error) throw new Error('The answer is shown, but its history entry was not confirmed as saved. Refresh History before retrying.');
    },
  };
}
