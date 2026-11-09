import { useState } from 'react';
import { CLINIC_IDS, CLINIC_NAMES, SPECIALTY_IDS, SPECIALTY_LABELS } from '@/data/scenario';
import { forecastWait, latestWaitWeeks } from '@/agents/forecast';
import { recordKey, validateAdjustments } from '@/planning/scenarioPlanning';
import type { ScenarioAdjustments } from '@/planning/scenarioPlanning';
import type { ClinicSpecialtyRecord, ScenarioStage } from '@/types';
import Sparkline from '@/components/Sparkline';

interface Props { stage: ScenarioStage; adjustments: ScenarioAdjustments; disabled: boolean;
  onApply: (values: ScenarioAdjustments) => Promise<void>; onFindings: () => void }
export default function ScenarioPlanner({ stage, adjustments, disabled, onApply, onFindings }: Props) {
  const [clinic, setClinic] = useState(CLINIC_IDS[0]); const [specialty, setSpecialty] = useState(SPECIALTY_IDS[0]);
  const record = stage.records.find(item => item.clinicId === clinic && item.specialtyId === specialty)!;
  const forecast = forecastWait(record, stage.seasonalFactorBySpecialty[specialty]);
  return <section aria-labelledby="planner-title">
    <div className="page-heading"><h2 id="planner-title">What would you change?</h2><p className="page-intro">Adjust one clinic and specialty. Apply the values to recalculate the rule-based findings.</p></div>
    <div className="planner-selectors">
      <label>Clinic<select value={clinic} onChange={event => setClinic(event.target.value as typeof clinic)}>{CLINIC_IDS.map(id => <option key={id} value={id}>{CLINIC_NAMES[id]}</option>)}</select></label>
      <label>Specialty<select value={specialty} onChange={event => setSpecialty(event.target.value as typeof specialty)}>{SPECIALTY_IDS.map(id => <option key={id} value={id}>{SPECIALTY_LABELS[id]}</option>)}</select></label>
    </div>
    <div className="planner-layout"><div className="planner-summary">
      <p className="eyebrow">Current applied values · scenario data</p><h3>{CLINIC_NAMES[clinic]}</h3><p className="text-sm text-slate-600">{SPECIALTY_LABELS[specialty]}</p>
      <div className="planner-wait"><strong>{latestWaitWeeks(record).toFixed(1)}<span> weeks</span></strong><Sparkline values={record.waitingWeeksHistory} label="Six-week waiting history" /></div>
      <p className="text-sm">{forecast.weeksUntilLimit === null ? 'No rising trend toward the limit.' : forecast.weeksUntilLimit === 0 ? 'The fitted forecast is already at the 8-week limit.' : `The fitted trend reaches the 8-week limit in approximately ${forecast.weeksUntilLimit} weeks.`}</p>
      <dl className="planner-facts"><div><dt>Free hours / week</dt><dd>{record.freeSpecialistHoursPerWeek}</dd></div><div><dt>Referrals / week</dt><dd>{record.referralsPerWeek}</dd></div></dl>
      <button className="text-button" onClick={onFindings}>See all agent findings →</button>
    </div><RecordEditor key={`${recordKey(clinic, specialty)}:${latestWaitWeeks(record)}:${record.freeSpecialistHoursPerWeek}:${record.referralsPerWeek}`} record={record} stage={stage} adjustments={adjustments} disabled={disabled} onApply={onApply} /></div>
    <p className="planner-limit">Changing available hours may change routing and tele-pooling. Forecasts change only when waiting-time inputs change. This tool does not simulate the effect of extra hours on future waiting times.</p>
  </section>;
}

function RecordEditor({ record, stage, adjustments, disabled, onApply }: { record: ClinicSpecialtyRecord } & Omit<Props, 'onFindings'>) {
  const [wait, setWait] = useState(String(latestWaitWeeks(record))); const [hours, setHours] = useState(String(record.freeSpecialistHoursPerWeek)); const [referrals, setReferrals] = useState(String(record.referralsPerWeek));
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [saved, setSaved] = useState(false);
  async function apply(event: React.FormEvent) {
    event.preventDefault(); if (busy || disabled) return; setBusy(true); setError(null); setSaved(false);
    try {
      if (![wait, hours, referrals].every(value => value.trim())) throw new Error('Complete all three planning values.');
      const next = validateAdjustments(stage.id, { ...adjustments, [recordKey(record.clinicId, record.specialtyId)]: { waitingWeeks: Number(wait), freeHours: Number(hours), referrals: Number(referrals) } });
      await onApply(next); setSaved(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to apply changes.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={event => void apply(event)} className="planner-editor" aria-busy={busy}><p className="eyebrow">Edit fictional inputs</p>
    <label>Current waiting time <span>weeks</span><input type="number" min="0" max="52" step="0.1" required value={wait} disabled={disabled || busy} onChange={event => setWait(event.target.value)} /></label>
    <label>Free specialist hours <span>per week</span><input type="number" min="0" max="168" step="0.5" required value={hours} disabled={disabled || busy} onChange={event => setHours(event.target.value)} /></label>
    <label>Referrals <span>per week</span><input type="number" min="0" max="10000" step="1" required value={referrals} disabled={disabled || busy} onChange={event => setReferrals(event.target.value)} /></label>
    <button className="primary-button" disabled={disabled || busy}>{busy ? 'Applying…' : 'Apply & recalculate'}</button>
    <p className="field-note">Changed inputs create a separate review version. Existing approvals do not carry across to it.</p>
    {error && <p className="form-error" role="alert">{error}</p>}{saved && <p role="status" className="text-sm">Values applied. Agent findings have been recalculated.</p>}
  </form>;
}
