import type { PolicyEnv } from '../api/policy';
import type { ChatTools } from './chatTools';

// The Pages isolate delegates embeddings/pgvector to the existing protected Node
// service. Account credentials, reasons and conversation history never go there.
export function remotePolicyTools(env: PolicyEnv, fetcher: typeof fetch): ChatTools {
  async function read(payload: unknown) {
    if (!env.POLICY_SERVICE_URL || !env.POLICY_SERVICE_TOKEN) throw new Error('Policy service unavailable');
    const url = new URL(env.POLICY_SERVICE_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Policy service unavailable');
    const response = await fetcher(new URL('/api/policy', url), { method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.POLICY_SERVICE_TOKEN}` }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error('Policy service unavailable');
    return response.json();
  }
  return { searchPolicy: (query, previousQuery) => read({ action: 'search', query, previousQuery }),
    assessPolicy: request => read({ action: 'assess', stageId: request.scenarioId, adjustments: request.adjustments ?? {} }) };
}
