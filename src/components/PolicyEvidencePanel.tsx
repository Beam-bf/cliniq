import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import Panel from '@/components/Panel';
import PolicySourceCard from '@/components/PolicySourceCard';
import { POLICY_SOURCES } from '@/data/policySources';
import { searchPolicySources } from '@/policy/policyMatching';

export default function PolicyEvidencePanel({ focusSourceId }: { focusSourceId?: string | null }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchPolicySources(query), [query]);
  useEffect(() => {
    if (!focusSourceId || !POLICY_SOURCES.some(source => source.id === focusSourceId && source.verified)) return;
    setQuery('');
    const frame = requestAnimationFrame(() => {
      const card = document.getElementById(`policy-${focusSourceId}`);
      card?.scrollIntoView({ block: 'center' }); card?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusSourceId]);
  useEffect(() => {
    const reveal = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (!POLICY_SOURCES.some(source => source.id === id && source.verified)) return;
      setQuery('');
      requestAnimationFrame(() => {
        const card = document.getElementById(`policy-${id}`);
        card?.scrollIntoView({ block: 'center' });
        card?.focus({ preventScroll: true });
      });
    };
    window.addEventListener('halacapacity:source', reveal);
    return () => window.removeEventListener('halacapacity:source', reveal);
  }, []);

  return (
    <Panel
      title="Policy evidence"
      description="Only verified sources are used as evidence. Unverified items are listed for transparency and never cited."
    >
      <div className="flex flex-col gap-4">
        <label className="relative block">
          <span className="sr-only">Search policy sources</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by keyword, e.g. beds, nursing, Dubai"
            className="w-full rounded-sm border border-slate-300 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
        </label>

        <p className="text-xs text-slate-500" aria-live="polite">
          {results.length} of {POLICY_SOURCES.length} sources shown
        </p>

        {results.length === 0 ? (
          <EmptyState message="No sources match that search. Try a shorter keyword." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {results.map((source) => (
              <PolicySourceCard key={source.id} source={source} />
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
