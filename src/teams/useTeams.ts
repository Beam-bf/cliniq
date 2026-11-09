import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createTeamRepository } from '@/teams/repository';
import type { TeamWorkspaceData } from '@/teams/repository';
import { canEditTeam, canReviewTeam } from '@/teams/types';
import type { TeamMembership, TeamRole } from '@/teams/types';
import type { AuditEntry, StageId } from '@/types';
import type { ChatAudit } from '@/chat/core';
import type { ScenarioAdjustments } from '@/planning/scenarioPlanning';

const repository = supabase ? createTeamRepository(supabase) : null;
export function useTeamDirectory(userId?: string) {
  const [loaded, setLoaded] = useState<{ owner: string; available: boolean; teams: TeamMembership[] } | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const current = useRef(userId); current.current = userId;
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    if (!repository || !userId) { setLoaded(null); setBusy(false); setError(null); return; }
    setBusy(true); setError(null);
    try { const result = await repository.directory(userId);
      if (request === generation.current && current.current === userId) setLoaded({ owner: userId, ...result });
    } catch (failure) { if (request === generation.current) setError(failure instanceof Error ? failure.message : 'Unable to check team access.'); }
    finally { if (request === generation.current) setBusy(false); }
  }, [userId]);
  const cancel = useCallback(() => { generation.current++; }, []);
  useEffect(() => { void reload(); return cancel; }, [reload, cancel]);
  const active = loaded?.owner === userId ? loaded : null;
  return { teams: active?.teams ?? [], available: active?.available ?? false, error, reload,
    loading: Boolean(userId) && (busy || (!active && !error)) };
}

export function useTeamWorkspace(userId?: string, teamId?: string) {
  const identity = userId && teamId ? `${userId}:${teamId}` : null;
  const owner = useRef(identity); owner.current = identity;
  const generation = useRef(0);
  const [loaded, setLoaded] = useState<{ identity: string; data: TeamWorkspaceData } | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const data = loaded?.identity === identity ? loaded?.data ?? null : null;
  const reload = useCallback(async () => {
    const request = ++generation.current;
    if (!repository || !userId || !teamId || !identity) { setLoaded(null); setBusy(false); setError(null); return; }
    setBusy(true); setError(null);
    try { const next = await repository.load(teamId, userId);
      if (request === generation.current && owner.current === identity) setLoaded({ identity, data: next });
    } catch (failure) { if (request === generation.current) setError(failure instanceof Error ? failure.message : 'Unable to load team.'); }
    finally { if (request === generation.current) setBusy(false); }
  }, [identity, userId, teamId]);
  const cancel = useCallback(() => { generation.current++; }, []);
  useEffect(() => { void reload(); return cancel; }, [reload, cancel]);
  function requireAccess(action: 'read' | 'edit' | 'review' | 'admin') {
    if (!repository || !userId || !teamId || !identity || owner.current !== identity || !data || busy || error) throw new Error('Load your team workspace before continuing.');
    if ((action === 'edit' && !canEditTeam(data.role)) || (action === 'review' && !canReviewTeam(data.role)) || (action === 'admin' && data.role !== 'admin')) throw new Error('Your team role does not allow this action.');
    return { repository, userId, teamId, identity };
  }
  function update(id: string, apply: (previous: TeamWorkspaceData) => TeamWorkspaceData) {
    if (owner.current !== id) return;
    setLoaded(previous => previous?.identity === id ? { identity: id, data: apply(previous.data) } : previous);
  }
  return { data, error, reload, loading: Boolean(identity) && (busy || (!data && !error)),
    async savePlan(stage: StageId, values: ScenarioAdjustments) {
      const access = requireAccess('edit'); await access.repository.savePlan(access.teamId, access.userId, stage, values);
      update(access.identity, previous => ({ ...previous, adjustments: { ...previous.adjustments, [stage]: values } }));
    },
    async submit(stage: StageId) { const access = requireAccess('edit'); const id = await access.repository.submit(access.teamId, stage); await reload(); return id; },
    async decide(submissionId: string, entry: AuditEntry) { const access = requireAccess('review'); await access.repository.decide(access.teamId, submissionId, entry); await reload(); },
    async saveChat(entry: ChatAudit) {
      const access = requireAccess('read'); await access.repository.saveChat(access.teamId, access.userId, entry);
      update(access.identity, previous => ({ ...previous, chatAudit: [entry, ...previous.chatAudit] }));
    },
    async setMember(memberId: string, role: TeamRole | null) { const access = requireAccess('admin'); await access.repository.setMember(access.teamId, memberId, role); await reload(); },
  };
}
