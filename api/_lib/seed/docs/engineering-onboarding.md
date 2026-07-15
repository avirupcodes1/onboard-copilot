# Engineering Onboarding Guide

Welcome to the Northwind engineering team! This guide gets you from a fresh laptop to shipping your first change. Read it end to end on day one, then keep it bookmarked — most of what you'll reach for in your first month is here or linked from here.

## Tech Stack

Northwind is built as a set of services fronted by a single-page web app.

- **Frontend** — React with TypeScript, bundled with Vite. State via React Query and Zustand. Styling with Tailwind. Strict TypeScript is enforced; `any` is a review blocker unless justified in a comment.
- **Backend services** — Two runtimes, split by workload:
  - **Python + FastAPI** for the core domain and data-heavy APIs (orders, catalog, analytics). Managed with Poetry, typed with `mypy`, formatted with `ruff`.
  - **Node.js (TypeScript)** for the API gateway, real-time/websocket services, and BFF (backend-for-frontend) layers.
- **Data stores** — **PostgreSQL** is the system of record (one database per service; no cross-service shared tables). **Redis** handles caching, rate limiting, and background-job queues.
- **Infrastructure** — **AWS**: services run on ECS Fargate, Postgres on RDS, Redis on ElastiCache, static assets and uploads on S3 behind CloudFront. Infrastructure is defined in Terraform under the `infra/` repo — no click-ops in the console.

Everything is containerized. If it runs in CI or production, it runs in Docker.

## Local Dev Setup

You'll need Docker, Node 20+ (use `nvm`), Python 3.11+ with Poetry, and the AWS CLI configured with your SSO profile. Ask your onboarding buddy to add you to the `northwind-dev` GitHub team and the AWS SSO directory before you start.

Clone the monorepo and bootstrap:

```bash
git clone git@github.com:northwind/platform.git
cd platform

# Installs Node + Python deps, sets up pre-commit hooks
make bootstrap

# Copy env template and fill in secrets from 1Password (vault: "Eng Dev")
cp .env.example .env
```

Then bring the stack up. Postgres and Redis run in containers; app services run with hot reload:

```bash
# Start Postgres, Redis, and run DB migrations
make infra-up
make db-migrate

# Run all services (frontend :5173, gateway :8080, FastAPI :8000)
make dev
```

Visit `http://localhost:5173`. Seed data with `make seed`. If a port is taken or migrations fail, check `docs/runbooks/local-setup.md` — the fixes for 90% of setup issues are there. When in doubt, `make clean && make bootstrap` resets your environment.

## Git Workflow

We use **trunk-based development**. `main` is always releasable.

- Branch off `main` for every change. Keep branches **short-lived** — aim to merge within a day or two. Long-running feature branches drift and cause painful conflicts; use feature flags to merge incomplete work safely instead.
- Name branches `type/short-description`, e.g. `feat/order-refunds` or `fix/redis-timeout`.
- Rebase on `main` before opening or updating a PR; we keep history linear and merge with squash.
- Write **conventional commits**. The commit type drives changelog generation and release tooling:

```
feat(orders): add partial refund endpoint
fix(gateway): retry Redis connection on cold start
chore(deps): bump fastapi to 0.115
docs(runbooks): document on-call escalation path
```

Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`. A commit-lint hook rejects non-conforming messages, so you'll get fast feedback locally.

## Pull Request Rules

PRs are the gate to `main`. The rules are non-negotiable and enforced by branch protection:

- **No direct pushes to `main`.** Everything lands through a PR.
- **Two approvals required**, at least one from a code owner for the touched area (see `CODEOWNERS`).
- **CI must pass** — lint, type-check, unit and integration tests, and a successful build. Red CI blocks merge.
- Keep PRs small and focused. If a PR exceeds ~400 lines of diff, expect to be asked to split it.
- Fill out the PR template: what changed, why, how it was tested, and any rollout/rollback notes.
- Link the relevant ticket. Drafts are welcome for early feedback — mark them "Ready for review" only when you want approvals.

Review is a two-way street: respond to comments, and when you review others, be specific and kind. Approve when it's good enough to ship, not perfect.

## Testing Expectations

Tests ship with the code, not after.

- **Unit tests** cover business logic in isolation — Vitest/Jest on the frontend and Node, `pytest` for FastAPI.
- **Integration tests** exercise real Postgres and Redis (via Testcontainers) to catch wiring and query bugs unit tests miss.
- We target **~80% line coverage**. It's a guideline, not a hard gate — cover the code that matters (edge cases, error paths, money-handling logic) rather than gaming the number with trivial assertions.
- New endpoints need at least one integration test. Bug fixes need a regression test that fails before the fix.
- Run the relevant suite locally before pushing: `make test` runs everything; per-service targets like `make test-api` are faster during iteration.

## CI/CD

CI/CD runs on **GitHub Actions**; workflows live in `.github/workflows/`.

- **On every PR** — lint, type-check, tests, and a container build run in parallel. Results post back to the PR.
- **On merge to `main`** — the pipeline builds and pushes images, then **auto-deploys to staging**. Staging mirrors production, so verify your change there.
- **Production** deploys are **gated on manual approval**. A designated approver (usually the on-call or team lead) promotes the staging build to prod from the Actions "Deploy" workflow. Deploys are rolling with automatic health-check rollback.
- Database migrations run as a separate, explicit step — backward-compatible migrations first, then code, so a rollback never leaves the schema ahead of the app.

## On-Call Basics

Every engineer joins the on-call rotation after their first month, once they've shipped a few changes and shadowed a shift.

- Rotations are one week, handed off at a Monday sync. **PagerDuty** pages you; acknowledge within 5 minutes.
- Your job during an incident is to **stabilize first, diagnose second**. Roll back or flip a feature flag before deep debugging if users are impacted.
- Every alert links to a **runbook** with dashboards, likely causes, and mitigation steps. If a runbook is missing or wrong, fixing it is part of resolving the incident.
- Declare an incident in `#incidents` for anything customer-facing. Page the secondary or escalate to the team lead if you're stuck for more than 15 minutes — escalating early is expected, not a failure.
- Every SEV1/SEV2 gets a **blameless postmortem** within 48 hours. We fix systems, not people.

## Where Docs and Runbooks Live

- **`docs/`** in the monorepo — architecture decision records (ADRs), service READMEs, and this guide. Docs live next to code and are reviewed like code.
- **`docs/runbooks/`** — operational runbooks, linked directly from PagerDuty alerts.
- **Confluence** — org-wide process, team charters, and product context.
- **Backstage** — the service catalog: ownership, dependencies, dashboards, and on-call info for every service.
- **`#eng-help`** on Slack — no question is too small in your first weeks. Ask early and often.

Welcome aboard. Your first task is waiting in the onboarding project — pick it up, and don't hesitate to ping your buddy.
