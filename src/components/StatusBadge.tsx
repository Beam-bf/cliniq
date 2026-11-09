import type { ProposalStatus } from '@/types';

const STATUS_STYLES: Record<ProposalStatus, { label: string; className: string }> = {
  pending: { label: 'Awaiting review', className: 'bg-slate-100 text-slate-700' },
  approved: { label: 'Approved', className: 'bg-slate-100 text-slate-700' },
  rejected: { label: 'Rejected', className: 'bg-slate-100 text-slate-700' },
  changes_requested: { label: 'Changes requested', className: 'bg-slate-100 text-slate-700' },
};

interface StatusBadgeProps {
  status: ProposalStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`status-badge inline-flex whitespace-nowrap px-2 py-1 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}
