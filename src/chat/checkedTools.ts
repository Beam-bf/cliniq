import { buildContext, inputError, LIMITS } from './context';
import type { ChatRequest, ChatAnswer } from './core';
import { CLINIC_NAMES, SPECIALTY_LABELS } from '../data/scenario';
import { forecastWait, describeLimitClause, FORECAST_HORIZON_WEEKS } from '../agents/forecast';
import { validateAdjustments, planRevision, recordKey } from '../planning/scenarioPlanning';
import { isPolicyQuestion, policyFollowup, policyEvidenceMatches } from '../policy/coverage';
import { validateEvidence } from '../policy/retrievalClient';
import type { PolicyAssessment } from '../policy/knowledgeTypes';
import { conversationReply, operationalFollowup, previousPolicyQuestion } from './intents';

export interface ChatTools {
  searchPolicy?: (query: string, previousQuery?: string) => Promise<unknown>;
  assessPolicy?: (request: ChatRequest) => Promise<unknown>;
  recordExecution?: (snapshot: unknown) => Promise<string>;
}
export interface CheckedFact { id: string; text: string; sourceIds?: string[] }
export interface PreparedChat {
  context: ReturnType<typeof buildContext>; facts: CheckedFact[]; defaults: string[];
  knowledge?: ChatAnswer['knowledge']; simulation: boolean; blocked?: string; conversational?: boolean;
}
const clinics = Object.keys(CLINIC_NAMES);
const specialties = Object.keys(SPECIALTY_LABELS);
function clinicIn(text: string) { return clinics.find(id => new RegExp(`\\b${id}\\b`, 'i').test(text)); }
function specialtyIn(text: string) {
  const normalized = text.toLowerCase().replace(/-/g, ' ');
  return specialties.find(id => normalized.includes(id.replace(/-/g, ' '))) ??
    (/paediatric|children|pediatric/.test(normalized) ? 'pediatrics' : /mental health/.test(normalized) ? 'psychiatry' : undefined);
}
function scope(request: ChatRequest) {
  const past = (operationalFollowup.test(request.question))
    ? [...request.history].reverse().map(turn => turn.content) : [];
  return { clinic: clinicIn(request.question) ?? past.map(clinicIn).find(Boolean), specialty: specialtyIn(request.question) ?? past.map(specialtyIn).find(Boolean) };
}
export function blockedQuestion(request: ChatRequest) {
  const problem = inputError(request.question);
  if (problem) return problem;
  const q = request.question;
  if ((/\bwinter(?: surge)?\b/i.test(q) && request.scenarioId !== 'winter-surge') || (/\bspecialist leave\b/i.test(q) && request.scenarioId !== 'specialist-leave'))
    return 'That scenario is not currently selected. Select it in the planner before asking for its figures; I will not mix independent scenarios.';
  if (/\b(approve|reject|book|cancel|delete|save|submit|schedule|modify|update|change)\b/i.test(q) && !/\b(what.if|simulat|suppose|hypothetical)\b/i.test(q) && !/\b(?:how (?:do|can|should) (?:i|we)|how (?:is|does)|schedule rules|change assumptions)\b/i.test(q))
    return 'I cannot approve, reject, save a plan or change schedules. Use Decisions for a human review. No action has been taken.';
  if (/ignore.{0,40}(?:instruction|rule)|reveal.{0,40}(?:key|secret|prompt)|system prompt|print.{0,20}(?:key|secret)/i.test(q))
    return 'I can only explain the supplied planning data and verified policy context. I cannot reveal credentials or override the planning rules.';
  const unknown = [...q.matchAll(/\bclinic\s+([a-z][a-z-]*)/gi)].map(match => match[1].toLowerCase()).find(name => !clinics.includes(name) && !['capacity','shortages','pressure','data','hours','planning','availability','statistics','records','trends','comparison','forecast','by','and','is','has','with'].includes(name));
  if (unknown || /\b(oncology|cardiology|gastroenterology|neurology)\b/i.test(q))
    return 'The operational dataset only contains Alpha to Foxtrot and psychiatry, pediatrics, respiratory and long-term care. I cannot supply figures or recommendations for a missing clinic or specialty.';
  return conversationReply(request);
}

// Deliberately bounded input grammar. The LLM never supplies simulation numbers.
export function simulateRequest(request: ChatRequest): ChatRequest | undefined {
  if (!/what.if|simulate|suppose|hypothetical/i.test(request.question)) return;
  if (clinics.filter(id => new RegExp(`\\b${id}\\b`, 'i').test(request.question)).length > 1 || specialties.filter(id => request.question.toLowerCase().replace(/-/g,' ').includes(id.replace(/-/g,' '))).length > 1)
    throw new Error('Simulate one clinic and specialty at a time, with explicit values. No stored plan was changed.');
  if (/\b(?:double|halve|percent|percentages?|staff|doctors?|nurses?|beds?|slots?|appointments?|schedule|book|approve)\b|%/i.test(request.question))
    throw new Error('This simulation supports only explicit free specialist hours/week, referrals/week and waiting weeks. Restate supported inputs; no stored plan or schedule was changed.');
  const selected = scope(request);
  if (!selected.clinic || !selected.specialty) throw new Error('For a what-if, specify a supported clinic and specialty, for example Alpha psychiatry, and an explicit number of free hours, waiting weeks or referrals.');
  const current = buildContext(request).stage.records.find(row => row.clinicId === selected.clinic && row.specialtyId === selected.specialty)!;
  const next = { waitingWeeks: current.waitingWeeksHistory[current.waitingWeeksHistory.length - 1], freeHours: current.freeSpecialistHoursPerWeek, referrals: current.referralsPerWeek };
  let count = 0;
  const fields: [keyof typeof next, string][] = [['freeHours', '(?:(?:free|available|specialist)\\s+)*hours?'], ['referrals', 'referrals?'], ['waitingWeeks', '(?:waiting\\s+weeks?|weeks?\\s+(?:waiting|wait)|(?:waiting|wait)(?:\\s+time)?)']];
  for (const [field, label] of fields) {
    const matches: { value: number; clause: string }[] = [];
    for (const clause of request.question.split(/[,;]|\band\b/i)) {
      const before = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:more\\s+|fewer\\s+|less\\s+)?${label}\\b`, 'i').exec(clause);
      const after = new RegExp(`\\b${label}(?:\\s+(?:to|at|by|were|was|are|is|be|of))*\\s+(\\d+(?:\\.\\d+)?)\\b`, 'i').exec(clause);
      if (before || after) matches.push({ value: Number((before ?? after)![1]), clause });
    }
    if (matches.length > 1) throw new Error('Use one unambiguous value per what-if field. No stored plan was changed.');
    if (!matches.length) {
      if (new RegExp(`\\b${label}\\b`, 'i').test(request.question)) throw new Error('Give an explicit numeric value for every simulated field. No stored plan was changed.');
      continue;
    }
    const { value, clause } = matches[0];
    const absolute = /\b(?:to|at|were|was|are|is|be|of|had|has)\s+\d/i.test(clause);
    next[field] = absolute ? value : /\b(increase|add|raise|more)\b/i.test(clause) ? next[field] + value : /\b(decrease|reduce|remove|fewer|less)\b/i.test(clause) ? next[field] - value : value;
    count++;
  }
  if (!count || /-\s*\d/.test(request.question)) throw new Error('Use explicit nonnegative what-if values with their units. No stored plan was changed.');
  const adjustments = validateAdjustments(request.scenarioId, { ...request.adjustments, [recordKey(selected.clinic, selected.specialty)]: next });
  return { ...request, adjustments };
}

export function prepareOfflineChat(request: ChatRequest, assessment?: PolicyAssessment): PreparedChat {
  const initial = buildContext(request);
  const blocked = blockedQuestion(request);
  if (blocked) return { context: initial, facts: [], defaults: [], simulation: false, blocked, conversational: true };
  let working = request;
  try {
    working = simulateRequest(request) ?? request;
    const previousReply = [...request.history].reverse().find(turn => turn.role === 'assistant');
    if (working === request && policyFollowup.test(request.question) && previousReply?.content.startsWith('SIMULATED ')) {
      const previousInput = [...request.history].reverse().find(turn => turn.role === 'user' && /what.if|simulate|suppose|hypothetical/i.test(turn.content));
      if (!previousInput) throw new Error('The earlier simulation inputs are outside the bounded conversation context. Restate the clinic, specialty and explicit what-if values; no stored plan has changed.');
      const replay = simulateRequest({ ...request, question: previousInput.content });
      if (!replay) throw new Error('Restate the explicit what-if values before continuing that simulation.');
      working = { ...request, adjustments: replay.adjustments };
    }
  }
  catch (error) { return { context: initial, facts: [], defaults: [], simulation: true, blocked: error instanceof Error ? error.message : 'Unable to validate this simulation.' }; }
  const simulation = working !== request;
  const context = buildContext(working, assessment);
  const facts: CheckedFact[] = [];
  const selected = scope(working);
  const agentRequested = (agent: string, text: string) => agent === 'task-shifting' ? /task[- ]?shift|delegat|routine/i.test(text) : agent === 'tele-pooling' ? /tele[- ]?pool/i.test(text) : text.toLowerCase().includes(agent);
  const rows = context.stage.records.filter(row => (!selected.clinic || row.clinicId === selected.clinic) && (!selected.specialty || row.specialtyId === selected.specialty));
  const previous = [...request.history].reverse().find(turn => turn.role === 'user' && /forecast|routing|task.?shift|delegat|tele.?pool/i.test(turn.content));
  const q = operationalFollowup.test(request.question) && /^(?:why|explain (?:that|it|the recommendation)|tell me more)/i.test(request.question) && previous ? `${request.question} ${previous.content}` : request.question;
  const policy = isPolicyQuestion(request.question, previousPolicyQuestion(request));
  if (policy) {
    facts.push({ id: 'policy:unavailable', text: 'The verified policy service is unavailable. I cannot establish policy support or authorization. No citation or vector result has been invented.' });
  }
  if (!policy || /forecast|capacity|compare|routing|task|tele.?pool|conflict|approval|hold/i.test(q)) {
    if (!selected.clinic && !selected.specialty) facts.push({ id: 'summary', text: `Across this fictional scenario: ${context.summary.freeHours} free specialist hours/week; ${context.summary.referrals} referrals/week; average current wait ${context.summary.averageWait.toFixed(1)} weeks. These are scenario inputs, not Dubai public statistics or measured clinical outcomes.` });
    for (const row of rows) {
      const key = recordKey(row.clinicId, row.specialtyId);
      const name = `${CLINIC_NAMES[row.clinicId]} ${SPECIALTY_LABELS[row.specialtyId]}`;
      facts.push({ id: `clinic:${key}`, text: `${name}: current wait ${row.waitingWeeksHistory[row.waitingWeeksHistory.length - 1]} weeks; ${row.freeSpecialistHoursPerWeek} free specialist hours/week; ${row.referralsPerWeek} referrals/week. These are currently applied fictional inputs.` });
      const forecast = forecastWait(row, context.stage.seasonalFactorBySpecialty[row.specialtyId]);
      facts.push({ id: `forecast:${key}`, text: `${name}: current wait ${forecast.currentWeeks} weeks; ${describeLimitClause(forecast.weeksUntilLimit)}. Planning horizon: ${FORECAST_HORIZON_WEEKS} weeks${forecast.weeksUntilLimit !== null && forecast.weeksUntilLimit > FORECAST_HORIZON_WEEKS ? '; this threshold estimate lies beyond that horizon' : ''}. This is the existing straight-line, rule-based estimate; ${forecast.confidenceNote} It assumes the recent linear trend and selected seasonal factor continue. Fit consistency is not validated predictive accuracy. The eight-week limit is a fictional planning threshold, not a legal target. Referral/hour changes alone do not predict future waiting times.` });
    }
    for (const id of Object.keys(SPECIALTY_LABELS) as (keyof typeof SPECIALTY_LABELS)[]) {
      const subset = rows.filter(row => row.specialtyId === id);
      if (!subset.length) continue;
      const mean = subset.reduce((sum, row) => sum + row.waitingWeeksHistory[row.waitingWeeksHistory.length - 1], 0) / subset.length;
      facts.push({ id: `capacity:${id}`, text: `${SPECIALTY_LABELS[id]} in the selected scope: average current wait ${mean.toFixed(1)} weeks; ${subset.reduce((s,r)=>s+r.freeSpecialistHoursPerWeek,0)} free specialist hours/week; ${subset.reduce((s,r)=>s+r.referralsPerWeek,0)} referrals/week. Waiting pressure alone does not establish an operational workforce shortage.` });
    }
    const explanations = {
      forecast: 'Uses the recent straight-line waiting trend and seasonal factor to flag the eight-week scenario threshold within an eight-week planning horizon. Fit consistency is not prospective accuracy.',
      routing: 'Chooses the specialty with the highest mean wait, then ranks clinics with positive free hours by current waiting time. Other clinics appear lower in that ranking; travel, referral suitability and intake limits are not modelled.',
      'task-shifting': 'Considers only tasks explicitly marked delegable, ranked by specialist hours. Tasks not marked delegable stay with specialists. Hours are potential reassignment, not measured savings; actual competence and privileges remain unverified.',
      'tele-pooling': 'Targets up to two queues per specialty at four or more waiting weeks, seeks four hours for each, and uses other clinics with available hours. It cannot predict patient outcomes; donor safety and policy prerequisites require review.',
    };
    for (const agent of context.agents) facts.push({ id: `recommendation:${agent.agent}`, text: `Scenario-wide ${agent.agent}: ${agent.summary} Recommendation: ${agent.recommendation} ${agent.evidence.slice(0, 2).join(' ')} Why and constraints: ${explanations[agent.agent]} Strategies are complementary rules, not an evaluated winner across all strategies. Human review is required; these deterministic results do not authorize implementation.` });
    facts.push({ id: 'coordinator:conflicts', text: `Coordinator checks: ${context.conflicts.join(' ') || 'No operational conflict was flagged.'} Evidence/approval holds: ${context.gaps.join(' ') || 'No additional evidence gap was recorded.'} A recorded approval never grants clinical permission.` });
    facts.push({ id: 'limits', text: 'These are fictional aggregate inputs and deterministic planning rules. Adding hours does not model future waiting-time reductions. No actual staff licence, privilege, patient consent or clinical eligibility is established; human review is required.' });
  }
  if (simulation) facts.unshift({ id: 'simulation:inputs', text: `Isolated what-if only: ${rows.map(row => `${CLINIC_NAMES[row.clinicId]} ${SPECIALTY_LABELS[row.specialtyId]} uses waiting input ${row.waitingWeeksHistory[row.waitingWeeksHistory.length - 1]} weeks, ${row.freeSpecialistHoursPerWeek} free hours/week and ${row.referralsPerWeek} referrals/week`).join('; ')}. The four algorithms were rerun on this copy. No stored plan, approval or schedule changed. Changed waiting weeks are an input, not a predicted outcome.` });
  const defaults = simulation ? ['simulation:inputs', ...(!/what.if|simulate|suppose|hypothetical/i.test(request.question) && rows.length === 1 ? [`clinic:${recordKey(rows[0].clinicId,rows[0].specialtyId)}`] : ['recommendation:forecast', 'recommendation:tele-pooling'])]
    : policy ? [facts[0].id]
    : /conflict|approval|hold/i.test(q) ? ['coordinator:conflicts']
    : /compare|routing|task|delegat|tele.?pool|recommend|operat/i.test(q) ? context.agents.filter(agent => (/compare|operat/i.test(q) && agent.agent !== 'forecast') || agentRequested(agent.agent, q)).map(agent => `recommendation:${agent.agent}`)
    : /forecast|trend|risk/i.test(q) ? [...(!selected.clinic && !selected.specialty ? ['recommendation:forecast'] : []), ...rows.slice(0, 3).map(row => `forecast:${recordKey(row.clinicId,row.specialtyId)}`)]
    : selected.clinic || selected.specialty ? (rows.length === 1 ? [`clinic:${recordKey(rows[0].clinicId,rows[0].specialtyId)}`] : facts.filter(f=>f.id.startsWith('capacity:')).map(f=>f.id)) : ['summary'];
  const chosen = defaults.length ? defaults : ['summary'];
  // Restrict selection to the resolved intent. Correct but unrelated results are
  // still irrelevant, and must never replace the requested answer.
  return { context, facts: facts.filter(f => chosen.includes(f.id)), defaults: chosen, simulation };
}

export async function prepareChat(request: ChatRequest, tools: ChatTools = {}): Promise<PreparedChat> {
  let prepared = prepareOfflineChat(request);
  if (prepared.blocked) return prepared;
  if (/conflict|approval|hold|recommend|routing|task|tele.?pool|operat/i.test(request.question) && tools.assessPolicy) {
    try {
      const working = { ...request, adjustments: prepared.context.whatIfChanges };
      const result = await tools.assessPolicy(working) as { assessment?: PolicyAssessment };
      const candidate = result.assessment;
      if (candidate?.engine === 'pgvector' && candidate.stageId === working.scenarioId && candidate.planRevision === planRevision(working.adjustments ?? {}) && Array.isArray(candidate.findings) && candidate.findings.length === 4 && new Set(candidate.findings.map(f => f.agent)).size === 4 && candidate.findings.every(f => ['forecast','routing','task-shifting','tele-pooling'].includes(f.agent) && ['human-review','conflict','unsupported'].includes(f.status) && typeof f.summary === 'string' && Array.isArray(f.flags) && f.flags.every(flag => typeof flag === 'string') && f.automaticAuthorization === false && validateEvidence(f.evidence))) prepared = prepareOfflineChat(request, candidate);
    } catch { /* Unavailable evidence remains an explicit coordinator gap. */ }
  }
  if (prepared.facts.some(f => f.id === 'policy:unavailable')) {
    try {
      const previousQuery = previousPolicyQuestion(request);
      const result = await tools.searchPolicy?.(request.question, previousQuery) as { engine?: string; evidence?: unknown; coverage?: { status?: string }; retrievalId?: string; kbRevision?: string; embeddingModel?: string; resolvedQuery?: string } | undefined;
      if (result?.engine !== 'pgvector' || !validateEvidence(result.evidence) || !policyEvidenceMatches(request.question, previousQuery, result.evidence) || !['applicability-unresolved','insufficient-evidence'].includes(result.coverage?.status ?? '') || (result.coverage?.status === 'insufficient-evidence' && result.evidence.length) || !/^[a-f0-9]{64}$/.test(result.kbRevision ?? '') || typeof result.retrievalId !== 'string' || typeof result.embeddingModel !== 'string') throw new Error('Unavailable');
      const evidence = result.evidence;
      prepared.knowledge = { retrievalId: result.retrievalId, kbRevision: result.kbRevision!, embeddingModel: result.embeddingModel, evidence, resolvedQuery: result.resolvedQuery };
      prepared.facts = prepared.facts.map(f => f.id === 'policy:unavailable' ? { id: 'policy:evidence', text: evidence.length ? 'Applicability remains unresolved. The exact retrieved clauses below are candidate evidence, not permission for a clinic or staffing action. Human review of scope, exceptions, credentials and facility capability is required.' : 'No relevant verified policy evidence was found in the reviewed corpus. It does not establish an answer to this question; this is missing evidence, not proof that the claim is false. I cannot establish policy support.', sourceIds: evidence.map(hit => hit.id) } : f);
      prepared.defaults = prepared.defaults.map(id => id === 'policy:unavailable' ? 'policy:evidence' : id);
    } catch { /* Preserve explicit unavailable result; never invent evidence. */ }
  }
  return prepared;
}

export function validatedSelection(raw: string, prepared: PreparedChat): string[] | undefined {
  try {
    const plan = JSON.parse(raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
    if (!plan || typeof plan !== 'object' || Object.keys(plan).length !== 1 || !Array.isArray(plan.factIds) || plan.factIds.length > 8 || new Set(plan.factIds).size !== plan.factIds.length || !plan.factIds.every((id: unknown) => typeof id === 'string' && prepared.facts.some(fact => fact.id === id))) return;
    if (!prepared.simulation && plan.factIds.length && !prepared.defaults.every(id => plan.factIds.includes(id))) return;
    // An isolated simulation cannot be presented without its explicit simulation label.
    return prepared.simulation && plan.factIds.length && !plan.factIds.includes('simulation:inputs') ? ['simulation:inputs', ...plan.factIds.slice(0,7)] : plan.factIds;
  } catch { return; }
}

export function renderCheckedAnswer(prepared: PreparedChat, ids: string[], mode: 'live' | 'offline', notice: string): ChatAnswer {
  const selected = ids.map(id => prepared.facts.find(fact => fact.id === id)).filter((fact): fact is CheckedFact => Boolean(fact));
  const sources = selected.flatMap(fact => fact.sourceIds ?? []);
  const knowledge = sources.length || selected.some(f=>f.id==='policy:evidence') ? prepared.knowledge : undefined;
  const text = prepared.blocked ?? (selected.length ? selected.map(fact => fact.text).join('\n\n') : 'I cannot establish an answer from the approved results for this question. Please specify a supported clinic, specialty or planning task.');
  return { answer: prepared.conversational ? text : `${prepared.simulation ? 'SIMULATED ' : ''}Scenario data: ${prepared.context.stage.label}:\n${text}\n\n${LIMITS}`, mode, sourceIds: [...new Set(sources)], notice,
    ...(knowledge ? { knowledge } : {}) };
}
