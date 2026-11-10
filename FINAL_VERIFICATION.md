# Final local verification — 10 November 2026

Historical snapshot before the subsequent evidence-quality changes. See [EVIDENCE_QUALITY.md](EVIDENCE_QUALITY.md) for the current 44-passage corpus, source-table review, applicability/follow-up changes and latest test results. The findings below are preserved as the earlier verification record.

Result: the existing automated checks and local integration pass. This is **not a clean deployment sign-off**: dependency advisories, an evidence-support limitation and stale documentation remain unresolved. No commit, push, deployment, dependency upgrade, schema migration, account creation or hosted record write was performed. Existing source work was preserved.

| Area | Status | Actual result |
| --- | --- | --- |
| Application tests | PASS | `npm.cmd test`: 29 passed, 0 failed, skipped or cancelled. |
| Retrieval tests | PASS | `npm.cmd run test:kb`: 9 passed, 0 failed, skipped or cancelled; repeated successfully using a fresh downloaded model. 38 unique tests/subtests overall. |
| TypeScript | PASS | `npm.cmd run typecheck`: application, Pages functions and knowledge-service projects; exit 0. |
| ESLint | PASS | `npm.cmd run lint`: exit 0, no errors or warnings. |
| Production build | PASS | `npm.cmd run build`: exit 0; 1,676 modules; JS 370.85 kB / 112.00 kB gzip. First sandbox attempt failed on filesystem access; the same command passed with the necessary access. |
| Git whitespace | PASS | `git diff --check`: no whitespace errors; Git reports normal LF/CRLF conversion warnings. |
| Commit-content review | PASS | Tracked diff, new files and lockfile entries reviewed; no actual credentials or unrelated changes identified. Nothing staged. |
| Real database/search | PASS | Embedded PostgreSQL/PGlite with pgvector 0.8.7, 384-dimensional MiniLM vectors, persisted database, cosine search and HNSW index. No external PostgreSQL daemon is required. |
| Corpus reproducibility | PASS | Fresh model preparation; all four freshly downloaded PDF hashes match; extraction gives 5 + 6 + 1 + 3 = 15 passages. A new isolated database reproduced the same corpus revision and survived reopening. |
| Citation/provenance checks | PASS | Exact extracted passages, source SHA-256, publisher, edition, page/section and character offsets; incorrect IDs/quotes and malformed provenance rejected by existing tests. Browser links point to official PDFs with page fragments. |
| Missing evidence / service outage | PASS, bounded | Empty results produce explicit insufficient-evidence wording; service failure produces unavailable evidence. Domain-specific unsupported questions can still produce weak matches: see finding 2. |
| Decisions and Ask Hala | PASS, bounded | Browser verification passed for approval acknowledgement, persisted source snapshots, review versions, recalculation, source links, service outage, navigation and 390px layout. |
| Public Supabase checks | PASS | Email authentication and confirmation enabled; anonymous reads denied with HTTP 401 for all three personal tables. Read-only checks only. |
| Dependency security | FAIL | Audit reports 14 affected packages: 9 high, 4 moderate, 1 low; 0 critical. Production-only audit reports 1 high. |
| Setup/documentation accuracy | FAIL | Variable names and core startup steps match implementation; specific stale claims and missing configuration details remain below. |
| Hosted runtime / live LLM / authenticated isolation | NOT VERIFIED | No deployment or live model call; no signed-in two-account, password recovery or hosted decision/chat persistence test in this pass. |

## 1. Git contents and credential review

At the start, 13 tracked files were modified and 21 new files were untracked. The tracked changes are the policy integration, dependencies, configuration exclusions and related documentation. New files provide ingestion, embeddings, storage, policy assessment, HTTP service/adapter, UI integration, tests and attribution. Lockfile changes are consistent with those dependencies and their platform packages; existing package versions were not broadly upgraded.

A location-only scan covered all 107 tracked or nonignored candidate files, followed by review of the two matches. Both were deliberately fake test credentials in `tests/planning.test.mjs` and `knowledge/tests/retrieval.test.mjs`. No real secret was found. Pattern scanning and manual review do not guarantee absence of every possible credential format.

Keep these out of any commit (currently ignored):

- `.env.local`, `.env`, `.env.*`, `.dev.vars`: local configuration, even where values are public client configuration.
- `.knowledge/`: PostgreSQL database, database lock, audit snapshots, downloaded PDFs, model files and all verification scratch files.
- `.browser-qa/`: isolated browser profiles, screenshots and QA artifacts.
- `.npm-cache/`, `.wrangler/`, `node_modules/`, `dist/` and logs.

No downloaded PDF, ONNX model, database or environment file appears in the commit candidates. The source manifest's official public URLs and document hashes are intentional. `knowledge/NOTICE.md` and its MIT license file belong with the source adaptation. This report is the only new nonignored deliverable from the verification pass.

## 2. Unresolved evidence-support limitation

Reproduced through both the actual vector store and Ask Hala:

> Which DHA policy mandates an eight-week specialist waiting target?

The query returns two unrelated-to-the-claimed-target passages: telehealth applicability (PDF page 21, similarity approximately 0.466) and clinical privileges/facility scope (PDF page 6, approximately 0.407). Ask Hala labels them “relevant policy passages.” Neither establishes the requested waiting target. The answer retains its no-authorization warning and does not fabricate a quotation or explicitly assert the target is law, but it does not clearly state that these passages do not answer the question.

Cause: `knowledge/store.ts` applies a cosine similarity threshold of 0.40; `src/policy/retrievalClient.ts` treats any nonempty result as relevant. Semantic similarity is not a test of whether evidence supports the question's premise.

Before representing policy answers as reliably supported, add an answer-support/coverage check or explicitly describe hits as candidate related passages and disclose that the question may remain unanswered. Add a meaningful regression case for this unsupported in-domain question. The existing Neptune and motorcycle abstention tests alone do not establish in-domain abstention quality. No implementation was changed in this verification pass.

Actual passing insufficient-evidence examples:

- “What is the orbital period of Neptune?” returns no hits.
- “What legal rules govern data retention and cross-border health data transfers?” returns no hits over HTTP and displays “No sufficiently relevant verified passage was found” in Ask Hala.
- Blocked/unavailable policy service displays an unavailable finding and does not reuse an old policy-backed approval as the current review.

The existing broad chat input screen also rejects the word `patient`, including public policy questions that contain it. Policy dispatch uses a keyword regex rather than intent understanding. These are coverage limitations; not every natural-language policy question reaches vector search.

## 3. What the agents, approvals and chat actually do

- Forecast, Routing, Task-Shifting and Tele-Pooling remain fixed-rule calculations. Retrieval does not generate or alter their calculated recommendations/transfers; existing tests explicitly compare them.
- The Policy Agent performs mandate-specific vector retrieval and deterministic prerequisite checks. It always returns `automaticAuthorization: false`. False prerequisites can generate conflicts in direct tests; the public endpoint ignores client-supplied credential checks and evidence.
- Actual baseline HTTP assessment returned four human-review findings: Forecast 1 passage, Routing 2, Task-Shifting 3, Tele-Pooling 3. Missing professional/facility prerequisites remain flagged. Individual serialized policy snapshots were approximately 2.1–5.4k characters, below the saved evidence limit; the full decision path also checks its 12,000-character maximum.
- Recording an approval requires a reason and explicit acknowledgement. Acknowledgement records a human planning review; it does not resolve policy conflicts or authorize clinical work. The browser test verified the acknowledgement error, successful demo recording, exact provenance snapshot, persistence after reload and a new pending review after inputs change.
- Explicit policy chat uses local embeddings and real pgvector search, displaying exact source passages without a generative model. It records retrieval IDs, corpus revision and source IDs.
- Ordinary planning chat retains offline templates locally. Its optional live Cloudflare adapter uses the original keyword-based catalogue retrieval; the new vector search is not automatically supplied to every live LLM request. Provider-related tests use mocks. No live LLM capability was demonstrated.

## 4. Reproduction and database configuration

Verified runtime: Node 24.22.0. Existing documented commands were exercised, including `kb:prepare-model`, `kb:ingest -- --offline`, `test:kb`, `kb:serve` and the UI against Vite. Fresh model preparation used `POLICY_MODEL_DIR` pointing at a separate ignored directory; all five downloaded model-file hashes exactly matched the original model lock. The nine retrieval tests passed again with that fresh model.

All official PDFs were downloaded to separate verification files without replacing the original corpus. The three DHA documents downloaded through Node; the UAE AI document required a PowerShell retry after Node's connection failed. All four matched their manifest hashes; fresh UAE extraction reproduced its three passages. Together the fresh sources reproduce the documented 15 passages. PDF.js emitted `TT: undefined function: 21`; extraction and checks passed despite that warning.

Fresh isolated database ingestion produced:

| Document | Passages |
| --- | ---: |
| DHA Telehealth Standards v4 | 5 |
| DHA Clinical Privileging Policy v2 | 6 |
| DHA Clinical Services Capacity Plan | 1 |
| UAE AI Strategy 2031 | 3 |
| Total | 15 |

Corpus revision: `46c2f35371f4928e47cde0ae5e7f38b649807c302b4719b330c7194954d0dfb5`. The new database reopened with identical status. The top supervision query cited Telehealth Standards PDF page 37 with similarity approximately 0.679. Existing ingestion returned `unchanged: true` for all four documents, preserving its revision.

This is embedded PostgreSQL/PGlite, not a connection to the account Supabase PostgreSQL database. The knowledge store defaults to `.knowledge/database`, the raw corpus to `.knowledge/raw`, and model files to `.knowledge/models`. There is no implemented `DATABASE_URL` configuration for an external vector database. One process owns each persistent knowledge database; CLI operations must not compete with the service. Supabase personal-account tables are separate and require their documented migrations/RLS.

| Configuration | Exact variable names | Use |
| --- | --- | --- |
| Browser account configuration | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Public build-time values, locally in ignored `.env.local`. |
| Pages account backend | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Server configuration, locally in ignored `.dev.vars`. |
| Optional live LLM | `AI_PROVIDER`, `AI_API_KEY`, `AI_ACCOUNT_ID`, `AI_MODEL` | Server-only; implemented provider selector is `cloudflare`. Not configured/tested live. |
| Knowledge service | `POLICY_HOST`, `POLICY_PORT`, `POLICY_API_TOKEN` | Defaults to loopback and 8788; non-loopback requires a token of at least 24 characters. |
| Local model location | `POLICY_MODEL_DIR` | Defaults to `.knowledge/models`; preparation and inference must use the same directory. |
| Future Pages policy adapter | `POLICY_SERVICE_URL`, `POLICY_SERVICE_TOKEN` | HTTPS service origin and token matching the knowledge service's `POLICY_API_TOKEN`; server-only. |

The Node knowledge CLI/server reads process environment directly; it does not automatically load `.env.local` or `.dev.vars`. Its database location is currently fixed by the CLI/server, although the storage API accepts a directory for isolated tests. Keep privileged values out of all `VITE_` variables. No values are reproduced here.

A clean `npm ci` in a fresh checkout and a separate operating system were not run. Existing `node_modules` was preserved; no package install or automatic repair was performed. Fresh models, fresh source checks, fresh database ingestion and current installed-dependency checks passed on this Windows machine.

## 5. Dependency advisories

`npm audit` initially encountered connection errors, then completed on retry. Its exit status is 1 because vulnerabilities remain. The following are affected package groups, not a count of unique advisory IDs:

| Severity | Packages / installed versions | Scope |
| --- | --- | --- |
| High | `ws` 8.18.3 | Production dependency via `@supabase/supabase-js` → `@supabase/realtime-js`. |
| High | `brace-expansion` 1.1.11 / 2.0.1; `browserslist` 4.24.0; `cross-spawn` 7.0.3; `flatted` 3.3.1; `glob` 10.4.5; `js-yaml` 4.1.0; `minimatch` 3.1.2 / 9.0.5; `picomatch` 2.3.1 | Development dependencies. |
| Moderate | `@humanfs/node` 0.16.5; `ajv` 6.12.6; `postcss-selector-parser` 6.1.2; `yaml` 2.5.1 | Development dependencies. |
| Low | `@eslint/plugin-kit` 0.2.0 | Development dependency. |

The production-only audit independently reports one high affected package (`ws`). Its advisories include uninitialized memory disclosure and memory-exhaustion denial of service. The maintainer identifies 8.21.0 as a patched 8.x version for the latter: [ws maintainer advisory](https://github.com/websockets/ws/security/advisories/GHSA-96hv-2xvq-fx4p). This is dependency exposure, not proof that the current browser/Pages deployment is exploitable through that Node package.

All 14 groups report fixes available. Their installed versions predate this diff; no audited vulnerable package version was introduced by the knowledge integration. Plan targeted compatible updates, inspect the resulting lockfile and rerun affected checks. No `npm audit fix`, broad upgrade or lockfile mutation was applied. Full audit records remain ignored under `.knowledge/final-audit.json` and `.knowledge/final-audit-production.json`.

## 6. Documentation corrections needed

1. `README.md:104` says original scenarios retain their old proposal IDs. `src/App.tsx` now appends `:policy-<revision>` even for original scenarios. Historical records remain, but old unversioned approvals are not shown as current approvals. Document this intentional policy-review invalidation.
2. `CHATBOT.md:53` still says 23 automated checks. Actual results are 29 application tests/subtests plus nine knowledge tests. Its blanket fallback discussion should distinguish ordinary templates from vector retrieval and policy-service failure.
3. `README.md:137` still says to apply role retirement and verify personal saving, despite earlier paragraphs recording the user's confirmation. Describe the remaining independent hosted checks instead of implying those user-reported steps were never completed.
4. `knowledge/README.md` correctly names the policy token and Pages variables, but should list `POLICY_HOST`, `POLICY_PORT`, `POLICY_MODEL_DIR`, their defaults, direct process-environment loading, the matching service-token relationship and lack of an external database URL. Hosting still requires persistent compatible Node infrastructure; copying this service into a Pages isolate is insufficient.

## 7. Remaining blockers and limits

- Hold deployment sign-off until dependency risk is remediated or explicitly accepted, especially production `ws`.
- Resolve or accurately constrain the in-domain evidence-support behavior before claiming reliable policy-backed answers. The passing suite is a bounded engineering check, not a legal, clinical or retrieval-recall benchmark.
- Correct the documentation inconsistencies before the intended commit.
- Hosted signed-in decision/chat persistence, password recovery, two-account isolation, independent retired-role grants and live Pages/LLM behavior remain NOT VERIFIED. Public checks and local PostgreSQL tests do not establish these.
- Clinical applicability, full legislation coverage, real-world outcomes, publication rights for a redistributed corpus and user validation remain outside this local engineering verification.

Recommended commit message after resolving the chosen pre-commit findings:

```text
feat: add verified policy retrieval to HalaCapacity planning reviews

Add pinned local embeddings and PostgreSQL/pgvector retrieval for four
official documents, with versioned evidence, human-review flags and
policy-search integration in Decisions and Ask Hala.
```

No commit, push or deployment has been made. Verification scratch files, models, isolated database and browser artifacts remain ignored for inspection.
