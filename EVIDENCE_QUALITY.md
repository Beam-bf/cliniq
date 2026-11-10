# Evidence-quality improvements — 10 November 2026

Implemented locally without a commit, push, deployment, package installation, forecasting training or fine-tuning. The four healthcare calculation modules and synthetic clinic fixtures are unchanged. Existing pgvector storage, document checksums, exact-text extraction, source versions, historical decisions and audit snapshots are preserved.

## Capacity-table verification

All 40 submitted specialty/year records were compared with the original DHA Clinical Services Capacity Plan 2022–2033, Table 12. The caption is on PDF/printed page 40; the reviewed rows are on page 41. Column order was checked visually on a rendered source page, and the reproducible checker validates all 120 original table cells against the checksum-verified PDF text.

The complete comparison found **four demand-year corrections**, superseding the preliminary six-row estimate:

| Specialty | Year | Submitted demand | Verified demand | Outcome |
| --- | --- | ---: | ---: | --- |
| Cardiothoracic Surgery | 2025 | 278 | 213 | Corrected extraction; source arithmetic still unresolved, excluded |
| Cardiothoracic Surgery | 2030 | 213 | 278 | Corrected extraction; source arithmetic still unresolved, excluded |
| Psychiatry | 2025 | 343 | 323 | Corrected and reconciled |
| Psychiatry | 2030 | 323 | 343 | Corrected and reconciled |

These **12 rows remain excluded** because the published gap does not equal published supply minus demand:

| Specialty | Year | Published supply | Published demand | Published gap | Arithmetic gap |
| --- | --- | ---: | ---: | ---: | ---: |
| Gastroenterology | 2030 | 91 | 284 | -194 | -193 |
| Gastroenterology | 2033 | 91 | 347.6 | -257 | -256.6 |
| Orthopedics | 2033 | 213 | 460.8 | -248 | -247.8 |
| Cardiothoracic Surgery | 2022 | 101 | 127 | -25 | -26 |
| Cardiothoracic Surgery | 2025 | 101 | 213 | -111 | -112 |
| Cardiothoracic Surgery | 2030 | 101 | 278 | -176 | -177 |
| Respiratory Medicine | 2022 | 135 | 203 | -67 | -68 |
| Respiratory Medicine | 2025 | 135 | 293 | -159 | -158 |
| Paediatric Surgery | 2033 | 64 | 169.6 | -106 | -105.6 |
| Obstetrics | 2022 | 579 | 331 | 245 | 248 |
| Obstetrics | 2025 | 579 | 513 | 65 | 66 |
| Urology | 2033 | 56 | 142.2 | -86 | -86.2 |

Four fractional differences may reflect rounding, but the convention has not been established; those rows remain excluded. Published gaps are preserved, not silently replaced with calculated gaps. The **28 included rows are an incomplete subset** and cannot be summed as the full Dubai shortfall.

`analysis/capacity-2022-2033/submitted.json` preserves the supplied extraction. `reviewed.json` stores both versions, exact row/year/page provenance, corrections and inclusion decisions. Reproduce with:

```powershell
node analysis/capacity-2022-2033/review.mjs
```

The source PDF remains ignored under `.knowledge/raw/`. A changed PDF, unknown specialty/year, duplicate key or source-cell mismatch fails verification. The separate 63-row Investment Guide extract remains entirely excluded because its original source/edition/table is unresolved. The other collected CSVs and Abu Dhabi policy summary remain separate, unverified collected sources.

`analysis/datasets.json` explicitly distinguishes public statistical snapshots, planning baselines with modelled demand, future projections, synthetic clinic scenarios and policy documents. The 2022 demand figures are modelled; future supplies are planning assumptions. Beds are not spare specialist hours, licensed headcounts are not available capacity, and none of these regional figures replace Alpha–Foxtrot inputs.

## Expanded policy corpus

Actual ingestion and HTTP health checks report **44 current passages**, expanded from 15:

| Document/version | Previous passages | Current passages | Added coverage |
| --- | ---: | ---: | --- |
| DHA Telehealth Standards v4, effective 26 November 2025 | 5 | 23 | Facility licensing; inter-entity agreements; staffing and face-to-face cover; consent and selected exceptions; encounter documentation; secure storage and retention |
| DHA Clinical Privileging Policy v2, effective 3 September 2025 | 6 | 17 | Privileging framework; rotation and part-time staff; written service specifications; CPC accountability, credential review and records |
| DHA Capacity Plan 2022–2033 | 1 | 1 | Planning context only |
| UAE AI Strategy 2031 | 3 | 3 | Strategy context only |
| Total | 15 | 44 | 29 additional passages |

Document editions and PDF hashes are unchanged. The manifest identifies each selected page/section, including continued clauses. Passage text, PDF/printed page, section, character offsets, source hash and publication metadata remain attributable to the original. Older ingested versions remain for historical citation reconstruction; only current versions are searched. The scanned nursing PDF remains excluded.

Current corpus revision: `a685fac41dc2617586ebe98b5fedfdc2bb1a61dafbce20a9891dfa08fcc5a0d9`.

## Retrieval, applicability and conversations

Real neural embeddings and PostgreSQL/pgvector cosine retrieval remain in use. A reviewed topic/document/page guard now separates candidate retrieval from answer support. Raw candidates remain in query audits. Unknown topics, legal eight-week targets, independent-prescribing permissions, unreviewed overseas data-transfer claims and unreviewed numerical bed conclusions abstain instead of presenting nearby matches as an answer. Source follow-ups inherit bounded policy context; new substantive unsupported claims cannot inherit old evidence to bypass abstention.

Displayed passages are explicitly **candidates with unresolved applicability**. Their source limitations are visible. This is a bounded coverage guard, not a general entailment engine or a legal-compliance validator. A prerequisite conflict requires a matching retrieved regulatory clause; unrelated regulatory text cannot establish the prerequisite. Actual licences, privileges, referral modality, consent and facility capability remain unestablished. Every assessment still returns `automaticAuthorization: false`; human acknowledgement records a planning review only.

Actual baseline HTTP assessment returned four `human-review` findings with unresolved applicability. Evidence came from capacity-plan page 54; telehealth pages 50/40/42 for routing; privileging pages 2/8 for task-shifting; and telehealth pages 33/37/42 for tele-pooling. Serialized finding sizes were 1,973–5,913 characters before the decision wrapper. The existing complete 12,000-character audit check remains active.

Ordinary clinic-number answers now read the specific current clinic/specialty record rather than replying with dashboard totals. Successive follow-ups carry entity names only; numbers always come from the currently applied, validated scenario. Tests cover all 72 scenario records, changed inputs, another clinic and successive follow-ups. Public patient-consent/record-retention questions are allowed while common patient-identifier formats and clinical-advice requests remain blocked. Screening is conservative, not a comprehensive identifier detector.

## LLM provider inspection

Presence-only checks of `.env`, `.env.local`, `.dev.vars` and process environment found no `AI_PROVIDER`, `AI_API_KEY`, `AI_ACCOUNT_ID` or `AI_MODEL` configuration. No credentials were displayed, invented or written. No live model was enabled or called.

The existing adapter supports Cloudflare Workers AI. Future live use requires server-only `AI_PROVIDER=cloudflare`, `AI_API_KEY`, `AI_ACCOUNT_ID` and `AI_MODEL`, with an account-available model and a running Pages function runtime. Existing Supabase server configuration/session verification also applies to connected-account chat. Plain Vite does not execute `/api/chat`. Mocked-provider tests verify prompt/current-context/history handling and failure fallback; they are not live-provider validation.

The ordinary live adapter still retrieves the legacy source catalogue. Vector policy replies remain a separate exact-passage path. Future pgvector-grounded generative conversation requires server-side retrieval integration and live citation/numerical-consistency evaluation; it is not represented as enabled here.

## Measured checks

| Check | Result |
| --- | --- |
| `npm.cmd test` | PASS: 33 application tests/subtests; 0 failed, skipped or cancelled. Includes all original 29. |
| `npm.cmd run test:kb` | PASS: 16 tests; 0 failed, skipped or cancelled. Includes the original nine retrieval tests, four new evidence/conversation tests and three capacity-table tests. |
| `npm.cmd run typecheck` | PASS: application, server and knowledge projects. |
| `npm.cmd run lint` | PASS: no ESLint findings. |
| `npm.cmd run build` | PASS: 1,677 modules; JS 372.71 kB / 112.66 kB gzip; CSS 34.99 kB / 7.82 kB gzip. No deployment. |
| `node scripts/verify-policy-ui.mjs` | PASS against the actual HTTP/vector service through Vite in an isolated Chrome profile: source citations, consent and source-page follow-ups, unsupported waiting target, clinic numbers and successive follow-ups, approval acknowledgement, exact saved evidence, reload, input-version invalidation, outage fallback, navigation and 390px layout. No live account writes. |
| `git diff --check` | PASS: no whitespace errors; normal LF/CRLF notices only. |

Total automated results: **49 passing tests/subtests**, plus the real-service browser verification. PDF.js emits the existing `TT: undefined function: 21` font warning; extraction/provenance checks pass.

## Remaining issues

- Twelve capacity rows and all 63 Investment Guide rows remain excluded pending source clarification/verification. No complete-table shortage estimate is asserted.
- Policy coverage remains selected and incomplete; task-specific professional scope, actual credentials, complete privacy-law/transfer exceptions and other relevant law are not established. Abstention rules are bounded and require continued evaluation for unfamiliar phrasing.
- No live LLM provider configuration exists. No live generative conversational accuracy is claimed.
- Hosted authentication isolation, recovery, decision/chat persistence and deployed runtime checks remain outside this local pass.
- The previous dependency audit found 14 affected packages, including production `ws`. No dependency versions were changed or automatic repair performed in this pass; that unresolved audit remains relevant.
- No real operational forecasting dataset or clinical/user-outcome validation has been added. No forecasting model was trained or fine-tuned.

Source code, review records and documentation are ready for review. Nothing has been committed, pushed or deployed.
