# POPIA Checkpoint: Lease Documents (Milestone 5)

Scope: this is the lightweight, lease-document-specific checkpoint called for
in `docs/engineering-plan.md` §5, done immediately after Milestone 4 so
nothing else gets built on top of the document storage layer before these
three questions are answered. It is **not** the full POPIA/access-control
review — that stays at Milestone 10.

`lease_documents` may contain ID copies, which are sensitive personal
information under POPIA (PRD §11). The three required questions:

## 1. Encryption at rest

**Status: deferred at the application layer, by design — not an oversight.**

Phase 1 storage is local filesystem (`app/storage/local.py`), explicitly a
placeholder — see the confirmed decision in `docs/engineering-plan.md` §6.
Adding application-level encryption (key generation, storage, rotation) for
files that will be migrated to a real object store within the same phase's
architecture plan would be throwaway complexity: the key management problem
would need to be solved twice, once for local files and again for
DigitalOcean Spaces/AWS S3 server-side encryption.

The interim stance: rely on **disk/volume-level encryption** wherever the
`/uploads` directory lives —
- Local development: whatever full-disk encryption is already on the
  developer's machine (e.g. FileVault on macOS). No action required.
- Any non-local Phase 1 deployment (a pilot landlord's server): the hosting
  provider's disk encryption must be enabled before that server holds real
  tenant data. This is an operational deployment requirement, not a code
  change — flag it explicitly in any deployment runbook before Phase 1 ships
  to a real landlord.

When the storage backend is swapped for DigitalOcean Spaces/S3 (per the
storage abstraction in `app/storage/base.py`), enable server-side encryption
(SSE) on that bucket. This is a config change on the bucket, not an
application code change — the abstraction was built for exactly this
swap-out.

## 2. Access logging

**Status: implemented.**

Every lease document upload, download, and delete is logged to `audit_log`
via `app/audit.py::log_action()`, called from
`app/routers/lease_documents.py`. Logged fields: actor type (landlord/tenant)
and id, action (`lease_document.upload` / `.download` / `.delete`), the
document's entity id, and `lease_id` in metadata. The log entry is written in
the same DB transaction as the action it describes (see `log_action()`'s
docstring), so an access and its audit trail can never diverge.

This satisfies "access logging for every lease-document read/download" from
the Milestone 5 requirement. Building a UI to browse this log is Milestone 9
(Epic H1, activity log) — the data is captured now, surfaced later.

## 3. Retention / deletion stance

**Status: policy stated; manual deletion implemented; automated retention
deferred (documented, not silent).**

Policy: lease documents (including ID copies) are retained for the duration
of the tenancy plus a reasonable post-tenancy window to cover the
landlord's contractual/legal recordkeeping need, then should be deleted.
Phase 1 does not implement an automated retention/deletion job — there is no
scheduled task infrastructure exercised yet (Celery is scaffolded per
`docs/engineering-plan.md` §6 but idle until Phase 2, and a
retention-sweeper job is exactly the kind of thing that belongs there,
not bolted onto Phase 1's synchronous API).

What Phase 1 does provide: `DELETE /leases/{lease_id}/documents/{document_id}`
(landlord-only, logged) so a landlord can manually enact deletion — e.g. when
a lease ends and an ID copy is no longer needed. This is a deliberate,
minimal interim measure: manual capability now, automated policy enforcement
as a Phase 2+ Celery job once that infrastructure is actually exercised by
something. Revisit this at Milestone 10's full POPIA review, and again
before Epic I (payments) or any Phase 2 feature that increases the volume of
retained documents.
