import { loadServerEnvironment } from './serverEnv.ts';
import { createServer } from 'node:http';
import { openKnowledge } from './store.ts';
import { disposeEmbeddings, embed } from './embeddings.ts';
import { policyRequest } from './api.ts';
import { onRequestPost as chatRequest } from '../functions/api/chat.ts';
import { localChatTools } from './chatTools.ts';

loadServerEnvironment();
const host = process.env.POLICY_HOST ?? '127.0.0.1';
const port = Number(process.env.POLICY_PORT ?? 8788);
const token = process.env.POLICY_API_TOKEN;
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && (!token || token.length < 24)) throw new Error('Non-loopback hosting requires a server-side POLICY_API_TOKEN of at least 24 characters');
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY)) throw new Error('Remote chat requires configured account authentication.');
const store = await openKnowledge();
const status = await store.status();
try {
  if (!status.chunkCount) throw new Error('Knowledge base empty. Run npm run kb:ingest before starting the service.');
  await embed(['Warm up healthcare policy retrieval']);
} catch (failure) { await store.close(); await disposeEmbeddings().catch(() => {}); throw failure; }
const buckets = new Map<string, { count: number; until: number }>();
const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  const send = (code: number, value: unknown) => { response.statusCode = code; response.end(JSON.stringify(value)); };
  try {
    const origin = request.headers.origin;
    if (origin) {
      const url = new URL(origin);
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') return send(403, { error: 'Origin rejected' });
    }
    if (request.url?.startsWith('/api/policy') && token && request.headers.authorization !== `Bearer ${token}`) return send(401, { error: 'Policy service authentication required' });
    if (request.url === '/api/policy/health' && request.method === 'GET') return send(200, await store.status());
    if (!['/api/policy','/api/chat'].includes(request.url ?? '') || request.method !== 'POST') return send(404, { error: 'Endpoint not found' });
    const now = Date.now();
    for (const [id, bucket] of buckets) if (bucket.until <= now) buckets.delete(id);
    const key = request.socket.remoteAddress ?? 'local';
    const bucket = buckets.get(key) ?? { count: 0, until: now + 60000 };
    buckets.set(key, bucket);
    if (++bucket.count > 30) return send(429, { error: 'Wait before sending more policy queries' });
    if (!request.headers['content-type']?.includes('application/json')) return send(415, { error: 'JSON required' });
    let size = 0; const chunks: Buffer[] = [];
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 12000) return send(413, { error: 'Policy request too large' });
      chunks.push(Buffer.from(chunk));
    }
    if (request.url === '/api/chat') {
      const headers = new Headers();
      for (const [name,value] of Object.entries(request.headers)) if (typeof value === 'string') headers.set(name,value);
      // IP rate limits use the socket, never a caller-forged forwarding header.
      headers.set('CF-Connecting-IP', request.socket.remoteAddress ?? 'local');
      const result = await chatRequest({ request: new Request(`http://${request.headers.host ?? '127.0.0.1:8788'}/api/chat`, { method: 'POST', headers, body: Buffer.concat(chunks).toString('utf8') }),
        env: { AI_PROVIDER: process.env.AI_PROVIDER, AI_API_KEY: process.env.AI_API_KEY, AI_MODEL: process.env.AI_MODEL, AI_ACCOUNT_ID: process.env.AI_ACCOUNT_ID,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
          SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY } }, fetch, localChatTools(store));
      return send(result.status, await result.json());
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return send(400, { error: 'Invalid JSON' }); }
    try { return send(200, await policyRequest(store, body)); }
    catch (failure) {
      const message = failure instanceof Error ? failure.message : '';
      if (/Invalid healthcare|Invalid what-if|Invalid scenario|Invalid adjustment|Unknown policy|Enter a policy|personal identifiers/.test(message)) return send(400, { error: message });
      console.error('Policy request failed; no authorization granted.');
      return send(503, { error: 'Policy retrieval unavailable. Human review required.' });
    }
  } catch { send(400, { error: 'Invalid request' }); }
});
server.listen(port, host, () => console.log(`ClinIQ policy service: http://${host}:${port}; ${status.chunkCount} real vector chunks; no automatic authorization.`));
let closing = false;
async function close() {
  if (closing) return; closing = true;
  server.close(); server.closeAllConnections(); await store.close(); await disposeEmbeddings();
}
process.once('SIGINT', () => void close()); process.once('SIGTERM', () => void close());
