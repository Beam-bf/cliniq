import type {
  ClinicId,
  ClinicSpecialtyRecord,
  DelegableTask,
  ScenarioStage,
  SpecialtyId,
  StageId,
} from '@/types';

export const CLINIC_IDS: ClinicId[] = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'];

export const SPECIALTY_IDS: SpecialtyId[] = ['psychiatry', 'pediatrics', 'respiratory', 'long-term-care'];

export const STAGE_ORDER: StageId[] = ['baseline', 'winter-surge', 'specialist-leave'];

export const CLINIC_NAMES: Record<ClinicId, string> = {
  alpha: 'Clinic Alpha',
  bravo: 'Clinic Bravo',
  charlie: 'Clinic Charlie',
  delta: 'Clinic Delta',
  echo: 'Clinic Echo',
  foxtrot: 'Clinic Foxtrot',
};

export const SPECIALTY_LABELS: Record<SpecialtyId, string> = {
  psychiatry: 'Psychiatry',
  pediatrics: 'Pediatrics',
  respiratory: 'Respiratory',
  'long-term-care': 'Long-term care',
};

const BASELINE_RECORDS: ClinicSpecialtyRecord[] = [
  { clinicId: 'alpha', specialtyId: 'psychiatry', waitingWeeksHistory: [4.0, 4.2, 4.1, 4.4, 4.5, 4.6], referralsPerWeek: 38, freeSpecialistHoursPerWeek: 20 },
  { clinicId: 'bravo', specialtyId: 'psychiatry', waitingWeeksHistory: [3.1, 3.0, 3.2, 3.1, 3.3, 3.2], referralsPerWeek: 30, freeSpecialistHoursPerWeek: 12 },
  { clinicId: 'charlie', specialtyId: 'psychiatry', waitingWeeksHistory: [5.2, 5.4, 5.6, 5.9, 6.1, 6.4], referralsPerWeek: 44, freeSpecialistHoursPerWeek: 24 },
  { clinicId: 'delta', specialtyId: 'psychiatry', waitingWeeksHistory: [2.8, 2.7, 2.9, 2.6, 2.8, 2.7], referralsPerWeek: 26, freeSpecialistHoursPerWeek: 8 },
  { clinicId: 'echo', specialtyId: 'psychiatry', waitingWeeksHistory: [4.8, 4.7, 4.9, 4.6, 4.8, 4.9], referralsPerWeek: 35, freeSpecialistHoursPerWeek: 16 },
  { clinicId: 'foxtrot', specialtyId: 'psychiatry', waitingWeeksHistory: [3.6, 3.9, 4.0, 4.1, 4.3, 4.4], referralsPerWeek: 31, freeSpecialistHoursPerWeek: 10 },
  { clinicId: 'alpha', specialtyId: 'pediatrics', waitingWeeksHistory: [2.4, 2.5, 2.4, 2.6, 2.7, 2.8], referralsPerWeek: 40, freeSpecialistHoursPerWeek: 14 },
  { clinicId: 'bravo', specialtyId: 'pediatrics', waitingWeeksHistory: [3.6, 3.5, 3.7, 3.6, 3.8, 3.9], referralsPerWeek: 33, freeSpecialistHoursPerWeek: 10 },
  { clinicId: 'charlie', specialtyId: 'pediatrics', waitingWeeksHistory: [2.0, 2.1, 2.2, 2.1, 2.3, 2.2], referralsPerWeek: 28, freeSpecialistHoursPerWeek: 18 },
  { clinicId: 'delta', specialtyId: 'pediatrics', waitingWeeksHistory: [4.2, 4.4, 4.5, 4.6, 4.7, 4.9], referralsPerWeek: 36, freeSpecialistHoursPerWeek: 6 },
  { clinicId: 'echo', specialtyId: 'pediatrics', waitingWeeksHistory: [3.1, 3.0, 3.2, 3.1, 3.0, 3.1], referralsPerWeek: 30, freeSpecialistHoursPerWeek: 12 },
  { clinicId: 'foxtrot', specialtyId: 'pediatrics', waitingWeeksHistory: [2.7, 2.8, 2.6, 2.9, 2.8, 2.9], referralsPerWeek: 25, freeSpecialistHoursPerWeek: 8 },
  { clinicId: 'alpha', specialtyId: 'respiratory', waitingWeeksHistory: [1.8, 1.9, 1.9, 2.0, 2.1, 2.0], referralsPerWeek: 22, freeSpecialistHoursPerWeek: 6 },
  { clinicId: 'bravo', specialtyId: 'respiratory', waitingWeeksHistory: [2.9, 3.0, 3.1, 3.0, 3.2, 3.3], referralsPerWeek: 27, freeSpecialistHoursPerWeek: 8 },
  { clinicId: 'charlie', specialtyId: 'respiratory', waitingWeeksHistory: [2.2, 2.3, 2.2, 2.4, 2.3, 2.5], referralsPerWeek: 24, freeSpecialistHoursPerWeek: 10 },
  { clinicId: 'delta', specialtyId: 'respiratory', waitingWeeksHistory: [3.4, 3.5, 3.6, 3.7, 3.6, 3.8], referralsPerWeek: 29, freeSpecialistHoursPerWeek: 4 },
  { clinicId: 'echo', specialtyId: 'respiratory', waitingWeeksHistory: [2.5, 2.4, 2.6, 2.5, 2.7, 2.6], referralsPerWeek: 21, freeSpecialistHoursPerWeek: 6 },
  { clinicId: 'foxtrot', specialtyId: 'respiratory', waitingWeeksHistory: [2.0, 2.1, 2.0, 2.2, 2.1, 2.2], referralsPerWeek: 19, freeSpecialistHoursPerWeek: 8 },
  { clinicId: 'alpha', specialtyId: 'long-term-care', waitingWeeksHistory: [6.0, 6.2, 6.1, 6.4, 6.5, 6.6], referralsPerWeek: 18, freeSpecialistHoursPerWeek: 10 },
  { clinicId: 'bravo', specialtyId: 'long-term-care', waitingWeeksHistory: [5.1, 5.0, 5.2, 5.1, 5.3, 5.2], referralsPerWeek: 16, freeSpecialistHoursPerWeek: 6 },
  { clinicId: 'charlie', specialtyId: 'long-term-care', waitingWeeksHistory: [7.0, 7.2, 7.3, 7.5, 7.6, 7.8], referralsPerWeek: 20, freeSpecialistHoursPerWeek: 12 },
  { clinicId: 'delta', specialtyId: 'long-term-care', waitingWeeksHistory: [4.0, 4.1, 4.0, 4.2, 4.1, 4.3], referralsPerWeek: 14, freeSpecialistHoursPerWeek: 8 },
  { clinicId: 'echo', specialtyId: 'long-term-care', waitingWeeksHistory: [5.5, 5.6, 5.8, 5.7, 5.9, 6.0], referralsPerWeek: 15, freeSpecialistHoursPerWeek: 4 },
  { clinicId: 'foxtrot', specialtyId: 'long-term-care', waitingWeeksHistory: [4.6, 4.5, 4.7, 4.8, 4.7, 4.9], referralsPerWeek: 12, freeSpecialistHoursPerWeek: 6 },
];

const WINTER_RECORDS: ClinicSpecialtyRecord[] = [
  ...BASELINE_RECORDS.filter((record) => record.specialtyId === 'psychiatry' || record.specialtyId === 'long-term-care'),
  { clinicId: 'alpha', specialtyId: 'pediatrics', waitingWeeksHistory: [3.6, 3.9, 4.1, 4.4, 4.8, 5.1], referralsPerWeek: 46, freeSpecialistHoursPerWeek: 14 },
  { clinicId: 'bravo', specialtyId: 'pediatrics', waitingWeeksHistory: [4.9, 5.1, 5.3, 5.6, 5.8, 6.0], referralsPerWeek: 39, freeSpecialistHoursPerWeek: 10 },
  { clinicId: 'charlie', specialtyId: 'pediatrics', waitingWeeksHistory: [3.2, 3.4, 3.3, 3.6, 3.8, 4.0], referralsPerWeek: 33, freeSpecialistHoursPerWeek: 18 },
  { clinicId: 'delta', specialtyId: 'pediatrics', waitingWeeksHistory: [5.8, 6.0, 6.3, 6.5, 6.8, 7.0], referralsPerWeek: 42, freeSpecialistHoursPerWeek: 6 },
  { clinicId: 'echo', specialtyId: 'pediatrics', waitingWeeksHistory: [4.2, 4.4, 4.5, 4.6, 4.9, 5.0], referralsPerWeek: 36, freeSpecialistHoursPerWeek: 12 },
  { clinicId: 'foxtrot', specialtyId: 'pediatrics', waitingWeeksHistory: [3.8, 4.0, 4.1, 4.3, 4.5, 4.6], referralsPerWeek: 31, freeSpecialistHoursPerWeek: 8 },
  { clinicId: 'alpha', specialtyId: 'respiratory', waitingWeeksHistory: [3.0, 3.3, 3.5, 3.8, 4.0, 4.2], referralsPerWeek: 30, freeSpecialistHoursPerWeek: 6 },
  { clinicId: 'bravo', specialtyId: 'respiratory', waitingWeeksHistory: [4.2, 4.4, 4.6, 4.8, 5.0, 5.3], referralsPerWeek: 37, freeSpecialistHoursPerWeek: 8 },
  { clinicId: 'charlie', specialtyId: 'respiratory', waitingWeeksHistory: [3.4, 3.6, 3.5, 3.8, 4.0, 4.1], referralsPerWeek: 33, freeSpecialistHoursPerWeek: 10 },
  { clinicId: 'delta', specialtyId: 'respiratory', waitingWeeksHistory: [4.8, 5.0, 5.2, 5.4, 5.5, 5.7], referralsPerWeek: 38, freeSpecialistHoursPerWeek: 4 },
  { clinicId: 'echo', specialtyId: 'respiratory', waitingWeeksHistory: [3.6, 3.7, 3.9, 4.0, 4.2, 4.4], referralsPerWeek: 30, freeSpecialistHoursPerWeek: 6 },
  { clinicId: 'foxtrot', specialtyId: 'respiratory', waitingWeeksHistory: [3.1, 3.3, 3.2, 3.4, 3.6, 3.7], referralsPerWeek: 28, freeSpecialistHoursPerWeek: 8 },
];

const LEAVE_RECORDS: ClinicSpecialtyRecord[] = BASELINE_RECORDS.map((record) =>
  // One 16-hour specialist removed from Clinic Charlie's psychiatry hours.
  record.clinicId === 'charlie' && record.specialtyId === 'psychiatry'
    ? { ...record, waitingWeeksHistory: [5.8, 6.0, 6.3, 6.8, 7.2, 7.6], freeSpecialistHoursPerWeek: 8 }
    : record,
);

const NO_SEASONAL_EFFECT: Record<SpecialtyId, number> = {
  psychiatry: 1,
  pediatrics: 1,
  respiratory: 1,
  'long-term-care': 1,
};

export const SCENARIO_STAGES: Record<StageId, ScenarioStage> = {
  baseline: {
    id: 'baseline',
    label: 'Stage 1 Baseline',
    description: 'Normal weekly operations across all six clinics.',
    seasonalFactorBySpecialty: NO_SEASONAL_EFFECT,
    records: BASELINE_RECORDS,
  },
  'winter-surge': {
    id: 'winter-surge',
    label: 'Stage 2 Winter surge',
    description: 'Respiratory and pediatric waits rise with winter demand.',
    seasonalFactorBySpecialty: {
      psychiatry: 1,
      pediatrics: 1.1,
      respiratory: 1.2,
      'long-term-care': 1,
    },
    records: WINTER_RECORDS,
  },
  'specialist-leave': {
    id: 'specialist-leave',
    label: 'Stage 3 Specialist leaves',
    description: 'A specialist is away, removing hours from Clinic Charlie.',
    seasonalFactorBySpecialty: NO_SEASONAL_EFFECT,
    records: LEAVE_RECORDS,
  },
};

export const DELEGABLE_TASKS: DelegableTask[] = [
  { id: 'task-1', clinicId: 'alpha', specialtyId: 'psychiatry', name: 'Routine medication refills', specialistHoursPerWeek: 3, delegable: true },
  { id: 'task-2', clinicId: 'bravo', specialtyId: 'psychiatry', name: 'Intake questionnaire review', specialistHoursPerWeek: 2.5, delegable: true },
  { id: 'task-3', clinicId: 'charlie', specialtyId: 'psychiatry', name: 'Follow-up symptom checks', specialistHoursPerWeek: 4, delegable: true },
  { id: 'task-4', clinicId: 'charlie', specialtyId: 'psychiatry', name: 'Complex case reviews', specialistHoursPerWeek: 3, delegable: false },
  { id: 'task-5', clinicId: 'alpha', specialtyId: 'pediatrics', name: 'Vaccine record checks', specialistHoursPerWeek: 2, delegable: true },
  { id: 'task-6', clinicId: 'delta', specialtyId: 'pediatrics', name: 'Growth chart updates', specialistHoursPerWeek: 1.5, delegable: true },
  { id: 'task-7', clinicId: 'echo', specialtyId: 'respiratory', name: 'Inhaler technique teaching', specialistHoursPerWeek: 2, delegable: true },
  { id: 'task-8', clinicId: 'delta', specialtyId: 'respiratory', name: 'Spirometry interpretation', specialistHoursPerWeek: 2, delegable: false },
  { id: 'task-9', clinicId: 'foxtrot', specialtyId: 'respiratory', name: 'Oxygen therapy check-ins', specialistHoursPerWeek: 1.5, delegable: true },
  { id: 'task-10', clinicId: 'alpha', specialtyId: 'long-term-care', name: 'Routine wound dressing review', specialistHoursPerWeek: 2, delegable: true },
  { id: 'task-11', clinicId: 'charlie', specialtyId: 'long-term-care', name: 'Medication round sign-off', specialistHoursPerWeek: 2.5, delegable: true },
  { id: 'task-12', clinicId: 'echo', specialtyId: 'long-term-care', name: 'Care plan reviews', specialistHoursPerWeek: 2, delegable: false },
];
