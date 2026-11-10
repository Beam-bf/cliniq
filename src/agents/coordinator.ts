import { AGENT_CATALOG } from '@/agents/catalog';
import { FORECAST_HORIZON_WEEKS, MIN_HISTORY_WEEKS, describeLimitClause, forecastWait } from '@/agents/forecast';
import { CLINIC_NAMES, SPECIALTY_LABELS } from '@/data/scenario';
import type { AgentResult, CoordinatorReport, ScenarioStage } from '@/types';
import type { PolicyAssessment } from '@/policy/knowledgeTypes';
import { unavailablePolicyFinding } from '@/policy/knowledgeTypes';

export function proposalIdFor(stage: ScenarioStage, result: AgentResult) {
  return `${stage.id}:${result.agent}`;
}

const pairKey = (clinicId: string, specialtyId: string) => `${clinicId}:${specialtyId}`;

export function coordinateStage(stage: ScenarioStage, results: AgentResult[], policy?: PolicyAssessment): CoordinatorReport {
  if (policy?.stageId !== stage.id) policy = undefined;
  const recordsByPair = new Map(
    stage.records.map((record) => [pairKey(record.clinicId, record.specialtyId), record] as const),
  );
  const forecastsByPair = new Map(
    stage.records.map(
      (record) =>
        [
          pairKey(record.clinicId, record.specialtyId),
          forecastWait(record, stage.seasonalFactorBySpecialty[record.specialtyId]),
        ] as const,
    ),
  );

  const conflicts: string[] = [];
  const lentByPair = new Map<string, number>();

  for (const result of results) {
    const agentName = AGENT_CATALOG[result.agent].name;
    for (const transfer of result.transfers) {
      const label = SPECIALTY_LABELS[transfer.specialtyId];
      const clinic = CLINIC_NAMES[transfer.fromClinicId];
      const key = pairKey(transfer.fromClinicId, transfer.specialtyId);

      if (transfer.fromClinicId === transfer.toClinicId) {
        conflicts.push(`${agentName} proposes moving ${label} hours from ${clinic} to itself.`);
      }

      lentByPair.set(key, (lentByPair.get(key) ?? 0) + transfer.hoursPerWeek);

      const forecast = forecastsByPair.get(key);
      if (forecast && forecast.weeksUntilLimit !== null && forecast.weeksUntilLimit <= FORECAST_HORIZON_WEEKS) {
        conflicts.push(
          `${agentName} proposes lending ${transfer.hoursPerWeek} hours per week of ${label} from ${clinic}, but that clinic is ${describeLimitClause(forecast.weeksUntilLimit)}.`,
        );
      }
    }
  }

  for (const [key, lent] of lentByPair) {
    const record = recordsByPair.get(key);
    if (record && lent > record.freeSpecialistHoursPerWeek) {
      conflicts.push(
        `Proposed lending of ${lent} hours per week of ${SPECIALTY_LABELS[record.specialtyId]} from ${CLINIC_NAMES[record.clinicId]} exceeds its ${record.freeSpecialistHoursPerWeek} free hours.`,
      );
    }
  }

  const gaps: string[] = [];
  for (const record of stage.records) {
    if (record.waitingWeeksHistory.length < MIN_HISTORY_WEEKS) {
      gaps.push(
        `No ${MIN_HISTORY_WEEKS}-week waiting history for ${SPECIALTY_LABELS[record.specialtyId]} at ${CLINIC_NAMES[record.clinicId]}, so no forecast is possible.`,
      );
    }
  }
  for (const result of results) {
    if (result.evidence.length === 0) {
      gaps.push(`${AGENT_CATALOG[result.agent].name} found no evidence this stage.`);
    }
  }

  const findings = results.map(result => policy?.findings.find(finding => finding.agent === result.agent) ?? unavailablePolicyFinding(result.agent));
  for (const finding of findings) {
    if (finding.status === 'conflict') conflicts.push(`${AGENT_CATALOG[finding.agent].name}: ${finding.summary}`);
    gaps.push(`${AGENT_CATALOG[finding.agent].name} policy review: ${finding.summary}`);
  }
  return {
    conflicts,
    gaps,
    ...(policy ? { policyAssessment: policy } : {}),
    proposals: results.map((result, index) => ({ ...result, id: proposalIdFor(stage, result), policyReview: findings[index] })),
  };
}
