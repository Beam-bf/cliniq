import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createWorkspaceRepository, emptyWorkspace } from '@/lib/workspaceRepository';
import type { WorkspaceData } from '@/lib/workspaceRepository';
import type { AuditEntry, StageId } from '@/types';
import type { ChatAudit } from '@/chat/core';
import type { ScenarioAdjustments } from '@/planning/scenarioPlanning';

const repository = supabase ? createWorkspaceRepository(supabase) : null;
export function useAccountWorkspace(userId: string | undefined) {
  const [loaded, setLoaded] = useState<{ owner: string; data: WorkspaceData } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const owner = useRef(userId); owner.current = userId;
  const generation = useRef(0);
  const ready = Boolean(userId && loaded?.owner === userId);
  const data = ready ? loaded!.data : emptyWorkspace();
  const reload = useCallback(async () => {
    const current = ++generation.current;
    if (!repository || !userId) { setLoaded(null); setLoading(false); setError(null); return; }
    setLoading(true); setError(null);
    try {
      const next = await repository.load(userId);
      if (generation.current === current && owner.current === userId) setLoaded({ owner: userId, data: next });
    } catch (failure) {
      if (generation.current === current) setError(failure instanceof Error ? failure.message : 'Unable to load workspace.');
    } finally { if (generation.current === current) setLoading(false); }
  }, [userId]);
  const cancelLoad = useCallback(() => { generation.current++; }, []);
  useEffect(() => { void reload(); return cancelLoad; }, [reload, cancelLoad]);
  const requireAccount = () => {
    if (!repository || !userId || owner.current !== userId || !ready || loading || error) throw new Error('Wait for your account workspace to load successfully.');
    return { repository, userId };
  };
  const update = (id: string, apply: (current: WorkspaceData) => WorkspaceData) => {
    if (owner.current !== id) return;
    setLoaded(current => current?.owner === id ? { owner: id, data: apply(current.data) } : current);
  };
  return { data, ready, loading: Boolean(userId) && (!ready || loading), error, reload,
    async savePlan(stage: StageId, adjustments: ScenarioAdjustments) {
      const account = requireAccount(); await account.repository.savePlan(account.userId, stage, adjustments);
      update(account.userId, current => ({ ...current, adjustments: { ...current.adjustments, [stage]: adjustments } }));
    },
    async saveDecision(entry: AuditEntry) {
      const account = requireAccount(); await account.repository.saveDecision(account.userId, entry);
      update(account.userId, current => ({ ...current, audit: [entry, ...current.audit], statuses: {
        ...current.statuses, [entry.proposalId ?? `${entry.stage}:${entry.agent}`]: entry.decision } }));
    },
    async saveChat(entry: ChatAudit) {
      const account = requireAccount(); await account.repository.saveChat(account.userId, entry);
      update(account.userId, current => ({ ...current, chatAudit: [entry, ...current.chatAudit] }));
    },
  };
}
