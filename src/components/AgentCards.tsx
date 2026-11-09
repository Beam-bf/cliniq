import { AGENT_CATALOG } from '@/agents/catalog';
import Panel from '@/components/Panel';
import PolicyPassageList from '@/components/PolicyPassageList';
import StatusBadge from '@/components/StatusBadge';
import type { Proposal, ProposalStatus } from '@/types';

interface Props { proposals: Proposal[]; statuses: Record<string, ProposalStatus> }

export default function AgentCards({ proposals, statuses }: Props) {
  return <Panel title="Agent findings" description="Four fixed-rule calculations. Recommendations await human review.">
    <div className="agent-findings">{proposals.map((proposal, index) => {
      const info = AGENT_CATALOG[proposal.agent];
      return <article key={proposal.id} className="agent-finding">
        <div className="agent-label"><span className="eyebrow">0{index + 1} / Rule-based agent</span><h3>{info.name}</h3><StatusBadge status={statuses[proposal.id] ?? 'pending'} /><p className="mt-3 text-xs text-slate-600">{info.rule}</p></div>
        <div className="min-w-0"><p className="text-sm font-semibold">{proposal.summary}</p>
          <details className="agent-evidence"><summary>Operational evidence · {proposal.evidence.length} observations</summary><ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-slate-600">{proposal.evidence.map(item => <li key={item}>{item}</li>)}</ul></details>
          <p className="agent-recommendation"><span className="font-semibold">Recommendation / </span>{proposal.recommendation}</p>
          <PolicyPassageList agent={proposal.agent} />
        </div>
      </article>;
    })}</div>
  </Panel>;
}
