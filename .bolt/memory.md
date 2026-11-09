# Project memory

## Product intent & audience

- Healthcare specialist capacity planning dashboard for Dubai.
- Human-approved decision-support tool: agents recommend, human approves before action.
- Audience: healthcare planners/administrators; not for autonomous clinical decisions.

## Brand personality & voice

- Professional, trustworthy, clinical-adjacent tone.
- Plain language used for limitations and user-facing explanations.

## Visual design & UX direction

- Stack: React + TypeScript + Tailwind (Vite), Lucide React icons, `@/` import alias.
- User selected direction A, Paper briefing, then rejected the density and requested functional website elements. The workspace now has Overview, Planner, Decisions, Evidence, History, Help and Account hash routes. Overview is brief; deep evidence/limitations are progressively disclosed. Ivory/forest palette remains.
- The content/design pass shortened Overview/Planner copy and gave Decisions a side-by-side recommendation/review layout with expandable evidence and coordinator concerns. The user has now resumed backend activation (10 November 2026). No competition judging criteria supplied yet; do not imply a guaranteed winning design.
- Content/design is saved on feature/content-design; backend activation continues on feature/backend-activation. The previously approved initial main upload is complete; later branch changes remain local until upload is authorized. User and friend will work on separate task branches.
- Read-only chat is now a nonmodal bottom-right widget with launcher, Escape close/focus return, suggestion sends and source-card navigation. Context includes applied what-if changes and current view. Full LLM system instruction lives in functions/_lib/chatPrompt.ts.
- Responsive grids throughout; status conveyed by color plus numeric value (never color-only).
- Accessibility baseline established: skip-to-main link, `main` landmark with id, `aria-labelledby` on all sections, `aria-pressed` on toggle buttons, `aria-live` for decision status announcements, `aria-describedby` linking reason-field errors, `scope` on table headers, reduced-motion handling in CSS.
- Browser demo state persists to localStorage. Supabase auth and per-account repositories now have local public project configuration and the user has applied the SQL migration. Three tables exist; anonymous reads are denied and a user screenshot confirms RLS enabled with expected policy counts. Live account/save/isolation verification remains outstanding; do not simulate sign-in.

## Decisions, constraints & rationale

- Rule-based agents, not ML models; simple forecast; keyword-based policy matching.
- Decision reason required before approval; audit history captured for every decision.
- All data is fictional; tool explicitly not validated for real-world use.
- Plain-language limitations include the optional chat LLM, incomplete input screening, and browser-only audit persistence.
- ITU mapping is now a draft concept comparison with official references. Y.3172 component names and AI Readiness landing-page themes were checked; applicability and detailed readiness metrics remain unverified.
- Cloudflare Pages Functions is the proposed chat host; the export has no existing hosting configuration. No credentials, deployment or push. See README.md and CHATBOT.md for setup.
- Sixteen Node tests cover chat/planning retrieval, output validation, failure fallback, screening, adjusted scenarios, review identities, prompt context, authenticated context, repository writes and request limits. No new packages.
- Supabase is now used for actual auth/persistence adapters. Live auth, database migration and RLS execution have not been verified. Server chat verifies the bearer token and reads the saved account context with that token instead of trusting browser account records.
- What-if edits recalculate fixed rules and use canonical input identities for separate approvals. Changing hours/referrals does not simulate future wait reduction. Task-shifting still uses the shared fictional task list.

## Open questions & assumptions

- Direct AI Ready report body was unreadable; no report-specific metric claim is made.
- Git has now been initialized locally. The shared remote is https://github.com/Beam-bf/halacapacity-ai.git; preserve its initial main history. CONTRIBUTING.md describes collaboration. The user's original no-push/no-deploy restriction remains until explicitly revoked.
- An isolated installed-Chrome session verified navigation, demo review, planner recalculation, approval versioning, offline chat, source focus, reload persistence, scenario isolation and a 390px mobile viewport. Screenshots/profile are ignored under .browser-qa. Vite ignores that folder to avoid locked cache-file watcher errors.
- User supplied a Supabase project URL and public publishable key. These are configured locally in ignored .env.local and .dev.vars; never put their values in tracked source/docs. Project Auth settings responded 200: email sign-in/sign-up enabled, email confirmation required. Tables initially returned 404/PGRST205, but after the user's SQL run all three now return anonymous permission denial (401/42501). The screenshot confirms RLS enabled and policy counts: planning_plans 3, planning_decisions 2, planning_chat_audit 2. No privileged SQL connection exists. No accounts, emails or database records were created by assistant checks. Next verify auth redirect configuration, real signup/sign-in and authenticated saving/isolation. Model API and hosted runtime remain unconfigured. See BACKEND_SETUP.md for activation and PRODUCT_ROADMAP.md for next priorities.
- User subsequently signed in and applied 18 specialist hours for Alpha psychiatry; screenshot confirms applied values. Full cross-account live verification remains outstanding. User explicitly requires chatbot as a core staff-facing feature.
- New local branch feature/team-roles implements shared team membership with Admin/Planner/Reviewer, protected membership RPCs (last-Admin protection), applied team drafts, immutable submitted snapshots and reviewer decisions. Personal records remain separate and unchanged. Team chat notes are private to their author. Signed-in users see Team and Copy UID; signup never self-assigns Admin.
- New additive migration supabase/migrations/202611100001_team_roles.sql and trusted initial setup supabase/setup/create_first_team.sql are prepared, not yet applied to hosted Supabase. First Admin UID is still missing. TEAM_SETUP.md explains activation. Do not claim the user is already Admin or assign a guessed account.
- Added dev-only @electric-sql/pglite to execute PostgreSQL policy/bootstrap tests; synthetic Auth schema is used in those tests. Thirty automated checks cover real SQL policy behavior plus model/context/repository tests. Isolated Chrome role workflows use synthetic sessions and intercepted Supabase responses; no real accounts/emails/cloud records were created. Do not confuse these with live RLS/Auth verification.
