# Hala assistant

The assistant is a nonmodal bottom-right widget available across workspace views. It can explain data and guide navigation. It has no approval, scheduling, editing, deletion, email or database-write tools. Recording a visible chat audit is handled by the application, outside the model.

## The guiding instruction

The single source of the deployed system instruction is [functions/_lib/chatPrompt.ts](functions/_lib/chatPrompt.ts). The server includes it on every live request. It covers:

1. Product purpose, fictional clinics/specialties and three independent scenarios.
2. Meaning and limits of the four fixed-rule agents, including the distinction between changing available hours and forecasting future waits.
3. The supplied context schema and current workspace view.
4. Exact source-ID citation rules; keyword relevance does not establish support.
5. How to direct a user to Planner, Decisions, Evidence, History, Help or Account.
6. Read-only behavior, rejection of medical advice and personal identifiers, and treatment of retrieved/user text as untrusted data.
7. Short answers: answer the question first, use only relevant figures, suggest one next step, and disclose missing context.

A good prompt improves model behavior; it cannot prove correctness or eliminate prompt injection. It does not activate an LLM by itself. Real provider credentials and a running function are still required.

## Grounding flow

For ordinary planning chat, the browser sends the question, scenario ID, up to four bounded prior turns, current view, validated what-if adjustments and recent decision metadata. The function recomputes the rules and coordinator, then retrieves up to five keyword-matching passages from the original verified-source list. This generative-chat path does not train models or search the web.

Explicit policy, regulation, licensing, scope/privileging, consent and retention questions use the separate `/api/policy` retrieval tool. It generates local MiniLM embeddings and searches a real PostgreSQL/pgvector knowledge base of 44 selected passages. Reviewed topic/page boundaries restrict candidate passages; vector similarity alone is not answer support. Unknown topics, unsupported waiting targets and unreviewed numerical claims receive an insufficient-evidence response. Retrieved clauses remain candidates with unresolved applicability, not permission. Bounded source follow-ups reuse the previous policy query; explicit new topics retrieve new evidence. No generative model rewrites these passages. A failed service reports unavailable evidence instead of simulating results. The public-document policy tool works without an account. See [knowledge/README.md](knowledge/README.md).

Policy query/assessment snapshots are persisted server-side. Chat history records the retrieval UUID, KB version and source IDs. The existing Decisions workflow additionally records the selected policy finding and exact source snapshot in its evidence field. Human approval requires acknowledgement of unresolved flags and never grants clinical permission.

For a connected account, the function verifies the access token with Supabase Auth and replaces client-supplied plan/decision metadata with that account's saved records. For a public demo without account configuration, browser what-if values are explicitly untrusted simulation inputs. The server independently validates numeric ranges and record keys. No passwords, model keys or free-text decision reasons are sent to the LLM.

The context includes applied records, totals, forecasts, agent evidence/recommendations, coordinator conflicts/gaps, recent decision metadata, retrieved passage IDs/text and current navigation view. History helps interpret follow-ups; it is not a new source of facts.

The application now uses a single capacity-planner workflow. Team role/context fields have been removed, and legacy team/submission requests are rejected with a clear retired-workspace response. Authenticated chat reads only the caller's private account context. No other prompt or popup redesign is part of this rollback; further chatbot changes are deferred.

## Live provider configuration

Cloudflare Pages Functions is the proposed host; no actual host was identifiable in the export. Use server-only `AI_PROVIDER=cloudflare`, `AI_API_KEY`, `AI_ACCOUNT_ID` and `AI_MODEL`. Other provider adapters are not implemented. Use a currently available text model, for example `@cf/meta/llama-3.2-3b-instruct`, after checking availability for your account. Never prefix privileged keys with `VITE_`.

The evidence-quality pass checked `.env`, `.env.local`, `.dev.vars` and process-environment presence without displaying values: no LLM provider configuration or credentials were present. No live model was enabled or called. To enable it later, supply the four server variables above, select a model actually available in the account, and run the Pages function runtime alongside the client with its existing account configuration/session verification. Plain Vite does not execute `/api/chat`. The ordinary live adapter currently uses the legacy source catalogue; vector policy replies remain a separate exact-passage tool. Do not claim live pgvector-grounded generation until that server-side integration and live evaluation are implemented.

[Cloudflare pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), checked 9 November 2026, documents 10,000 free neurons/day, resetting at 00:00 UTC (04:00 Dubai). Model/token usage determines the number of questions; it is not a fixed request allowance. Further Free-plan operations fail after the allocation; Paid plans can incur charges. Recheck pricing, quota and the [model catalog](https://developers.cloudflare.com/workers-ai/models/) before enabling live calls.

## Fallback and limits

Missing model configuration, provider errors/timeouts/rate limits, or invalid output cause an offline template response for ordinary planning chat. Local Vite has no generative chat endpoint, so ordinary answers use local templates; policy requests are proxied to the separate vector service. A browser configured for accounts but signed out uses offline planning chat without calling the protected endpoint. Invalid inputs and authentication/rate-limit errors are displayed rather than bypassing the server to call a model.

Offline answers support greetings, short summaries, forecast/routing/task-shifting/tele-pooling findings, coordinator concerns and navigation guidance. They use currently applied values and a few relevant extracts. They do not have a live LLM's language understanding; unsupported questions receive a clear limitation.

Questions are capped at 600 characters, bodies at 12 KB, history at four 600-character turns, provider calls at ten seconds and client requests at twenty seconds. Account context fetches have five-second timeouts. A per-isolate IP limiter allows ten function requests/minute; it resets on cold starts and is not distributed abuse protection.

Conservative screening blocks common identifiers and diagnosis/treatment requests before model use. It is incomplete; do not enter real personal data. Live responses are bounded, reasoning tags removed, invalid bracket citations stripped/flagged, and a fixed uncertainty footer appended. These checks cannot guarantee all claims or medical language are caught.

Chat questions, used source IDs and visible answer summaries are logged to the current browser demo or signed-in account. Rejected inputs are not logged. Account persistence failures display an error after showing the answer; they do not silently create a demo record. No hidden reasoning is requested or stored.

## Verification

The application suite has 33 tests/subtests and the knowledge/capacity suite has 16, including real PostgreSQL/vector retrieval, original-table discrepancies, unsupported in-domain questions and follow-up context. Ordinary clinic-number answers re-read the currently applied scenario; regional public figures never replace them. Model-provider tests use mocks. Real model calls, hosted function behavior and hosted retirement remain unverified until configuration/migration. Existing personal sign-in was demonstrated by the user; complete cross-account testing remains outstanding.
