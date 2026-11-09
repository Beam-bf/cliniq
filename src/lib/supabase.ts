import { createClient } from '@supabase/supabase-js';

// Public project configuration only. A service-role/secret key must never enter the browser.
const environment = import.meta.env ?? {};
const url = environment.VITE_SUPABASE_URL as string | undefined;
const key = environment.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
let valid = false;
if (url && key && !key.startsWith('sb_secret_')) {
  try {
    const parsed = new URL(url);
    valid = parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname));
    if (key.split('.').length === 3) {
      const claims = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (claims.role !== 'anon') valid = false;
    }
  } catch { valid = false; }
}
export const accountConfigurationError = Boolean(url || key) && !valid;
export const supabase = valid ? createClient(url!, key!) : null;
