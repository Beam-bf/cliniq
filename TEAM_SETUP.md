# Shared team workspaces and roles

The role system is implemented locally. It is not active in your Supabase project until the **new team migration** and initial Admin setup are run. Existing personal planning data stays intact. Do not rerun the original personal-table migration.

## Roles

| Role | Team permissions |
| --- | --- |
| Planner | Read the team workspace, edit/apply inputs, submit applied scenarios for review. Cannot record team decisions or manage membership. |
| Reviewer | Read team plans and immutable submissions, record decisions. Cannot edit or submit team plans or manage membership. |
| Admin | Manage members and perform both planning and reviewing workflows. The last Admin cannot be removed or demoted. |

All members can use the read-only assistant and export visible scenario data. Team plans, submissions and decisions are shared. Chat audit entries are private to their author within the team, including from other Admin users through ordinary client access. Personal workspaces remain separate sandboxes; a personal review has no authority over a team submission.

## 1. Apply the new migration once

Open [supabase/migrations/202611100001_team_roles.sql](supabase/migrations/202611100001_team_roles.sql). Copy it into your Supabase SQL Editor and run it once against the intended project. It adds separate team tables, indexes, grants, policies and guarded functions. It does not drop or rewrite the original personal tables.

The migration is transactional. If an object already exists, do not drop it or repeatedly rerun the file: inspect whether it was already applied or whether the schema differs. No privileged database credential is needed in the application. The public publishable key cannot apply SQL migrations.

## 2. Assign the first Admin deliberately

Sign in to HalaCapacity. Open **Team** and use **Copy UID**, or find the account in Supabase → Authentication → Users. Do not copy a session token or password.

Open [supabase/setup/create_first_team.sql](supabase/setup/create_first_team.sql). Replace `REPLACE_WITH_YOUR_USER_UID` with that confirmed account's UID. Run the script in the trusted Supabase SQL Editor. It creates “HalaCapacity Team” and makes exactly that account its first Admin. It checks that the user exists and has confirmed their email, and rejects duplicate setup for an account already administering a team.

There is no “choose Admin” option at signup, and no public bootstrap endpoint. Do not automatically promote the first registered user or trust editable user metadata for permission decisions.

## 3. Refresh and select the team

In HalaCapacity → Team, select **Refresh access**, or reload the website. A newly loaded account defaults to its first available team; use the workspace selector to switch back to Personal. Existing personal changes, such as the 18-hour test, remain in Personal until you deliberately recreate them in the team workspace.

The Admin can add another already registered user by UID and choose their role. No invitation email is sent by this feature. Role changes/removals are recorded in `planning_membership_audit`, visible to team Admins. Removal asks for confirmation in the UI and does not delete that person's prior submissions/decisions.

## 4. Test the handoff with separate accounts

1. Sign in as Planner and select the team. Apply a scenario in Planner, then choose **Submit applied values for review**. Only server-saved applied values are included.
2. Sign in as Reviewer in a separate browser profile. Refresh the workspace and open Decisions. Select the submitted version, inspect its evidence and record a decision. Editing team inputs must be disabled and a direct database write must be denied.
3. Change and apply the draft as Planner. The old submission and its review must remain unchanged. Submit a new version for a new review.
4. Inspect History as either member. The decision identifies the submission and reviewer UID. Team chat entries must remain author-private.
5. Check an unrelated account: it must not see the team's plans, members, submissions, decisions or chat. Remove a test member as Admin and confirm new requests lose access.
6. Attempt to remove/demote the only remaining Admin; it must fail. Never use a real operational decision for these tests.

Permissions are enforced by database grants/policies and guarded RPCs, not just disabled buttons. Membership RPCs serialize changes on the team row to protect the last Admin. Submission RPCs copy saved input values on the server; review RPCs verify role and submission/team association and derive the actor from `auth.uid()`.

## Chat context

Authenticated team chat verifies the session, fetches membership from the database and overrides any browser-provided role. It reads the selected submission snapshot when one is active; otherwise it reads the team's saved draft. Nonmembers and cross-team/missing submissions are rejected. The assistant cannot perform edits, submit plans, change roles or record decisions.

Plain Vite does not execute the Pages function, so the widget still uses offline templates until the function/model is activated. That limitation is separate from Supabase team persistence.

## Verification and current limits

The automated suite includes an embedded PostgreSQL engine (PGlite), which executes both migrations and checks actual database permission errors for Planner, Reviewer, Admin, outsider and anonymous roles. It also checks bootstrap, immutable snapshots, last-Admin protection, private chat and preservation of original personal records. Supabase authentication is stubbed for these database tests; they do not prove hosted Auth/RLS deployment correctness.

Browser role checks use synthetic sessions and intercepted responses: Planner saves/submits but cannot approve; Reviewer cannot edit and decides against the selected snapshot; Admin manages a roster. No real accounts, emails or live records are created by these checks.

The new migration has not been applied to the hosted project by this agent. The first Admin has not been assigned; the intended User UID is still needed. Real multi-account verification remains required after activation. The current model has three roles, no assigned-reviewer routing, no email invitations, no realtime subscriptions and no organizational hierarchy. Latest applied draft writes still use last-successful-save wins. Submissions are immutable, versioned with `rules_version = v1`, and the app shows up to 100 recent submissions, 500 decisions and 200 author chat entries. Submitted input snapshots are preserved, but old rule-engine executables are not archived.
