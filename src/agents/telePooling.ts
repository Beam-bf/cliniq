import { CLINIC_NAMES, SPECIALTY_IDS, SPECIALTY_LABELS } from '@/data/scenario';
import { latestWaitWeeks } from '@/agents/forecast';
import type { AgentResult, ClinicId, ClinicSpecialtyRecord, HourTransfer, ScenarioStage } from '@/types';

const QUEUE_THRESHOLD_WEEKS = 4;
const MAX_QUEUES_PER_SPECIALTY = 2;
const POOL_HOURS_PER_QUEUE = 4;

export function matchFreeHoursToQueues(records: ClinicSpecialtyRecord[]): HourTransfer[] {
  const transfers: HourTransfer[] = [];

  for (const specialtyId of SPECIALTY_IDS) {
    const specialtyRecords = records.filter((record) => record.specialtyId === specialtyId);
    const remainingFree = new Map<ClinicId, number>(
      specialtyRecords.map((record) => [record.clinicId, record.freeSpecialistHoursPerWeek] as const),
    );
    const queues = specialtyRecords
      .filter((record) => latestWaitWeeks(record) >= QUEUE_THRESHOLD_WEEKS)
      .sort((a, b) => latestWaitWeeks(b) - latestWaitWeeks(a))
      .slice(0, MAX_QUEUES_PER_SPECIALTY);

    for (const queue of queues) {
      let needed = POOL_HOURS_PER_QUEUE;
      const donors = [...remainingFree.entries()]
        .filter(([clinicId, hours]) => clinicId !== queue.clinicId && hours > 0)
        .sort((a, b) => b[1] - a[1]);

      for (const [clinicId, hours] of donors) {
        if (needed <= 0) break;
        const give = Math.min(hours, needed);
        remainingFree.set(clinicId, hours - give);
        needed -= give;
        transfers.push({ specialtyId, fromClinicId: clinicId, toClinicId: queue.clinicId, hoursPerWeek: give });
      }
    }
  }

  return transfers;
}

export function runTelePoolingAgent(stage: ScenarioStage): AgentResult {
  const transfers = matchFreeHoursToQueues(stage.records);

  if (transfers.length === 0) {
    return {
      agent: 'tele-pooling',
      summary: `No queue of ${QUEUE_THRESHOLD_WEEKS} or more weeks could be matched to free hours at another clinic.`,
      evidence: [],
      recommendation: 'No pooling proposed this week.',
      transfers: [],
    };
  }

  const totalHours = transfers.reduce((sum, transfer) => sum + transfer.hoursPerWeek, 0);
  return {
    agent: 'tele-pooling',
    summary: `${transfers.length} matches would move ${totalHours} free hours per week to queues of ${QUEUE_THRESHOLD_WEEKS} or more weeks.`,
    evidence: transfers.map(
      (transfer) =>
        `${CLINIC_NAMES[transfer.fromClinicId]} lends ${transfer.hoursPerWeek} hours per week of ${SPECIALTY_LABELS[transfer.specialtyId]} to ${CLINIC_NAMES[transfer.toClinicId]}`,
    ),
    recommendation: 'Offer video slots from the lending clinics to the longer queues for two weeks, then review.',
    transfers,
  };
}
