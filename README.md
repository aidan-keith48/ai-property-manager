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
