import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuditEntry, StageId } from '@/types';
import type { ChatAudit } from '@/chat/core';
import { emptyWorkspace } from '@/lib/workspaceRepository';
import type { WorkspaceData } from '@/lib/workspaceRepository';
import { validateAdjustments } from '@/planning/scenarioPlanning';
import type { ScenarioAdjustments } from '@/planning/scenarioPlanning';
import { teamProposalId } from '@/teams/types';
import type { TeamMember, TeamMembership, TeamRole, TeamSubmission } from '@/teams/types';

export interface TeamWorkspaceData extends WorkspaceData {
  role: TeamRole; members: TeamMember[]; submissions: TeamSubmission[];
}
export function createTeamRepository(client: SupabaseClient) {
  return {
    async directory(userId: string): Promise<{ available: boolean; teams: TeamMembership[] }> {
      const { data, error } = await client.from('planning_team_members').select('team_id,role,planning_teams(id,name)').eq('user_id', userId);
      if (error?.code === 'PGRST205' || error?.code === '42P01') return { available: false, teams: [] };
      if (error) throw new Error('Team access could not be checked. Please retry.');
      return { available: true, teams: (data ?? []).map(row => {
        const team = Array.isArray(row.planning_teams) ? row.planning_teams[0] : row.planning_teams;
        if (!team || !['admin','planner','reviewer'].includes(row.role)) throw new Error('Invalid team membership.');
        return { id: row.team_id, name: team.name, role: row.role as TeamRole };
      }) };
    },
    async load(teamId: string, userId: string): Promise<TeamWorkspaceData> {
      const [members, plans, submissions, decisions, chats] = await Promise.all([
        client.from('planning_team_members').select('user_id,role').eq('team_id', teamId),
        client.from('planning_team_plans').select('stage,adjustments').eq('team_id', teamId),
        client.from('planning_team_submissions').select('*').eq('team_id', teamId).order('created_at', { ascending: false }).limit(100),
        client.from('planning_team_decisions').select('*').eq('team_id', teamId).order('created_at', { ascending: false }).limit(500),
        client.from('planning_team_chat_audit').select('*').eq('team_id', teamId).eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
      ]);
      if ([members, plans, submissions, decisions, chats].some(result => result.error)) throw new Error('Team data could not be loaded. Check your membership and retry.');
      const current = members.data?.find(row => row.user_id === userId);
      if (!current || !['admin','planner','reviewer'].includes(current.role)) throw new Error('You no longer have access to this team. Refresh your workspaces.');
      const result: TeamWorkspaceData = { ...emptyWorkspace(), role: current.role, members: members.data ?? [],
        submissions: (submissions.data ?? []).map(row => ({ ...row, adjustments: validateAdjustments(row.stage, row.adjustments) })) };
      for (const plan of plans.data ?? []) result.adjustments[plan.stage as StageId] = validateAdjustments(plan.stage, plan.adjustments);
      result.audit = (decisions.data ?? []).map(row => ({ id: row.id, time: row.created_at, stage: row.stage,
        agent: row.agent, summary: row.summary, evidence: row.evidence, reason: row.reason, decision: row.decision,
        submissionId: row.submission_id, actorId: row.user_id, proposalId: teamProposalId(row.submission_id, row.agent) }));
      for (const entry of result.audit) if (!(entry.proposalId! in result.statuses)) result.statuses[entry.proposalId!] = entry.decision;
      result.chatAudit = (chats.data ?? []).map(row => ({ id: row.id, time: row.created_at, stage: row.stage,
        question: row.question, sourceIds: row.source_ids, summary: row.summary, mode: row.mode }));
      return result;
    },
    async savePlan(teamId: string, userId: string, stage: StageId, values: ScenarioAdjustments) {
      const { error } = await client.from('planning_team_plans').upsert({ team_id: teamId, stage,
        adjustments: validateAdjustments(stage, values), updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: 'team_id,stage' });
      if (error) throw new Error('Team plan was not confirmed as saved. Only a Planner or Admin can edit; refresh before retrying.');
    },
    async submit(teamId: string, stage: StageId): Promise<string> {
      const { data, error } = await client.rpc('submit_planning_team_plan', { p_team_id: teamId, p_stage: stage });
      if (error || typeof data !== 'string') throw new Error('Submission was not confirmed. Apply the scenario first and check your Planner/Admin access.');
      return data;
    },
    async decide(teamId: string, submissionId: string, entry: AuditEntry) {
      const { error } = await client.rpc('record_planning_team_decision', { p_team_id: teamId, p_submission_id: submissionId,
        p_agent: entry.agent, p_decision: entry.decision, p_reason: entry.reason, p_summary: entry.summary, p_evidence: entry.evidence });
      if (error) throw new Error('Team decision was not confirmed. Only a Reviewer or Admin can decide; refresh before retrying.');
    },
    async saveChat(teamId: string, userId: string, entry: ChatAudit) {
      const { error } = await client.from('planning_team_chat_audit').insert({ id: entry.id, team_id: teamId, user_id: userId,
        stage: entry.stage, question: entry.question, source_ids: entry.sourceIds, summary: entry.summary, mode: entry.mode });
      if (error) throw new Error('Answer shown, but your team chat note was not confirmed as saved. Refresh History.');
    },
    async setMember(teamId: string, userId: string, role: TeamRole | null) {
      const { error } = await client.rpc('set_planning_team_member', { p_team_id: teamId, p_user_id: userId, p_role: role });
      if (error) throw new Error('Membership was not changed. Admin access is required, the user must exist, and the team must keep an Admin.');
    },
  };
}
