import { AlertTriangle, CircleDot } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import Panel from '@/components/Panel';
import StatusBadge from '@/components/StatusBadge';
import { AGENT_CATALOG } from '@/agents/catalog';
import type { CoordinatorReport, Proposal, ProposalStatus } from '@/types';

interface CoordinatorPanelProps {
  report: CoordinatorReport;
  statuses: Record<string, ProposalStatus>;
  selectedId: string | null;
  onSelect: (proposal: Proposal) => void;
}

const REVIEW_LABELS = {
  forecast: 'Waiting time forecast',
  routing: 'Referral destinations',
  'task-shifting': 'Routine task options',
  'tele-pooling': 'Specialist hour transfers',
};

export default function CoordinatorPanel({ report, statuses, selectedId, onSelect }: CoordinatorPanelProps) {
  return (
    <div className="recommendation-sidebar">
      <details className={`coordinator-concerns ${report.conflicts.length || report.gaps.length ? 'has-concerns' : ''}`}>
        <summary>{report.conflicts.length} concerns, {report.gaps.length} evidence gaps</summary>
        <div className="pt-4"><h3 className="mb-2 text-lg">Coordinator concerns</h3><IssueList items={report.conflicts} emptyMessage="No conflicts flagged." tone="warning" /><h3 className="mb-2 mt-4 text-lg">Evidence gaps</h3><IssueList items={report.gaps} emptyMessage="No evidence gaps flagged." tone="error" /></div>
      </details>
      <Panel title="Recommendations" description="Select one to review.">
        <ul className="recommendation-list">
          {report.proposals.map((proposal) => {
            const status = statuses[proposal.id] ?? 'pending';
            const selected = proposal.id === selectedId;
            return (
              <li key={proposal.id}>
                <button
                  type="button"
                  onClick={() => onSelect(proposal)}
                  aria-pressed={selected}
                  className={`w-full rounded-sm border p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    selected
                      ? 'border-teal-600 bg-teal-50 '
                      : 'border-slate-200 bg-transparent hover:border-slate-300 hover:bg-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {AGENT_CATALOG[proposal.agent].name}
                    </span>
                    <StatusBadge status={status} />
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">{REVIEW_LABELS[proposal.agent]}</p>
                </button>
              </li>
            );
          })}
        </ul>
        {report.proposals.length === 0 && <EmptyState message="No proposed actions for this stage yet." />}
      </Panel>
    </div>
  );
}

interface IssueListProps {
  items: string[];
  emptyMessage: string;
  tone: 'warning' | 'error';
}

function IssueList({ items, emptyMessage, tone }: IssueListProps) {
  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const Icon = tone === 'warning' ? AlertTriangle : CircleDot;
  const iconClass = tone === 'warning' ? 'text-amber-600' : 'text-rose-600';

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 rounded-sm bg-transparent p-3 text-sm text-slate-700">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
