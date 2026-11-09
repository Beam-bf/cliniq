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

export default function CoordinatorPanel({ report, statuses, selectedId, onSelect }: CoordinatorPanelProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Conflicts" description="Proposals that clash with the forecast or with each other.">
        <IssueList items={report.conflicts} emptyMessage="No conflicts found for this stage." tone="warning" />
      </Panel>

      <Panel title="Gaps" description="Places where an agent or dataset had no evidence to work with.">
        <IssueList items={report.gaps} emptyMessage="No gaps found for this stage." tone="error" />
      </Panel>

      <Panel className="lg:col-span-2" title="Proposed actions" description="Select an action to review it below.">
        <ul className="space-y-3">
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
                  <p className="mt-2 text-sm font-medium text-slate-900">{proposal.recommendation}</p>
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
