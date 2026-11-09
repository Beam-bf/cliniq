import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { accountConfigurationError, supabase } from '@/lib/supabase';

interface Props { session: Session | null; recovery: boolean; onRecovered: () => void; onContinue: () => void }
export default function AccountPanel({ session, recovery, onRecovered, onContinue }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage('Password updated. You can return to your workspace.'); onRecovered();
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage('Signed in. Your saved workspace is loading.');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        setMessage(data.session ? 'Account created. Your workspace is ready to load.' : 'Check your email for the account confirmation link before signing in.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        setMessage('If an eligible account exists, you will receive a password reset email.');
      }
      setPassword('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Account request failed. Try again.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    if (!supabase) return;
    setBusy(true); setError(null);
    try { const { error } = await supabase.auth.signOut(); if (error) throw error; setMessage('Signed out.'); }
    catch { setError('Sign-out could not be confirmed. Please retry.'); }
    finally { setBusy(false); }
  }
  return <section className="account-page" aria-labelledby="account-title">
    <p className="eyebrow">Your workspace</p>
    <h2 id="account-title">{recovery ? 'Choose a new password' : session ? 'Your account' : 'Welcome to HalaCapacity'}</h2>
    <p className="page-intro">Save fictional scenarios, review recommendations, and pick up where you left off.</p>
    {!supabase ? <div className="setup-notice">
      <h3>Explore the demo</h3>
      <p>{accountConfigurationError ? 'The account connection is incomplete.' : 'Accounts are not connected in this demo yet.'} Planning works in this browser; signing in and cloud saving will become available once the account service is connected.</p>
      <button type="button" className="primary-button" onClick={onContinue}>Open demo workspace</button>
    </div> : session && !recovery ? <div className="setup-notice">
      <p className="text-sm">Signed in as <strong>{session.user.email}</strong></p>
      <p className="text-sm">User UID: <code className="member-uid">{session.user.id}</code></p>
      <p className="text-sm">Your plans and history belong to this account. Demo records are kept separate and are not uploaded automatically.</p>
      <div className="button-row"><button className="primary-button" onClick={onContinue}>Open workspace</button><button className="secondary-button" disabled={busy} onClick={() => void signOut()}>{busy ? 'Signing out…' : 'Sign out'}</button></div>
    </div> : <form onSubmit={event => void submit(event)} className="account-form" aria-busy={busy}>
      {!recovery && <div className="auth-options" aria-label="Account action">
        <button type="button" aria-pressed={mode === 'signin'} onClick={() => { setMode('signin'); setError(null); setMessage(null); }}>Sign in</button>
        <button type="button" aria-pressed={mode === 'signup'} onClick={() => { setMode('signup'); setError(null); setMessage(null); }}>Create account</button>
      </div>}
      {!recovery && <label>Email address<input type="email" required autoComplete="email" value={email} disabled={busy} onChange={event => setEmail(event.target.value)} /></label>}
      {(recovery || mode !== 'reset') && <label>Password<input type="password" required minLength={mode === 'signup' || recovery ? 12 : undefined} autoComplete={mode === 'signin' && !recovery ? 'current-password' : 'new-password'} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} />{(mode === 'signup' || recovery) && <span className="field-note">Use at least 12 characters.</span>}</label>}
      <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : recovery ? 'Update password' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}</button>
      {!recovery && <button type="button" className="text-button" onClick={() => { setMode(mode === 'reset' ? 'signin' : 'reset'); setError(null); setMessage(null); }}>{mode === 'reset' ? 'Back to sign in' : 'Forgot your password?'}</button>}
    </form>}
    {message && <p className="mt-4 text-sm" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
