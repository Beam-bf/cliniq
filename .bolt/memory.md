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
- Read-only chat is now a nonmodal bottom-right widget with launcher, Escape close/focus return, suggestion sends and source-card navigation. Context includes applied what-if changes and current view. Full LLM system instruction lives in functions/_lib/chatPrompt.ts.
- Responsive grids throughout; status conveyed by color plus numeric value (never color-only).
- Accessibility baseline established: skip-to-main link, `main` landmark with id, `aria-labelledby` on all sections, `aria-pressed` on toggle buttons, `aria-live` for decision status announcements, `aria-describedby` linking reason-field errors, `scope` on table headers, reduced-motion handling in CSS.
- Browser demo state persists to localStorage. Supabase auth and per-account plan/decision/chat repositories are implemented but not connected to a real project. SQL migration in supabase/migrations enables owner RLS. Public client and server configuration still required; do not simulate sign-in.

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
- No real Supabase/model credentials, project or deployment is configured. See BACKEND_SETUP.md for activation and PRODUCT_ROADMAP.md for next priorities. Keep no-push/no-deploy constraint.
