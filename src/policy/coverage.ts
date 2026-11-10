// Reviewed topic boundaries, not an entailment model or a claim of legal completeness.
// A high vector score alone never establishes that a question has been answered.
export interface PolicyTopic { id: string; label: string; documents: string[]; pages: number[]; query: string; anchor: RegExp }
const telehealth = ['DHA-TELEHEALTH-4'];
const privileging = ['DHA-PRIVILEGING-2'];
const TOPICS: [RegExp, PolicyTopic][] = [
  [/retention|retain|how long.*record|keep.*record/i, { id: 'retention', label: 'DHA telehealth record retention', documents: telehealth, pages: [46], query: 'telehealth health records retained minimum twenty five years last health encounter', anchor: /11\.10\.|twenty-five/ }],
  [/consent|refus(?:e|al)/i, { id: 'consent', label: 'DHA telehealth consent', documents: telehealth, pages: [40,41,42,43], query: 'telehealth informed documented electronic consent patient legal guardian', anchor: /consent/i }],
  [/supervis|nurs.*telehealth|allied.*telehealth/i, { id: 'supervision', label: 'DHA telehealth professional supervision', documents: telehealth, pages: [37], query: 'nurses allied health direction clinical supervision treating physician', anchor: /supervision/i }],
  [/physician[- ]led|physician leadership/i, { id: 'physician-led', label: 'DHA physician-led telehealth', documents: telehealth, pages: [37], query: 'telehealth services physician led', anchor: /physician-led|physician led/i }],
  [/cross[- ]facility|rotation|part[- ]time|memorandum|\bMOU\b/i, { id: 'cross-facility', label: 'DHA cross-facility privileging and entity agreements', documents: [...telehealth,...privileging], pages: [5,24], query: 'staff rotation cross facility privileging part time written contract memorandum understanding', anchor: /cross-facility|rotation|memorandum|part-time/i }],
  [/staffing|face[- ]to[- ]face|training/i, { id: 'staffing', label: 'DHA telehealth staffing and training', documents: telehealth, pages: [33], query: 'telehealth staffing must not compromise ongoing face to face in person services training', anchor: /staffing|training/i }],
  [/privileg|scope of practice|competenc/i, { id: 'privileging', label: 'DHA clinical privileging and scope', documents: privileging, pages: [2,3,5,6,7,8,9], query: 'clinical privileges scope of practice licence specialty competence facility capability', anchor: /privileg|scope of practice/i }],
  [/licen[cs]|facility requirements/i, { id: 'licensing', label: 'DHA telehealth licensing', documents: telehealth, pages: [27,37], query: 'DHA licensed telehealth facility professionals licensing categories privileges', anchor: /licens|licenc/i }],
  [/electronic referral|e-referral/i, { id: 'e-referral', label: 'DHA electronic-referral provisions', documents: telehealth, pages: [50], query: 'electronic referrals e-referral consent referral agreements exception', anchor: /13\.7\.|E-referral/i }],
  [/record|document.*encounter/i, { id: 'records', label: 'DHA telehealth encounter documentation', documents: telehealth, pages: [44,45,46], query: 'telehealth encounter accurate documentation electronic health records communications', anchor: /11\.[1-9]|documentation/i }],
  [/telehealth|teleconsultation/i, { id: 'telehealth', label: 'DHA telehealth scope', documents: telehealth, pages: [21,27,37], query: 'telehealth applicability DHA licensed facilities professionals exclusions', anchor: /telehealth/i }],
  [/capacity plan|non[- ]acute|long[- ]term care beds/i, { id: 'planning', label: 'DHA planning context only', documents: ['DHA-CAPACITY-2022-2033'], pages: [54], query: 'non acute long term care beds capacity planning undersupply', anchor: /non-acute|undersupply/i }],
  [/artificial intelligence|AI strategy|AI governance/i, { id: 'strategy', label: 'UAE AI strategy context only', documents: ['UAE-AI-2031'], pages: [22], query: 'national artificial intelligence governance regulation', anchor: /governance|regulation/i }],
];
export const policyFollowup = /^(?:and\b|what about\b|which (?:page|source|section)|where (?:is|does)|does (?:that|it)|can (?:that|it)|why\b|explain\b|tell me more\b)/i;
function outsideReviewedScope(question: string) {
  return /(?:eight|8)[ -]week|waiting.*(?:target|law|mandat)|(?:independent|autonomous).*(?:diagnos|prescrib)|(?:cross[- ]border|overseas|outside.*UAE).*(?:data|transfer)|(?:current|actual|2025|2030|2033).*(?:bed|gap)|\b\d+\s*(?:beds?|rooms?)\b|(?:how many|how much|total|shortfall|number).*(?:beds?|rooms?)|(?:beds?|rooms?).*(?:gap|shortfall|total)/i.test(question);
}
export function policyTopic(question: string): PolicyTopic | undefined {
  // No selected passage establishes waiting targets, individual permissions,
  // overseas data-transfer exceptions, diagnosis/prescribing rights or current bed totals.
  if (outsideReviewedScope(question)) return;
  return TOPICS.find(([pattern]) => pattern.test(question))?.[1];
}
export function isPolicyQuestion(question: string, previousPolicyQuery?: string) {
  return /policy|policies|regulat|scope|privileg|licen[cs]|DHA|\blaw\b|legal|permitted|consent|retention|telehealth|teleconsultation|rules? (?:apply|for)/i.test(question) || Boolean(previousPolicyQuery && policyFollowup.test(question));
}
export function resolvePolicyQuestion(question: string, previousPolicyQuery?: string) {
  // Only anaphoric follow-ups inherit prior topic context. Explicit new topics
  // and unsupported substantive questions cannot be repaired by old evidence.
  const anaphoric = /^(?:which (?:page|source|section)|where (?:is|does)|does (?:that|it)|can (?:that|it)|why[?!.\s]*$|explain (?:that|it)|tell me more)/i.test(question);
  const resolvedQuery = previousPolicyQuery && anaphoric && !outsideReviewedScope(question) ? previousPolicyQuery : question;
  return { resolvedQuery, topic: policyTopic(resolvedQuery) };
}
