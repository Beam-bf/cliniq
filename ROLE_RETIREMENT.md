# Return to a single capacity planner

The application now has one intended user: a capacity planner comparing fictional specialist-capacity options. Admin/Planner/Reviewer accounts, Team navigation, workspace selection and team submission handoffs have been removed. Sign-in and private account storage remain available. The existing design and popup chatbot remain in place; only the retired team-role context was removed from the chatbot integration.

## Existing records

Personal data in `planning_plans`, `planning_decisions` and `planning_chat_audit` is unchanged. Existing team records are not copied into personal accounts and are not deleted. They remain in the database as historical records available to the trusted Supabase project owner.

## Disable the old team API in Supabase

The user reports running [supabase/migrations/202611100002_retire_team_roles.sql](supabase/migrations/202611100002_retire_team_roles.sql) in the project's SQL Editor. It revokes ordinary client access to the seven old team tables, their management/review functions, and private role helpers. It leaves Auth, personal planning grants/policies, and all rows intact. The script is safe to repeat and also handles installations where team roles were never enabled. Use [supabase/verify_backend.sql](supabase/verify_backend.sql) to independently check hosted grants without changing records.

The earlier team migration remains in the repository because it was already applied to the hosted project; migration history is preserved rather than rewritten. Do not rerun it to activate roles. The old bootstrap setup has been removed from the active codebase.

Until the retirement SQL runs, the new website no longer calls team APIs, but a previously authorized client could still use the old database permissions. Removing buttons alone does not revoke backend access. The retirement has been tested locally in PostgreSQL; it has not been applied to the hosted project by this agent because no privileged database connection is available.

## Verify the result

The user confirms their personal 19-hour plan persists after refresh. Still verify Decisions and History with the signed-in hosted account. There should be no Team navigation, role selector or team submission button. The public demo and popup assistant should still work. Old team chat requests receive an explicit retired-workspace response rather than being used as personal context.

Local PostgreSQL tests verify retained historical rows, preserved personal access/isolation, denied old Admin calls and repeatable retirement. These do not replace a hosted authenticated verification after the SQL is applied.
