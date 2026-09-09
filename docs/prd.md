# Product Requirements Document: AI Property Manager

**Version:** 1.0
**Status:** Draft — ready for engineering scoping
**Target market:** Independent landlords, Cape Town / South Africa, 2–15 units

---

## 1. Overview

An AI-assisted property management platform for small independent landlords who are too small to justify a management company's 8–10% cut but too busy to self-manage well with spreadsheets and WhatsApp. The product consolidates tenant communication, maintenance coordination, and reporting into one system, with AI acting as an optional assistant — never a silent autonomous actor — on top of a fully functional manual workflow.

## 2. Goals

- Give a landlord with a handful of units back their time without taking away their control or judgment.
- Replace scattered WhatsApp/email/calls with one inbox and one activity log per property.
- Make maintenance coordination (getting quotes, picking a contractor, tracking the job) dramatically faster.
- Keep every AI-assisted action reviewable and reversible before it takes effect.

## 3. Non-Goals (v1)

- Not competing with AppFolio/PayProp on enterprise features (leasing CRM, portfolio-scale accounting, affordable-housing compliance modules).
- Not a full accounting/bookkeeping suite — light rent/arrears tracking only, not tax/GL-level accounting.
- No autonomous financial actions (no auto-approving repair spend, no auto-charging tenants) or autonomous legal actions (no auto-sending legal notices) without landlord confirmation.
- Not targeting managing agencies at launch — single-landlord/small-portfolio use case only.

## 4. Target Users

| Persona | Role | Needs |
|---|---|---|
| **Landlord** (primary) | Owns/manages 2–15 units | One place to see everything, less admin time, control over what AI does |
| **Tenant** | Submits issues, pays rent | Frictionless way to report problems, doesn't want to learn a new app |
| **Contractor** | Electrician/plumber/handyman in the trust network | Gets clear job requests, doesn't need to log into anything complex |

## 5. Competitive Landscape (condensed)

| Product | Segment | Gap it leaves |
|---|---|---|
| AppFolio | Enterprise PMs, 50+ unit minimum | Priced/scaled for portfolios, not individuals |
| PayProp | Letting agencies (SA market leader), tiers start at up to 200 properties | Doesn't serve individual landlords directly |
| TurboTenant / Avail / TenantCloud | DIY landlords globally | Transactional only (payments/listings) — no action-taking, no AI |
| Traditional PM company | Small-mid landlords | 8–10% of rent, still needs owner oversight |

**Positioning:** the only tool built specifically for a landlord with a handful of units who wants an assistant, not a dashboard and not a middleman.

---

## 6. Feature Requirements

Priority key: **P0** = MVP, **P1** = fast-follow, **P2** = later phase.

### Epic A — Tenant Portal & Intake (P0)
- A1. Tenant-facing submission form: text description of issue (P0), photo upload (P0), voice note upload (P1), video upload (P1).
- A2. Email-in fallback: tenant forwards/sends an email to a dedicated address; content is parsed into the same submission pipeline (P1).
- A3. No-friction access: magic link or phone-number verification instead of a full account/password (P0).
- A4. Submission confirmation shown to tenant + automatic acknowledgment message (P0).

### Epic B — Unified Communication Inbox (P0)
- B1. Single inbox aggregating tenant submissions, contractor replies, and system notices, regardless of source channel (P0).
- B2. Per-property and per-tenant conversation threading (P0).
- B3. Search and filter across all historical communication (P1).

### Epic C — AI Classification & Escalation Engine (P1)
- C1. On submission, AI classifies issue type (electrical, plumbing, general, tenant question, other) and unit/tenant.
- C2. AI assigns an urgency flag (routine / needs attention soon / urgent) and surfaces it in the inbox.
- C3. Voice notes transcribed automatically; photos/video analyzed to help describe the issue (P1/P2 depending on media type).
- C4. All classifications are visible/editable by the landlord — AI suggests, doesn't decide silently.

### Epic D — AI-Assisted Drafting (Human-in-the-loop) (P1)
- D1. AI drafts a tenant-facing reply based on the submitted issue; landlord reviews and sends (never auto-sent).
- D2. AI drafts notices (late rent reminder, lease violation notice) from templates grounded in current requirements; landlord reviews and sends.
- D3. Natural-language quick actions: e.g., "create a new tenant, here are the details…" — AI populates the record, landlord confirms before it's saved (accuracy-critical fields like ID numbers/lease terms always require explicit confirmation).

### Epic E — Contractor Trust Network & Outreach Automation (P1)
- E1. Landlord maintains a contractor list per trade (electrician, plumber, etc.) with contact preferences (email/SMS/WhatsApp).
- E2. On a flagged repair, landlord can trigger AI outreach: pings relevant contractors for quote/availability across their preferred channel.
- E3. AI compiles contractor responses into a single comparison view for the landlord to decide from — AI does not pick the contractor or approve cost.
- E4. AI can carry a scheduling back-and-forth with a contractor (e.g., confirming a time) but nothing is finalized without landlord sign-off (P2).

### Epic F — Tenant / Lease / Unit Management (P0)
- F1. CRUD for properties, units, tenants, and leases.
- F2. Document storage per lease (lease PDF, ID copies, etc.) with secure access control.
- F3. Natural-language quick-add (see D3) as an accelerator on top of standard forms, not a replacement for them.

### Epic G — Notices & Compliance Templates (P1)
- G1. Template library for common notices (late rent, lease violation, renewal) aligned to South African Rental Housing Act requirements — legal-reviewed before release.
- G2. AI-assisted drafting from templates (see D2), always human-approved before sending.

### Epic H — Reporting & Logging (P0)
- H1. Automatic, timestamped activity log per property/unit (every submission, message, and action recorded — no manual data entry).
- H2. Weekly owner summary: what was handled automatically/semi-automatically, what still needs a decision (P1).
- H3. Exportable reports (PDF/CSV) per property for the landlord's own records (P2).

### Epic I — Payments & Rent Collection (P2, Phase 2+)
- I1. Rent collection integration via **PayFast** (ZAR settlement, native recurring billing, no monthly fee).
- I2. Arrears detection and flagging, feeding into Epic D's notice drafting.
- I3. Evaluate Ozow (instant EFT) and Yoco/Peach Payments as secondary payment method options for tenants.
- I4. Stripe explicitly excluded — not available to South African merchants.

### Epic J — Notifications (P1)
- J1. Multi-channel outbound notifications (email, SMS, WhatsApp) for landlord alerts and tenant/contractor communication.
- J2. Configurable notification preferences per landlord (e.g., urgent-only push vs. everything).

### Epic K — Auth, Roles & Permissions (P0)
- K1. Three roles: Landlord (full access), Tenant (portal-only, own unit scope), Contractor (job-request view only, no system-wide access).
- K2. Landlord can set auto-approve thresholds (e.g., "auto-approve repairs under R500" — still logged and visible, and this is the *only* place anything resembling autonomous approval exists, and only if the landlord explicitly opts in).

### Epic L — Landlord Settings & Configuration (P1)
- L1. Manage contractor trust network entries and preferred channels.
- L2. Set notification preferences and any auto-approve thresholds.
- L3. Toggle AI-assist features on/off per feature (some landlords may want zero AI involvement — full manual mode must remain a first-class option, not a degraded fallback).

---

## 7. AI Design Principles

1. **Human-in-the-loop by default.** AI drafts, suggests, classifies, and compiles — the landlord approves, sends, and decides. No exceptions for financial or legal actions.
2. **Manual mode is not a fallback, it's a first-class mode.** A landlord who wants to do everything by hand should have a fully functional product with AI features simply switched off.
3. **Provider-agnostic AI layer.** Don't hard-wire to one model provider (Claude/GPT/Gemini) — keep it swappable behind a thin interface.
4. **Grounded generation over free generation.** Legal notices and compliance-sensitive content should be generated via retrieval against approved templates, not open-ended generation.
5. **Every AI action is visible and logged.** Nothing AI touches should be invisible to the landlord after the fact, even the parts they approved.

---

## 8. Technical Architecture

### Stack
- **Backend:** FastAPI (Python) — REST API, async endpoints, Pydantic schemas, JWT-based auth.
- **Frontend:** Next.js (App Router) — two surfaces sharing one codebase where practical:
  - Landlord Dashboard (authenticated, full feature set)
  - Tenant Portal (lightweight, magic-link auth, submission-focused)
- **Async processing:** Celery workers for anything that shouldn't block an API response:
  - Voice note transcription
  - Photo/video analysis for issue extraction
  - AI classification + escalation scoring
  - Contractor outreach (sending + polling for replies across email/SMS/WhatsApp)
  - Scheduled jobs: weekly summary generation, arrears checks, notice-due reminders
- **Broker/cache:** Redis — Celery broker + result backend, plus short-lived caching (session data, rate limiting on the tenant portal to prevent abuse).
- **Database:** PostgreSQL (recommended default — relational fit for leases/units/tenants, plus `pgvector` if RAG retrieval is kept in-database rather than a separate vector store).
- **Object storage:** S3-compatible bucket (e.g., DigitalOcean Spaces, AWS S3) for voice notes, photos, video, and lease documents — never stored directly in Postgres.
- **AI/Agent layer:**
  - Classification + drafting pipeline built with your course's agent patterns; every "action" node in the pipeline is followed by an explicit approval gate before anything external happens (send message, contact contractor, save record).
  - RAG store for: (a) contractor-to-issue-type matching, (b) notice template grounding.
  - Speech-to-text service for voice note transcription; multimodal model pass for photo/video issue extraction.
- **Real-time updates:** WebSocket connection (or polling + SWR/React Query revalidation as a simpler v1) so the landlord dashboard updates live as submissions/contractor replies come in.

### Third-party integrations
| Purpose | Provider |
|---|---|
| Rent payments | PayFast (primary), Ozow/Yoco (secondary, evaluate) |
| SMS/WhatsApp | Twilio or WhatsApp Business API |
| Email in/out | Postmark or SendGrid (+ inbound parsing for email-in fallback) |
| Speech-to-text | Provider-agnostic, swappable |
| AI models | Provider-agnostic interface (Claude/GPT/Gemini) |

### Suggested monorepo layout
```
/apps
  /web        — Next.js (landlord dashboard + tenant portal)
  /api        — FastAPI service
  /worker     — Celery worker(s) + task definitions
/packages
  /shared-types  — Pydantic <-> TS type contracts (e.g., via OpenAPI codegen)
/infra        — deployment config, env templates
```

---

## 9. Data Model (high-level entities)

- **Landlord** — id, contact info, notification preferences, auto-approve thresholds
- **Property** — id, landlord_id, address
- **Unit** — id, property_id, details
- **Tenant** — id, unit_id, contact info, lease_id
- **Lease** — id, tenant_id, unit_id, terms, documents, start/end dates
- **Submission** (maintenance/complaint) — id, tenant_id, unit_id, type, media (voice/photo/video refs), AI classification, urgency, status
- **CommunicationLog** — id, related_entity (submission/tenant/contractor), channel, direction, content, timestamp
- **Contractor** — id, landlord_id, trade, contact channels, notes
- **JobRequest** — id, submission_id, contractor_id(s), status, quotes received
- **Notice** — id, tenant_id, type, template_used, status (draft/sent), sent_at
- **Payment** (Phase 2) — id, tenant_id, amount, status, provider_reference
- **AuditLog** — id, actor (AI/landlord), action, entity, timestamp

---

## 10. Repo & Deployment Strategy

- Base product built as a **GitHub template repository** (native free-tier feature — no paid plan needed to start).
- Per-client repos generated from the template via "Use this template" (clean history, no shared git tree) — one repo per landlord client.
- **Architecture implication to flag:** this repo-per-client approach implies single-tenant deployments (each landlord gets their own instance/DB) rather than one shared multi-tenant SaaS. This is actually a good fit for POPIA data isolation, but plan hosting costs accordingly as the client count grows — worth revisiting if you get past a handful of clients and it becomes cheaper/easier to run one multi-tenant deployment instead.
- GitHub Free covers this fully at current scale (unlimited private repos, unlimited collaborators, 2,000 CI/CD minutes/month).

---

## 11. Compliance & Security Requirements

- **POPIA (Protection of Personal Information Act):** tenant ID numbers, financial data, and images/video of their homes are all personal information under POPIA — data minimization, explicit consent at portal signup, encryption at rest and in transit, and a documented data retention/deletion policy are required, not optional.
- **Rental Housing Act:** any AI-drafted notice (late rent, lease violation) must be checked against current provincial/municipal notice requirements — legal review before any template goes live.
- Contractor and tenant contact data should have the same access-control rigor as tenant data — a leaked contractor list is a smaller but still real exposure.

---

## 12. MVP Scope (Phase 1) — Roadmap

**Phase 1 (MVP — validate the core loop, mostly manual):**
Epics A (text+photo only), B, F, H1, K — a working tenant-submission-to-landlord-inbox loop with clean logging, no AI yet or classification-only AI.

**Phase 2 (AI assist layer):**
Epics C, D, E, G, H2, J, L — drafting, contractor outreach automation, notices, weekly summaries, multi-channel notifications.

**Phase 3 (scale features):**
Epic I (payments), voice/video intake at scale (A1 full), H3 (exports), advanced WhatsApp Business integration.

---

## 13. Open Questions & Risks

1. Single-tenant (repo-per-client) vs. multi-tenant SaaS — revisit once past 3–5 clients.
2. Legal review of notice templates is a hard blocker before Epic G ships to real tenants.
3. Contractor onboarding UX — manual entry vs. bulk import — needs a decision before Epic E build starts.
4. Pricing model — flat fee per unit vs. a fee meaningfully below the 8–10% management-company cost.
5. Which 2 pilot landlords, and what's the smallest feature set they'd actually pay for on day one?

---

## 14. Success Metrics (draft — refine with pilot landlords)

- Landlord-reported time saved per week vs. baseline (target: measurable reduction from the ~8–12 hrs/month/property benchmark).
- % of tenant submissions resolved without the landlord needing to personally coordinate every step.
- Time from submission to first landlord-visible classification/response.
- Landlord retention/renewal after first 3 months (proxy for trust in the AI-assist features).
