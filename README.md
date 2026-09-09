# AI Property Manager

An AI-assisted property management platform for small independent landlords
(2–15 units) in Cape Town, South Africa. AI is human-in-the-loop only — it
drafts, classifies, and suggests; the landlord always approves, sends, and
decides. Manual mode with zero AI features is a first-class, fully functional
mode, not a degraded fallback.

See [`docs/prd.md`](docs/prd.md) for the full product requirements,
[`docs/engineering-plan.md`](docs/engineering-plan.md) for the Phase 1
engineering plan, data model, and milestone breakdown, and
[`docs/system-overview.md`](docs/system-overview.md) for a walkthrough of
how the whole system actually works, end to end — from landlord signup
through every feature.

## Repo structure

```
/apps
  /web        — Next.js (App Router): landlord dashboard + tenant portal
  /api        — FastAPI: REST API, async endpoints, Pydantic schemas, JWT auth
  /worker     — Celery worker(s) + task definitions
/packages
  /shared-types — Pydantic <-> TS type contracts
/infra
  docker-compose.yml — Postgres + Redis for local dev
  /env-templates
/scripts
  dev-start.sh, dev-stop.sh — run the whole stack (see "Running it")
/docs
  prd.md, engineering-plan.md — product spec + build plan
  system-overview.md          — how the running system actually works
  popia-review.md, compliance-lease-documents.md — data-protection reviews
/uploads      — local filesystem storage (gitignored, Phase 1 only)
```

## Running it

One command brings up the whole stack — Postgres + Redis, database
migrations, the API, and the web app:

```
./scripts/dev-start.sh     # → http://localhost:3000
./scripts/dev-stop.sh
```

Both are safe to re-run: starting twice leaves anything already running
alone, and stopping preserves the database volume. First run also creates
the `.env` files and installs dependencies.

| | |
|---|---|
| Landlord dashboard | http://localhost:3000 |
| Tenant portal | http://localhost:3000/portal |
| API docs (Swagger) | http://localhost:8000/docs |
| Logs | `.dev-logs/api.log`, `.dev-logs/web.log` |

**In VSCode:** the same two scripts are wired to **▶ Start App** / **■ Stop
App** buttons in the status bar, via the
[VSCode Action Buttons](https://marketplace.visualstudio.com/items?itemName=seunlanlege.action-buttons)
extension (`seunlanlege.action-buttons`) — install it and the buttons
appear; the config is committed in `.vscode/settings.json`.

Prerequisites: Docker Desktop, Poetry, and pnpm (Node 22). Per-app setup
details are in [`apps/api/README.md`](apps/api/README.md) and
[`apps/web/README.md`](apps/web/README.md).

New to the codebase? [`docs/system-overview.md`](docs/system-overview.md)
walks through what every part does.

## Status

Phase 1 (MVP) complete — all 10 milestones in
[`docs/engineering-plan.md`](docs/engineering-plan.md) §5 shipped in strict
order. No AI features are implemented in Phase 1 (that's Phase 2, Epics
C/D/E/G/H2/J).

## Compliance

Tenant/lease data handling is designed around POPIA (South Africa's data
protection law) from day one — see `docs/prd.md` §11,
[`docs/compliance-lease-documents.md`](docs/compliance-lease-documents.md)
(Milestone 5: lease documents specifically), and
[`docs/popia-review.md`](docs/popia-review.md) (Milestone 10: the full
access-control review across every entity, plus tenant-portal rate
limiting). Two items remain open by design — pending a product/legal
decision, not an engineering gap — see `docs/popia-review.md` §3 and §5.
