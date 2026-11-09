import type { StageId } from '@/types';
import type { ScenarioAdjustments } from '@/planning/scenarioPlanning';

export type TeamRole = 'admin' | 'planner' | 'reviewer';
export interface TeamMembership { id: string; name: string; role: TeamRole }
export interface TeamMember { user_id: string; role: TeamRole }
export interface TeamSubmission { id: string; team_id: string; stage: StageId; adjustments: ScenarioAdjustments; submitted_by: string; created_at: string; rules_version: string }
export const canEditTeam = (role?: TeamRole) => role === 'admin' || role === 'planner';
export const canReviewTeam = (role?: TeamRole) => role === 'admin' || role === 'reviewer';
export const teamProposalId = (submissionId: string, agent: string) => `team:${submissionId}:${agent}`;
