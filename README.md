# AI Property Manager

An AI-assisted property management platform for small independent landlords
(2–15 units) in Cape Town, South Africa. AI is human-in-the-loop only — it
drafts, classifies, and suggests; the landlord always approves, sends, and
decides. Manual mode with zero AI features is a first-class, fully functional
mode, not a degraded fallback.

See [`docs/prd.md`](docs/prd.md) for the full product requirements and
[`docs/engineering-plan.md`](docs/engineering-plan.md) for the Phase 1
engineering plan, data model, and milestone breakdown.

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
/docs
  prd.md
  engineering-plan.md
/uploads      — local filesystem storage (gitignored, Phase 1 only)
```

## Local development

1. Start Postgres + Redis:
   ```
   docker compose -f infra/docker-compose.yml up -d
   ```
2. Copy `.env.example` to `.env` in `apps/api` and `apps/worker`.
3. API setup (Poetry): see `apps/api/README.md` (added in Milestone 2).
4. Web setup (pnpm): see `apps/web/README.md` (added in Milestone 6).

## Status

Phase 1 (MVP) in progress — building in strict milestone order per
[`docs/engineering-plan.md`](docs/engineering-plan.md) §5. No AI features are
implemented in Phase 1.

## Compliance

Tenant/lease data handling is designed around POPIA (South Africa's data
protection law) from day one — see `docs/prd.md` §11 and
[`docs/compliance-lease-documents.md`](docs/compliance-lease-documents.md)
for the Milestone 5 checkpoint (encryption at rest, access logging,
retention/deletion) on lease documents specifically.
