# HalaCapacity policy knowledge service

This is the server-side knowledge base for **HalaCapacity AI**, the Dubai healthcare
capacity-planning prototype. Existing Forecast, Routing, Task-Shifting, Tele-Pooling,
clinic scenarios, planning controls, personal accounts and historical records remain.
The Coordinator now adds evidence-backed policy flags; no clinical action is authorized.

## Architecture

```text
Reviewed official PDF manifest + expected SHA-256
  → bounded PDF page/section extraction (PDF.js)
  → overlapping exact-text chunks with character offsets
  → pinned local MiniLM ONNX embeddings (384 dimensions)
  → persistent PostgreSQL/PGlite + pgvector 0.8.7 + cosine HNSW index
  → server-side search and Policy Agent applicability checks
  → existing Coordinator, approval screen and Hala chat
  → versioned decision evidence + server retrieval/assessment audit snapshots
```

The vector database and neural embeddings are real. Neither keyword scores nor
fixture vectors substitute for search. PGlite `0.5.16` and its pgvector extension
`0.0.17` have matching peer versions. The implementation runs on the existing
Node **24.22+** environment, without Docker, Python, Ollama or hosted database keys.
It uses the reference's ingestion/vector-retrieval architecture, with overlapping
word chunking adapted under MIT; see [NOTICE.md](NOTICE.md).

The selected embedding model is `Xenova/all-MiniLM-L6-v2`, pinned at revision
`751bff37182d3f1213fa05d7196b954e230abad9`, quantized CPU ONNX, mean pooled and
normalized. Preparation records all model-file hashes; inference checks those
hashes and runs locally with remote model loading disabled. Dependencies and
native inference stay server-side. The Vite build does not bundle them.

## Run and reproduce

From the repository root:

```powershell
npm.cmd ci
npm.cmd run kb:prepare-model
npm.cmd run kb:ingest
npm.cmd run kb:query -- "telehealth physician led licensed clinical privileges supervision"
npm.cmd run test:kb
```

Preparation downloads public model files once. Ingestion downloads approved
official PDFs if missing. It checks their exact manifest hashes, extracts only
reviewed sections, embeds them and persists the database under `.knowledge/`.
`npm.cmd run kb:ingest -- --offline` reproduces ingestion from verified cached PDFs.
Reingestion is idempotent; new reviewed editions retain previous versions for audits.
A changed source hash fails rather than silently accepting a replacement document.

Start the service and existing UI in separate terminals:

```powershell
npm.cmd run kb:serve
```

```powershell
npm.cmd run dev
```

The policy service binds to `127.0.0.1:8788`; Vite proxies `/api/policy` to it.
In **Decisions**, select a recommendation to see Policy Agent flags and expandable
exact passages. Human approval requires the existing reason plus acknowledgement
of unresolved policy flags. In **Ask Hala**, ask “Which DHA telehealth scope and
licensing requirements apply?” to search the real KB. Ordinary operational
questions retain their existing chat path and fallback behavior.

The service is a single-process embedded PostgreSQL deployment. Stop it before
using CLI ingestion/query/status; an exclusive `.knowledge/database.lock` prevents
two processes opening the same database. After a crash, verify that its recorded
PID is no longer running before manually removing that lock file. Do not remove
the database to clear a lock. `test:kb` uses a separate in-memory real PostgreSQL
instance and does not interfere with the running service.

## Verified seed corpus

Review date: **10 November 2026, Asia/Dubai**. Four official documents produce
**44 chunks** (expanded from 15). This is selected-section coverage, not a complete legal corpus. Telehealth contributes 23, Clinical Privileging 17, Capacity Planning 1 and the AI Strategy 3. Older ingestion versions and audit snapshots are retained; only current versions are searched.

| Document | Classification | Reviewed pages/sections |
| --- | --- | --- |
| DHA Standards for Telehealth Services, version 4, effective 26 November 2025 | Regulatory standard for the stated DHA/telehealth scope; not a statute | p.21 §4; p.24 §§6.1–6.3.2; p.27 §§7.1–7.2.1; p.33 §§8.2.1–8.2.2; p.37 §9; pp.40–43 §§10.1–10.5.5; pp.44–46 §§11.1–11.10; p.50 §§13.7–13.7.1 and 14.1. PDF/printed pagination agrees. |
| DHA Clinical Privileging Policy, version 2, effective 3 September 2025 | Regulatory policy, including scope-of-practice guidance; not a statute | p.2 §§2–3.3; p.3 §3.9; p.5 §§4.2.4–4.3.7; p.6 §§4.4–4.7.1(a–c); p.7 §4.7.1(d–h) through §4.10.2; pp.8–9 §§4.10.3–4.13.12. PDF/printed pagination agrees. |
| DHA Clinical Services Capacity Plan 2022–2033 | Planning guidance | PDF/printed p.54 §6.7; regional projections do not authorize referrals or establish an eight-week legal waiting target |
| UAE National Strategy for Artificial Intelligence 2031 | Government strategy | Physical PDF p.22, printed pp.42–43, Objective 8 opening; strategy goals do not grant clinical permissions |

The manifest preserves official URLs, publishers, jurisdiction, legal classification,
edition/version, verification/effective dates, expected PDF hashes and selection
locators. Chunks preserve IDs, exact extracted characters, page/section and offsets.
Extraction whitespace may differ from visual PDF layout; passages are not paraphrased.
Unknown edition/publication details are identified rather than invented.

The registered-nurse scope PDF downloaded during review is scanned with no native
text. It was **excluded**, not treated as verified OCR. The text-extractable current
Clinical Privileging Policy supplies the initial professional-scope material.
Task-specific nurse/GP scope, actual credentials, facility permissions, further
laws/circulars, full privacy-law/transfer-exception coverage and broader policy coverage remain gaps. Selected telehealth documentation/retention clauses are now included; they do not establish the full privacy-law framework.
Existing eight catalogue records, including research and unverified items, are
preserved separately; they are not silently promoted into the verified vector corpus.
Research, planning and strategy cannot establish regulatory permission.

Official publications remain in the ignored cache/database; check source rights
before redistributing a corpus. This local integration does not publish the PDFs.

## Applicability and human review

Policy search now uses reviewed topic/document/page boundaries on top of actual vector retrieval. Candidate clauses never establish that an action is permitted. Unknown topics and unsupported claims (including a legal eight-week waiting target, independent prescribing and unreviewed bed totals) return insufficient evidence even if raw cosine matches exist. Retention, consent, supervision, staffing, licensing, privileging and source/page follow-ups are covered within the manifest's limits. This is a bounded coverage guard, not a general natural-language entailment model or a guarantee of legal completeness. Query audits retain both candidates and displayed evidence.

`human-review` explicitly means applicability is unresolved. A prerequisite conflict additionally requires a matching retrieved regulatory clause; unrelated regulatory text cannot establish the missing prerequisite. Client-supplied claims still never authorize clinical work.

The Policy Agent issues `human-review`, `conflict`, `unsupported` or `unavailable`;
**there is no automatic-authorization result**. It retrieves mandate-specific
evidence for routing, task-shifting and tele-pooling; Forecast receives planning
context only. Electronic-referral conditions are not automatically applied to
in-person referrals. Nurse/allied supervision is not automatically applied to a
physician-only scenario. Missing modality, consent, licences, privileges, clinical
eligibility and service capability remain explicit review flags.

The public assessment endpoint ignores client-supplied permissions, evidence and
decisions. Direct test scenarios can declare false prerequisites to demonstrate
conflicting recommendations. Even declared true prerequisites never authorize work.
The Coordinator retains all its operational conflict checks and additionally
surfaces policy findings. A stopped/failed knowledge service produces an explicit
unavailable flag; no vector result is simulated and no old policy-backed approval
is silently reused.

Review IDs include input revision and KB revision. Historical decisions are retained;
a changed corpus or unavailable service needs a separate review. Saved decision
`evidence` includes the selected Policy Agent snapshot, acknowledgement, exact
passages, metadata, retrieval query, similarity and model/KB versions. It fits the
existing 12,000-character database field; oversized snapshots fail instead of
silently truncating provenance. No account-table migration is needed.

The knowledge service separately persists complete query and assessment snapshots
in `kb_audit`. Chat history stores the retrieval UUID/KB version and source IDs,
which refer to that snapshot. Browser-only records remain user-editable; these
records do not constitute a tamper-proof independent audit or clinical authorization.

## APIs and server-only configuration

- `GET /api/policy/health`: engine, model, corpus metadata and chunk count.
- `POST /api/policy`, `{ "action": "search", "query": "..." }`: exact passages,
  cosine similarities, provenance, KB/model version and persisted retrieval UUID.
  Optional `previousQuery` supplies one bounded public policy question for anaphoric source follow-ups; it is validated like the current query. Responses include coverage status/reason and the resolved query. Explicit new topics do not inherit old evidence.
- `POST /api/policy`, `{ "action": "assess", "stageId": "baseline", "adjustments": {} }`:
  validated plan revision and four review findings. It never writes approvals.

Requests have bounded bodies, queries, timeouts and a service rate limit. The service
does not accept arbitrary ingestion URLs or execute instructions in document text.
Its origin checks permit the local demo; remote binding requires a server-side
`POLICY_API_TOKEN` of at least 24 characters. Credentials never use `VITE_` variables.

The Node CLI/server reads process environment directly, without automatically loading `.env.local` or `.dev.vars`. `POLICY_HOST` defaults to `127.0.0.1`, `POLICY_PORT` to `8788`, and `POLICY_MODEL_DIR` to `.knowledge/models`. Preparation and inference must use the same model location. The CLI/server uses the embedded store at `.knowledge/database`; there is no external `DATABASE_URL` adapter. Supabase account storage is separate. For hosted forwarding, `POLICY_SERVICE_TOKEN` must match the Node service's `POLICY_API_TOKEN`.

For a later hosted integration, `functions/api/policy.ts` is an HTTP adapter:
set **server-only** `POLICY_SERVICE_URL` to the HTTPS service origin and
`POLICY_SERVICE_TOKEN` to the service token. It forwards neither account tokens nor
decision reasons/history. No live hosting configuration or secret was created here.
Node/ONNX/PGlite cannot simply be copied into the Pages isolate; host this service
on a compatible persistent Node server, or adapt the PostgreSQL layer to an approved
hosted pgvector endpoint. ITU Lab/distributed hosting remains separate work.

## Checks

```powershell
npm.cmd test
npm.cmd run test:kb
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

The application suite has 33 tests/subtests, including the original 29. The knowledge/capacity suite has
16 tests covering original PDF-table review, vector storage, idempotence, semantic relevance,
unsupported questions, date/type filtering, inaccurate citations/quotes,
conflicting recommendations, no automatic authorization, exact offsets/source
checksums, durable audit snapshots and credential-safe proxy behavior. These are
bounded engineering checks, not clinical accuracy, legal-compliance or retrieval
recall benchmarks.

The capacity extract is reviewed separately under `analysis/capacity-2022-2033/`: 40 rows checked against DHA Table 12, four demand-year corrections, 12 unresolved source discrepancies excluded. The 28 included rows are not a complete-table total. Neither these projections nor the synthetic clinic scenarios are training data. `analysis/datasets.json` records the separate provenance classes.

`scripts/verify-policy-ui.mjs` additionally verifies the real HTTP/vector/chat path,
human acknowledgement, saved exact evidence, review versions, input recalculation,
service-outage fallback, existing navigation and 390px layout using an isolated
installed Chrome profile. Screenshots are ignored under `.browser-qa/`.

The dependency audit reported 14 advisories (one low, four moderate, nine high).
No broad dependency upgrade or `npm audit fix` was applied to the existing product.
This integration does not claim a clean dependency security audit, completed ITU
hosting, exhaustive legislation coverage or validated clinical outcomes.

## Files changed

Modified existing files:

- `.gitignore`, `eslint.config.js`: exclude generated private corpus/model/database caches.
- `package.json`, `package-lock.json`: pinned server dependencies and reproducible commands.
- `vite.config.ts`: local policy proxy and generated-data watch exclusion.
- `src/App.tsx`: retrieve current assessment, version reviews with KB revision and save exact policy snapshots.
- `src/agents/coordinator.ts`: merge policy gaps/conflicts; preserve all operational calculations/checks.
- `src/types.ts`, `src/chat/core.ts`: typed review and retrieval-audit metadata.
- `src/components/ApprovalControls.tsx`, `src/components/ChatPanel.tsx`: policy flags, acknowledgement and real retrieval in the existing interface.
- `README.md`, `CHATBOT.md`: current operation and evidence boundaries.

Added files:

- `knowledge/manifest.ts`, `ingest.ts`, `embeddings.ts`, `store.ts`: reviewed corpus, extraction, model and pgvector persistence.
- `knowledge/policyAgent.ts`, `api.ts`, `server.ts`, `cli.ts`, `register.mjs`: applicability tool, guarded service, commands and native Node TypeScript alias resolution.
- `knowledge/tests/retrieval.test.mjs`: 13 integration tests using actual PDFs/model/PostgreSQL vectors; `knowledge/tests/capacity.test.mjs`: three source-table/provenance checks.
- `knowledge/README.md`, `NOTICE.md`, `licenses/ITUAIReadiness-MIT.txt`: architecture, verification and attribution.
- `functions/api/policy.ts`: optional credential-safe Pages adapter.
- `src/policy/knowledgeTypes.ts`, `retrievalClient.ts`, `src/hooks/usePolicyAssessment.ts`, `src/components/PolicyKnowledgeReview.tsx`: shared types, retrieval validation and existing-UI integration.
- `scripts/verify-policy-ui.mjs`, `tsconfig.knowledge.json`: browser verification and server typechecking.

The Forecast, Routing, Task-Shifting and Tele-Pooling implementation files,
`src/data/scenario.ts`, `src/data/policySources.ts`, existing tests and Supabase
schema/migrations are unchanged. No hosted database writes, GitHub push or deployment
were performed. `.knowledge/verification.json` contains the demonstrated real HTTP
query result and unsupported-question result locally; it is intentionally ignored.
