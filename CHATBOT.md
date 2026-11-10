# ClinIQ assistant

Latest measured behavior and tests: [ASK_HALA_UPGRADE_VERIFICATION.md](ASK_HALA_UPGRADE_VERIFICATION.md). Public and connected chat now share intent handling and deterministic result preparation. Greetings, developer/product identity, clarifications and blocked requests stay local; public mode never calls Cloudflare. Offline simulations use isolated copies too.

Current live setup and measured outputs: [LIVE_CHAT_VERIFICATION.md](LIVE_CHAT_VERIFICATION.md). Cloudflare is selected locally. Its tested model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`; the original selected model required a Paid plan. The current model selects approved result IDs; the server renders deterministic facts and exact policy passages. It does not display free-form model-authored statistics or recommendations.

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

For connected planning chat, the browser sends the question, scenario ID, up to four bounded prior turns, current view, adjustments and recent decision metadata. The server verifies account context, recomputes the deterministic rules/coordinator and prepares approved result IDs restricted to the resolved intent. The model returns only a JSON selection of those IDs. The server validates and renders the original results; unknown/duplicate/unrelated IDs, unexpected fields and raw prose are rejected. No model training or web search occurs. The browser's offline fallback uses the same checked facts with no automatic keyword citations.

Policy questions in connected chat use server-side pgvector tools over the existing 44 passages; the model sees result labels, not raw retrieved documents. Displayed text and citations come from the original tool response. The public `/api/policy` tool also remains available without an account. Reviewed topic/page boundaries, insufficient-evidence behavior and unresolved-applicability warnings apply to both paths. Bounded source follow-ups reuse the previous policy query. A failed service reports unavailable evidence instead of simulating results. See [knowledge/README.md](knowledge/README.md).

Policy query/assessment snapshots are persisted server-side. Chat history records the retrieval UUID, KB version and source IDs. The existing Decisions workflow additionally records the selected policy finding and exact source snapshot in its evidence field. Human approval requires acknowledgement of unresolved flags and never grants clinical permission.

For a connected account, the function verifies the access token with Supabase Auth and replaces client-supplied plan/decision metadata with that account's saved records. For a public demo without account configuration, browser what-if values are explicitly untrusted simulation inputs. The server independently validates numeric ranges and record keys. No passwords, model keys or free-text decision reasons are sent to the LLM.

The model context includes applied records, totals, forecasts, agent evidence/recommendations, coordinator conflicts/gaps, recent decision metadata and current navigation view. Retrieved source text stays outside that context. History helps interpret follow-ups; it is not a new source of facts.

The application now uses a single capacity-planner workflow. Team role/context fields have been removed, and legacy team/submission requests are rejected with a clear retired-workspace response. Authenticated chat reads only the caller's private account context. No other prompt or popup redesign is part of this rollback; further chatbot changes are deferred.

## Live provider configuration

Cloudflare Pages Functions is the proposed host; no deployment has been performed. Use server-only `AI_PROVIDER=cloudflare`, `AI_API_KEY`, `AI_ACCOUNT_ID` and `AI_MODEL`. The active, tested local model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. An optional Anthropic transport is also implemented but is inactive and has not been live-tested. Never prefix privileged keys with `VITE_`.

The later live-cloud pass found complete Cloudflare settings, retained the user's token/account and tested real inference. `npm.cmd run kb:serve` now runs the local Node HTTP bridge for both policy and chat; Vite proxies those routes. Credentials are loaded server-side from ignored environment files and never exposed through `VITE_` variables. Connected accounts retain their server-side session verification. For future Pages hosting, the existing function can call the protected policy service with `POLICY_SERVICE_URL` and `POLICY_SERVICE_TOKEN`; no hosting was configured or deployed here.

[Cloudflare pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), checked 9 November 2026, documents 10,000 free neurons/day, resetting at 00:00 UTC (04:00 Dubai). Model/token usage determines the number of questions; it is not a fixed request allowance. Further Free-plan operations fail after the allocation; Paid plans can incur charges. Recheck pricing, quota and the [model catalog](https://developers.cloudflare.com/workers-ai/models/) before enabling live calls.

## Fallback and limits

Missing model configuration, provider errors/timeouts/rate limits or invalid selections cause explicitly labelled checked/offline results. Vite proxies chat to the local Node bridge when it is running. A browser configured for accounts but signed out uses offline planning chat without calling the protected endpoint. Invalid inputs and authentication/rate-limit errors are displayed rather than bypassing the server to call a model.

Offline answers support greetings, verified product identity, missing-developer disclosure, clarifications, summaries, forecasts, optimization explanations and isolated simulations. They use currently applied values. Exact policy passages are retrieved separately for policy questions; unrelated operational answers have no automatic extracts. Intent handling is deliberately bounded rather than unrestricted language generation.

Questions are capped at 600 characters, bodies at 12 KB, history at four 600-character turns, provider calls at fifteen seconds and client requests at twenty seconds. Account context fetches have five-second timeouts. A per-isolate IP limiter allows ten function requests/minute; it resets on cold starts and is not distributed abuse protection.

Conservative screening blocks common identifiers and diagnosis/treatment requests before model use. It is incomplete; do not enter real personal data. Live provider output must be an exact checked-ID selection; model-authored prose and citations are not displayed. Operational responses carry a fixed uncertainty footer. The legacy free-text validator is retained for compatibility tests but is not the live response path.

Chat questions, used source IDs and visible answer summaries are logged to the current browser demo or signed-in account. Rejected inputs are not logged. Account persistence failures display an error after showing the answer; they do not silently create a demo record. No hidden reasoning is requested or stored.

## Verification

The application suite has 61 tests/subtests and the knowledge/capacity suite has 20. The latest designated live check passed 13 cases with eight real Cloudflare calls and five locally handled requests. The public browser check passed 13 conversations with zero cloud-chat calls and unchanged plans/approvals. Ordinary provider unit tests use mocks. Hosted deployment, a real signed-in browser session and complete live cross-account testing remain outstanding.
