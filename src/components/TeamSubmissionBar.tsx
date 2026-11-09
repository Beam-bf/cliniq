import { useRef, useState } from 'react';
import type { TeamSubmission } from '@/teams/types';

interface Props {
  stage: string; submissions: TeamSubmission[]; selectedId?: string; canSubmit: boolean;
  hasAppliedPlan: boolean; reviewing: boolean; onSelect: (id: string) => void; onSubmit: () => Promise<void>;
}
export default function TeamSubmissionBar({ stage, submissions, selectedId, canSubmit, hasAppliedPlan, reviewing, onSelect, onSubmit }: Props) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const lock = useRef(false);
  const items = submissions.filter(item => item.stage === stage);
  async function submit() {
    if (lock.current) return; lock.current = true; setBusy(true); setError(null);
    try { await onSubmit(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Submission failed.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="submission-bar">
    {reviewing ? <><label>Submitted version<select value={selectedId ?? ''} onChange={event => onSelect(event.target.value)} disabled={!items.length || busy}><option value="" disabled>No submitted versions</option>{items.map(item => <option key={item.id} value={item.id}>{new Date(item.created_at).toLocaleString()} · {item.id.slice(0, 8)}</option>)}</select></label><p className="field-note">{items.length ? 'Reviewing a saved snapshot. Later edits do not change these inputs.' : 'A Planner or Admin must apply and submit a scenario before team review.'}</p></> : <><div><p className="eyebrow">Team review</p><p className="field-note">Only applied values are included in a submission.</p></div>{canSubmit && <button className="primary-button" disabled={busy || !hasAppliedPlan} onClick={() => void submit()}>{busy ? 'Submitting…' : 'Submit applied values for review'}</button>}{!hasAppliedPlan && <p className="field-note">Apply this scenario first.</p>}</>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
