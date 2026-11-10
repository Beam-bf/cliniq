# ClinIQ

Ask ClinIQ now has tested local Cloudflare inference with restricted, server-rendered algorithm results and pgvector evidence. Start `npm.cmd run kb:serve` and `npm.cmd run dev`; sign in for the configured account workspace. See [LIVE_CHAT_VERIFICATION.md](LIVE_CHAT_VERIFICATION.md) for real outputs, setup, restrictions and remaining limits.

The latest conversation, policy-relevance and offline-simulation improvements are documented in [ASK_HALA_UPGRADE_VERIFICATION.md](ASK_HALA_UPGRADE_VERIFICATION.md). Use [HACKATHON_DEMO.md](HACKATHON_DEMO.md) for the demonstration sequence. `npm run test:all` runs both repeatable suites; explicit `test:live`, `test:browser` and `security:secrets` commands cover their separate boundaries.

The healthcare policy knowledge-base increment is documented in
[knowledge/README.md](knowledge/README.md). It adds verified document ingestion,
local neural embeddings and a real PostgreSQL/pgvector retrieval service, with
Policy Agent findings in the existing Coordinator, approvals and Ask ClinIQ chat.
The original clinic agents and scenarios remain intact. Start with
`npm.cmd run kb:prepare-model`, `npm.cmd run kb:ingest`, then run
`npm.cmd run kb:serve` alongside the existing `npm.cmd run dev`.

An interactive specialist-capacity planning demo for **a capacity planner** responsible for comparing specialist availability across clinics. The prototype uses six fictional Dubai clinics and four specialties. All operational data is fictional and aggregate; no patient information belongs in any field.

**Problem hypothesis:** the capacity planner needs to inspect uneven waiting-time pressure and available specialist hours together, compare rule-based options, and record a reasoned planning review.

**Honest limits:** this is a fictional-data prototype with fixed rules. It has not demonstrated reduced waiting times, clinical benefit, market demand or suitability for real hospital operations. Accounts save each planner's own work; there is no Admin/Planner/Reviewer split or shared team-review workflow.

**Validation status: pending.** No hospital-operations or health-administration contact has been interviewed, no validation message has been sent, and no real user quote has been collected.

Four interview questions to use later:

1. How do you currently identify specialist-capacity shortages or uneven waiting times across clinics?
2. Which part of that process causes the most delay or uncertainty?
3. Would a prototype like this fit your workflow? What would make it useful or not useful?
4. What data, evidence and safeguards would you need before relying on its recommendations?

Record actual responses accurately and obtain permission before quoting someone in the pitch. Until then, keep validation labelled pending.

## Real-data analysis

Collected datasets are separated by provenance in [analysis/datasets.json](analysis/datasets.json). The [capacity-table review](analysis/capacity-2022-2033/README.md) verifies 40 submitted rows against original DHA Table 12, corrects four demand-year cells, and excludes 12 unresolved source discrepancies. Modelled demand and projections remain distinct from public statistical observations and the fictional clinic scenarios. No forecasting model is trained on these data.

A first descriptive analysis uses Dubai Health Authority's published **2024** workforce and facility tables: [analysis report](analysis/dubai-2024/REPORT.md), [CSV](analysis/dubai-2024/results.csv), and [source/provenance](analysis/dubai-2024/source-data.json). Reproduce it with `node analysis/dubai-2024/analyze.mjs`. All three table totals and the physician subset reconcile. These are regional licensed-resource counts; they do not establish clinic waiting times or spare specialist hours. The website's fictional scenarios remain labelled as such.

## What you can do

- **Overview:** see a short planning snapshot, forecast pressure and the next useful action. Expand the full indicators only when needed.
- **Planner:** select a clinic/specialty, edit fictional current waiting weeks, available hours and referrals, then apply and recalculate the four fixed-rule agents. This edits scenario inputs; it does not simulate how added hours change future waits.
- **Decisions:** select a recommendation from the compact list and review it alongside the decision form. Concern counts stay visible; expand them, operational evidence and policy extracts when needed. Reviews are attached to the exact scenario-input version. A changed plan needs its own review.
- **Evidence:** search the existing source list. Quotes and summaries stay visible; publisher details are expandable. Unverified sources are excluded from retrieval.
- **History:** search recorded decisions and chat summaries, filter by scenario, and refresh connected-account records.
- **Help:** short walkthrough, privacy/storage information, expandable limitations and draft ITU concept alignment.
- **Account:** real Supabase email/password sign-up, sign-in, confirmation and password-reset flows when configured. Without configuration, this page clearly identifies the browser demo; it does not simulate a login.
- **Ask ClinIQ:** bottom-right floating assistant, available across views. Suggested questions send immediately; Enter sends and Shift+Enter adds a line. Escape closes the panel and restores launcher focus. Click citations to open Evidence and focus the source. Closing the panel preserves the conversation; changing scenarios or account resets it.
- **Export:** download a JSON briefing of the current scenario, findings, review statuses and visible history. Account credentials are not included.

## Run

Use Node **24.22+** for the existing module-hook test runner.

```sh
npm ci
npm run dev
```

On PowerShell use `npm.cmd` if `npm.ps1` is blocked. No execution-policy change is needed. The policy knowledge service adds the pinned dependencies described in `knowledge/README.md`. Open the Local URL printed by Vite.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run backend:check
npm run preview
```

Vite serves the client and proxies `/api/policy` and `/api/chat` to the local Node knowledge/chat service when running. The bridge executes the existing chat handler with server-only provider configuration, deterministic planning tools and real vector retrieval. It does not deploy or emulate Cloudflare Pages hosting. Unavailable or invalid live selections fall back to clearly labelled checked results. `build` outputs `dist/` and does not deploy anything.

## Working together

The shared repository is https://github.com/Beam-bf/cliniq. See [CONTRIBUTING.md](CONTRIBUTING.md) for cloning, separate task branches, checks and pull requests. Local changes become available to collaborators after they are pushed. Each signed-in capacity planner has private account storage; collaborating on the code does not share application records.

## Backend and account activation

Supabase is connected locally. The app contains auth flows, private account storage, row-level-security migrations, and server-side session verification for account chat context. The user reports applying the role-retirement SQL and confirms a signed-in 19-hour plan survives refresh. Read-only public checks on 10 November 2026 confirm email authentication/confirmation enabled and anonymous reads denied on all three personal tables. Account now shows saved-record counts, sync time, save progress and connection retry. Local PostgreSQL tests verify private plans, decisions and chat history; hosted decision/chat persistence, password recovery and two-account isolation still require signed-in verification. See [BACKEND_SETUP.md](BACKEND_SETUP.md).

Public browser build configuration:

| Variable | Use |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public publishable key (or legacy anon key), never a service-role/secret key. |

These are build-time values, so adding them requires restarting Vite/rebuilding the client. Local `.env.local` now contains the supplied public connection details and is ignored by Git. Server `.dev.vars` contains the corresponding public configuration for future local Pages testing. Hosting environments remain unconfigured.

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

The application targets one capacity planner workflow. Team roles and shared submissions have been removed from the UI, repositories and chat integration. Historical team records are retained in the database; [ROLE_RETIREMENT.md](ROLE_RETIREMENT.md) explains the non-destructive SQL step that disables the old team APIs. The user reports applying it; hosted grants have not been independently verified. [supabase/verify_backend.sql](supabase/verify_backend.sql) provides read-only setup checks. Personal planning tables and Auth are unchanged.

Demo plans/statuses/history use `localStorage` keys prefixed `halacapacity.`. Signed-in workspaces use three account-specific tables: `planning_plans`, `planning_decisions`, and `planning_chat_audit`. Demo records are not imported into an account automatically, and account data is not copied back to demo storage when signing out. A failed account save surfaces an error instead of silently saving to demo storage.

Current plan identity is the canonical set of changed inputs. Every recommendation, including an original scenario, also includes the policy-corpus revision (or an unavailable marker). Historical unversioned reviews remain in History but do not approve the new policy version. Restoring exactly the same inputs and corpus returns to that version's recorded reviews. The app stores the latest plan per scenario/account and does not yet provide named scenario branches, revision recovery or multi-device conflict resolution. Last successful save wins. History currently loads up to 500 decisions and 200 chat entries per account.

Decisions and chat rows permit select/insert for their owner; normal clients have no update/delete grants. These remain user-entered planning records, not independently verified or tamper-proof operational audit records. Administrators retain database access. All scheduling, staffing and booking actions remain outside this tool.

## Chatbot context and guiding prompt

The actual server system instruction is [functions/_lib/chatPrompt.ts](functions/_lib/chatPrompt.ts). It explains the product, scenarios, fixed-rule algorithms, navigation, context schema, what-if limitations, evidence rules, read-only boundary, untrusted text and concise answer style. It is passed to the model on every live call.

See [CHATBOT.md](CHATBOT.md) for retrieval, limits, provider configuration, and what the prompt can and cannot guarantee. The LLM does not generate the four capacity agents' results. No capacity-model training was added. The separate policy knowledge service now uses pretrained sentence embeddings and pgvector; live generative-model configuration remains separate.

## Demo steps

1. Open Overview and switch between Baseline, Winter surge and Specialist leaves. The cases are independent; specialist leave is based on baseline, not winter surge.
2. In Decisions, select the forecast recommendation, enter a fictional reason and record a decision.
3. In Planner, select Clinic Alpha / Psychiatry. Change current wait to 8.5 weeks and free hours to 2; click **Apply & recalculate**. The findings change and the altered plan's recommendation awaits a fresh review.
4. Open Ask ClinIQ and ask “Give me a summary of free hours and referrals”. Offline mode uses the currently applied values. Ask “Explain Alpha psychiatry forecast” for the calculated trend and its limits. Policy passages appear only for relevant policy questions, such as telehealth consent.
5. Open History to search the question and decision. Reload to verify demo persistence. Do not use real patient data to test input rejection.
6. Open Account to see connection status. Once activated, use two separate test accounts to verify that plans and history do not cross account boundaries.

## Verification

The application suite includes **61 tests/subtests**, including conversation, restricted-provider, clinic-number, simulation and follow-up checks. The separate `npm run test:kb` suite includes **20 checks** for original-table review, actual PostgreSQL/vector retrieval, citation relevance, document-instruction rejection and applicability boundaries. `npm run test:all` runs both. Separate actual Cloudflare/browser results are documented in [ASK_HALA_UPGRADE_VERIFICATION.md](ASK_HALA_UPGRADE_VERIFICATION.md). Local retirement tests do not prove that the retirement SQL has been applied correctly to the hosted project.

An isolated installed-Chrome session verified page navigation, a real demo approval, input editing/recalculation, review invalidation after editing, the floating assistant, Escape close/focus return, contextual offline answers, clinical-input rejection, repeated source navigation/focus, JSON export content, persisted history after reload, scenario isolation and the unconfigured account state. The page and widget fit the tested 390×844 mobile viewport. Screenshots are in ignored `.browser-qa/`. No new browser/test packages were installed.

After role removal, another isolated Chrome check used a synthetic session and intercepted Supabase responses to verify personal saving/reload, decision/history persistence, popup answers and focus, the retired Team route, absence of team API calls, and the 390px layout. Production build and a bundled server-function offline smoke check passed. These checks made no live account or database writes.

The user has demonstrated a signed-in workspace and applied inputs. Hosted role retirement, a full two-account isolation check, password recovery, a hosted Cloudflare runtime and real model calls still need verification. Local PostgreSQL and mocked browser checks do not establish hosted database policy correctness.

## Limits and next priorities

Operational figures and task assignments are fictional. The four agents are fixed rules; forecast confidence indicates straight-line fit only. Changing referral/hour inputs does not model future clinical outcomes. Original policy verification flags are inherited, and a keyword match is not proof of policy support. ITU alignment remains a draft concept comparison, with unverified applicability/metrics labelled in the app.

Role retirement and personal-plan reload were reported completed by the user; independent hosted permission, decision/chat, recovery and isolation checks remain. User validation is pending; use the four questions above when a real contact is available. See [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md).
