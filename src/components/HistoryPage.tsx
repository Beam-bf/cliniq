import { useState } from 'react';
import AuditHistory from '@/components/AuditHistory';
import { SCENARIO_STAGES, STAGE_ORDER } from '@/data/scenario';
import type { AuditEntry, StageId } from '@/types';
import type { ChatAudit } from '@/chat/core';

interface Props { entries: AuditEntry[]; chatEntries: ChatAudit[]; connected: boolean; onRefresh: () => void }
export default function HistoryPage({ entries, chatEntries, connected, onRefresh }: Props) {
  const [stage, setStage] = useState<StageId | 'all'>('all'); const [query, setQuery] = useState('');
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const decisions = entries.filter(entry => (stage === 'all' || entry.stage === stage) && terms.every(term => `${entry.summary} ${entry.reason} ${entry.agent} ${entry.decision}`.toLowerCase().includes(term)));
  const chats = chatEntries.filter(entry => (stage === 'all' || entry.stage === stage) && terms.every(term => `${entry.question} ${entry.summary} ${entry.mode} ${entry.sourceIds.join(' ')}`.toLowerCase().includes(term)));
  return <section aria-labelledby="history-title"><div className="history-actions"><div><h2 id="history-title" className="text-3xl">Your planning record</h2><p className="page-intro">Find past reviews and assistant conversations.</p></div>{connected && <button className="secondary-button" onClick={onRefresh}>Refresh</button>}</div>
    <div className="history-filters"><label>Search history<input type="search" placeholder="Question, agent, reason…" value={query} onChange={event => setQuery(event.target.value)} /></label><label>Scenario<select value={stage} onChange={event => setStage(event.target.value as StageId | 'all')}><option value="all">All scenarios</option>{STAGE_ORDER.map(id => <option key={id} value={id}>{SCENARIO_STAGES[id].label.replace(/^Stage \d /, '')}</option>)}</select></label></div>
    <p className="field-note mb-5" role="status">{decisions.length} decisions · {chats.length} chat turns{connected ? ' · Showing up to 500 recent decisions and 200 recent chat turns' : ' · Browser demo records'}</p>
    {decisions.length === 0 && chats.length === 0 && (terms.length > 0 || stage !== 'all') ? <p className="empty-note">No matching records. Try a shorter search or choose all scenarios.</p> : <AuditHistory entries={decisions} chatEntries={chats} />}
  </section>;
}
