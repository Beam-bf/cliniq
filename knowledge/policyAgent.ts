import { randomUUID } from 'node:crypto';
import type { KnowledgeStore } from './store.ts';
import type { AgentId, StageId } from '../src/types.ts';
import type { PolicyAssessment, PolicyEvidence, PolicyFinding } from '../src/policy/knowledgeTypes.ts';

const MANDATES: Record<AgentId, { query: string; documents: string[]; checks: string[] }> = {
  forecast: { query: 'non acute long term care beds undersupply capacity planning demand', documents: ['DHA-CAPACITY-2022-2033'], checks: [] },
  routing: { query: 'Patient referrals electronically E-referral consent referral agreements', documents: ['DHA-TELEHEALTH-4'], checks: ['patientConsent'] },
  'task-shifting': { query: 'clinical privileges scope of practice license professional competencies specialty', documents: ['DHA-PRIVILEGING-2'], checks: ['licensed', 'privileged'] },
  'tele-pooling': { query: 'telehealth physician led licensed privileged direction clinical supervision', documents: ['DHA-TELEHEALTH-4', 'DHA-PRIVILEGING-2'], checks: ['licensed', 'privileged', 'physicianLed', 'supervision'] },
};
const CHECKS: Record<string, string> = {
  patientConsent: 'Consent and referral arrangements for electronic referrals are not established; the e-claims exception needs separate applicability review.',
  licensed: 'The relevant professional/facility licence has not been established.',
  privileged: 'Clinical privileges and competence for the proposed duties have not been established.',
  physicianLed: 'Physician leadership of the proposed telehealth service has not been established.',
  supervision: 'Required clinical supervision for nurse/allied-health telehealth activity has not been established.',
};
const CLAUSE_MATCH: Record<string, RegExp> = {
  patientConsent: /consent/i, licensed: /licen[cs]/i, privileged: /privileg/i,
  physicianLed: /physician[- ]led/i, supervision: /clinical supervision/i,
};
export type PlanningChecks = Partial<Record<'patientConsent' | 'licensed' | 'privileged' | 'physicianLed' | 'supervision', boolean>> & {
  referralMode?: 'electronic' | 'in-person' | 'unknown';
  professionalRole?: 'physician' | 'nurse-or-allied' | 'unknown';
};

export function verifyCitations(evidence: PolicyEvidence[], citations: { id: string; quote: string }[]) {
  return citations.length > 0 && citations.every(citation => {
    const source = evidence.find(hit => hit.id === citation.id);
    return Boolean(source && citation.quote.trim() && source.passage.includes(citation.quote));
  });
}

export async function assessPolicy(store: KnowledgeStore, stageId: StageId, planRevision: string, checks: PlanningChecks = {}, asOf = new Date().toISOString().slice(0, 10)): Promise<PolicyAssessment> {
  const status = await store.status();
  const findings: PolicyFinding[] = [];
  for (const [agent, mandate] of Object.entries(MANDATES) as [AgentId, typeof MANDATES[AgentId]][]) {
    const evidence = await store.search(mandate.query, { documentIds: mandate.documents, limit: 3, asOf });
    const flags: string[] = [];
    let findingStatus: PolicyFinding['status'] = evidence.length ? 'human-review' : 'unsupported';
    if (!evidence.length) flags.push('No sufficiently relevant verified passage was retrieved for this mandate. Do not infer permission.');
    if (agent === 'forecast') flags.push('The capacity plan is planning guidance. It does not establish a legal eight-week waiting target or validate the fictional clinic forecast.');
    else {
      const regulatory = evidence.some(hit => ['regulatory-standard', 'regulatory-policy'].includes(hit.classification));
      if (!regulatory) { findingStatus = 'unsupported'; flags.push('Planning, strategy or research evidence cannot establish permission for this clinical activity.'); }
      for (const check of mandate.checks) {
        if (check === 'supervision' && checks.professionalRole === 'physician') continue;
        const clauseFound = evidence.some(hit => ['regulatory-standard', 'regulatory-policy'].includes(hit.classification) && CLAUSE_MATCH[check].test(hit.passage));
        if (!clauseFound) flags.push(`No retrieved clause establishes the '${check}' prerequisite; abstain from a policy conclusion for that check.`);
        if (checks[check as keyof PlanningChecks] !== true) flags.push(CHECKS[check]);
        if (clauseFound && checks[check as keyof PlanningChecks] === false && (agent !== 'routing' || checks.referralMode === 'electronic') &&
          (check !== 'supervision' || checks.professionalRole === 'nurse-or-allied')) {
          findingStatus = 'conflict'; flags.push(`Declared scenario condition '${check}=false' conflicts with a prerequisite requiring human review; no action is authorized.`);
        }
      }
    }
    if (agent === 'routing') flags.push('Retrieved electronic-referral provisions apply conditionally. The scenario does not establish that referrals are electronic, clinical suitability or receiving-facility agreement.');
    if (agent === 'task-shifting') flags.push('A fictional task marked delegable is not professional scope-of-practice evidence. Obtain task-specific nursing/GP scope and local privileging review.');
    if (agent === 'tele-pooling') flags.push('Spare specialist hours do not establish telehealth eligibility, facility capability, consent or cross-facility permission.');
    flags.push('A human planning approval records a review only; it does not grant clinical privileges or change schedules.');
    findings.push({ agent, status: findingStatus, evidence, flags, retrievalQuery: mandate.query, automaticAuthorization: false,
      summary: findingStatus === 'conflict' ? 'A declared scenario condition conflicts with a retrieved policy prerequisite.'
        : findingStatus === 'unsupported' ? 'The knowledge base does not establish support for this action.'
          : 'Applicability unresolved. Retrieved passages are review context; policy support for this particular action has not been established.' });
  }
  return { id: randomUUID(), evaluatedAt: new Date().toISOString(), asOf, stageId, planRevision,
    kbRevision: status.kbRevision, embeddingModel: status.model, engine: 'pgvector', findings };
}
