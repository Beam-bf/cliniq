# Activate the account backend

The local implementation uses the existing Supabase dependency. On 10 November 2026, the supplied project URL and public publishable key were configured in ignored `.env.local` and `.dev.vars` files. The project responds and reports email sign-in, sign-up and email confirmation enabled. The user applied the migration: all three tables now deny anonymous queries, and the supplied SQL result confirms row-level security enabled with 3 plan policies, 2 decision policies and 2 chat policies. Real sign-in, saving and cross-account isolation still need verification. No accounts or emails were created by the assistant's checks.

## 1. Create or select the project

Use your own project. Obtain its project URL and **public publishable key** (a legacy anon key also works). These identify the public client; row-level policies protect the records. Never put a service-role key, `sb_secret_` key, database password or model API key into Vite variables or chat.

Before configuration, understand that this will enable real account emails and save each account's fictional planning data to that project. The demo continues to use browser storage and is not migrated automatically.

## 2. Review and apply the migration

Read [supabase/migrations/202611090001_planning_workspace.sql](supabase/migrations/202611090001_planning_workspace.sql), then apply it once using your project's SQL editor or your existing migration workflow. It creates three new tables and policies; it does not drop existing data. If names already exist, reconcile the schema before applying rather than dropping tables or rerunning blindly. The file uses a transaction, so a failed statement rolls back its changes.

Tables:

- `planning_plans`: one current JSON adjustment set per account and scenario.
- `planning_decisions`: append-only review records for the ordinary API client, including scenario-input identity.
- `planning_chat_audit`: append-only visible question/answer summaries and source IDs for the ordinary API client.

All tables enable row-level security. Anonymous access is revoked. Authenticated read/insert policies require `auth.uid() = user_id`. Plan updates enforce the same owner check; decision/chat update/delete access is not granted. No service-role key is needed by this app. Supabase's [row-level security guide](https://supabase.com/docs/guides/database/postgres/row-level-security) explains how database policies enforce this boundary.

The original SQL configures personal workspaces. Shared teams and Admin/Planner/Reviewer roles use the separate additive migration and setup in [TEAM_SETUP.md](TEAM_SETUP.md). Do not rerun the original personal migration to enable teams. Team planning bounds are checked inside the database as well as the app.

## 3. Configure authentication

Enable email/password authentication, review your project's password policy, and keep email confirmation enabled for normal sign-up. Configure the site's URL and an explicit redirect allow-list for the origins you actually use, such as your local Vite URL and future hosted URL. The app redirects confirmation/reset links to its root and handles recovery events by showing a new-password form. Production email delivery may require your own SMTP configuration; review your provider's current delivery limits.

The app implements sign-up, sign-in, sign-out, reset email and password update using the documented [password authentication flows](https://supabase.com/docs/guides/auth/passwords). Account email/password go to Supabase Auth, never the chatbot. No OAuth providers or MFA are configured. Team roles are stored in database membership, not editable signup metadata, and need their own migration/first-Admin setup.

## 4. Configure the client build

Supply `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to Vite through your local environment or build settings, then restart/rebuild. These public values are now configured locally in ignored `.env.local`; future hosting still needs its own build configuration. Do not expose any privileged key.

Without both valid values, the app clearly stays in browser demo mode. With them present, Account enables the real forms. Missing database tables/policies produce a workspace connection error with Retry; the app does not silently save account records into the demo.

## 5. Configure the function

Supply matching server variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the Pages function. It verifies the bearer token with `/auth/v1/user`, then fetches the saved plan and recent decisions under that user's token. Browser-supplied account adjustments/audit are replaced. Expired tokens are rejected; a missing or broken database does not produce an authenticated live answer.

Live LLM calls additionally need `AI_PROVIDER=cloudflare`, `AI_API_KEY`, `AI_ACCOUNT_ID` and `AI_MODEL`. Keep these server-only, with no `VITE_` prefix. Plain `npm run dev` does not execute the Pages function and continues to use offline templates. No model API key has been supplied or tested.

## 6. Verify before claiming activation

Create two test accounts in separate browser profiles. For each account, verify sign-up confirmation, sign-in, session reload, password recovery and sign-out. Create different scenario changes and decisions; confirm that account A cannot read or write account B's rows through direct REST requests, not only through the UI. Confirm that anonymous queries fail and decision/chat update/delete operations are rejected.

Check a database/network failure: a save must display an error and must not be represented as saved. Test the chat endpoint with missing and expired tokens, then with an actual valid session; ensure the context matches the saved account plan. Verify that sign-out clears the account view and returns to the separate browser demo without copying private records. Only then describe the live backend as activated.

The included automated tests use mocks for service boundaries. The migration and actual row-level policies have **not** been executed here.
