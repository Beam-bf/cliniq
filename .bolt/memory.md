# Project memory

## Current user direction

- User resumed backend/frontend finalization, explicitly selecting **Finalize locally first** on 10 November 2026. Local implementation and verification are authorized; no deployment requested. User reports running role-retirement SQL and confirmed their signed-in 19-hour personal plan persists after refresh; retirement grants and two-account isolation are not independently verified. Hosted decisions/chat-history persistence and password reset remain unverified.
- No real dataset was supplied. Asked asynchronously whether to find public data or use their CSV/Excel. Meanwhile prepared a separate initial Dubai DHA 2024 aggregate resource analysis under analysis/dubai-2024, with provenance, 22 transcribed category counts, reproducible Node checks and report/CSV/JSON. All three totals and physician subset reconcile. Do not substitute annual licensed counts into fictional clinic waits/free-hour forecasts or claim operational/user validation. Source choice can be steered by user reply.
- HalaCapacity AI is a prototype for one intended user: a capacity planner comparing specialist availability and waiting pressure across clinics.
- User requested reverting Admin/Planner/Reviewer roles. Current local branch is feature/single-planner, based on feature/team-roles at 981fbb2. Prior content/design improvements from d638ffe stay.
- Remove Team navigation, role controls, workspace selection, shared submissions and team chat context. Retain Supabase sign-in, private account plans/decisions/history, browser demo and existing popup assistant.
- Further popup-chatbot, system-prompt, design and interactivity changes are deferred. Removing retired role context is within this rollback.
- Validation status: pending. User has no validation contact. No outreach was sent. Do not invent contacts, quotes, interviews, validation or operational outcomes. README contains four interview questions for later; obtain permission before quoting a real interviewee.

## Product and implementation

- React + TypeScript + Tailwind/Vite, Lucide icons, @/ alias. Ivory/forest Paper briefing design. Overview, Planner, Decisions, Evidence, History, Help and Account hash routes.
- Six fictional clinics, four specialties, three independent scenarios. All operational data is fictional and aggregate; no patient data.
- Four fixed-rule agents, straight-line forecasting and keyword policy matching. No ML accuracy, clinical benefit, reduced-wait or market-demand claim is established.
- Applied what-if edits recalculate rules and create canonical review identities. Editing hours/referrals does not simulate future waiting-time reduction. Task shifting uses a shared fictional task list.
- Human decision reasons are required; reviews record decisions without changing schedules. Demo uses localStorage; account records remain private to the authenticated owner.
- Bottom-right nonmodal assistant has suggestions, Escape/focus return and source navigation. Guiding instruction: functions/_lib/chatPrompt.ts. Live LLM hosting/key are not configured; Vite falls back to labelled offline answers.
- Server account chat verifies the bearer token and reads personal context with that token, replacing client-supplied account plans/audit. Retired team-context requests now return HTTP 409 before data/model calls.
- Accessibility includes skip link, main landmark, status/reason semantics, reduced motion. Policy verification flags are inherited. ITU alignment is a draft with applicability/metrics unverified.

## Backend state and role retirement

- Public Supabase configuration exists only in ignored .env.local and .dev.vars. Never commit credentials or user UID. No privileged Supabase connection is available to this agent.
- Personal migration 202611090001_planning_workspace.sql is applied: planning_plans, planning_decisions, planning_chat_audit. RLS enabled, expected policy counts 3/2/2 and anonymous reads denied. User signed in and showed Clinic Alpha/Psychiatry at 18 specialist hours. Full live cross-account isolation testing remains outstanding.
- Historical team migration 202611100001_team_roles.sql was also applied by the user, who showed Admin in HalaCapacity Team. Preserve that migration and historical rows; do not rerun it to reactivate roles.
- New 202611100002_retire_team_roles.sql revokes ordinary-client grants on seven team tables, three team RPCs and private helpers. No rows are deleted; Auth/personal grants remain. Repeatable and safe on personal-only installations.
- Retirement SQL was prepared and locally tested; user subsequently reports running it. The agent cannot independently verify authenticated hosted grants without privileged access. Signed-in personal saving/reload has since been confirmed by the user. Backend follow-up resumed for local finalization.

## Local finalization, 10 November 2026

- Account now displays saved scenario/decision/chat counts, sync time, saving/loading status and refresh/retry. Assistant requests wait for loaded account data. Save/refresh operations have synchronous guards; account changes cannot apply old save results. Auth mode switches are disabled while submitting; sign-out clears password-recovery mode.
- Added `npm run backend:check` (public read-only checks, no account creation/emails/writes) and `supabase/verify_backend.sql` (five read-only RLS/grant/team-retirement checks). Public hosted checks passed: email auth/confirmation enabled and all three personal tables reject anonymous reads with HTTP 401. Hosted grants/authenticated isolation remain unverified.
- Local PostgreSQL tests added for personal plan, decision and chat persistence, cross-account read/write denial, owner reassignment rejection, append-only history and verification-query drift detection. 29 tests pass, lint/typecheck pass. Isolated intercepted Chrome checks also cover failed saves, account counts/sync time, reload of all record types, failed-load retry and disabled chat during loading/error, plus original desktop/mobile workflows. No cloud writes in browser checks.
- README/setup/roadmap/retirement docs updated to distinguish user-reported hosted progress, read-only checks and local verification. Live AI and hosting remain unconfigured.
- ROLE_RETIREMENT.md documents the transition. Ignored .browser-qa/role-retirement.html at http://localhost:5173/.browser-qa/role-retirement.html offers copyable SQL plus three boolean privilege checks. Old local activation shortcuts were disabled. No live cloud records were created/deleted by this rollback.

## Collaboration and verification

- Remote: https://github.com/Beam-bf/halacapacity-ai.git. Initial main upload at 5e7c04b was authorized/completed. Later content/design, role and rollback branches remain local; no push/deploy without authorization. User and friend use separate task branches per CONTRIBUTING.md.
- Node 24.22+, npm.cmd in PowerShell. Node module-hook test runner; dev-only PGlite executes real PostgreSQL permission tests. Lint/typecheck and all 23 automated checks passed, including retained rows, personal access/isolation, denied old Admin/RPC calls, repeatable retirement and legacy chat rejection.
- Prior isolated Chrome checks covered demo planning/reviews, popup/focus/source navigation, reload/scenario isolation, export and 390px mobile. Role UI checks used synthetic sessions and intercepted Supabase; they were not live authorization verification.
- Current rollback also passed production build, bundled server offline smoke and isolated Chrome with intercepted backend requests: no Team UI/API calls, private save/reload, decisions/history, popup/offline audit, Escape focus, retired route and 390px layout. Copy-helper SQL ran in local PostgreSQL with all three verification results true.
- User's existing Vite server runs on localhost:5173; do not stop it. QA profiles/artifacts are ignored under .browser-qa and excluded from Vite watch. Close only browser instances launched by this agent.
- Report build and hosted verification accurately. Local/mocked checks do not establish hosted Auth/RLS correctness.
