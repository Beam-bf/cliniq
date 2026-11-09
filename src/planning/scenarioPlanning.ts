import { SCENARIO_STAGES } from '@/data/scenario';
import { forecastWait, FORECAST_HORIZON_WEEKS, latestWaitWeeks } from '@/agents/forecast';
import type { ScenarioStage, StageId } from '@/types';

export interface RecordAdjustment {
  waitingWeeks: number; freeHours: number; referrals: number;
}
export type ScenarioAdjustments = Record<string, RecordAdjustment>;
export type SavedAdjustments = Partial<Record<StageId, ScenarioAdjustments>>;
export const recordKey = (clinicId: string, specialtyId: string) => `${clinicId}:${specialtyId}`;

export function validateAdjustments(stageId: StageId, value: unknown): ScenarioAdjustments {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid scenario adjustments.');
  const stage = SCENARIO_STAGES[stageId];
  if (!stage) throw new Error('Unknown scenario.');
  const result: ScenarioAdjustments = {};
  for (const [key, adjustment] of Object.entries(value)) {
    const record = stage.records.find(item => recordKey(item.clinicId, item.specialtyId) === key);
    if (!record || !adjustment || typeof adjustment !== 'object') throw new Error('Unknown clinic or specialty.');
    const { waitingWeeks, freeHours, referrals } = adjustment as RecordAdjustment;
    if (![waitingWeeks, freeHours, referrals].every(item => typeof item === 'number' && Number.isFinite(item)) ||
      waitingWeeks < 0 || waitingWeeks > 52 || freeHours < 0 || freeHours > 168 || referrals < 0 || referrals > 10000 || !Number.isInteger(referrals))
      throw new Error('Use 0–52 waiting weeks, 0–168 free hours and 0–10,000 whole referrals.');
    if (waitingWeeks !== latestWaitWeeks(record) || freeHours !== record.freeSpecialistHoursPerWeek || referrals !== record.referralsPerWeek)
      result[key] = { waitingWeeks, freeHours, referrals };
  }
  return result;
}

export function applyAdjustments(stageId: StageId, values: ScenarioAdjustments = {}): ScenarioStage {
  const adjustments = validateAdjustments(stageId, values);
  const stage = SCENARIO_STAGES[stageId];
  return { ...stage, records: stage.records.map(record => {
    const adjustment = adjustments[recordKey(record.clinicId, record.specialtyId)];
    return adjustment ? { ...record, waitingWeeksHistory: [...record.waitingWeeksHistory.slice(0, -1), adjustment.waitingWeeks],
      freeSpecialistHoursPerWeek: adjustment.freeHours, referralsPerWeek: adjustment.referrals } : record;
  }) };
}

// Stable content identity for separating approvals of different simulation inputs.
export function planRevision(values: ScenarioAdjustments): string {
  const keys = Object.keys(values).sort();
  if (keys.length === 0) return 'original';
  // Keep the canonical inputs in the identity, avoiding hash collisions.
  return keys.map(key => `${key}=${values[key].waitingWeeks},${values[key].freeHours},${values[key].referrals}`).join('|');
}

export function summarizeStage(stage: ScenarioStage) {
  const ranked = stage.records.map(record => ({ record, forecast: forecastWait(record, stage.seasonalFactorBySpecialty[record.specialtyId]) }))
    .filter(item => item.forecast.weeksUntilLimit !== null && item.forecast.weeksUntilLimit <= FORECAST_HORIZON_WEEKS)
    .sort((a, b) => (a.forecast.weeksUntilLimit ?? Infinity) - (b.forecast.weeksUntilLimit ?? Infinity));
  return { atRisk: ranked, freeHours: stage.records.reduce((sum, record) => sum + record.freeSpecialistHoursPerWeek, 0),
    referrals: stage.records.reduce((sum, record) => sum + record.referralsPerWeek, 0),
    averageWait: stage.records.reduce((sum, record) => sum + latestWaitWeeks(record), 0) / stage.records.length };
}
