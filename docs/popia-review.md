# POPIA Review — Full Pass (Milestone 10)

Scope: the full access-control and data-protection review called for by
`docs/engineering-plan.md` §5, Milestone 10 — everything beyond the
lease-document-specific checkpoint at Milestone 5
(`docs/compliance-lease-documents.md`, still valid, not repeated here).

Structure follows PRD §11's four POPIA requirements: data minimization,
explicit consent, encryption at rest/in transit, and retention/deletion —
plus a full pass over access control across every entity, since that's the
mechanism all four ultimately depend on.

## 1. Access control, entity by entity

| Entity | Scoping | Status |
|---|---|---|
| Landlord | Self-scoped via JWT (`/auth/landlord/me`) | ✅ |
| Property | Owning landlord only (`landlord_id`) | ✅ |
| Unit | Via owning property | ✅ |
| Lease | Via owning unit → property | ✅ |
| LeaseDocument | Owning landlord OR the lease's tenant; every read/write access-logged | ✅ (Milestone 5) |
| Submission | Owning landlord (via unit→property) OR the tenant who filed it | ✅ (Milestones 7/8) |
| Submission photos | Same dual-role check as the submission itself | ✅ (Milestone 8) |
| CommunicationLog | Never listed directly — only reachable through a submission's `messages` sub-resource, which inherits that submission's access control | ✅ |
| AuditLog | Never listed directly — only reachable through a property's or unit's `activity` sub-resource, landlord-only, ownership-checked | ✅ (Milestone 9) |
| MagicLink | Never exposed via any read endpoint; only the SHA-256 hash is stored | ✅ (Milestone 3) |
| Tenant | **Not scoped to a landlord** — any authenticated landlord on this instance can view/edit/delete any tenant record | ⚠️ see below |

### Tenant scoping — confirmed position, not a gap

`Tenant` has no `landlord_id` (it isn't in the confirmed Phase 1 schema —
`docs/engineering-plan.md` §4). This was a deliberate Milestone 4 decision
resting on the PRD's repo-per-client, single-tenant-per-instance deployment
model (`docs/prd.md` §10): in practice there is one landlord account per
running instance, so cross-landlord tenant access isn't a real exposure
today. Re-confirmed here rather than left as an implicit assumption. If the
deployment model ever changes to multi-landlord-per-instance (PRD §13, open
question 1), this needs a `landlord_id` FK and a migration before that
change ships — flagging it explicitly so it isn't missed.

## 2. Data minimization

Reviewed every model in `apps/api/app/models/`. No field stores more than
its stated purpose requires:
- `Tenant` — name, email, phone. No ID numbers, no financial data at rest
  in this table (those would live in `LeaseDocument` uploads, which are
  already the most access-controlled/logged entity in the system).
- `Submission` — description text + photo paths. No inferred/derived
  personal data stored beyond what the tenant typed or uploaded.
- `AuditLog.log_metadata` — property_id/unit_id/tenant_id/entity ids only,
  no free-text personal data duplicated into metadata.

No changes needed here.

## 3. Explicit consent — open item, needs a product/legal decision

**Status: not yet implemented. Flagging, not silently deciding.**

PRD §11 requires "explicit consent at portal signup." In this product's
actual shape, a tenant doesn't self-register — the landlord creates the
tenant record, and the tenant's only "entry" is via magic link
(`docs/engineering-plan.md` §1, Epic A3's no-friction-access design). That
means the natural place for a consent capture is different from a typical
B2C signup form: either (a) at the moment the landlord adds a tenant record
(the landlord asserting consent was obtained offline, e.g. in the lease
agreement itself), or (b) a one-time notice/acceptance shown to the tenant
the first time they land on `/portal/submit` after verifying their magic
link.

This is deliberately left as an open item rather than an engineering
decision made unilaterally in this pass: the actual consent language and
which of (a)/(b) (or both) fits depends on how the landlord's lease
agreements already handle this, and possibly on legal review — the same
gate `docs/engineering-plan.md` §6 already places on notice templates
(Epic G). Recommend resolving before onboarding a real pilot landlord's
real tenants, not before Phase 1 code-complete.

## 4. Encryption at rest and in transit

**At rest:** Same stance as Milestone 5's lease-document review
(`docs/compliance-lease-documents.md` §1), extended here to submission
photos, which use the identical storage abstraction and local filesystem
backend. Disk/volume-level encryption for now; SSE on the bucket when the
storage backend is swapped to DigitalOcean Spaces/S3. No new code change —
same abstraction, same deferred-and-documented position.

**In transit:** The application does not terminate TLS itself — `uvicorn`
runs plain HTTP in local dev (`http://localhost:8000`), which is correct
for local development. This is a **deployment requirement, not an
application code gap**: any real deployment (a pilot landlord's server)
must put TLS termination in front of the API (reverse proxy / load
balancer / platform-provided HTTPS), and `NEXT_PUBLIC_API_URL` /
`CORS_ORIGINS` must be updated to `https://` origins at that point. Flagging
explicitly for the deployment runbook — there is no code change to make in
this repo for it.

## 5. Retention / deletion

Milestone 5 set the pattern for lease documents: policy stated, manual
deletion available now, automated retention deferred to a Phase 2+ Celery
job. Extending that same pattern here rather than inventing a different one
per entity:

- **Tenant records** — retained while the platform is in use; a landlord
  can `DELETE /tenants/{id}` at any time (Milestone 4), which also has no
  cascading effect on that tenant's past `Submission`/`CommunicationLog`/
  `AuditLog` rows (those are historical records of what happened, not the
  tenant's live contact profile, and deleting them would break the
  activity log's completeness — Epic H1's "no manual data entry" promise
  depends on the trail being append-only).
- **Submissions / communication log / audit log** — no automated deletion
  exists or is planned to exist automatically; these are the activity
  record Epic H1 exists to provide. Manual deletion isn't exposed for
  these either, on the same reasoning.
- **Exact retention periods** (e.g. "delete tenant contact data N months
  after move-out") are a business/legal decision, not an engineering one —
  same category as the consent question in §3. Not decided here.

## 6. CORS and transport-adjacent config

`CORSMiddleware` reads `allow_origins` from `settings.cors_origin_list`
(`app/config.py`), which is config-driven per environment — no wildcard
`*` anywhere in the codebase. Operational note for the deployment runbook:
`CORS_ORIGINS` must be set to the real production origin(s) before a real
deployment goes live; the `.env.example` default
(`http://localhost:3000`) is a dev-only placeholder.

## 7. Auth mechanics (re-confirmed, not re-litigated)

- Passwords: bcrypt (Milestone 3), no plaintext or reversible storage.
- JWTs: signed with `JWT_SECRET_KEY`, expire after
  `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (60 min default) for both landlord and
  tenant sessions — tenant sessions don't currently have a separate,
  shorter expiry setting; noting this as symmetric-by-default rather than
  a considered choice, in case a shorter tenant session length becomes
  desirable later (low priority — it's a config value away).
- Magic-link tokens: SHA-256-hashed at rest, single-use (`used_at`),
  time-limited (`MAGIC_LINK_EXPIRE_MINUTES`), and now rate-limited on both
  the request and verify endpoints (this milestone, §8 below).
- No raw SQL anywhere in the codebase — every query goes through
  SQLAlchemy's query builder, so there's no SQL-injection surface from
  string-built queries.

## 8. New this milestone: rate limiting on the tenant portal

Redis-backed fixed-window rate limiting (`app/ratelimit.py`), per the
architecture doc's "rate limiting on the tenant portal to prevent abuse"
(`docs/prd.md` §8):

- `POST /auth/tenant/magic-link/request` — 5 requests / 15 min / IP
- `POST /auth/tenant/magic-link/verify` — 10 requests / 15 min / IP
- `POST /submissions` — 20 requests / hour / IP

Keyed by client IP via a single Redis `INCR`+`EXPIRE`. This is
defense-in-depth on top of the magic link's real security property (a
32-byte cryptographically random token — brute-forcing it is infeasible
regardless of rate limiting) and blunts spam/abuse of the intake form.

## 9. Forward note for Epic E (Phase 2)

When contractor records are introduced (Epic E), they need the same
access-control rigor as tenant data per PRD §11 ("a leaked contractor list
is a smaller but still real exposure") — this review didn't touch that
because no `Contractor` model exists yet in Phase 1. Flagging so it isn't
missed when that epic starts, consistent with the Future-Phase Design
Notes already in `docs/engineering-plan.md` §7.

## Summary

No access-control defects found in this pass — every entity that should be
scoped, is; every entity that's deliberately unscoped (`Tenant`) has that
position re-confirmed and dated here rather than left as an implicit
assumption from Milestone 4. Two items are explicitly **not** resolved
because they're product/legal decisions, not engineering ones: consent
capture wording/placement (§3) and exact retention periods (§5). Both
should be resolved before real tenant data from a pilot landlord enters the
system — not before Phase 1 is code-complete.
