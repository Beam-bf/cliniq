import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let authEventReceived = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      authEventReceived = true;
      if (!active) return;
      setSession(next); setLoading(false); setError(null);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
    });
    supabase.auth.getSession().then(({ data, error: failure }) => {
      if (!active || authEventReceived) return;
      setSession(data.session); setLoading(false);
      if (failure) setError('Your account session could not be restored. Please sign in again.');
    }).catch(() => { if (active && !authEventReceived) { setLoading(false); setError('Account service is unavailable.'); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  return { session, loading, error, recovery, finishRecovery: () => setRecovery(false) };
}
