import { validateAdjustments } from '../../src/planning/scenarioPlanning';
import type { ChatRequest } from '../../src/chat/core';

export interface BackendEnv { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string }
export class AccountContextError extends Error {
  public status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export async function loadAccountContext(request: Request, body: ChatRequest, env: BackendEnv, fetcher: typeof fetch): Promise<ChatRequest> {
  if ('teamId' in body || 'submissionId' in body) {
    throw new AccountContextError('Team workspaces have been retired. Reload the website to use your capacity-planner account.', 409);
  }
  const authorization = request.headers.get('Authorization');
  if (!env.SUPABASE_URL && !env.SUPABASE_PUBLISHABLE_KEY) {
    if (authorization) throw new AccountContextError('The live account service is not configured. Use offline mode for now.', 503);
    return body;
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw new AccountContextError('Account service configuration is incomplete.', 503);
  if (!authorization?.startsWith('Bearer ') || authorization.length > 9000) throw new AccountContextError('Sign in to use the connected assistant.', 401);
  const base = env.SUPABASE_URL.replace(/\/$/, '');
  if (!base.startsWith('https://') && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new AccountContextError('Invalid account service configuration.', 503);
  const headers = { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: authorization };
  try {
    // Verify the session with Auth; never decode a JWT and trust its user ID.
    const userResponse = await fetcher(`${base}/auth/v1/user`, { headers, signal: AbortSignal.timeout(5000) });
    if (!userResponse.ok) throw new AccountContextError(userResponse.status >= 500 ? 'Account service is unavailable.' : 'Your session expired. Sign in again.', userResponse.status >= 500 ? 503 : 401);
    const user = await userResponse.json() as { id?: string };
    if (!user.id || !/^[0-9a-f-]{36}$/i.test(user.id)) throw new AccountContextError('Invalid account session.', 401);
    const filter = `user_id=eq.${encodeURIComponent(user.id)}&stage=eq.${encodeURIComponent(body.scenarioId)}`;
    const [planResponse, auditResponse] = await Promise.all([
      fetcher(`${base}/rest/v1/planning_plans?select=adjustments&${filter}&limit=1`, { headers, signal: AbortSignal.timeout(5000) }),
      fetcher(`${base}/rest/v1/planning_decisions?select=stage,agent,decision&${filter}&order=created_at.desc&limit=5`, { headers, signal: AbortSignal.timeout(5000) }),
    ]);
    if (!planResponse.ok || !auditResponse.ok) throw new AccountContextError('Saved planning context is unavailable. Try again after refreshing your workspace.', 503);
    const plans = await planResponse.json() as { adjustments: unknown }[];
    const recentAudit = await auditResponse.json() as ChatRequest['recentAudit'];
    if (!Array.isArray(plans) || !Array.isArray(recentAudit)) throw new AccountContextError('Saved planning context is invalid.', 503);
    return { ...body, adjustments: validateAdjustments(body.scenarioId, plans[0]?.adjustments ?? {}), recentAudit };
  } catch (error) {
    if (error instanceof AccountContextError) throw error;
    throw new AccountContextError('Account context could not be loaded. Please retry.', 503);
  }
}
