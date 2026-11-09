import { passagesForAgent } from '@/policy/policyMatching';
import type { AgentId } from '@/types';

interface PolicyPassageListProps {
  agent: AgentId;
}

export default function PolicyPassageList({ agent }: PolicyPassageListProps) {
  const matches = passagesForAgent(agent);

  return (
    <div className="mt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Policy passages used</p>
      {matches.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500">No verified policy passage matched this recommendation.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {matches.map(({ source, matchedKeywords }) => (
            <li key={source.id} className="rounded-sm bg-transparent px-3 py-2 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">[{source.id}]</span> &ldquo;{source.passage}&rdquo;
              <span className="mt-1 block text-slate-500">
                {source.title} ({source.publisher}). Matched on: {matchedKeywords.join(', ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
