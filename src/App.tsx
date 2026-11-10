import { useEffect, useMemo, useState } from 'react';
import { Download, LayoutDashboard, SlidersHorizontal, ClipboardCheck, Library, History, CircleHelp, UserRound } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/hooks/useAuth';
import { usePolicyAssessment } from '@/hooks/usePolicyAssessment';
import { useAccountWorkspace } from '@/hooks/useAccountWorkspace';
import { PAGES, useNavigation } from '@/hooks/useNavigation';
import type { Page } from '@/hooks/useNavigation';
import { coordinateStage } from '@/agents/coordinator';
import { runAllAgents } from '@/agents';
import AgentCards from '@/components/AgentCards';
import ApprovalControls from '@/components/ApprovalControls';
import HistoryPage from '@/components/HistoryPage';
import CoordinatorPanel from '@/components/CoordinatorPanel';
import DataBanner from '@/components/DataBanner';
import StageSelector from '@/components/StageSelector';
import PolicyEvidencePanel from '@/components/PolicyEvidencePanel';
import Overview from '@/components/Overview';
import ScenarioPlanner from '@/components/ScenarioPlanner';
import AccountPanel from '@/components/AccountPanel';
import HelpPage from '@/components/HelpPage';
import ChatWidget from '@/components/ChatWidget';
import { SCENARIO_STAGES, STAGE_ORDER } from '@/data/scenario';
import { passagesForAgent } from '@/policy/policyMatching';
import { applyAdjustments, planRevision, validateAdjustments } from '@/planning/scenarioPlanning';
import type { SavedAdjustments, ScenarioAdjustments } from '@/planning/scenarioPlanning';
import type { ChatAudit } from '@/chat/core';
import type { AuditEntry, Decision, ProposalStatus, StageId } from '@/types';

const EMPTY_ADJUSTMENTS: ScenarioAdjustments = {};
const NAV = [
  { page: 'overview', icon: LayoutDashboard }, { page: 'planner', icon: SlidersHorizontal },
  { page: 'decisions', icon: ClipboardCheck }, { page: 'evidence', icon: Library },
  { page: 'history', icon: History }, { page: 'help', icon: CircleHelp },
] as const;

function App() {
  const [storedStageId, setStageId] = useLocalStorage<StageId>('halacapacity.stage', 'baseline');
  const stageId = STAGE_ORDER.includes(storedStageId) ? storedStageId : 'baseline';
  const [demoStatuses, setStatuses, statusStorageError] = useLocalStorage<Record<string, ProposalStatus>>('halacapacity.proposalStatuses', {});
  const [demoAudit, setAudit, auditStorageError] = useLocalStorage<AuditEntry[]>('halacapacity.audit', []);
  const [demoChatAudit, setChatAudit, chatStorageError] = useLocalStorage<ChatAudit[]>('halacapacity.chatAudit', []);
  const [demoAdjustments, setAdjustments, planStorageError] = useLocalStorage<SavedAdjustments>('halacapacity.adjustments', {});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { page, source, navigate } = useNavigation();
  const auth = useAuth();
  const account = useAccountWorkspace(auth.session?.user.id);
  const signedIn = Boolean(auth.session);
  const workspaceBlocked = auth.loading || (signedIn && (account.loading || Boolean(account.error)));
  const statuses = signedIn ? account.data.statuses : demoStatuses;
  const audit = signedIn ? account.data.audit : demoAudit;
  const chatAudit = signedIn ? account.data.chatAudit : demoChatAudit;
  const savedAdjustments = signedIn ? account.data.adjustments : demoAdjustments;
  const rawAdjustments = savedAdjustments?.[stageId] ?? EMPTY_ADJUSTMENTS;
  const adjustments = useMemo(() => {
    try { return validateAdjustments(stageId, rawAdjustments); } catch { return EMPTY_ADJUSTMENTS; }
  }, [stageId, rawAdjustments]);
  const revision = planRevision(adjustments);
  const stage = useMemo(() => applyAdjustments(stageId, adjustments), [stageId, adjustments]);
  const policy = usePolicyAssessment(stageId, adjustments);
  const report = useMemo(() => {
    const result = coordinateStage(stage, runAllAgents(stage), policy.assessment);
    const policyVersion = policy.assessment?.kbRevision.slice(0, 12) ?? 'unavailable';
    return { ...result, proposals: result.proposals.map(proposal => ({ ...proposal,
      id: `${revision === 'original' ? proposal.id : `${stageId}:${revision}:${proposal.agent}`}:policy-${policyVersion}` })) };
  }, [stage, stageId, revision, policy.assessment]);
  const selected = report.proposals.find(proposal => proposal.id === selectedId) ?? null;
  const selectedStatus = selected ? statuses[selected.id] ?? 'pending' : 'pending';

  useEffect(() => { if (auth.recovery) navigate('account'); }, [auth.recovery, navigate]);
  useEffect(() => { setSelectedId(null); setNotice(null); }, [auth.session?.user.id, stageId]);
  useEffect(() => {
    if (!source) document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [page, source]);

  function go(next: Page) { setNotice(null); navigate(next); }
  async function applyPlan(values: ScenarioAdjustments) {
    const valid = validateAdjustments(stageId, values);
    if (workspaceBlocked) throw new Error('Wait for your workspace to finish loading.');
    if (signedIn) await account.savePlan(stageId, valid);
    else setAdjustments(current => ({ ...current, [stageId]: valid }));
    setSelectedId(null); setNotice(signedIn ? 'Scenario saved to your account. Findings recalculated.' : 'Scenario applied to the browser demo. Findings recalculated.');
  }
  async function recordDecision(decision: Decision, reason: string, policyAcknowledged: boolean) {
    if (!selected || workspaceBlocked) throw new Error('Select a recommendation in a loaded workspace.');
    if (policy.loading) throw new Error('Wait for the policy evidence check to finish.');
    if (decision === 'approved' && !policyAcknowledged) throw new Error('Acknowledge policy review flags before recording an approval.');
    const policySnapshot = { assessmentId: policy.assessment?.id ?? null, kbRevision: policy.assessment?.kbRevision ?? null,
      embeddingModel: policy.assessment?.embeddingModel ?? null, evaluatedAt: policy.assessment?.evaluatedAt ?? null, asOf: policy.assessment?.asOf ?? null,
      policyAcknowledged, finding: selected.policyReview };
    const evidence = `${selected.evidence.join('; ')} | Policy sources: ${passagesForAgent(selected.agent).map(({ source }) => source.id).join(', ') || 'none'} | Policy Agent snapshot: ${JSON.stringify(policySnapshot)}`;
    if (evidence.length > 12000) throw new Error('The policy evidence snapshot exceeds the audit limit. Request changes rather than losing source provenance.');
    const entry: AuditEntry = { id: crypto.randomUUID(), time: new Date().toISOString(), stage: stageId, agent: selected.agent,
      summary: selected.summary, evidence,
      decision, reason, proposalId: selected.id, planRevision: revision };
    if (signedIn) await account.saveDecision(entry);
    else { setStatuses(current => ({ ...current, [selected.id]: decision })); setAudit(current => [entry, ...current]); }
    setNotice('Decision recorded for this scenario version. No schedules were changed.');
  }
  async function recordChat(entry: ChatAudit) {
    if (signedIn) await account.saveChat(entry);
    else setChatAudit(current => [entry, ...current]);
  }
  function exportBriefing() {
    const body = { label: 'FICTIONAL planning data', stage, adjustments, revision, report,
      statuses: Object.fromEntries(report.proposals.map(proposal => [proposal.id, statuses[proposal.id] ?? 'pending'])),
      audit: audit.filter(entry => entry.stage === stageId), chatAudit: chatAudit.filter(entry => entry.stage === stageId) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `cliniq-${stageId}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Current scenario briefing downloaded.');
  }
  const review = (id?: string) => { setSelectedId(id ?? null); go('decisions'); };
  return <div className="planning-room min-h-screen">
    <a href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }} className="skip-link">Skip to main content</a>
    <DataBanner />
    <div className="briefing-layout">
      <aside className="scenario-rail" aria-label="Workspace navigation">
        <a className="rail-brand" href="#overview">ClinIQ</a><p className="eyebrow">Capacity planner workspace</p>
        <nav className="workspace-nav" aria-label="Main navigation">{NAV.map(({ page: target, icon: Icon }) => <a key={target} href={`#${target}`} aria-current={page === target ? 'page' : undefined}><Icon size={17} aria-hidden="true" /><span>{PAGES[target]}</span></a>)}</nav>
        <div className="rail-stages"><p className="eyebrow">Active scenario</p><StageSelector value={stageId} onChange={next => { setStageId(next); setSelectedId(null); setNotice(null); }} /></div>
        <div className="rail-note"><p>6 fictional clinics, 4 specialties</p><a href="#account"><UserRound size={15} aria-hidden="true" />{signedIn ? 'Your account' : 'Sign in / Create account'}</a></div>
      </aside>
      <div className="briefing-document">
        <header className="workspace-header"><div><p className="eyebrow">Workspace / {PAGES[page]}</p><h1>{PAGES[page]}</h1></div><div className="workspace-header-actions">
          <span className="connection-label" role="status">{auth.loading ? 'Checking account…' : signedIn ? account.error ? 'Account unavailable' : account.loading ? 'Loading saved workspace…' : account.saving ? 'Saving to account…' : 'Account workspace' : 'Demo, browser only'}</span>
          <button type="button" className="secondary-button export-button" onClick={exportBriefing} disabled={workspaceBlocked}><Download size={15} aria-hidden="true" />Export</button>
          <button type="button" className="account-button" onClick={() => go('account')}><UserRound size={17} aria-hidden="true" />{signedIn ? 'Account' : 'Sign in'}</button>
        </div></header>
        <div className="scenario-context"><span>{SCENARIO_STAGES[stageId].label.replace(/^Stage \d /, '')}</span><p>{Object.keys(adjustments).length ? 'What-if changes applied' : 'Original scenario'}</p><a href="#planner">Change inputs →</a></div>
        <main id="main-content" tabIndex={-1} className="workspace-main">
          {auth.error && <p className="form-error" role="alert">{auth.error}</p>}
          {!signedIn && (statusStorageError || auditStorageError || chatStorageError || planStorageError) && <p className="form-error" role="alert">Browser storage is unavailable. Current changes are only in memory; export them before leaving.</p>}
          {notice && <p className="workspace-notice" role="status">{notice}</p>}
          {workspaceBlocked && !['account', 'help'].includes(page) ? <div className="workspace-loading" role="status">{account.error ? <><h2>We couldn’t load your saved workspace</h2><p>{account.error}</p><button className="primary-button" onClick={() => void account.reload()}>Retry connection</button></> : <p>Loading your workspace…</p>}</div> : <>
          {page === 'overview' && <Overview stage={stage} report={report} statuses={statuses} changedCount={Object.keys(adjustments).length} onPlan={() => go('planner')} onReview={review} />}
          {page === 'planner' && <ScenarioPlanner key={`${auth.session?.user.id ?? 'demo'}:${stageId}`} stage={stage} adjustments={adjustments} disabled={workspaceBlocked || account.saving} onApply={applyPlan} onFindings={() => review()} />}
          {page === 'decisions' && <div className="decisions-page"><div className="page-heading"><h2>Review recommendations</h2></div>
            <div className="decision-workspace">
            <CoordinatorPanel report={report} statuses={statuses} selectedId={selectedId} onSelect={proposal => { setSelectedId(proposal.id); setNotice(null); if (window.matchMedia('(max-width: 1099px)').matches) requestAnimationFrame(() => document.getElementById('decision-detail')?.scrollIntoView({ block: 'start' })); }} />
            <div id="decision-detail"><ApprovalControls key={`${selected?.id ?? 'none'}:${policy.assessment?.id ?? 'unavailable'}`} proposal={selected} status={selectedStatus} onDecide={recordDecision} disabled={workspaceBlocked || account.saving || policy.loading} /></div>
            </div>
            <details className="progressive-details"><summary>How the four agents reached their findings</summary><div className="pt-5"><AgentCards proposals={report.proposals} statuses={statuses} /></div></details>
          </div>}
          {page === 'evidence' && <PolicyEvidencePanel focusSourceId={source} />}
          {page === 'history' && <HistoryPage entries={audit} chatEntries={chatAudit} connected={signedIn} onRefresh={() => void account.reload()} />}
          {page === 'help' && <HelpPage />}
          {page === 'account' && <AccountPanel key={auth.session?.user.id ?? 'demo'} session={auth.session} recovery={auth.recovery} onRecovered={auth.finishRecovery} onContinue={() => go('overview')}
            workspace={{ loading: account.loading, saving: account.saving, error: account.error, syncedAt: account.syncedAt,
              plans: Object.keys(account.data.adjustments).length, decisions: audit.length, chats: chatAudit.length, reload: account.reload }} />}
          </>}
        </main>
        <footer className="briefing-footer"><span>ClinIQ, Fictional planning demonstration</span><a href="#help">Help & limitations</a><a href="#account">Account</a></footer>
      </div>
    </div>
    <ChatWidget key={auth.session?.user.id ?? 'demo'} disabled={workspaceBlocked || account.saving} stageId={stageId} adjustments={adjustments} currentView={page} audit={audit} accessToken={auth.session?.access_token} onAudit={recordChat} onSource={id => { navigate('evidence', id); requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('halacapacity:source', { detail: id }))); }} />
  </div>;
}

export default App;
