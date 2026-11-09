import { CLINIC_NAMES, SPECIALTY_LABELS } from '@/data/scenario';
import type { AgentResult, DelegableTask } from '@/types';

export function runTaskShiftingAgent(tasks: DelegableTask[]): AgentResult {
  const delegable = tasks
    .filter((task) => task.delegable)
    .sort((a, b) => b.specialistHoursPerWeek - a.specialistHoursPerWeek);
  const keptCount = tasks.length - delegable.length;

  if (delegable.length === 0) {
    return {
      agent: 'task-shifting',
      summary: 'No routine tasks were found that nurses or GPs could take over.',
      evidence: [],
      recommendation: 'Keep all tasks with specialists this week.',
      transfers: [],
    };
  }

  const totalHours = delegable.reduce((sum, task) => sum + task.specialistHoursPerWeek, 0);
  const evidence = delegable.map(
    (task) =>
      `${CLINIC_NAMES[task.clinicId]}, ${SPECIALTY_LABELS[task.specialtyId]}: ${task.name}, ${task.specialistHoursPerWeek} hours per week`,
  );
  if (keptCount > 0) {
    evidence.push(`${keptCount} tasks stay with specialists.`);
  }

  return {
    agent: 'task-shifting',
    summary: `${totalHours} specialist hours per week across ${delegable.length} routine tasks could move to nurses or GPs.`,
    evidence,
    recommendation: 'Pilot the largest routine tasks with nurses or GPs after clinic lead sign-off.',
    transfers: [],
  };
}
