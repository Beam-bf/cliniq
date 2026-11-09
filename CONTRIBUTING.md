# Working together on HalaCapacity AI

Shared repository: https://github.com/Beam-bf/halacapacity-ai

## First setup on each computer

Accept the repository invitation, install Git and Node 24.22+, then:

```sh
git clone https://github.com/Beam-bf/halacapacity-ai.git
cd halacapacity-ai
npm ci
npm run dev
```

On PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. Start with the browser demo. Backend/account activation is documented separately in [BACKEND_SETUP.md](BACKEND_SETUP.md).

## One branch per task

Agree on the task owner before editing. Start a task from an up-to-date `main`:

```sh
git switch main
git pull --ff-only origin main
git switch -c feature/short-task-name
```

If you have unfinished changes, commit them to their existing branch before switching; do not discard them to update `main`. Use names such as `feature/account-setup` and `feature/planner-comparison`. Keep each change small enough for the other person to review.

Before sharing:

```sh
npm run lint
npm run typecheck
npm test
npm run build
git status
git diff
```

Stage the intended files, inspect the staged diff with `git diff --cached`, then commit. When you are ready to upload your branch:

```sh
git push -u origin feature/short-task-name
```

Open a pull request targeting `main`. Describe the change and tests, ask the other person to review, and merge after agreement. Each person then pulls the updated `main` before starting another task. Avoid force-pushing shared branches.

## Suggested first split

- One person: Supabase development project, auth configuration, migration and live persistence verification.
- Other person: scenario comparison, planner usability and the visible assistant experience.
- Both: review each other's changes and test the main workflow before merging.

If you both use coding assistants, give each assistant its own task and branch. Coordinate edits to shared files such as `src/App.tsx`, `package.json`, lockfiles and database migrations. Add a new migration for later database changes rather than modifying a migration already applied to your shared project.

## Configuration and generated files

Never commit `.env` files, privileged API keys, database passwords, `node_modules`, build output, npm caches or browser QA profiles. Existing ignore rules cover these generated/local files. Public Supabase configuration is described in the setup guide; keep real configuration in each computer's local environment and hosting settings. Invite your friend to the development services with their own account rather than sharing passwords.

Demo localStorage is separate on each computer. Signed-in capacity-planner accounts keep their plans/history private. Application team roles have been removed; see [ROLE_RETIREMENT.md](ROLE_RETIREMENT.md) for retiring previously enabled team APIs without deleting data. Never modify a migration already applied to the shared project.

Keep all operational demo data fictional and aggregate. The capacity agents remain fixed rules, and approvals record a review without changing real schedules.
