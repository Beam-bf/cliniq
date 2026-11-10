# ClinIQ

An interactive specialist-capacity planning demo for six fictional Dubai clinics and four specialties. All operational data is fictional and aggregate. No patient information belongs in any field.

## What you can do

- **Overview:** see a short planning snapshot, forecast pressure and the next useful action. Expand the full indicators only when needed.
- **Planner:** select a clinic/specialty, edit fictional current waiting weeks, available hours and referrals, then apply and recalculate the four fixed-rule agents. This edits scenario inputs; it does not simulate how added hours change future waits.
- **Decisions:** inspect coordinator concerns, select a recommendation and record approval, rejection or a request for changes with a reason. Reviews are attached to the exact scenario-input version. A changed plan needs its own review.
- **Evidence:** search the existing source list. Quotes and summaries stay visible; publisher details are expandable. Unverified sources are excluded from retrieval.
- **History:** search recorded decisions and chat summaries, filter by scenario, and refresh connected-account records.
- **Help:** short walkthrough, privacy/storage information, expandable limitations and draft ITU concept alignment.
- **Account:** real Supabase email/password sign-up, sign-in, confirmation and password-reset flows when configured. Without configuration, this page clearly identifies the browser demo; it does not simulate a login.
- **Ask Hala:** bottom-right floating assistant, available across views. Suggested questions send immediately; Enter sends and Shift+Enter adds a line. Escape closes the panel and restores launcher focus. Click citations to open Evidence and focus the source. Closing the panel preserves the conversation; changing scenarios or account resets it.
- **Export:** download a JSON briefing of the current scenario, findings, review statuses and visible history. Account credentials are not included.

## Run

Use Node **24.22+** for the existing module-hook test runner.

```sh
npm ci
npm run dev
```

On PowerShell use `npm.cmd` if `npm.ps1` is blocked. No execution-policy change is needed. Dependencies are already installed; this increment adds no packages. Open the Local URL printed by Vite.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

Vite serves the client only. Its dev and preview commands do not run Cloudflare Pages Functions; the assistant falls back to clearly labelled offline templates. `build` outputs `dist/` and does not deploy anything.

## Working together

The shared repository is https://github.com/Beam-bf/halacapacity-ai. See [CONTRIBUTING.md](CONTRIBUTING.md) for cloning, separate task branches, checks and pull requests. Local changes become available to collaborators after they are pushed. Account data sharing is separate from code collaboration: the current backend gives each user a personal workspace.

## Backend and account activation

Supabase is now an active integration, using the dependency already in the project. The app contains auth flows, an account-scoped repository, database migration with row-level security, and server-side session verification for account chat context. **No Supabase project is connected yet**, and no migration has been executed against a real database. See [BACKEND_SETUP.md](BACKEND_SETUP.md) for the exact activation steps.

Public browser build configuration:

| Variable | Use |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public publishable key (or legacy anon key), never a service-role/secret key. |

These are build-time values, so adding them requires restarting Vite/rebuilding the client. No environment files or variables were created or changed during implementation.

Server function configuration:

| Variable | Use |
| --- | --- |
| `SUPABASE_URL` | Same project URL, used only by the server function. |
| `SUPABASE_PUBLISHABLE_KEY` | Same public project key. Authenticated REST reads use the caller's verified bearer token and database policies. |
| `AI_PROVIDER` | `cloudflare` selects the implemented live model adapter. |
| `AI_API_KEY` | Server-only scoped Workers AI API token. |
| `AI_ACCOUNT_ID` | Cloudflare account ID. |
| `AI_MODEL` | Available text-generation model; check the current model catalog before enabling it. |

Cloudflare Pages Functions remains the proposed function host because the export has no existing hosting configuration. Root `functions/api/chat.ts` serves `/api/chat`; Pages must bundle `functions/` alongside static `dist/`. A separately installed Wrangler can run `wrangler pages dev dist`; Wrangler is not installed here. No SDK or CLI was downloaded for this increment.

The browser demo remains available without an account. Configured but signed-out browser clients use local offline chat. A server configured for accounts requires a valid session for connected chat. The function verifies that session through Supabase Auth, then reads the caller's saved plan and recent decision metadata under their own row-level policies, replacing any client-supplied account plan/audit. Passwords, API keys and decision reasons are not sent to the model.

## Persistence and review versions

Demo plans/statuses/history use `localStorage` keys prefixed `halacapacity.`. Signed-in workspaces use three account-specific tables: `planning_plans`, `planning_decisions`, and `planning_chat_audit`. Demo records are not imported into an account automatically, and account data is not copied back to demo storage when signing out. A failed account save surfaces an error instead of silently saving to demo storage.

Current plan identity is the canonical set of changed inputs. Original scenarios retain the old proposal IDs for compatibility. What-if recommendations receive distinct IDs; restoring exactly the same inputs returns to that version's recorded reviews. This is intentional. The app stores the latest plan per scenario/account and does not yet provide named scenario branches, revision recovery or multi-device conflict resolution. Last successful save wins. History currently loads up to 500 decisions and 200 chat entries per account.

Decisions and chat rows permit select/insert for their owner; normal clients have no update/delete grants. These remain user-entered planning records, not independently verified or tamper-proof operational audit records. Administrators retain database access. All scheduling, staffing and booking actions remain outside this tool.

## Chatbot context and guiding prompt

The actual server system instruction is [functions/_lib/chatPrompt.ts](functions/_lib/chatPrompt.ts). It explains the product, scenarios, fixed-rule algorithms, navigation, context schema, what-if limitations, evidence rules, read-only boundary, untrusted text and concise answer style. It is passed to the model on every live call.

See [CHATBOT.md](CHATBOT.md) for retrieval, limits, provider configuration, and what the prompt can and cannot guarantee. The optional LLM is not used to generate the four capacity agents' results. No training or embeddings are involved.

## Demo steps

1. Open Overview and switch between Baseline, Winter surge and Specialist leaves. The cases are independent; specialist leave is based on baseline, not winter surge.
2. In Decisions, select the forecast recommendation, enter a fictional reason and record a decision.
3. In Planner, select Clinic Alpha / Psychiatry. Change current wait to 8.5 weeks and free hours to 2; click **Apply & recalculate**. The findings change and the altered plan's recommendation awaits a fresh review.
4. Open Ask Hala and ask “Give me a summary of free hours and referrals”. Offline mode uses the currently applied values. Ask “What psychiatry forecast risks appear?” to see related verified-source chips.
5. Open History to search the question and decision. Reload to verify demo persistence. Do not use real patient data to test input rejection.
6. Open Account to see connection status. Once activated, use two separate test accounts to verify that plans and history do not cross account boundaries.

## Verification

Lint, frontend/server typechecks, **16 automated tests**, and the Vite production build pass. A separate server-bundle smoke check returns offline summaries for all three scenarios. Tests cover retrieval, citations, reasoning-block removal, mocked model failures, input screening, adjusted-scenario calculations, review identities, guiding-prompt context, token rejection, authenticated-context replacement, database owner filters, chat-audit inserts and save failures.

An isolated installed-Chrome session verified page navigation, a real demo approval, input editing/recalculation, review invalidation after editing, the floating assistant, Escape close/focus return, contextual offline answers, clinical-input rejection, repeated source navigation/focus, JSON export content, persisted history after reload, scenario isolation and the unconfigured account state. The page and widget fit the tested 390×844 mobile viewport. Screenshots are in ignored `.browser-qa/`. No new browser/test packages were installed.

Live Supabase email/session flows, database migrations/RLS execution, a hosted Cloudflare runtime and real model calls still need verification after project configuration. Mocked security tests do not establish live database policy correctness.

## Limits and next priorities

Operational figures and task assignments are fictional. The four agents are fixed rules; forecast confidence indicates straight-line fit only. Changing referral/hour inputs does not model future clinical outcomes. Original policy verification flags are inherited, and a keyword match is not proof of policy support. ITU alignment remains a draft concept comparison, with unverified applicability/metrics labelled in the app.

Start with backend/provider activation and cross-account verification. Then add named/versioned planning runs, team roles and reviewer assignment, validated aggregate CSV import, and a measured demand/capacity model. The recommended functional roadmap is in [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md).
