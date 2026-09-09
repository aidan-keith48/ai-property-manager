# AI Property Manager — Repo Setup & Phase 1 (MVP) Plan

## Context

The PRD (`ai-property-manager-prd.md`) defines a full AI-assisted property management
platform, but the project directory is currently empty (no repo, no code). Before any
code gets written, the user wants: a private GitHub template repo created, a Phase 1
scope confirmation, a proposed monorepo layout and data model, an ordered Phase 1
milestone list, and every open question surfaced — so misunderstandings get caught
before implementation starts, not after.

Four architecture decisions were confirmed with the user up front (see §6):
GitHub destination, auth approach, storage approach, and the Tenant↔Unit data model
shape. Everything below reflects those decisions.

---

## 1. Phase 1 (MVP) Scope — Confirmation

Per PRD §12, Phase 1 validates the **core loop** — tenant submits an issue → it lands
in one place → the landlord sees it, in an organized, logged way — with **no AI**
(or classification-only groundwork at most). Concretely, Phase 1 covers:

- **Epic K (Auth/Roles):** Landlord login (JWT); Tenant magic-link access (no
  password). Contractor role exists in the schema but has no Phase 1 UI (Epic E is
  Phase 2).
- **Epic F (Tenant/Lease/Unit Management):** Full CRUD for Properties, Units,
  Tenants, Leases, from the landlord dashboard. Lease documents (PDF/ID copies)
  uploadable and stored with access control.
- **Epic A (Tenant Portal & Intake) — text + photo only:** Tenant submits an issue
  via a magic-link-gated form (text description + photo upload), sees a confirmation,
  gets an automatic acknowledgment. Voice/video upload and email-in fallback are
  explicitly out of scope for Phase 1 (they're P1/P2 in the PRD).
- **Epic B (Unified Inbox):** One inbox view aggregating tenant submissions (no
  contractor replies yet, since Epic E is Phase 2), threaded per property/tenant.
- **Epic H1 (Activity Log):** Every submission/message/action automatically recorded
  to a timestamped log per property/unit — no manual data entry.

**Explicitly not in Phase 1:** AI classification/urgency/drafting (Epic C/D), notices
(Epic G), contractor outreach (Epic E), payments (Epic I), multi-channel
notifications beyond in-app (Epic J), weekly summaries (H2), exports (H3).

This matches the PRD's own phasing. Flag now if this reading is wrong.

---

## 2. Repo Creation

- Create a **private** repo under `aidan-keith48` (already authenticated via `gh`),
  configured as a **GitHub template repository** (per PRD §10), named
  `ai-property-manager` (open to renaming).
- Initialize with the monorepo skeleton below, the PRD committed as `docs/prd.md`,
  a root `README.md`, `.gitignore` (including the local uploads folder — see §6),
  and `.env.example` files per app.
- Minimal GitHub Actions CI (lint + test on PR) to start, within GitHub Free's
  2,000 min/month — matches PRD §10.

---

## 3. Monorepo Structure

```
/apps
  /web        — Next.js (App Router): landlord dashboard + tenant portal
  /api        — FastAPI: REST API, async endpoints, Pydantic schemas, JWT auth
  /worker     — Celery worker(s) + task definitions (scaffolded now, mostly idle
                until Phase 2 — Phase 1 has no async AI/transcription jobs, but
                wiring it up now avoids a Phase 2 restructure)
/packages
  /shared-types — Pydantic <-> TS contracts (OpenAPI codegen)
/infra
  docker-compose.yml   — Postgres, Redis, local dev stack
  /env-templates
/docs
  prd.md
/uploads      — local filesystem storage root (gitignored, see §6)
```

Python: FastAPI app uses Poetry + Alembic for migrations. JS: pnpm workspaces
across `apps/web` and `packages/shared-types`. `docker-compose.yml` in `/infra`
brings up Postgres + Redis for local dev.

---

## 4. Phase 1 Data Model

Tables scoped to Phase 1 only (Contractor/JobRequest/Notice/Payment tables are
Phase 2+ and deferred, per PRD §12):

- **landlords** — id, email, password_hash, name, phone, notification_preferences
  (jsonb), auto_approve_threshold_cents (nullable, Epic K2 — schema-ready, unused
  in Phase 1), created_at
- **properties** — id, landlord_id (fk), address, name, created_at
- **units** — id, property_id (fk), unit_label, bedrooms, bathrooms, created_at
- **tenants** — id, unit_id (fk, nullable — simple current-pointer model, confirmed
  in §6; kept in sync with `leases` transactionally, not independently editable —
  see §6)
- **leases** — id, unit_id (fk), tenant_id (fk), start_date, end_date, rent_amount,
  status (active/ended), created_at
- **lease_documents** — id, lease_id (fk), file_path, file_type, uploaded_at
  (access-controlled: only the owning landlord + the tenant on that lease can fetch)
- **magic_links** — id, tenant_id (fk), token_hash (SHA-256 of the raw token —
  see §6, the raw token is never stored), expires_at, used_at (Epic A3/K)
- **submissions** — id, tenant_id (fk), unit_id (fk), description (text),
  photo_paths (jsonb array), status (open/in_progress/resolved), classification
  (nullable, Phase 2), urgency (nullable, Phase 2), created_at, updated_at
- **communication_log** — id, related_entity_type, related_entity_id, channel,
  direction, content, timestamp (Epic B/H1)
- **audit_log** — id, actor_type (landlord/tenant/system — no "ai" value used yet
  in Phase 1), actor_id, action, entity_type, entity_id, timestamp, metadata (jsonb)

Nullable classification/urgency/auto-approve columns are added now (schema-ready)
rather than via a Phase 2 migration, since they're cheap to add up front and avoid
a later backfill migration. Flag if you'd rather keep the Phase 1 schema strictly
minimal and add these columns only when Epic C/D actually start.

---

## 5. Phase 1 Milestones (ordered)

1. **Repo + infra scaffold** — monorepo layout, docker-compose (Postgres + Redis),
   env templates, CI skeleton (lint/test on PR). Also create a `BUSINESS.md` at
   repo root (non-technical, separate from `/docs`) recording the pricing model —
   see §7.
2. **Backend foundations** — FastAPI app skeleton, Pydantic settings, DB
   session/connection, Alembic migrations, base SQLAlchemy models for §4's tables.
3. **Auth scaffold (Epic K)** — Landlord signup/login (JWT), role-based access
   control middleware (Landlord/Tenant/Contractor roles, Contractor unused until
   Phase 2), Tenant magic-link request/verify flow with **hashed** tokens (§6).
   **Includes basic pytest happy-path tests** for signup/login/magic-link
   request+verify — not deferred to Milestone 9.
4. **Tenant/Unit/Lease CRUD (Epic F)** — Landlord-facing CRUD API + DB models for
   Property/Unit/Tenant/Lease; lease document upload via the local storage
   abstraction (§6) with access control. `tenants.unit_id` updates happen inside
   the same transaction as the lease-status change that causes them (§6, decision
   confirmed). **Includes basic pytest happy-path tests** for each CRUD endpoint.
5. **Lightweight POPIA checkpoint on lease documents** — before anything else
   builds on top of the document storage from Milestone 4: confirm encryption at
   rest for the local uploads volume (or document why it's deferred), add access
   logging for every lease-document read/download (feeds `audit_log`), and set an
   explicit retention/deletion stance for ID copies. This is scoped to ID/lease
   documents only — the full POPIA/access-control review stays at Milestone 9.
6. **Landlord dashboard skeleton (Next.js)** — auth pages, property/unit/tenant/
   lease management screens wired to the API.
7. **Tenant portal submission flow (Epic A: text+photo, magic-link, confirmation)**
   — tenant-facing Next.js pages, submission API endpoint, photo upload.
   Includes basic pytest coverage for the submission endpoint.
8. **Unified inbox (Epic B)** — inbox API aggregating submissions + communication
   log, per-property/per-tenant threaded UI in the landlord dashboard.
9. **Activity log (Epic H1)** — audit_log wiring across every mutating action;
   activity log UI per property/unit.
10. **Hardening pass** — Redis-backed rate limiting on the tenant portal (abuse
    prevention per PRD's architecture section), the full POPIA-driven
    access-control review (§7, beyond the Milestone 5 checkpoint), and rounding
    out test coverage (pytest for API; Vitest/Playwright for web) for anything
    milestones 6–9 didn't already cover.

---

## 6. Confirmed Decisions & Remaining Open Questions

**Confirmed with the user this session:**
- **Repo destination:** private repo under the `aidan-keith48` GitHub account
  (already authenticated locally via `gh`).
- **Auth:** build custom (FastAPI-issued JWTs + DB-backed magic-link tokens) —
  no external auth provider, matches PRD's "JWT-based auth" language directly.
- **Storage (Phase 1):** local filesystem storage under an `/uploads` folder,
  git-ignored — no cloud bucket yet. Built behind a small storage abstraction
  (interface with a local-filesystem implementation now) so swapping in
  DigitalOcean Spaces/S3 later (PRD §8) is a config change, not a rewrite —
  this also keeps faith with PRD principle #3 (provider-agnostic, swappable
  interfaces) even though the *AI* provider is the principle's main target.
- **Tenant↔Unit model:** simple current pointer (`tenant.unit_id`), one active
  lease per tenant for Phase 1 — not lease-derived/history-modeled. **Sync
  mechanism (added after review):** `tenant.unit_id` is never edited directly by
  API consumers — it is only ever written as a side effect, inside the same DB
  transaction, of the lease-creation/lease-ending code path in Milestone 4. That
  code path is the single place `tenant.unit_id` can change, so it cannot drift
  from what `leases.status = 'active'` says. `leases` remains the source of truth
  for lease history; `tenant.unit_id` is a denormalized read-optimization derived
  from it, not an independently-editable field.
- **Magic-link token storage (added after review):** tokens are **hashed, not
  plaintext**. Flow: generate a random raw token → email the raw token to the
  tenant as the link → store only `SHA-256(raw token)` in `magic_links.token_hash`
  → on verification, hash the incoming token and compare hash-to-hash. The raw
  token exists only in the email and in-flight over HTTPS; DB read access alone
  (backup leak, broad admin role, misconfigured query tool) is not enough to
  impersonate a tenant. Schema updated in §4.
- **Celery worker scaffolded in Phase 1 despite being idle until Phase 2 (accepted
  trade-off, added after review):** this is a deliberate cost, not an oversight —
  one more service to run/monitor for zero Phase 1 functionality, accepted to
  avoid a structural Phase 2 restructure (moving async job wiring in after the
  fact touches the API's request/response boundary in ways that are cheaper to
  get right the first time).

**Still open (from PRD §13, not blocking Phase 1 engineering, flagged for later):**
1. Single-tenant (repo-per-client) vs. multi-tenant SaaS — revisit past 3–5 clients.
2. Legal review of notice templates — hard blocker before Epic G (Phase 2), not
   Phase 1.
3. Pilot landlord(s) and their must-have day-one feature set.

**Resolved this session (previously open):**
- Contractor onboarding UX — **both manual entry and bulk import**, first-class,
  for Epic E (Phase 2). See §7.
- Pricing model — setup fee + ongoing retainer, decided. See §7/`BUSINESS.md`.

**New assumptions being made (flag if wrong):**
- Repo name: `ai-property-manager` (placeholder, easy to rename before/after
  creation).
- Python via Poetry + Alembic; JS via pnpm workspaces — confirmed.
- Local uploads folder path: `/uploads` at repo root, gitignored — confirmed.
- Testing stack: pytest (API), Vitest + Playwright (web) — pytest introduced at
  Milestone 3 onward per-milestone; Vitest/Playwright still land at Milestone 10
  (no web UI exists to test before Milestone 6).

---

## 7. Future-Phase Design Notes & Standing Principles

Not Phase 1 scope — recorded now so these requirements survive to when their
epics actually start, rather than living only in chat history.

**Epic G (Notices & Compliance Templates, Phase 2):** notice templates must be
structured for easy per-client customization from day one — templated text
blocks / a config-driven approach, not hardcoded copy in application code.
Tailoring a notice's tone or legal wording for a specific client should be a
content/config change, not a code change. (Legal review of the templates
themselves, per §6 item 2, is a separate, still-open blocker.)

**Epic E (Contractor Trust Network, Phase 2):** contractor onboarding must
support **both manual entry and bulk import** as first-class paths, not one
with the other bolted on — explicit quality-of-life requirement.

**Business note (non-engineering, for the record):** pricing model is an
initial setup fee (~R7,000–R15,000) plus an ongoing retainer covering
maintenance, improvements, and new feature requests per client. Recorded in
`BUSINESS.md` at repo root (Milestone 1), kept separate from `/docs` technical
documentation since it's not an engineering artifact.

**Standing principles for how this gets built (apply for the life of the
project, not just Phase 1):**
- **Strict staged execution.** Build in the milestone order defined in §5. Do
  not start Epic C/D/E/G/I/J (Phase 2/3 epics) or jump ahead to a later
  milestone while earlier ones are incomplete.
- **Architect for absorbing change, not just for Phase 1.** The storage
  abstraction (§6), the `shared-types` package (§3), and the nullable
  schema-ready columns (§4) are the model to follow: interfaces over
  hardcoding, config over hardcoded values, additive schema changes over
  breaking ones. Apply this same instinct to decisions not explicitly covered
  in this plan, even where it isn't spelled out.
