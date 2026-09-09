# System Overview — How AI Property Manager Works

A walkthrough of the whole Phase 1 system, end to end: what happens from
the moment a landlord signs up through everything a landlord and a tenant
can do. For the "why" behind specific decisions, see
[`engineering-plan.md`](engineering-plan.md); for the original product
spec, see [`prd.md`](prd.md). This doc is the "what actually happens when
you click things" companion to those two.

Two independent front doors share one Next.js codebase and one FastAPI
backend: the **landlord dashboard** (`/properties`, `/tenants`, `/inbox`,
etc.) and the **tenant portal** (`/portal/*`). They never share a session —
a landlord's JWT and a tenant's JWT live under different `localStorage`
keys, so both can be open in the same browser without interfering.

---

## 1. Landlord: signup and login

**Where:** `apps/web/app/signup/page.tsx`, `apps/web/app/login/page.tsx`

A landlord fills in name/email/password. The form calls
`POST /auth/landlord/signup` (or `/login`), which:

1. Hashes the password with `bcrypt` (`apps/api/app/auth/security.py`) —
   never stored or logged in plaintext.
2. Issues a JWT (`apps/api/app/auth/security.py::create_access_token`)
   with `sub` = the landlord's id, `role: "landlord"`, expiring after
   `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (60 min by default).
3. The frontend stores that token under `localStorage["apm_token"]`
   (`apps/web/lib/api.ts`) and calls `GET /auth/landlord/me` to hydrate
   the `AuthProvider` context (`apps/web/lib/auth-context.tsx`).

From here, every dashboard request goes through `apiFetch()`
(`apps/web/lib/api.ts`), which attaches `Authorization: Bearer <token>` to
every call automatically. The `(dashboard)` route group's layout
(`apps/web/app/(dashboard)/layout.tsx`) checks `useAuth()` on every
navigation and bounces to `/login` if there's no valid session — that's
the only route guard in the app; individual pages don't re-check auth.

On the backend, every landlord-only endpoint depends on
`require_landlord` (`apps/api/app/auth/dependencies.py`), which decodes
the JWT, checks `role == "landlord"`, and loads the `Landlord` row. If
that fails at any point (missing token, wrong role, expired token,
landlord no longer exists), FastAPI returns 401/403 before any handler
code runs.

---

## 2. Landlord: building the property tree

**Where:** `apps/web/app/(dashboard)/properties/`,
`apps/web/app/(dashboard)/units/[unitId]/`

The landlord's data model is a strict hierarchy:

```
Landlord → Property → Unit → (Lease ↔ Tenant)
```

- **Properties** (`POST/GET/PATCH/DELETE /properties`) are the only
  entity with a direct `landlord_id` foreign key. Every other entity's
  ownership is derived by walking up this chain — `get_owned_property`
  and `get_owned_unit` (`apps/api/app/crud/authz.py`) do that walk and
  404 (not 403 — see §7) if the chain doesn't lead back to the requesting
  landlord.
- **Units** belong to a property (`property_id`). Created from inside a
  property's detail page.
- **Tenants** are *not* landlord-scoped — `GET /tenants` returns every
  tenant on the instance, not just this landlord's. That's a confirmed,
  deliberate decision (`docs/engineering-plan.md` §6, re-confirmed in
  `docs/popia-review.md` §1) resting on the PRD's repo-per-client
  deployment model: in practice there's one landlord account per running
  instance, so this isn't a real cross-tenant exposure today. If that
  deployment model ever changes, this needs revisiting first.

Creating/editing/deleting any of these writes an `audit_log` row in the
*same database transaction* as the change itself (`apps/api/app/audit.py`
— see §6). If you navigate to a property, unit, or tenant you don't have
access to, the page shows "doesn't exist or you don't have access"
instead of spinning forever (`notFound` state in each detail page —
this was a real gap found and fixed during Milestone 10's testing pass).

---

## 3. The core invariant: leases and `tenant.unit_id`

**Where:** `apps/api/app/crud/lease.py`

This is the one piece of business logic worth understanding in detail,
because it's the thing the rest of the system leans on.

`Tenant.unit_id` is a denormalized "where does this tenant currently
live" pointer — but it is **never writable directly**. `TenantUpdate`
(the PATCH schema) doesn't even have a `unit_id` field. The only two
places that column can change are inside `create_lease()` and
`end_lease()`, and in both cases the lease row and the tenant's `unit_id`
update happen in the same `db.commit()` — so they can never observably
drift apart.

**Creating a lease** (`POST /leases`, called from a unit's detail page
once a tenant is selected):
1. Rejects if the tenant already has an active lease (`tenant.unit_id is
   not None`) — one active lease per tenant.
2. Rejects if the unit already has an active lease — one active tenant
   per unit.
3. Inserts the `Lease` row (`status: active`) and sets
   `tenant.unit_id = unit_id`, in one transaction.

**Ending a lease** (`POST /leases/{id}/end`, the "End Lease" button):
1. Sets `lease.status = ended`.
2. Clears `tenant.unit_id` back to `None` — but only if it still points
   at *this* lease's unit (a defensive check against edge cases).

Once a lease ends, that tenant becomes available again in the "assign a
tenant" dropdown on any unit's page (`app/(dashboard)/units/[unitId]/page.tsx`
filters tenants where `unit_id === null`).

---

## 4. Lease documents

**Where:** `apps/api/app/routers/lease_documents.py`, the "Lease
Documents" card on a unit's detail page

Once a lease exists, the landlord can upload files (leases, ID copies)
against it. This is the most tightly controlled part of the system,
because these documents can contain the most sensitive personal
information in the app:

- **Access:** the owning landlord *or* the tenant on that specific
  lease — nobody else, checked on every request via
  `_get_lease_for_principal`.
- **Every** upload, download, and delete writes an `audit_log` entry —
  not just mutations. Viewing a document is logged the same as changing
  it.
- Files go through the storage abstraction (§8), not straight to disk —
  so swapping local storage for a real object store later touches
  nothing in this router.
- A landlord can delete a document (e.g. an ID copy no longer needed
  after move-out); a tenant downloading their own documents can't.

Full reasoning: [`compliance-lease-documents.md`](compliance-lease-documents.md).

---

## 5. Tenant: magic link and the submission portal

**Where:** `apps/web/app/portal/`

A tenant never gets a password. The flow:

1. **`/portal`** — tenant enters their email, `POST
   /auth/tenant/magic-link/request`. The backend looks up a `Tenant` by
   email; if found, generates a random 32-byte token
   (`secrets.token_urlsafe(32)`), stores only its **SHA-256 hash** in
   `magic_links.token_hash`, and (outside production) returns the raw
   token directly in the response since no email provider is wired up
   yet (Epic J is Phase 2). The response is identical whether or not the
   email matched a tenant, so the endpoint can't be used to enumerate
   registered tenants.
2. **`/portal/verify?token=...`** — the tenant "clicks the link" (in dev,
   a literal on-screen link). `POST /auth/tenant/magic-link/verify`
   hashes the submitted token and compares hashes — the raw token is
   never stored anywhere, so a database read alone can never impersonate
   a tenant. On success: the link is marked used (single-use), and a
   tenant-role JWT is issued and stored under
   `localStorage["apm_tenant_token"]`.
3. **`/portal/submit`** — the actual issue-report form. Guarded
   client-side: no tenant token → redirect back to `/portal`.
   `POST /submissions` requires the tenant to currently have an active
   lease (`tenant.unit_id is not None`) — otherwise 409. On success, the
   description + any photos are stored, an `audit_log` entry is written
   (`actor_type: tenant`), and a `CommunicationLog` row is created as the
   automatic acknowledgment message — all in one transaction. The
   frontend then shows a confirmation screen with the submission id.

Both the magic-link-request and submission-create endpoints are
rate-limited by IP (§9) — the tenant portal is the one surface reachable
without any prior authentication, so it's the one that needs abuse
protection.

---

## 6. The landlord's inbox

**Where:** `apps/api/app/routers/inbox.py`,
`apps/web/app/(dashboard)/inbox/`

Every submission becomes a thread. `GET /inbox` aggregates all
submissions across the landlord's properties (joined through
unit→property), with tenant/unit/property context and a message count,
ordered by most recent activity — filterable by `property_id` or
`tenant_id`. Opening a submission (`GET /inbox/{id}`) shows the full
`CommunicationLog` thread for it, in order: the automatic acknowledgment
first, then any landlord replies.

**Replying** (`POST /inbox/{id}/messages`) is landlord-only and
human-authored — there's no AI drafting anywhere in Phase 1 (that's
Epic D, Phase 2, and even then would need explicit landlord approval
before sending, per the PRD's human-in-the-loop principle). A tenant can
*read* their own thread (`GET /submissions/{id}/messages`) to see
replies, but can't post into it in Phase 1.

Submission photos are served through `GET
/submissions/{id}/photos/{index}` — dual access control (owning landlord
or owning tenant), content-type inferred from the stored filename. The
frontend can't just use `<img src="...">` for these because the endpoint
requires an `Authorization` header, which plain image tags can't send —
so `AuthedImage` (`apps/web/components/ui.tsx`) fetches the image as a
blob via `apiFetch` and renders it as an object URL instead.

---

## 7. The activity log

**Where:** `apps/api/app/routers/activity.py`,
`apps/web/components/activity-log.tsx`

Every mutating action anywhere in the app — property/unit/tenant
create/update/delete, lease create/end, submission create, inbox reply,
lease document upload/download/delete — writes an `AuditLog` row via
`log_action()` (`apps/api/app/audit.py`), in the same transaction as the
action it describes. Every entry that traces back to a unit also carries
`unit_id` and `property_id` in its JSON metadata (`unit_context()` in the
same file), which is what makes per-property and per-unit activity feeds
possible.

`GET /properties/{id}/activity` and `GET /units/{id}/activity` fetch all
audit rows and filter by that metadata in Python rather than with
database-side JSON operators — deliberately simple, since ownership is
already enforced before the query runs and Phase 1's scale (2–15 units
per landlord) doesn't need anything more sophisticated. Both are
rendered by the same `ActivityLog` component on the property and unit
detail pages, most-recent-first, with human-readable action labels.

---

## 8. The storage abstraction

**Where:** `apps/api/app/storage/`

Every file the app touches — lease documents, submission photos — goes
through `StorageBackend` (`base.py`), an interface with one
implementation right now: `LocalStorageBackend`, which writes to
`/uploads` on disk (gitignored). No router or business logic talks to
the filesystem directly. When Phase 1's local storage is swapped for
DigitalOcean Spaces or S3, that's a new `StorageBackend` implementation
and a config change (`STORAGE_BACKEND` in `.env`) — nothing in
`lease_documents.py` or `submissions.py` changes.

---

## 9. Rate limiting

**Where:** `apps/api/app/ratelimit.py`

A Redis-backed fixed-window limiter (`INCR` + `EXPIRE`, keyed by client
IP) sits in front of the three tenant-portal endpoints reachable without
prior authentication:

| Endpoint | Limit |
|---|---|
| `POST /auth/tenant/magic-link/request` | 5 / 15 min / IP |
| `POST /auth/tenant/magic-link/verify` | 10 / 15 min / IP |
| `POST /submissions` | 20 / hour / IP |

This is defense-in-depth, not the primary defense — the magic link
token itself (32 random bytes) is already infeasible to brute-force
regardless. It mainly blunts spam/abuse of the public intake form.

---

## 10. Everything that logs something, logs it in the same transaction

A pattern worth naming because it shows up everywhere: whenever an
action produces a side-effect record (an audit log entry, an automatic
acknowledgment message, a `tenant.unit_id` update), that record is
written to the same SQLAlchemy session *before* the single `db.commit()`
call that finalizes the whole action. There's no "do the thing, then
separately log that we did it" — if the commit succeeds, everything in
it succeeded together; if anything fails, nothing partial is left
behind. This is why, for example, a lease can never exist without its
`lease.create` audit entry, and a tenant's `unit_id` can never diverge
from what `leases.status = 'active'` actually says.

---

## 11. What's deliberately not here yet

Everything in this doc is Phase 1 (no AI). Explicitly out of scope until
Phase 2+ (`docs/engineering-plan.md` §1, §7):

- AI classification/urgency, AI-drafted replies or notices (Epics C, D)
- Contractor outreach — no `Contractor` model exists yet (Epic E)
- Notice templates (Epic G)
- Real email/SMS delivery (Epic J) — magic links are shown on-screen in
  dev instead
- Payments (Epic I)
- Weekly owner summaries (H2), exports (H3)

Two POPIA-related items are also open by design, not by oversight —
consent-capture wording/placement and exact data-retention periods
(`docs/popia-review.md` §3, §5) — both are product/legal decisions, not
engineering ones, flagged for resolution before real tenant data from a
pilot landlord enters the system.

---

## Where to look next

- Want to run it locally? [`README.md`](../README.md) → Local
  development.
- Want the full milestone-by-milestone build history and the decisions
  behind them? [`engineering-plan.md`](engineering-plan.md).
- Want to see the tests that prove all of the above actually works?
  `apps/api/tests/` (57 pytest cases), `apps/web/e2e/` (10 Playwright
  cases, `pnpm test:e2e`), and `apps/web/lib/*.test.ts` (10 Vitest unit
  cases, `pnpm test`).
