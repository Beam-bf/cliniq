import { useEffect, useState } from 'react';
import type { StageId } from '@/types';
import type { ScenarioAdjustments } from '@/planning/scenarioPlanning';
import { planRevision } from '@/planning/scenarioPlanning';
import type { PolicyAssessment } from '@/policy/knowledgeTypes';
import { validateEvidence } from '@/policy/retrievalClient';

export function usePolicyAssessment(stageId: StageId, adjustments: ScenarioAdjustments) {
  const revision = planRevision(adjustments);
  const key = `${stageId}:${revision}`;
  const [loaded, setLoaded] = useState<{ key: string; assessment?: PolicyAssessment; loading: boolean }>({ key: '', loading: true });
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    setLoaded({ key, loading: true });
    void (async () => {
      try {
        const response = await fetch('/api/policy', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'assess', stageId, adjustments }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
        if (!response.ok) throw new Error('Policy service unavailable');
        const body = await response.json() as { assessment?: PolicyAssessment };
        const assessment = body.assessment;
        if (!assessment || assessment.engine !== 'pgvector' || assessment.stageId !== stageId || assessment.planRevision !== revision ||
          !/^[a-f0-9]{64}$/.test(assessment.kbRevision) || !Array.isArray(assessment.findings) || assessment.findings.length !== 4 ||
          new Set(assessment.findings.map(finding => finding.agent)).size !== 4 ||
          !assessment.findings.every(finding => ['forecast', 'routing', 'task-shifting', 'tele-pooling'].includes(finding.agent)) ||
          !assessment.findings.every(finding => finding.automaticAuthorization === false && validateEvidence(finding.evidence) &&
            ['human-review', 'conflict', 'unsupported'].includes(finding.status) && typeof finding.summary === 'string' &&
            Array.isArray(finding.flags) && finding.flags.every(flag => typeof flag === 'string'))) throw new Error('Invalid policy assessment');
        if (active) setLoaded({ key, assessment, loading: false });
      } catch { if (active) setLoaded({ key, loading: false }); }
    })();
    return () => { active = false; controller.abort(); };
  // revision is the canonical representation of adjustments.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, stageId, revision]);
  return { assessment: loaded.key === key ? loaded.assessment : undefined, loading: loaded.key !== key || loaded.loading };
}
