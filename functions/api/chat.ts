import { inputError } from '../../src/chat/core';
import type { ChatRequest } from '../../src/chat/core';
import { AccountContextError, loadAccountContext } from '../_lib/accountContext';
import type { BackendEnv } from '../_lib/accountContext';
import { validateAdjustments, planRevision } from '../../src/planning/scenarioPlanning';
import { prepareChat, validatedSelection, renderCheckedAnswer } from '../_lib/chatTools';
import type { ChatTools } from '../_lib/chatTools';
import { configuredProvider, selectResults } from '../_lib/llmProvider';
import type { ProviderEnv } from '../_lib/llmProvider';
import { remotePolicyTools } from '../_lib/policyTools';
import type { PolicyEnv } from './policy';

export interface Env extends BackendEnv, ProviderEnv, PolicyEnv {}
const buckets = new Map<string, { count: number; expires: number }>();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function answerChat(request: ChatRequest, env: Env, fetcher: typeof fetch = fetch, tools: ChatTools = remotePolicyTools(env, fetcher)) {
  const history = (Array.isArray(request.history) ? request.history : []).slice(-4)
    .filter(turn => turn && ['user', 'assistant'].includes(turn.role) && typeof turn.content === 'string' && !inputError(turn.content.slice(0, 600)))
    .map(turn => ({ role: turn.role, content: turn.content.slice(0, 600) }));
  const prepared = await prepareChat({ ...request, history }, tools);
  const { context } = prepared;
  // The model sees fixed algorithm outputs, never retrieved document text.
  // It can select IDs only; the server renders the associated facts verbatim.
  const payload = { CONTEXT: { label: context.label, stage: context.stage, currentView: context.currentView, whatIfChanges: context.whatIfChanges,
    summary: { freeHours: context.summary.freeHours, referrals: context.summary.referrals, averageWait: context.summary.averageWait },
    conflicts: context.conflicts, gaps: context.gaps, recentAudit: context.recentAudit,
    agents: context.agents.map(agent => ({ agent: agent.agent, summary: agent.summary, recommendation: agent.recommendation, evidence: agent.evidence, transfers: agent.transfers })) },
    APPROVED_RESULTS: prepared.facts.map(({ id, text }) => ({ id, text })), UNTRUSTED_HISTORY: history, QUESTION: request.question };
  const result = prepared.blocked ? undefined : await selectResults(env, payload, fetcher);
  const selection = result ? validatedSelection(result.raw, prepared) : undefined;
  const ids = selection?.length ? selection : undefined;
  const response = renderCheckedAnswer(prepared, ids ?? prepared.defaults, ids ? 'live' : 'offline', ids
    ? 'The model selected approved result IDs. All displayed figures and recommendations come from deterministic tools; policy text is retrieved verbatim.'
    : prepared.blocked ? 'No model call or action was made.' : configuredProvider(env)
      ? 'Live interpretation failed or returned an invalid selection. Showing checked tool results; no model-authored claims were displayed.'
      : 'No compatible provider configuration is available. Showing checked tool results without a live model.');
  let executionId: string | undefined;
  if (tools.recordExecution && !inputError(request.question)) {
    try { executionId = await tools.recordExecution({ scenarioId: request.scenarioId, basePlanRevision: planRevision(request.adjustments ?? {}),
      effectivePlanRevision: planRevision(context.whatIfChanges), simulation: prepared.simulation, selectedFactIds: ids ?? prepared.defaults,
      facts: prepared.facts.filter(f=> (ids ?? prepared.defaults).includes(f.id)), knowledge: response.knowledge,
      question: request.question, answer: response.answer, mode: response.mode, provider: result?.provider ?? 'none' }); }
    catch { response.notice += ' The server execution snapshot could not be saved.'; }
  }
  response.grounding = { provider: result?.provider ?? 'none', factIds: ids ?? prepared.defaults, basePlanRevision: planRevision(request.adjustments ?? {}),
    planRevision: planRevision(context.whatIfChanges), simulation: prepared.simulation, ...(executionId ? { executionId } : {}) };
  return response;
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }, fetcher: typeof fetch = fetch, tools?: ChatTools) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Origin rejected.' }, 403);
  const now = Date.now();
  for (const [key, value] of buckets) if (value.expires <= now) buckets.delete(key);
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  if (!buckets.has(ip) && buckets.size >= 10000) return json({ error: 'Rate limit: retry later.' }, 429);
  const bucket = buckets.get(ip) ?? { count: 0, expires: now + 60000 };
  buckets.set(ip, bucket);
  if (++bucket.count > 10) return json({ error: 'Rate limit: wait one minute.' }, 429);
  if (!request.headers.get('Content-Type')?.includes('application/json')) return json({ error: 'JSON required.' }, 415);
  // Read a bounded body, even if Content-Length is absent or forged.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Missing body.' }, 400);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 12000) { await reader.cancel(); return json({ error: 'Request too large.' }, 413); }
    chunks.push(value);
  }
  let body: ChatRequest;
  try { const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return json({ error: 'Invalid JSON.' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'Invalid request.' }, 400);
  const error = inputError(body.question);
  if (error) return json({ error }, 400);
  if (body.previousPolicyQuery !== undefined && inputError(body.previousPolicyQuery)) return json({ error: 'Invalid previous policy context.' }, 400);
  if (!['baseline', 'winter-surge', 'specialist-leave'].includes(body.scenarioId) ||
    !Array.isArray(body.history) || (body.recentAudit !== undefined && !Array.isArray(body.recentAudit)))
    return json({ error: 'Invalid scenario, history or audit.' }, 400);
  try {
    body.adjustments = validateAdjustments(body.scenarioId, body.adjustments ?? {});
  } catch { return json({ error: 'Invalid what-if planning values.' }, 400); }
  try {
    const context = await loadAccountContext(request, body, env, fetcher);
    // A public demo endpoint may run deterministic tools, never cloud inference.
    // Connected inference requires the verified account context above.
    const providerEnv = env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY ? env : {};
    return json(await answerChat(context, providerEnv, fetcher, tools));
  } catch (failure) {
    return failure instanceof AccountContextError ? json({ error: failure.message }, failure.status) : json({ error: 'Chat service is unavailable.' }, 503);
  }
}
