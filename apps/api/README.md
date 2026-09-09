# API

FastAPI backend for AI Property Manager. Python 3.11, managed with Poetry.

## Setup

```
cd infra && docker compose up -d   # Postgres (localhost:5433) + Redis (localhost:6380)
cd apps/api
cp .env.example .env
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/health`

## Common commands

```
poetry run pytest             # tests
poetry run ruff check .       # lint
poetry run alembic revision --autogenerate -m "..."   # new migration
poetry run alembic upgrade head                        # apply migrations
```

## Structure

- `app/models/` — SQLAlchemy models (Phase 1 schema: see `docs/engineering-plan.md` §4)
- `app/storage/` — storage abstraction; `local.py` is the Phase 1 filesystem
  backend, swappable for an S3-compatible backend later without touching callers
- `app/config.py` — Pydantic settings, loaded from `.env`
- `app/db.py` — SQLAlchemy engine/session
- `alembic/` — migrations

## Notes

- Postgres/Redis run on non-default host ports (5433/6380) to avoid clashing
  with other projects' containers on the same machine — see `infra/docker-compose.yml`.
- `magic_links.token_hash` stores only a SHA-256 hash of the tenant's raw
  magic-link token — never the raw token itself.
- `tenants.unit_id` is written only as a side effect of the lease
  creation/ending code path, never edited directly — see the comment in
  `app/models/tenant.py`.
