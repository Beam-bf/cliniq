import { validateAdjustments } from '../../src/planning/scenarioPlanning';
import type { ChatRequest } from '../../src/chat/core';

export interface BackendEnv { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string }
export class AccountContextError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function loadAccountContext(request: Request, body: ChatRequest, env: BackendEnv, fetcher: typeof fetch): Promise<ChatRequest> {
  const authorization = request.headers.get('Authorization');
  if (!env.SUPABASE_URL && !env.SUPABASE_PUBLISHABLE_KEY) {
    if (authorization || body.teamId) throw new AccountContextError('The live account service is not configured. Use offline mode for now.', 503);
    return { ...body, teamRole: undefined, submissionId: undefined };
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
    if (body.teamId) {
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (typeof body.teamId !== 'string' || !uuid.test(body.teamId) || (body.submissionId !== undefined && (typeof body.submissionId !== 'string' || !uuid.test(body.submissionId)))) throw new AccountContextError('Invalid team or submission ID.', 400);
      const membershipResponse = await fetcher(`${base}/rest/v1/planning_team_members?select=role&team_id=eq.${body.teamId}&user_id=eq.${user.id}`, { headers, signal: AbortSignal.timeout(5000) });
      if (!membershipResponse.ok) throw new AccountContextError('Team access could not be verified.', 503);
      const memberships = await membershipResponse.json() as { role: ChatRequest['teamRole'] }[];
      const role = Array.isArray(memberships) ? memberships[0]?.role : undefined;
      if (!role || !['admin','planner','reviewer'].includes(role)) throw new AccountContextError('You do not have access to this team.', 403);
      const filter = `team_id=eq.${body.teamId}&stage=eq.${encodeURIComponent(body.scenarioId)}`;
      const planPath = body.submissionId ? `planning_team_submissions?select=adjustments&${filter}&id=eq.${body.submissionId}` : `planning_team_plans?select=adjustments&${filter}&limit=1`;
      const [planResponse, auditResponse] = await Promise.all([
        fetcher(`${base}/rest/v1/${planPath}`, { headers, signal: AbortSignal.timeout(5000) }),
        fetcher(`${base}/rest/v1/planning_team_decisions?select=stage,agent,decision&${filter}${body.submissionId ? `&submission_id=eq.${body.submissionId}` : ''}&order=created_at.desc&limit=5`, { headers, signal: AbortSignal.timeout(5000) }),
      ]);
      if (!planResponse.ok || !auditResponse.ok) throw new AccountContextError('Saved team context is unavailable.', 503);
      const plans = await planResponse.json() as { adjustments: unknown }[];
      const recentAudit = await auditResponse.json() as ChatRequest['recentAudit'];
      if (!Array.isArray(plans) || !Array.isArray(recentAudit) || (body.submissionId && !plans.length)) throw new AccountContextError('Team submission is not available.', 403);
      return { ...body, teamRole: role, adjustments: validateAdjustments(body.scenarioId, plans[0]?.adjustments ?? {}), recentAudit };
    }
    const filter = `user_id=eq.${encodeURIComponent(user.id)}&stage=eq.${encodeURIComponent(body.scenarioId)}`;
    const [planResponse, auditResponse] = await Promise.all([
      fetcher(`${base}/rest/v1/planning_plans?select=adjustments&${filter}&limit=1`, { headers, signal: AbortSignal.timeout(5000) }),
      fetcher(`${base}/rest/v1/planning_decisions?select=stage,agent,decision&${filter}&order=created_at.desc&limit=5`, { headers, signal: AbortSignal.timeout(5000) }),
    ]);
    if (!planResponse.ok || !auditResponse.ok) throw new AccountContextError('Saved planning context is unavailable. Try again after refreshing your workspace.', 503);
    const plans = await planResponse.json() as { adjustments: unknown }[];
    const recentAudit = await auditResponse.json() as ChatRequest['recentAudit'];
    if (!Array.isArray(plans) || !Array.isArray(recentAudit)) throw new AccountContextError('Saved planning context is invalid.', 503);
    return { ...body, teamRole: undefined, submissionId: undefined, adjustments: validateAdjustments(body.scenarioId, plans[0]?.adjustments ?? {}), recentAudit };
  } catch (error) {
    if (error instanceof AccountContextError) throw error;
    throw new AccountContextError('Account context could not be loaded. Please retry.', 503);
  }
}
