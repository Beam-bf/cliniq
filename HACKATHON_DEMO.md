# Ask ClinIQ demo guide

Use fictional aggregate inputs only. The application is named **ClinIQ** in its repository and UI; ClinIQ is its assistant. Verified developer identity has not been provided.

## Start locally

Use Node 24 and the existing installed dependencies. With the verified PDF/model cache and ingested database already present, run in separate terminals:

```powershell
npm.cmd run kb:serve
npm.cmd run dev
```

Open the local Vite URL. Public chat uses deterministic answers and public policy retrieval, with no Cloudflare inference. Sign in to use Cloudflare-assisted result selection and the account's saved inputs. Keep `AI_PROVIDER`, `AI_API_KEY`, `AI_ACCOUNT_ID`, `AI_MODEL` server-only. The tested model remains `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. See [knowledge setup](knowledge/README.md) for cache preparation and ingestion; see [backend setup](BACKEND_SETUP.md) for account configuration.

## Suggested sequence

1. Select **Baseline** and describe all clinic figures as fictional. Ask **Hi** and **Who designed you?** to show clear identity and honest missing metadata.
2. Ask **Explain Alpha psychiatry forecast**. Current wait is 4.6 weeks; the straight-line estimate reaches the eight-week scenario threshold in about 29 weeks, beyond the eight-week planning horizon. Trend consistency is 90% over six observations, not validated predictive accuracy. The scenario-wide forecast flags two pairs within the planning horizon.
3. Ask **Explain routing**. Show the actual ranked recommendation and its positive-free-hours constraint. Ask **Explain that** to demonstrate follow-up context.
4. Ask **Compare Routing, Task-Shifting and Tele-Pooling**. Explain that these are complementary deterministic rules, with no experimentally validated overall winner.
5. Ask **What if Alpha psychiatry had 30 free hours?** Then **And its referrals?** The hypothetical copy uses 30 hours and 38 referrals/week; waiting input stays 4.6 weeks. The simulated label stays visible. Stored plans and approvals remain unchanged. Hour changes do not predict a waiting-time reduction.
6. Ask **What are DHA telehealth consent requirements?** Expand Policy evidence and inspect exact passages and PDF page links (40–43, version 4). Applicability and actual consent remain unresolved. Ask **Which page is that on?** for a source follow-up.
7. Ask **Which DHA policy mandates an eight-week waiting target?** The assistant reports missing evidence and does not call the fictional threshold a legal rule.
8. Ask **Can you book specialist schedules?** or **Approve all proposals now**. No action is taken. Human Decisions controls remain separate and do not confer clinical permission.

For operational what-ifs, use one supported clinic/specialty and explicit numeric hours, referrals or waiting weeks. `Increase ... hours to 30` sets 30; `increase ... hours by 2` adds two. Unsupported changes need clarification.

## Checks before presenting

```powershell
npm.cmd run test:all
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run security:secrets
```

`npm.cmd run test:live` explicitly makes cloud calls with fictional data, rebuilding the verified 44-passage corpus in an isolated in-memory database. It does not interrupt the running service. Standard tests use provider mocks.

For the browser check, start a separate Chrome instance with `--headless=new --enable-automation --remote-debugging-port=9234 --user-data-dir=<workspace>/.browser-qa/halacapacity-chat-qa/profile`, then run `npm.cmd run test:browser`. The script refuses personal profiles, uses a loopback app, blocks hosted account traffic, and verifies public behavior. It does not test a real signed-in account. `CHAT_QA_APP` and `CHAT_QA_CDP` can override the loopback URLs.

## Demo boundaries

This is a local demonstration, with incomplete policy coverage and synthetic operational data. No model training, real clinical validation, deployment or account billing change was performed. Hosted signed-in cross-account flows need separate verification. Dependency advisories remain unresolved; see [the verification report](ASK_HALA_UPGRADE_VERIFICATION.md).
