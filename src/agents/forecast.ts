import { CLINIC_NAMES, SPECIALTY_LABELS } from '@/data/scenario';
import type { AgentResult, ClinicSpecialtyRecord, ScenarioStage, WaitForecast } from '@/types';

export const WAIT_LIMIT_WEEKS = 8;
export const FORECAST_HORIZON_WEEKS = 8;
export const MIN_HISTORY_WEEKS = 6;

export function latestWaitWeeks(record: ClinicSpecialtyRecord) {
  return record.waitingWeeksHistory[record.waitingWeeksHistory.length - 1];
}

export function describeLimitClause(weeksUntilLimit: number | null) {
  if (weeksUntilLimit === null) return `not on track to reach the ${WAIT_LIMIT_WEEKS}-week limit`;
  if (weeksUntilLimit === 0) return `already at the ${WAIT_LIMIT_WEEKS}-week limit`;
  const unit = weeksUntilLimit === 1 ? 'week' : 'weeks';
  return `forecast to reach the ${WAIT_LIMIT_WEEKS}-week limit in about ${weeksUntilLimit} ${unit}`;
}

export function forecastWait(record: ClinicSpecialtyRecord, seasonalFactor: number): WaitForecast {
  const history = record.waitingWeeksHistory;
  const n = history.length;
  const meanX = (n - 1) / 2;
  const meanY = history.reduce((sum, value) => sum + value, 0) / n;

  let sxy = 0;
  let sxx = 0;
  history.forEach((value, x) => {
    sxy += (x - meanX) * (value - meanY);
    sxx += (x - meanX) ** 2;
  });
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = meanY - slope * meanX;

  const residuals = history.reduce((sum, value, x) => sum + (value - (intercept + slope * x)) ** 2, 0);
  const total = history.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  const fit = total === 0 ? 1 : Math.max(0, 1 - residuals / total);

  const projectedNow = (intercept + slope * (n - 1)) * seasonalFactor;
  let weeksUntilLimit: number | null;
  if (projectedNow >= WAIT_LIMIT_WEEKS) {
    weeksUntilLimit = 0;
  } else if (slope <= 0) {
    weeksUntilLimit = null;
  } else {
    weeksUntilLimit = Math.ceil((WAIT_LIMIT_WEEKS / seasonalFactor - intercept) / slope - (n - 1));
  }

  const confidence = fit >= 0.8 ? 'High' : fit >= 0.5 ? 'Medium' : 'Low';
  const reliability = {
    High: 'Waits have moved steadily, so the trend is a reasonable guide.',
    Medium: 'Waits have moved with some noise, so timing is approximate.',
    Low: 'Recent waits are volatile, so treat the timing as indicative only.',
  }[confidence];
  const seasonNote = seasonalFactor !== 1 ? ` Seasonal factor ${seasonalFactor.toFixed(2)} applied.` : '';

  return {
    currentWeeks: history[n - 1],
    weeksUntilLimit,
    confidence,
    confidenceNote: `${reliability} Trend consistency ${Math.round(fit * 100)}% over ${n} weeks.${seasonNote}`,
  };
}

export function runForecastAgent(stage: ScenarioStage): AgentResult {
  const forecasts = stage.records.map((record) => ({
    record,
    forecast: forecastWait(record, stage.seasonalFactorBySpecialty[record.specialtyId]),
  }));

  const sortByLimit = (a: (typeof forecasts)[number], b: (typeof forecasts)[number]) =>
    (a.forecast.weeksUntilLimit ?? Number.POSITIVE_INFINITY) - (b.forecast.weeksUntilLimit ?? Number.POSITIVE_INFINITY);

  const atRisk = forecasts
    .filter(({ forecast }) => forecast.weeksUntilLimit !== null && forecast.weeksUntilLimit <= FORECAST_HORIZON_WEEKS)
    .sort(sortByLimit);
  const nearest = [...forecasts].sort(sortByLimit).slice(0, 3);

  return {
    agent: 'forecast',
    summary:
      atRisk.length === 0
        ? `No clinic and specialty pair is forecast to reach the ${WAIT_LIMIT_WEEKS}-week limit within ${FORECAST_HORIZON_WEEKS} weeks.`
        : `${atRisk.length} of ${forecasts.length} clinic and specialty pairs are forecast to reach the ${WAIT_LIMIT_WEEKS}-week limit within ${FORECAST_HORIZON_WEEKS} weeks.`,
    evidence: nearest.map(({ record, forecast }) => {
      const confidence = `${forecast.confidence} confidence. ${forecast.confidenceNote}`;
      return `${CLINIC_NAMES[record.clinicId]} ${SPECIALTY_LABELS[record.specialtyId]}: now ${forecast.currentWeeks.toFixed(1)} weeks, ${describeLimitClause(forecast.weeksUntilLimit)}. ${confidence}`;
    }),
    recommendation:
      atRisk.length === 0
        ? 'Keep the current plan and re-check next week.'
        : 'Review cover for the flagged pairs before the next scheduling cycle.',
    transfers: [],
  };
}
