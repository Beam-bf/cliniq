import { useState } from 'react';
import type { TeamMember, TeamMembership, TeamRole } from '@/teams/types';

interface Props {
  userId: string; available: boolean; team?: TeamMembership; role?: TeamRole; members: TeamMember[];
  onRefresh: () => Promise<void>; onMember: (id: string, role: TeamRole | null) => Promise<void>;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default function TeamPage({ userId, available, team, role, members, onRefresh, onMember }: Props) {
  const [memberId, setMemberId] = useState(''); const [newRole, setNewRole] = useState<TeamRole>('planner');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  async function change(id: string, next: TeamRole | null) {
    if (busy) return; setBusy(true); setError(null); setMessage(null);
    try { await onMember(id, next); setMessage(next ? 'Team role saved.' : 'Membership removed.'); setMemberId(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to change membership.'); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="team-title"><div className="history-actions"><div><h2 id="team-title" className="text-3xl">{team?.name ?? 'Your team'}</h2><p className="page-intro">{team ? `Your role: ${role ?? team.role}. Plans and recorded decisions are shared with this team.` : 'A shared workspace connects planners and reviewers.'}</p></div><button className="secondary-button" disabled={busy} onClick={() => void onRefresh()}>Refresh access</button></div>
    <div className="user-id-box"><p className="eyebrow">Your User UID</p><code>{userId}</code><button className="text-button" onClick={async () => { try { await navigator.clipboard.writeText(userId); setMessage('User UID copied.'); } catch { setError('Select and copy the UID shown above.'); } }}>Copy UID</button></div>
    {!available ? <div className="setup-notice"><h3>Team setup pending</h3><p>The team migration needs to be applied to Supabase. Your existing personal plans remain available. The first Admin is assigned through the project’s SQL Editor, using a confirmed account UID.</p></div> : !team ? <div className="setup-notice"><h3>Select a team workspace</h3><p>If a team is listed in the workspace selector, open it there. Otherwise, share your User UID with your team Admin. A new account is not automatically an Admin.</p></div> : <>
      <div className="role-explanation"><span>Planner: edit & submit</span><span>Reviewer: inspect & decide</span><span>Admin: manage members & both workflows</span></div>
      <div className="overflow-x-auto"><table className="concept-table min-w-full text-left"><thead><tr><th scope="col">Member UID</th><th scope="col">Role</th>{role === 'admin' && <th scope="col">Manage access</th>}</tr></thead><tbody>{members.map(member => <MemberRow key={`${member.user_id}:${member.role}`} member={member} currentUser={userId} admin={role === 'admin'} busy={busy} onChange={change} />)}</tbody></table></div>
      {role === 'admin' && <form className="member-form" aria-busy={busy} onSubmit={event => { event.preventDefault(); if (!UUID.test(memberId.trim())) { setError('Enter a valid User UID from an existing account.'); return; } void change(memberId.trim(), newRole); }}>
        <h3 className="text-2xl">Add a team member</h3><p className="field-note">Your teammate registers and confirms their account first, then shares their User UID. This does not send an email invitation.</p>
        <label>Member User UID<input value={memberId} onChange={event => setMemberId(event.target.value)} required disabled={busy} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>
        <label>Role<select value={newRole} onChange={event => setNewRole(event.target.value as TeamRole)} disabled={busy}><option value="planner">Planner</option><option value="reviewer">Reviewer</option><option value="admin">Admin</option></select></label>
        <button className="primary-button" disabled={busy}>Add / update member</button>
      </form>}
    </>}
    {message && <p className="workspace-notice mt-4" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
function MemberRow({ member, currentUser, admin, busy, onChange }: { member: TeamMember; currentUser: string; admin: boolean; busy: boolean; onChange: (id: string, role: TeamRole | null) => Promise<void> }) {
  const [role, setRole] = useState(member.role); const [remove, setRemove] = useState(false);
  return <tr><td><code className="member-uid">{member.user_id}</code>{member.user_id === currentUser && <span className="field-note"> (you)</span>}</td><td>{admin ? <select aria-label={`Role for ${member.user_id}`} value={role} onChange={event => setRole(event.target.value as TeamRole)} disabled={busy}><option value="admin">Admin</option><option value="planner">Planner</option><option value="reviewer">Reviewer</option></select> : member.role}</td>{admin && <td><div className="button-row">{remove ? <><button className="secondary-button" disabled={busy} onClick={() => void onChange(member.user_id, null)}>Confirm removal</button><button className="text-button" onClick={() => setRemove(false)}>Cancel</button></> : <><button className="secondary-button" disabled={busy || role === member.role} onClick={() => void onChange(member.user_id, role)}>Save role</button><button className="text-button" disabled={busy} onClick={() => setRemove(true)}>Remove</button></>}</div></td>}</tr>;
}
