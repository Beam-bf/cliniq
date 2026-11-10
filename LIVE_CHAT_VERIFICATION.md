# Live Cloudflare Ask Hala verification — 10 November 2026

This records the initial integration checkpoint. For the subsequent conversation/relevance upgrade, current **81 automated tests**, **13 live cases/eight cloud calls**, **13 public-browser conversations**, and remaining issues, see [ASK_HALA_UPGRADE_VERIFICATION.md](ASK_HALA_UPGRADE_VERIFICATION.md).

Cloudflare Workers AI is configured locally and has been tested with actual inference calls. No account upgrade, billing change, deployment, commit or push was performed. The credential values are not included in this report, source code, browser bundle or logs.

## Active local setup

The original configured model returned HTTP 403, error **5035**: it required a Workers Paid plan. The same token/account successfully ran `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Only `AI_MODEL` in ignored `.dev.vars` was changed to this tested model. `AI_PROVIDER=cloudflare`, `AI_API_KEY` and `AI_ACCOUNT_ID` retain the user's settings. No token was replaced or printed.

Start the app in two terminals:

```powershell
npm.cmd run kb:serve
```

```powershell
npm.cmd run dev
```

The Node service owns the existing pgvector database and serves `/api/policy` and `/api/chat` on loopback port 8788. Vite proxies both endpoints. The server loads `.env`, `.env.local` and `.dev.vars`, with process environment taking precedence. Keys are server-only; provider secrets must never use a `VITE_` prefix. Restart the Node service after changing configuration. With the existing Supabase configuration, connected chat requires sign-in and a verified session; the public browser demo remains available separately.

## Restriction architecture

The model interprets the question by selecting up to eight approved result IDs. The server rejects unknown/duplicate IDs, extra fields, raw prose and invalid JSON. It then renders the selected algorithm results verbatim. The LLM cannot supply replacement clinic figures, perform its own arithmetic, invent a citation or author a displayed legal permission. Cloudflare JSON mode is used for documented compatible models, with mandatory application validation regardless of provider formatting.

- The four existing deterministic healthcare agents are unchanged. Their actual outputs supply the result catalogue.
- Clinic/specialty facts come from the active validated scenario, including saved-account inputs when signed in. Other scenarios are not silently mixed in.
- Policy results come from the existing 44-passage pgvector corpus. Exact quotations/citations are displayed as evidence with unresolved-applicability warnings. Retrieved text is not sent to the model; it cannot override the model's system instructions.
- What-if values use a deliberately bounded server parser. The algorithms run against an isolated copy. No stored plan, decision or schedule is changed. Ambiguous/invalid inputs require clarification. Changing hours does not model a future waiting-time reduction.
- Follow-ups resolve entity names from bounded history and re-read current inputs. Anaphoric simulation follow-ups replay the explicit prior what-if input; if those inputs have fallen outside context, the assistant asks for them again.
- Approval/action attempts and unrelated questions are blocked before a paid model call. Human approval controls are unchanged.
- Local server execution snapshots record scenario versions, selected checked facts, exact policy evidence and final visible answers in the existing audit store. Raw model responses, hidden reasoning and credentials are not recorded. Existing browser/account chat summaries remain in use.

This is a structural restriction on displayed content, not a general guarantee of perfect interpretation, clinical validity or comprehensive legislation coverage. The model can still select an unhelpful approved result. The underlying scenarios are fictional, the forecast is a rule-based fit and policy applicability remains a human decision. Invalid model selections fall back to checked results with an explicit offline notice.

## Real cloud test results

Run explicitly, with the Node service stopped so the CLI can own the database:

```powershell
node --import ./knowledge/register.mjs scripts/verify-live-chat.mjs
```

The latest run used the tested model as a runtime override before persisting that same model in `.dev.vars`. Seven real inference requests returned **HTTP 200** and passed output/citation checks; two requests were correctly blocked without calling the model. Complete visible outputs are retained in ignored `.knowledge/live-chat-verification.json`.

| Case | Actual outcome |
| --- | --- |
| Alpha psychiatry capacity | PASS, live: current wait **4.6 weeks**, **20 free specialist hours/week**, **38 referrals/week**. |
| Follow-up waiting trend | PASS, live: retained Alpha/psychiatry; reported the algorithm's **about 29 weeks** to the fictional eight-week threshold, with **90% fit consistency over six weeks** and explicit lack of validated predictive accuracy. |
| Routing / Task-Shifting / Tele-Pooling comparison | PASS, live: displayed each algorithm's actual recommendation. |
| DHA telehealth patient consent | PASS, live: exact attributable passages, checked against PDF extraction, with PDF pages 40–43 and unresolved applicability. |
| Isolated 30-hour what-if | PASS, live: used 30 free hours/week in a copied scenario; current waiting input stayed 4.6 weeks. Explicitly stated that no stored plan or schedule changed. |
| Alleged eight-week legal mandate | PASS, live interpretation: no source citations; answered that the reviewed corpus does not establish the claim. |
| Coordinator conflicts / approval holds | PASS, live: selected actual coordinator checks and unresolved policy holds. |
| Approve all / book schedules | PASS, blocked: no model call; no action taken. |
| Current Bitcoin price | PASS, blocked: outside dataset; no model call. |

## Browser and engineering checks

A separate Chrome profile and demo-only QA processes exercised the full UI → Vite → Node → Cloudflare → pgvector path without touching the user's account session or hosted records. Five live browser conversations and one blocked approval attempt passed. Checks covered clinic numbers, follow-ups, consent source links, isolated simulations, unsupported legal claims, chat audit entries and a 390px viewport. Browser storage for plans and decisions was identical before and after the conversations. The QA-only authentication overrides were confined to those temporary processes; normal account-protected startup was restored afterwards.

Ignored artifacts: `.knowledge/live-browser-verification.json` and `.browser-qa/cloud-20261110/live-mobile.png`.

| Check | Result |
| --- | --- |
| Application tests | **44 passed**, including the original 33 and 11 new restricted-provider/tool tests. |
| Retrieval/capacity tests | **18 passed**, including real pgvector citation checks through the chat path. |
| TypeScript | PASS for application, server and knowledge projects. |
| ESLint | PASS. |
| Production build | PASS; client JS 373.08 kB / 112.81 kB gzip. |
| Secret exposure scan | PASS: configured secret values absent from nonignored repository files and generated browser assets. |
| Capacity exclusions | Original source-review tests still verify **12 excluded** rows and 28 included rows. No forecasting training. |

No live hosted-account authentication or production deployment was performed. Existing dependency advisories and incomplete policy coverage remain unresolved. The local cloud inference and demo browser path were actually tested; they are not mocked-provider results.

References: [Cloudflare JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/), [Paid-plan model restriction and error 5035](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/).
