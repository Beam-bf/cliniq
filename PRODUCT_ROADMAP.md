# Make HalaCapacity a functional planning product

The target workflow is: **sign in → open a saved scenario → adjust or import aggregate figures → evaluate a planning run → review evidence → record a decision → return to the saved record.** The first interactive version of that workflow is implemented locally; live-service activation is the immediate dependency.

## Priority 1 — Activate and verify the existing implementation

Connect your Supabase project, apply the reviewed migration and configure the auth redirects. Activate the server function and model provider. Test real email confirmation/recovery, two-account isolation, save failures and model fallbacks. See [BACKEND_SETUP.md](BACKEND_SETUP.md). A mock login or an attractive chat widget would not establish these capabilities.

Done means: two users can independently save/reload their own scenarios and history, private endpoint requests without valid sessions fail, and the assistant answers from the saved plan with valid citations or a clear offline label.

## Priority 2 — Make planning runs recoverable and comparable

Add named plans, immutable input snapshots for each evaluation, timestamps and a history of saved versions. Offer “Compare with original” and “Duplicate plan” rather than overwriting a single current plan. Preserve exactly which inputs and rule version produced a recommendation. Add conflict handling when two browser sessions save different revisions.

Done means: a reviewer can reconstruct the figures behind any old decision and compare two saved runs without losing either. The current implementation separates approval identities but still stores only the latest editable input set per scenario.

## Priority 3 — Add teams and a real review workflow

Introduce organizations, memberships and permission checks for owner, planner, reviewer and read-only viewer roles. Store reviewer assignments and decision state on the backend, and apply authorization to every server/database path. Add an in-app review inbox and activity updates. Design any external email notifications separately before enabling sends.

Done means: a planner can submit a version for an assigned reviewer; viewers cannot write decisions; nobody can grant themselves a privileged role. Current accounts are personal workspaces, without team roles.

## Priority 4 — Accept useful aggregate input

Add a documented CSV template for clinic/specialty/week figures, preview and validation, duplicate detection, and a reversible import summary. Keep the import schema restricted to aggregate operational fields; do not add patient-level data. Persist provenance and import versions. Provide understandable per-row errors and a sample fictional file.

Done means: a planner can replace the supplied fictional input with another authorized aggregate test dataset, see what changed, and recover the prior version. No real clinic integration is implied.

## Priority 5 — Make the model answer an operational question

The present rules highlight pressure but do not estimate how an hour transfer affects future waits. Define the decision to support first: for example, comparing weekly capacity allocations under explicit assumptions about appointment duration, demand and eligible staff hours. Build a transparent demand/capacity simulation, assess it against appropriate data, and show assumptions and uncertainty. Do not label unvalidated estimates as accurate or optimal.

Keep the chatbot as an explanation layer over computed outputs. Improve retrieval with fuller verified extracts and support checks before adding more conversational features. Measure citation validity and whether answers actually address realistic planning questions. Fine-tuning is not required to connect the assistant to application context.

## Priority 6 — Prepare day-to-day operation

Add history pagination, backups and restore checks, structured application errors, provider usage tracking, server-side rate limits that work across instances, and an automated browser suite for the main workflow. Add user feedback connected to actual task failures. Revisit retention/export/account-deletion behavior once the live storage model and team needs are clear.

The most valuable next increment is a working connected account and a saved, reproducible planning run. Extra landing-page sections would add less utility at this stage.
