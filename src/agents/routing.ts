import { CLINIC_NAMES, SPECIALTY_IDS, SPECIALTY_LABELS } from '@/data/scenario';
import { latestWaitWeeks } from '@/agents/forecast';
import type { AgentResult, ClinicSpecialtyRecord, ScenarioStage, SpecialtyId } from '@/types';

export function rankClinicsByWait(records: ClinicSpecialtyRecord[], specialtyId: SpecialtyId) {
  return records
    .filter((record) => record.specialtyId === specialtyId && record.freeSpecialistHoursPerWeek > 0)
    .sort((a, b) => latestWaitWeeks(a) - latestWaitWeeks(b));
}

export function runRoutingAgent(stage: ScenarioStage): AgentResult {
  const averageWait = (specialtyId: SpecialtyId) => {
    const matching = stage.records.filter((record) => record.specialtyId === specialtyId);
    return matching.reduce((sum, record) => sum + latestWaitWeeks(record), 0) / matching.length;
  };
  const focus = SPECIALTY_IDS.reduce((best, id) => (averageWait(id) > averageWait(best) ? id : best), SPECIALTY_IDS[0]);
  const ranked = rankClinicsByWait(stage.records, focus);
  const label = SPECIALTY_LABELS[focus];
  const top = ranked[0];

  if (!top) {
    return {
      agent: 'routing',
      summary: `No clinic has free ${label} hours to receive referrals.`,
      evidence: [],
      recommendation: 'Hold new referrals until a clinic has free hours.',
      transfers: [],
    };
  }

  return {
    agent: 'routing',
    summary: `For ${label}, ${CLINIC_NAMES[top.clinicId]} has the shortest wait at ${latestWaitWeeks(top).toFixed(1)} weeks.`,
    evidence: ranked.map(
      (record, index) =>
        `${index + 1}. ${CLINIC_NAMES[record.clinicId]}: ${latestWaitWeeks(record).toFixed(1)} weeks, ${record.freeSpecialistHoursPerWeek} free hours per week`,
    ),
    recommendation: `Route new ${label} referrals to ${CLINIC_NAMES[top.clinicId]} first, then down the list.`,
    transfers: [],
  };
}
