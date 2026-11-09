import { buildContext, inputError, offlineAnswer, validateAnswer } from '../../src/chat/core';
import type { ChatRequest } from '../../src/chat/core';
import { CHAT_SYSTEM_PROMPT } from '../_lib/chatPrompt';
import { AccountContextError, loadAccountContext } from '../_lib/accountContext';
import type { BackendEnv } from '../_lib/accountContext';
import { validateAdjustments } from '../../src/planning/scenarioPlanning';

export interface Env extends BackendEnv { AI_PROVIDER?: string; AI_API_KEY?: string; AI_MODEL?: string; AI_ACCOUNT_ID?: string }
const buckets = new Map<string, { count: number; expires: number }>();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function answerChat(request: ChatRequest, env: Env, fetcher: typeof fetch = fetch) {
  const fallback = () => offlineAnswer(request);
  if (env.AI_PROVIDER !== 'cloudflare' || !env.AI_API_KEY || !env.AI_ACCOUNT_ID || !env.AI_MODEL) return fallback();
  const context = buildContext(request);
  const history = (Array.isArray(request.history) ? request.history : []).slice(-4)
    .filter(turn => turn && ['user', 'assistant'].includes(turn.role) && typeof turn.content === 'string' && !inputError(turn.content.slice(0, 600)))
    .map(turn => ({ role: turn.role, content: turn.content.slice(0, 600) }));
  try {
    const response = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.AI_ACCOUNT_ID)}/ai/run/${env.AI_MODEL.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${env.AI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: CHAT_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify({ CONTEXT: context, UNTRUSTED_HISTORY: history, QUESTION: request.question }) }], max_tokens: 700 }),
    });
    if (!response.ok) return fallback();
    const body = await response.json() as { result?: { response?: string } };
    return typeof body.result?.response === 'string'
      ? validateAnswer(body.result.response, context.passages.map(source => source.id)) ?? fallback() : fallback();
  } catch { return fallback(); }
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }, fetcher: typeof fetch = fetch) {
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
  if (!['baseline', 'winter-surge', 'specialist-leave'].includes(body.scenarioId) ||
    !Array.isArray(body.history) || (body.recentAudit !== undefined && !Array.isArray(body.recentAudit)))
    return json({ error: 'Invalid scenario, history or audit.' }, 400);
  try {
    body.adjustments = validateAdjustments(body.scenarioId, body.adjustments ?? {});
  } catch { return json({ error: 'Invalid what-if planning values.' }, 400); }
  try {
    const context = await loadAccountContext(request, body, env, fetcher);
    return json(await answerChat(context, env, fetcher));
  } catch (failure) {
    return failure instanceof AccountContextError ? json({ error: failure.message }, failure.status) : json({ error: 'Chat service is unavailable.' }, 503);
  }
}
