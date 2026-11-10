export interface PolicyEnv { POLICY_SERVICE_URL?: string; POLICY_SERVICE_TOKEN?: string }
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Pages runs an HTTP adapter; Node/ONNX/PostgreSQL never run in the browser or
// Pages isolate. Both service configuration values are server-only secrets.
export async function onRequestPost({ request, env }: { request: Request; env: PolicyEnv }, fetcher: typeof fetch = fetch) {
  if (request.headers.get('Origin') && request.headers.get('Origin') !== new URL(request.url).origin) return json({ error: 'Origin rejected' }, 403);
  if (!env.POLICY_SERVICE_URL || !env.POLICY_SERVICE_TOKEN) return json({ error: 'Policy service not configured. Human review required.' }, 503);
  let url: URL;
  try { url = new URL(env.POLICY_SERVICE_URL); if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Invalid URL'); }
  catch { return json({ error: 'Policy service configuration invalid' }, 503); }
  if (!request.headers.get('Content-Type')?.includes('application/json')) return json({ error: 'JSON required' }, 415);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Missing body' }, 400);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 12000) { await reader.cancel(); return json({ error: 'Policy request too large' }, 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let body: Record<string, unknown>;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); if (!body || !['search', 'assess'].includes(String(body.action))) throw new Error('Invalid action'); }
  catch { return json({ error: 'Invalid policy request' }, 400); }
  // Never forward account tokens, chat history, audit reasons or arbitrary URLs.
  const payload = body.action === 'search' ? { action: 'search', query: body.query, previousQuery: body.previousQuery }
    : { action: 'assess', stageId: body.stageId, adjustments: body.adjustments };
  try {
    const response = await fetcher(new URL('/api/policy', url), { method: 'POST', signal: AbortSignal.timeout(25000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.POLICY_SERVICE_TOKEN}` }, body: JSON.stringify(payload) });
    if (!response.ok) return json({ error: 'Policy retrieval unavailable. Human review required.' }, response.status === 400 ? 400 : 503);
    return json(await response.json());
  } catch { return json({ error: 'Policy retrieval unavailable. Human review required.' }, 503); }
}
