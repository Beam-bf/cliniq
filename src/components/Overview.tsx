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
    <div className="overview-intro"><div><p className="eyebrow">Start here</p><h2>Your planning snapshot</h2><p>See the pressure. Explore a change. Review the recommendation.</p></div><button className="primary-button" onClick={onPlan}>Explore a scenario <span aria-hidden="true">↗</span></button></div>
    <dl className="metric-strip">
      <div><dt>Pairs approaching the limit</dt><dd>{summary.atRisk.length}<span> / 24</span></dd><p>Within the 8-week forecast horizon</p></div>
      <div><dt>Free specialist hours</dt><dd>{summary.freeHours}<span> / week</span></dd><p>Across all six fictional clinics</p></div>
      <div><dt>Recommendations to review</dt><dd>{pending}<span> / 4</span></dd><button className="text-button" onClick={() => onReview()}>Open decision queue →</button></div>
    </dl>
    <div className="overview-columns">
      <section className="priority-list" aria-labelledby="priorities-title"><div className="section-title-row"><h3 id="priorities-title">Where to look first</h3><span className="eyebrow">Scenario data</span></div>
        {summary.atRisk.length ? <ul>{summary.atRisk.slice(0, 4).map(({ record, forecast }) => <li key={`${record.clinicId}:${record.specialtyId}`}>
          <div><p>{CLINIC_NAMES[record.clinicId]}</p><span>{SPECIALTY_LABELS[record.specialtyId]}</span></div><div className="priority-number"><strong>{forecast.currentWeeks.toFixed(1)} wk</strong><span>{forecast.weeksUntilLimit === 0 ? 'At the forecast limit' : `Limit in ~${forecast.weeksUntilLimit} wk`}</span></div>
        </li>)}</ul> : <p className="empty-note">No pair is forecast to reach the limit within eight weeks.</p>}
        <button className="text-button mt-4" onClick={() => onReview(report.proposals.find(item => item.agent === 'forecast')?.id)}>Review forecast evidence →</button>
      </section>
      <section className="next-step" aria-labelledby="next-title"><p className="eyebrow">Next step</p><h3 id="next-title">Try one change</h3><p>Choose a clinic and specialty in Planner. Edit the fictional figures, run the rules again, and compare the findings.</p><p className="plan-note">{changedCount ? `${changedCount} clinic/specialty ${changedCount === 1 ? 'pair has' : 'pairs have'} what-if changes applied.` : 'You are viewing the original scenario.'}</p><button className="secondary-button" onClick={onPlan}>Open Planner</button>
      </section>
    </div>
    <div className="attention-line"><span>{report.conflicts.length} coordinator concerns</span><span>{summary.referrals} referrals / week</span><button className="text-button" onClick={() => onReview()}>Review concerns →</button></div>
    <details className="progressive-details"><summary>Explore all clinic indicators</summary><div className="pt-6"><IndicatorsSection records={stage.records} /></div></details>
  </div>;
}
