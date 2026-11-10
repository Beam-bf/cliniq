// Read-only public connectivity checks. No sign-ups, emails or record writes.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

let local = {};
try { local = parseEnv(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const settings = { ...local, ...process.env };
const base = settings.VITE_SUPABASE_URL?.replace(/\/$/, '');
const key = settings.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!base || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Configure .env.local first.');
  process.exitCode = 1;
} else {
  const request = path => fetch(`${base}${path}`, { headers: { apikey: key }, signal: AbortSignal.timeout(10000) });
  try {
    const response = await request('/auth/v1/settings');
    if (!response.ok) throw new Error('Authentication settings are unavailable.');
    const auth = await response.json();
    const results = [{ check: 'Email authentication enabled', passed: auth.external?.email === true },
      { check: 'Sign-up email confirmation enabled', passed: auth.mailer_autoconfirm === false }];
    for (const table of ['planning_plans', 'planning_decisions', 'planning_chat_audit']) {
      const result = await request(`/rest/v1/${table}?select=user_id&limit=0`);
      results.push({ check: `${table}: anonymous reads denied`, passed: [401, 403].includes(result.status), status: result.status });
    }
    for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.check}${result.status ? ` (HTTP ${result.status})` : ''}`);
    console.log('Authenticated saves, recovery emails and account isolation require signed-in verification. Run supabase/verify_backend.sql for read-only database checks.');
    if (results.some(result => !result.passed)) process.exitCode = 1;
  } catch {
    console.error('Backend check failed. Check network access and public project configuration. No records were changed.');
    process.exitCode = 1;
  }
}
