// Server-only HTTP transports. No SDK, browser credentials or arbitrary base URL.
import { CHAT_SYSTEM_PROMPT } from './chatPrompt';

export interface ProviderEnv {
  AI_PROVIDER?: string; AI_API_KEY?: string; AI_ACCOUNT_ID?: string; AI_MODEL?: string;
  ANTHROPIC_API_KEY?: string; ANTHROPIC_MODEL?: string;
}
export function configuredProvider(env: ProviderEnv) {
  const provider = env.AI_PROVIDER ?? (env.ANTHROPIC_API_KEY ? 'anthropic' : undefined);
  if (provider === 'anthropic' && (env.AI_API_KEY || env.ANTHROPIC_API_KEY) && (env.AI_MODEL || env.ANTHROPIC_MODEL)) return 'anthropic';
  if (provider === 'cloudflare' && env.AI_API_KEY && env.AI_ACCOUNT_ID && env.AI_MODEL) return 'cloudflare';
  return undefined;
}
export async function selectResults(env: ProviderEnv, payload: unknown, fetcher: typeof fetch = fetch): Promise<{ raw: string; provider: 'anthropic' | 'cloudflare' } | undefined> {
  const provider = configuredProvider(env);
  if (!provider) return;
  try {
    const content = JSON.stringify(payload);
    // Only documented JSON-mode models receive this option. Other configured
    // text models still face the identical mandatory server-side validator.
    const jsonModels = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast','@cf/meta/llama-3-8b-instruct','@cf/meta/llama-3.1-8b-instruct','@hf/nousresearch/hermes-2-pro-mistral-7b','@hf/thebloke/deepseek-coder-6.7b-instruct-awq','@cf/deepseek-ai/deepseek-r1-distill-qwen-32b'];
    const format = jsonModels.includes(env.AI_MODEL ?? '') ? { response_format: { type: 'json_schema', json_schema: { type: 'object', properties: { factIds: { type: 'array', maxItems: 8, items: { type: 'string' } } }, required: ['factIds'], additionalProperties: false } } } : {};
    const response = provider === 'anthropic'
      ? await fetcher('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY || env.AI_API_KEY!, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: env.ANTHROPIC_MODEL || env.AI_MODEL, max_tokens: 700, system: CHAT_SYSTEM_PROMPT, messages: [{ role: 'user', content }] }),
      })
      : await fetcher(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.AI_ACCOUNT_ID!)}/ai/run/${env.AI_MODEL!.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.AI_API_KEY}` },
        body: JSON.stringify({ messages: [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, { role: 'user', content }], max_tokens: 700, ...format }),
      });
    if (!response.ok) return; // Never log provider error bodies or request headers.
    const body = await response.json();
    const raw = provider === 'anthropic'
      ? (Array.isArray(body.content) && body.stop_reason !== 'max_tokens' ? body.content.filter((block: { type?: string; text?: unknown }) => block.type === 'text' && typeof block.text === 'string').map((block: { text: string }) => block.text).join('') : undefined)
      : (typeof body.result?.response === 'object' && body.result.response !== null ? JSON.stringify(body.result.response) : body.result?.response);
    if (typeof raw === 'string' && raw.length <= 5000) return { raw, provider };
  } catch { /* Configuration, transport and format failures use checked local results. */ }
}
