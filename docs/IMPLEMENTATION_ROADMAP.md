# EduSphere Implementation Roadmap

**Date:** 2026-11-17
**Basis:** Repository evidence and enterprise gap analysis

## Working Principles

- Make P0 integrity fixes before new feature work.
- Preserve existing working routes and data shapes.
- Add idempotency and transactions before expanding workflows.
- Validate each stage with focused tests and builds.
- Do not claim external integrations complete until live credentials are exercised.
- Obtain approval before destructive database migrations or production data changes.

## Phase 0: Baseline and Gate

1. Create CI for build, unit, security, API, integration and release gate.
2. Capture current test/build counts and coverage thresholds.
3. Resolve route inventory mismatches and stale report claims.
4. Add structured logging and deployment trace identifiers.

## Phase P0: Critical Integrity and Isolation

1. Central tenant/visibility policy module.
2. Add public/live/search negative isolation tests.
3. Add transaction and idempotency for assessment/certificate issuance.
4. Add transaction/idempotency for payment webhook/enrollment.
5. Add progress lesson-completion model and atomic updates.
6. Move JWT to secure HttpOnly cookie or document a short-lived in-memory strategy.
7. Restrict detailed health/telemetry outputs.
8. Add SSRF/private-address protection for transcode/source URLs.

## Phase P1: Essential Learning Workflows

1. Assignment submission model and routes.
2. Rubric and manual grading workflow.
3. Gradebook and regrade audit trail.
4. Assessment attempts, policy and immutable submission records.
5. LiveKit room SDK join, chat, attendance, reconnection and recording lifecycle.
6. Notification model and durable delivery worker.
7. Course draft/publish/review lifecycle and owner-scoped teacher API.
8. Distributed cache/search or explicit removal of unavailable Redis/BullMQ claims.
9. Durable outbox dispatcher and dead-letter handling.
10. Storage reconciler and deleted-object lifecycle.

## Phase P1: Institutional Operations

1. Program, term, cohort and section models.
2. Institution admin roster and bulk enrollment.
3. Role/permission matrix with fine-grained course and institution scopes.
4. Institution and platform reporting exports.
5. Audit log search and event immutability.
6. Tenant onboarding workflow and verification.

## Phase P2: Usability and Scale

1. Complete Amharic, Oromo and English UI copy audit.
2. RTL/Unicode/accessibility review and automated WCAG checks.
3. PWA/offline learning shell and resumable answer drafts.
4. Low-bandwidth media profiles and text-first fallback.
5. Mobile responsive workflow review for all role surfaces.
6. LMS analytics: completion, engagement, cohorts and at-risk learners.
7. Redis/BullMQ production deployment and dashboards.
8. LTI 1.3 real issuer/key/session testing and SCORM package ingestion/scoring.
9. Stripe Connect account, onboarding and payout reconciliation if marketplace model remains.

## Phase P3: Advanced Differentiation

1. Competency/adaptive learning maps.
2. AI tutor with content grounding, tenant isolation and privacy controls.
3. Plagiarism/proctoring integrations.
4. Native mobile applications if PWA adoption warrants them.
5. Regional payments and SMS/USSD integrations.
6. Advanced recommendation and learning analytics.

## First Implementation Slice

The first code slice should be tenant and data-integrity focused:

- Prove and fix public live and search tenant predicates.
- Introduce idempotency for payment and assessment outcomes.
- Add focused cross-tenant and replay tests.
- Add progress completion records without migrating existing data destructively.

## Verification by Stage

- Unit and focused route tests after each slice.
- Build frontend and backend before broader test suites.
- Cross-tenant API suite on every authorization change.
- Integration tests only against real or explicitly unavailable external infrastructure.
- E2E tests against a staging environment with test credentials.
- Release gate before environment promotion.

## Exit Criteria

P0/P1 work is complete only when source, tests, deployment evidence and known limitations agree. UI presence alone is not completion evidence.