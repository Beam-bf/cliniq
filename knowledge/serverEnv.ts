import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const allowed = new Set(['AI_PROVIDER','AI_API_KEY','AI_MODEL','AI_ACCOUNT_ID','ANTHROPIC_API_KEY','ANTHROPIC_MODEL',
  'SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','POLICY_SERVICE_URL','POLICY_SERVICE_TOKEN','POLICY_HOST','POLICY_PORT','POLICY_API_TOKEN','POLICY_MODEL_DIR']);
export function readServerEnvironment(root = process.cwd()): Record<string, string | undefined> {
  const values: Record<string,string> = {};
  for (const name of ['.env','.env.local','.dev.vars']) {
    try {
      const parsed = parseEnv(readFileSync(`${root}/${name}`,'utf8'));
      if (Object.entries(parsed).some(([key,value]) => value && /^VITE_.*(?:API_KEY|TOKEN|SECRET)/i.test(key)))
        throw new Error('Provider secrets must not use a VITE_ prefix. Move them to server-only variables before starting the app.');
      for (const [key,value] of Object.entries(parsed)) if (allowed.has(key) && typeof value === 'string') values[key] = value;
    } catch (error) { if ((error as { code?: string }).code !== 'ENOENT') throw error; }
  }
  return { ...values, ...process.env };
}
export function loadServerEnvironment() {
  const loaded = readServerEnvironment();
  for (const key of allowed) if (loaded[key] !== undefined) process.env[key] = loaded[key];
  return loaded;
}
