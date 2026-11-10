import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createWorkspaceRepository, emptyWorkspace } from '@/lib/workspaceRepository';
import type { WorkspaceData } from '@/lib/workspaceRepository';
import type { AuditEntry, StageId } from '@/types';
import type { ChatAudit } from '@/chat/core';
import type { ScenarioAdjustments } from '@/planning/scenarioPlanning';

const repository = supabase ? createWorkspaceRepository(supabase) : null;
export function useAccountWorkspace(userId: string | undefined) {
  const [loaded, setLoaded] = useState<{ owner: string; data: WorkspaceData; syncedAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const owner = useRef(userId); owner.current = userId;
  const generation = useRef(0);
  const reading = useRef<string | null>(null);
  const writing = useRef<string | null>(null);
  const [savingOwner, setSavingOwner] = useState<string | null>(null);
  const ready = Boolean(userId && loaded?.owner === userId);
  const data = ready ? loaded!.data : emptyWorkspace();
  const reload = useCallback(async () => {
    if (userId && writing.current === userId) return;
    const current = ++generation.current;
    if (!repository || !userId) { setLoaded(null); setLoading(false); setError(null); return; }
    reading.current = userId;
    setLoading(true); setError(null);
    try {
      const next = await repository.load(userId);
      if (generation.current === current && owner.current === userId) setLoaded({ owner: userId, data: next, syncedAt: new Date().toISOString() });
    } catch (failure) {
      if (generation.current === current) setError(failure instanceof Error ? failure.message : 'Unable to load workspace.');
    } finally { if (generation.current === current) { reading.current = null; setLoading(false); } }
  }, [userId]);
  const cancelLoad = useCallback(() => { generation.current++; }, []);
  useEffect(() => { void reload(); return cancelLoad; }, [reload, cancelLoad]);
  const requireAccount = () => {
    if (!repository || !userId || owner.current !== userId || !ready || loading || reading.current === userId || error) throw new Error('Wait for your account workspace to load successfully.');
    if (writing.current === userId) throw new Error('Another save is in progress. Please try again when it finishes.');
    return { repository, userId };
  };
  const update = (id: string, apply: (current: WorkspaceData) => WorkspaceData) => {
    if (owner.current !== id) return;
    setLoaded(current => current?.owner === id ? { owner: id, data: apply(current.data), syncedAt: new Date().toISOString() } : current);
  };
  async function save(persist: (account: { repository: NonNullable<typeof repository>; userId: string }) => Promise<void>, apply: (current: WorkspaceData) => WorkspaceData) {
    const account = requireAccount();
    writing.current = account.userId; setSavingOwner(account.userId);
    try {
      await persist(account);
      if (owner.current !== account.userId) throw new Error('The active account changed. Reload its workspace to confirm the save.');
      update(account.userId, apply);
    } finally {
      if (writing.current === account.userId) { writing.current = null; setSavingOwner(null); }
    }
  }
  return { data, ready, loading: Boolean(userId) && ((!ready && !error) || loading), saving: Boolean(userId && savingOwner === userId),
    syncedAt: ready ? loaded!.syncedAt : null, error, reload,
    async savePlan(stage: StageId, adjustments: ScenarioAdjustments) {
      await save(account => account.repository.savePlan(account.userId, stage, adjustments),
        current => ({ ...current, adjustments: { ...current.adjustments, [stage]: adjustments } }));
    },
    async saveDecision(entry: AuditEntry) {
      await save(account => account.repository.saveDecision(account.userId, entry), current => ({ ...current, audit: [entry, ...current.audit], statuses: {
        ...current.statuses, [entry.proposalId ?? `${entry.stage}:${entry.agent}`]: entry.decision } }));
    },
    async saveChat(entry: ChatAudit) {
      await save(account => account.repository.saveChat(account.userId, entry), current => ({ ...current, chatAudit: [entry, ...current.chatAudit] }));
    },
  };
}
