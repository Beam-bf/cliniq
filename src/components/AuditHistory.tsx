import { AGENT_CATALOG } from '@/agents/catalog';
import EmptyState from '@/components/EmptyState';
import Panel from '@/components/Panel';
import StatusBadge from '@/components/StatusBadge';
import type { AuditEntry } from '@/types';
import type { ChatAudit } from '@/chat/core';
import { SCENARIO_STAGES } from '@/data/scenario';

interface AuditHistoryProps {
  entries: AuditEntry[];
  chatEntries: ChatAudit[];
}

export default function AuditHistory({ entries, chatEntries }: AuditHistoryProps) {
  return (
    <Panel title="Audit history" description="Human decisions and chat summaries, newest first within each list. Stored in this browser only.">
      {entries.length === 0 ? (
        <EmptyState message="No decisions recorded yet. Decisions you make will appear here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-transparent">
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th scope="col" className="whitespace-nowrap px-5 py-3 sm:px-6">Time</th>
                <th scope="col" className="whitespace-nowrap px-5 py-3 sm:px-6">Agent</th>
                <th scope="col" className="whitespace-nowrap px-5 py-3 sm:px-6">Scenario</th>
                <th scope="col" className="px-5 py-3 sm:px-6">Summary</th>
                <th scope="col" className="px-5 py-3 sm:px-6">Evidence</th>
                <th scope="col" className="px-5 py-3 sm:px-6">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="align-top transition-colors hover:bg-transparent">
                  <td className="whitespace-nowrap px-5 py-4 tabular-nums text-slate-600 sm:px-6">
                    {new Date(entry.time).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800 sm:px-6">
                    {AGENT_CATALOG[entry.agent].name}
                  </td>
                  <td className="px-5 py-4 text-slate-600 sm:px-6"><p>{SCENARIO_STAGES[entry.stage].label.replace(/^Stage \d /, '')}</p><p className="mt-1 text-xs">{entry.submissionId ? `Submission ${entry.submissionId.slice(0, 8)}` : entry.planRevision && entry.planRevision !== 'original' ? 'What-if version' : 'Original scenario'}</p>{entry.actorId && <p className="mt-1 text-xs" title={entry.actorId}>Reviewer {entry.actorId.slice(0, 8)}</p>}</td>
                  <td className="min-w-[220px] px-5 py-4 text-slate-700 sm:px-6">{entry.summary}</td>
                  <td className="min-w-[160px] px-5 py-4 text-slate-600 sm:px-6"><details><summary className="text-teal-700">View evidence</summary><p className="mt-3 max-w-sm">{entry.evidence}</p></details></td>
                  <td className="px-5 py-4 sm:px-6">
                    <StatusBadge status={entry.decision} />
                    {entry.reason && <p className="mt-2 max-w-xs text-xs text-slate-500">{entry.reason}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {chatEntries.length > 0 && <div className="mt-6 border-t border-slate-200 pt-4">
        <h3 className="font-semibold">Chat turns · newest first</h3>
        <ol className="mt-3 space-y-4">{chatEntries.map(entry => <li key={entry.id} className="border-b border-slate-200 pb-3 text-sm">
          <p className="text-xs text-slate-600">{new Date(entry.time).toLocaleString()} · {entry.stage} · {entry.mode} mode</p>
          <p className="mt-1 font-medium">{entry.question}</p>
          <p className="mt-1">{entry.summary}</p>
          <p className="mt-1 text-xs">Sources: {entry.sourceIds.join(', ') || 'scenario data only'}</p>
        </li>)}</ol>
      </div>}
    </Panel>
  );
}
