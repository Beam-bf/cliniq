export type StageId = 'baseline' | 'winter-surge' | 'specialist-leave';

export type AgentId = 'forecast' | 'routing' | 'task-shifting' | 'tele-pooling';

export type Decision = 'approved' | 'rejected' | 'changes_requested';

export type ProposalStatus = 'pending' | Decision;

export type SpecialtyId = 'psychiatry' | 'pediatrics' | 'respiratory' | 'long-term-care';

export type ClinicId = 'alpha' | 'bravo' | 'charlie' | 'delta' | 'echo' | 'foxtrot';

export interface ClinicSpecialtyRecord {
  clinicId: ClinicId;
  specialtyId: SpecialtyId;
  waitingWeeksHistory: number[];
  referralsPerWeek: number;
  freeSpecialistHoursPerWeek: number;
}

export interface DelegableTask {
  id: string;
  clinicId: ClinicId;
  specialtyId: SpecialtyId;
  name: string;
  specialistHoursPerWeek: number;
  delegable: boolean;
}

export interface ScenarioStage {
  id: StageId;
  label: string;
  description: string;
  seasonalFactorBySpecialty: Record<SpecialtyId, number>;
  records: ClinicSpecialtyRecord[];
}

export interface WaitForecast {
  currentWeeks: number;
  weeksUntilLimit: number | null;
  confidence: 'High' | 'Medium' | 'Low';
  confidenceNote: string;
}

export interface HourTransfer {
  specialtyId: SpecialtyId;
  fromClinicId: ClinicId;
  toClinicId: ClinicId;
  hoursPerWeek: number;
}

export interface AgentResult {
  agent: AgentId;
  summary: string;
  evidence: string[];
  recommendation: string;
  transfers: HourTransfer[];
}

export interface Proposal extends AgentResult {
  id: string;
  policyReview?: import('./policy/knowledgeTypes').PolicyFinding;
}

export interface CoordinatorReport {
  conflicts: string[];
  gaps: string[];
  proposals: Proposal[];
  policyAssessment?: import('./policy/knowledgeTypes').PolicyAssessment;
}

export interface PolicySource {
  id: string;
  verified: boolean;
  title: string;
  publisher: string;
  url: string | null;
  date: string;
  documentType: string;
  summary: string;
  passage: string | null;
  locator?: string;
  note?: string;
  unverifiedReason?: string;
}

export interface AuditEntry {
  id: string;
  time: string;
  stage: StageId;
  agent: AgentId;
  summary: string;
  evidence: string;
  decision: Decision;
  reason: string;
  proposalId?: string;
  planRevision?: string;
}
