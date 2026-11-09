import { Check, MessageSquareWarning, X } from 'lucide-react';
import { useRef, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import Panel from '@/components/Panel';
import PolicyPassageList from '@/components/PolicyPassageList';
import StatusBadge from '@/components/StatusBadge';
import type { Decision, Proposal, ProposalStatus } from '@/types';

interface ApprovalControlsProps {
  proposal: Proposal | null;
  status: ProposalStatus;
  onDecide: (decision: Decision, reason: string) => void | Promise<void>;
  disabled?: boolean;
}

export default function ApprovalControls({ proposal, status, onDecide, disabled }: ApprovalControlsProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  if (!proposal) {
    return (
      <Panel title="Review a recommendation">
        <EmptyState message="Select a recommendation to see its evidence and record a decision." />
      </Panel>
    );
  }

  const decide = async (decision: Decision) => {
    if (disabled || lock.current) return;
    if (reason.trim() === '') {
      setError('Add a short reason before recording a decision.');
      return;
    }
    if (reason.length > 2000) { setError('Keep your reason within 2,000 characters.'); return; }
    setError(null); lock.current = true; setBusy(true);
    try { await onDecide(decision, reason.trim()); setReason(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'The decision could not be recorded.'); }
    finally { lock.current = false; setBusy(false); }
  };

  return (
    <Panel
      title="Your review"
      action={
        <div aria-live="polite">
          <StatusBadge status={status} />
        </div>
      }
    >
      <div className="grid gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recommendation</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{proposal.recommendation}</p>
          <p className="mt-3 text-sm text-slate-600">{proposal.summary}</p>
          <details className="review-evidence"><summary>Operational evidence · {proposal.evidence.length} observations</summary>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-600">
            {proposal.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          </details>
          <details className="review-evidence"><summary>Related policy extracts</summary><PolicyPassageList agent={proposal.agent} /></details>
        </div>

        <div className="flex flex-col gap-4">
          <label htmlFor="decision-reason" className="text-sm font-medium text-slate-700">
            Reason <span className="font-normal text-slate-500">(required)</span>
          </label>
          <textarea
            id="decision-reason"
            rows={4}
            maxLength={2000}
            disabled={disabled || busy}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (error) setError(null);
            }}
            placeholder="Explain your decision or the change you need"
            aria-invalid={error !== null}
            aria-describedby={error ? 'decision-reason-error' : undefined}
            className="w-full resize-y rounded-sm border border-slate-300 bg-transparent px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          {error && (
            <p id="decision-reason-error" role="alert" className="text-sm text-slate-700">
              {error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => void decide('approved')}
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-teal-700 px-4 py-2.5 text-sm font-medium text-white  transition-colors hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Approve
            </button>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => void decide('rejected')}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-slate-700 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Reject
            </button>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => void decide('changes_requested')}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-slate-300 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
            >
              <MessageSquareWarning className="h-4 w-4" aria-hidden="true" />
              Request changes
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {busy && <span role="status">Saving decision… </span>}
            Records this review only. Schedules and bookings stay unchanged.
          </p>
        </div>
      </div>
    </Panel>
  );
}
