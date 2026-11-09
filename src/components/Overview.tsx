import { CLINIC_NAMES, SPECIALTY_LABELS } from '@/data/scenario';
import { summarizeStage } from '@/planning/scenarioPlanning';
import IndicatorsSection from '@/components/IndicatorsSection';
import type { CoordinatorReport, ProposalStatus, ScenarioStage } from '@/types';

interface Props { stage: ScenarioStage; report: CoordinatorReport; statuses: Record<string, ProposalStatus>; changedCount: number;
  onPlan: () => void; onReview: (id?: string) => void }
export default function Overview({ stage, report, statuses, changedCount, onPlan, onReview }: Props) {
  const summary = summarizeStage(stage);
  const pending = report.proposals.filter(proposal => !statuses[proposal.id] || statuses[proposal.id] === 'pending').length;
  return <div className="overview-page">
    <div className="overview-intro"><div><h2>What needs attention?</h2><p>Test a change, then review the findings.</p></div><button className="primary-button" onClick={onPlan}>Adjust capacity <span aria-hidden="true">↗</span></button></div>
    <dl className="metric-strip">
      <div><dt>Pairs at forecast risk</dt><dd>{summary.atRisk.length}<span> / 24</span></dd><p>Reaching the limit within 8 weeks</p></div>
      <div><dt>Free specialist hours</dt><dd>{summary.freeHours}<span> / week</span></dd><p>Across 6 clinics</p></div>
      <div><dt>Awaiting review</dt><dd>{pending}<span> / 4</span></dd><button className="text-button" onClick={() => onReview()}>Review recommendations →</button></div>
    </dl>
    <div className="overview-columns">
      <section className="priority-list" aria-labelledby="priorities-title"><div className="section-title-row"><h3 id="priorities-title">Priority clinics</h3><span className="eyebrow">Scenario data</span></div>
        {summary.atRisk.length ? <ul>{summary.atRisk.slice(0, 4).map(({ record, forecast }) => <li key={`${record.clinicId}:${record.specialtyId}`}>
          <div><p>{CLINIC_NAMES[record.clinicId]}</p><span>{SPECIALTY_LABELS[record.specialtyId]}</span></div><div className="priority-number"><strong>{forecast.currentWeeks.toFixed(1)} wk</strong><span>{forecast.weeksUntilLimit === 0 ? 'At the forecast limit' : `Limit in ~${forecast.weeksUntilLimit} wk`}</span></div>
        </li>)}</ul> : <p className="empty-note">No pair is forecast to reach the limit within eight weeks.</p>}
        <button className="text-button mt-4" onClick={() => onReview(report.proposals.find(item => item.agent === 'forecast')?.id)}>Review forecast evidence →</button>
      </section>
      <section className="next-step" aria-labelledby="next-title"><p className="eyebrow">Your next move</p><h3 id="next-title">Explore available capacity</h3><p>Adjust a clinic’s inputs and review the updated recommendations.</p>{changedCount > 0 && <p className="plan-note">{changedCount} {changedCount === 1 ? 'pair adjusted' : 'pairs adjusted'}</p>}<button className="secondary-button" onClick={onPlan}>Open Planner</button>
      </section>
    </div>
    <div className="attention-line"><span>{report.conflicts.length} coordinator concerns</span><span>{summary.referrals} referrals / week</span><button className="text-button" onClick={() => onReview()}>Review concerns →</button></div>
    <details className="progressive-details"><summary>Explore all clinic indicators</summary><div className="pt-6"><IndicatorsSection records={stage.records} /></div></details>
  </div>;
}
