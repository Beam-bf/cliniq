# Ask Hala reliability upgrade verification

Verified locally on 10 November 2026. No commit, push, deployment, package installation, billing change, model training or scenario-data edit was performed. Existing uncommitted Cloudflare/evidence work was retained.

## Implementation

The old public response path answered identity questions with generic clinic text and attached keyword-matched policy passages to ordinary forecasts. Both modes now share deterministic intent handling and checked operational results. Greetings, identity/developer questions, unsupported questions, action attempts and clarification requests avoid model calls. Developer names are deliberately empty because the repository supplies no verified contributor metadata.

Operational queries produce only the appropriate fact catalogue. Cloudflare still selects IDs; it cannot author displayed calculations or citations. Unknown IDs, duplicates, unrelated IDs, unexpected fields, invalid JSON and incomplete ordinary-result selections fail validation. Empty selections now use deterministic fallback. The selected Cloudflare configuration was preserved.

Forecast presentation now states current waiting time, selected clinic/specialty, eight-week planning horizon, estimated threshold crossing, observation window, fit consistency, assumptions and limits. Threshold estimates beyond the horizon are labelled. The four agents' calculations are unchanged; only forecast explanation strings changed. Optimization explanations describe the actual ranking/filtering/queue constraints and state that the strategies were not evaluated as a single overall winner.

Offline chat reuses checked facts, including isolated simulations. A verified parser bug was fixed: `increase hours to 30` previously added 30 to the current value; it now sets 30. Relative `by 2` remains relative. Ambiguous fields, multiple clinics/specialties and unsupported changes are rejected. Relevant bounded follow-ups re-read current inputs or replay the explicit hypothetical input.

Policy retrieval no longer runs merely because an operational keyword overlaps a source. Operational topic changes stop inheriting old policy evidence. Returned citations must match reviewed document IDs, exact page boundaries and topic anchors as well as structural provenance. Prompt-control text is rejected before evidence display. Raw policy passages never enter the model's result-selection context. Missing evidence is distinguished from evidence that a claim is false; applicability never becomes automatic authorization. The four-document, 44-passage corpus is intact, with the existing 12 excluded DHA discrepancy rows still excluded.

Public browser chat never calls `/api/chat` or Cloudflare. If account authentication is not configured, even the public chat endpoint disables provider inference. Configured connected endpoints continue to verify sessions and load the caller's saved plan under owner policies. Chat resets on scenario/session changes, discards stale responses, prevents duplicate submissions, labels modes, and separates inspectable policy evidence from operational text.

## Files changed for this upgrade

| Files | Purpose |
| --- | --- |
| `src/chat/intents.ts` | Repository-backed identity, local conversation replies, scope/clarification handling and bounded follow-up detection. |
| `src/chat/context.ts` | Existing input screening, recomputation and context building, extracted without changing algorithms; removes automatic keyword passages. |
| `src/chat/checkedTools.ts` | Shared offline/connected fact preparation, simulation parsing, policy relevance checks and result validation/rendering. |
| `src/chat/core.ts`, `functions/_lib/chatTools.ts` | Keep public exports and delegate to the shared implementation. |
| `functions/api/chat.ts`, `functions/_lib/chatPrompt.ts` | Public cloud-call restriction, empty-selection fallback and complete restricted selection instructions. |
| `src/policy/coverage.ts`, `src/policy/retrievalClient.ts`, `knowledge/api.ts` | Topic-switch, document/page/anchor relevance and document-instruction rejection. |
| `src/agents/forecast.ts`, `src/components/LimitationsPanel.tsx` | Transparent trend-fit wording; no mathematical changes. |
| `src/components/ChatPanel.tsx` | Local simple replies, public offline routing, state isolation, mode labels and separate citation inspection. |
| `tests/chat-reliability.test.mjs` | 17 new application regression cases covering conversation, accuracy, simulations, provider failures and access controls. |
| `knowledge/tests/retrieval.test.mjs` | Two additional real retrieval boundary/injection tests. |
| `tests/planning.test.mjs` | Existing provider mock now selects the complete question-specific catalogue, retaining its assertions. |
| `package.json` | Combined suite plus explicit live, browser and secret-scan commands. |
| `eslint.config.js` | Excludes ignored downloaded Chrome profile artifacts from linting; application, server and test source coverage remains intact. |
| `scripts/verify-live-chat.mjs` | Optional isolated corpus reproduction and actual inference checks, including absolute simulation values and local-only intents. |
| `scripts/verify-chat-browser.mjs` | Repeatable dedicated-profile public browser integration checks without account writes. |
| `scripts/verify-secret-boundary.mjs` | Exact configured-value exposure scan across nonignored source and built assets; artifact tracking checks. |
| `README.md`, `CHATBOT.md`, this report, `HACKATHON_DEMO.md`, `LIVE_CHAT_VERIFICATION.md` | Current usage, measured verification and demonstration guidance. |

Earlier uncommitted provider adapters, Node server bridge, account/context fixes, policy tools and environment loader remain in the working tree. The table identifies this upgrade's changes rather than attributing all prior work to this session.

## Actual before/after examples

The old offline function was executed from `HEAD:src/chat/core.ts` in an ignored comparison module; the new answers were executed against the final shared path. The new public policy response was captured from the actual browser. Full outputs are in ignored `.knowledge/chat-before-after.json` and browser/live verification artifacts. The following are excerpts.

| Question | Before | After |
| --- | --- | --- |
| Hi | "Hello, I'm Hala. I can explain Baseline and its rule-based findings." Followed by an irrelevant no-policy-match notice. | "Hello! I'm Hala, a healthcare operations decision-support assistant. I can help explain clinic capacity, waiting-time forecasts, and resource optimization. What would you like to explore?" |
| Who designed you? | "The requested explanation is not available in the offline templates." With a scenario header. | "Verified developer information has not been provided in this project. I cannot identify who designed or developed it." |
| Explain Alpha psychiatry forecast | Returned clinic inputs and unrelated bed-policy keyword extracts. | Current wait **4.6 weeks**, threshold crossing in about **29 weeks**, beyond the **eight-week horizon**; **90% trend consistency over six weeks**, explicitly not validated predictive accuracy. No policy extract attached. |
| What is the Bitcoin price? | Generic clinic/scenario fallback. | "That request is outside healthcare operations planning." Followed by the supported planning scope. |
| What are DHA telehealth consent requirements? | Generic fallback with a keyword-matched source about connected facilities. | "I retrieved 4 candidate passages about DHA telehealth consent. Applicability remains unresolved." Actual inspectable document/page links point to Telehealth v4, PDF pages **40–43**. |
| What if Alpha psychiatry had 30 free hours? | Returned the unchanged **20** baseline hours and unrelated source text. | "SIMULATED"; an isolated copy uses **30** hours, **38** referrals and waiting input **4.6 weeks**. Algorithms rerun; no stored plan, approval or schedule changes. |

## Measured verification

| Command/check | Actual result |
| --- | --- |
| `npm.cmd run test:all` | PASS: `npm test` **61 passed**, `npm run test:kb` **20 passed**; **81 total**, zero failed/skipped. Includes local database owner isolation, protected endpoint tests, actual pgvector, provenance/citation checks and simulation mutation checks. |
| `npm.cmd run typecheck` | PASS for application, server and knowledge TypeScript projects. |
| `npm.cmd run lint` | PASS. |
| `npm.cmd run build` | PASS: 1,680 modules; JS **390.68 kB**, **119.05 kB gzip**; CSS 34.99 kB. |
| `npm.cmd run security:secrets` | PASS: configured secret values absent from nonignored repository files and three built assets. No secret values printed; environment, raw PDF/model/database and browser artifacts remain ignored. |
| `npm.cmd run test:live` | PASS: **13 cases**, including **eight actual HTTP 200 Cloudflare calls** and five locally handled cases with zero provider calls. Same tested model; exact PDF passages checked, fictional fixture snapshot unchanged. Reproduced the 44-passage corpus in memory without opening the active service database. |
| `npm.cmd run test:browser` | PASS: **13 public conversations** through the actual UI. Checked duplicate-submit lock, keyboard/focus behavior, policy page links, 390px layout and no JavaScript exceptions. Stored plan/approval state unchanged; **zero public chat/cloud API calls**. |
| `npm.cmd run backend:check` | PASS: hosted email auth and confirmation enabled; anonymous plan, decision and chat-audit reads denied with HTTP 401. No sign-in, emails or account writes. |
| `npm.cmd audit --json` | Completed advisory review: **14 unresolved** findings (**9 high, 4 moderate, 1 low**). This is not a clean dependency-security pass; packages were not modified. |
| `git diff --check` | PASS. |

The initial implementation test run caught three regressions (follow-up result selection and an outdated provider mock), plus missing extracted type imports. A later wording-variant regression exposed an overly narrow intent boundary for tele-pooling/delegation; it was fixed too. The full final checks above passed. The first sandboxed build was blocked by filesystem access to the esbuild configuration; the permitted production build subsequently passed. PDF extraction still prints the pre-existing non-failing `TT: undefined function: 21` font warning.

Actual live cases: Alpha capacity, operational forecast follow-up, three-strategy comparison, consent retrieval, explicit 30-hour simulation, absolute `to 30` simulation, unsupported waiting-target claim, and coordinator holds. Approval, Bitcoin, greeting, developer and clarification cases made no inference calls. Provider mocks in ordinary regression tests are not counted as live inference.

## Security review and limits

Verified protections include origin/body/rate limits, verified account-context loading, local database owner isolation and append-only history, no approval/write tools, checked-only rendering, server-only provider headers, rejection of malicious/irrelevant evidence, isolated what-ifs, no public inference and secret-free generated assets. Source citations are attributable to checksummed selected passages. A prompt alone does not guarantee language interpretation: ambiguous requests still require clarification or fallback.

NOT VERIFIED: production deployment, a real signed-in browser session, live hosted cross-account read/write isolation, recovery emails and production audit administration. Hosted anonymous checks and local owner-policy tests do not establish those properties. No authentication was weakened for testing. In-memory live-test audits are isolated test records; they are not a claim of hosted audit persistence.

Unresolved: 14 dependency advisories including high-severity transitive dependencies; the production dependency tree still includes `ws@8.18.3` through Supabase Realtime. Policy-topic coverage is incomplete, intent/simulation grammar is bounded, personal-data screening is conservative rather than comprehensive, and process-local rate limits are not distributed abuse controls. Current-source/topic checks are bounded reviewed relevance checks, not a general legal-entailment model. Operator-managed local policy/chat execution snapshots need deployment access/retention controls before production use.

## Hackathon readiness

The fictional baseline, operational problem, deterministic recommendation, explanation, strategy comparison, isolated what-if, attributable consent evidence and blocked approval sequence all have measured coverage. Follow [HACKATHON_DEMO.md](HACKATHON_DEMO.md). Public mode works without a cloud connection; policy retrieval still needs the local knowledge service. Authenticated inference requires valid account configuration and sign-in. The previously owned local backend was restarted with the final code and its intact 44-passage store; a real unauthenticated request through Vite was rejected with HTTP 401. The UI remains available at `http://localhost:5173/`.

The prototype has not demonstrated clinical outcomes, forecasting accuracy, legal compliance or real-world staffing effectiveness. The eight-week threshold is a scenario setting. Published statistics/projections and synthetic clinic data remain separate. No original policy documents or generated database/model files were added for committing.
