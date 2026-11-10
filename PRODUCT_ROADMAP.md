# Focus the prototype on one capacity planner

## Current use case

One capacity planner compares waiting-time pressure and available specialist hours across clinics, explores fictional input changes, checks rule-based options and records a planning review. Sign-in and private saved work support that workflow. Admin/Planner/Reviewer role separation and shared team submissions are retired.

## Immediate work

1. Independently verify hosted retirement permissions with `supabase/verify_backend.sql`. The user reports applying the retirement SQL; personal records and historical team rows remain preserved.
2. Finish hosted signed-in checks for decision/chat persistence, password recovery and two-account isolation. Personal plan reload is user-confirmed. Account now includes loaded-record counts, sync time and connection retry; local database tests cover personal persistence and access restrictions.
3. Keep the problem and limits clear: fictional aggregate data, fixed rules, no demonstrated clinical outcomes or reduced waiting times, and no live scheduling integration.
4. Keep **Validation status: pending** until a real hospital-operations or health-administration contact is available. The README contains four neutral interview questions. Do not invent a contact, quote, response, market estimate or claim of adoption.

## Deferred until requested

Further popup-chatbot design, system-prompt changes, guided actions and interactivity improvements are deferred while the user clarifies the use case. The existing chatbot remains in place and read-only; its live model provider is still unconfigured. No new patient portal or staff-role system is planned in the current scope.

Future investment should follow actual feedback and a concrete planning task, rather than a large market claim. A genuine interview response may inform the pitch only after it has been collected and permission to quote it has been obtained.
