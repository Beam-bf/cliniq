import type { ChatRequest } from './core';
import { isPolicyQuestion } from '../policy/coverage';

// Public identity is backed by README.md and the visible application branding.
// No verified contributor metadata is currently supplied by the repository.
export interface ProjectMetadata { name: string; developers: readonly string[] }
export const PROJECT_METADATA: ProjectMetadata = { name: 'ClinIQ', developers: [] };
export const operationalFollowup = /^(?:and\b|what about\b|how about\b|its\b|their\b|why\b|explain (?:that|it)|tell me more)|\b(that clinic|that specialty|same clinic|its forecast|its referrals)\b/i;
export function previousPolicyQuestion(request: ChatRequest) {
  if (request.previousPolicyQuery) return request.previousPolicyQuery;
  const previous = [...request.history].reverse().find(turn => turn.role === 'user');
  return previous && isPolicyQuestion(previous.content) ? previous.content : undefined;
}
export function conversationReply(request: ChatRequest, metadata = PROJECT_METADATA): string | undefined {
  const q = request.question.trim();
  if (/^(?:hi|hello|hey|good (?:morning|afternoon|evening))[!?.\s]*$/i.test(q))
    return "Hello! I'm ClinIQ, a healthcare operations decision support assistant. I can help explain clinic capacity, waiting time forecasts, and resource optimization. What would you like to explore?";
  if (/^(?:thanks|thank you|great|okay|ok|bye|goodbye)[!?.\s]*$/i.test(q))
    return /bye/i.test(q) ? 'Goodbye! Your planning decisions remain under human control.' : "You're welcome. What would you like to explore next?";
  if (/(?:who|which (?:person|team|company)).*(?:design|develop|creat|built|build|made)|(?:your|the) (?:developer|creator|designer|contributors?)/i.test(q))
    return metadata.developers.length ? `${metadata.name}'s documented developers: ${metadata.developers.join(', ')}.` : 'Verified developer information has not been provided in this project. I cannot identify who designed or developed it.';
  if (/who are you|what are you|what (?:is|does) (?:ask cliniq|cliniq|ask hala|hala(?:capacity)?(?: ai)?|curamind(?: ai)?|this app)|(?:your|app(?:lication)?'s?) purpose|what can you do|^help[!?.\s]*$/i.test(q))
    return `I'm ${metadata.name}, a Dubai healthcare capacity planning assistant. I explain fictional clinic inputs, four deterministic agents, isolated hypothetical scenarios and verified policy passages. People review decisions; I cannot approve actions or book schedules.`;
  if (/\b(bitcoin|crypto|stock|financial market|weather|football|recipe|poem|movie)\b/i.test(q))
    return 'That request is outside healthcare operations planning. I can help with clinic capacity, rule-based forecasts, optimization strategies and verified policy evidence; I cannot provide current financial market prices or unrelated information.';
  const previous = request.history.slice(-4).filter(turn => turn.role === 'user').reverse().find(turn => /forecast|routing|task.?shift|delegat|tele.?pool|capacity|hours|referral|clinic|psychiatry|pediatrics|respiratory|long.term care/i.test(turn.content));
  if (/^(?:explain (?:the |this |that )?recommendations?|why (?:this|that) recommendation)[!?.\s]*$/i.test(q) && (!previous?.content.match(/routing|task.?shift|delegat|tele.?pool|forecast/i) || /compare/i.test(previous.content)))
    return 'Which recommendation would you like me to explain: Forecast, Routing, Task-Shifting or Tele-Pooling? You can also ask me to compare them.';
  if (isPolicyQuestion(q, previousPolicyQuestion(request))) return;
  if (/\b(clinic|specialist|capacity|availability|waiting|wait|forecast|trend|routing|task|delegat|tele.?pool|recommend|operat|planning|conflict|approval|hold|hours?|referral|compare|what.if|simulat|summary|overview|alpha|bravo|charlie|delta|echo|foxtrot|psychiatry|pediatrics|respiratory|long.term care)/i.test(q)) {
    if (/^(?:which|what|tell me about|how is)\s+(?:the\s+)?clinic[!?.\s]*$/i.test(q))
      return 'Which clinic and specialty do you mean? The fictional dataset covers Alpha to Foxtrot and psychiatry, pediatrics, respiratory and long-term care.';
    return;
  }
  if (operationalFollowup.test(q) && (previous || request.history.some(turn => /alpha|bravo|charlie|delta|echo|foxtrot/i.test(turn.content)))) return;
  return 'Could you clarify what you would like to explore? For example, ask about Alpha psychiatry capacity, the selected scenario forecast, or a comparison of optimization strategies.';
}
