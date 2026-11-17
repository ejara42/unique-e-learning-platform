# EduSphere Architecture Audit

**Date:** 2026-11-17
**Evidence:** Repository source and test inventory

## 1. Architecture Summary

EduSphere follows a monorepo-style two-process architecture:

- React 18/Vite frontend with React Query and React Router.
- Express/TypeScript API with Mongoose.
- MongoDB for application state and the media job queue.
- Object storage/R2/S3 for media and documents.
- FFmpeg worker for HLS media processing.
- LiveKit for live-session token generation.
- Stripe for checkout and webhook processing.
- Process-local cache/search plus Mongo change streams and an application outbox.

## 2. Architectural Strengths

- Central frontend API wrapper and React Query boundaries.
- Central Zod validation for API payloads.
- JWT verification and token-version revocation in middleware.
- Tenant context middleware and tenant-aware repository calls in important routes.
- Unique compound indexes for key learner/course relationships.
- Separate worker process and HLS/media route boundaries.
- Health endpoints for liveness and component readiness.
- Backup/restore and disaster-recovery tooling.

## 3. Findings

| ID | Area | Finding | Risk | Priority |
|---|---|---|---|---|
| ARCH-01 | Tenant isolation | Public live/search routes do not consistently scope by tenant or visibility | Cross-tenant discovery/information leakage | P0 |
| ARCH-02 | Transactions | Assessment/certificate, payment/enrollment, reset-password, tenant registration, and other multi-document flows lack transactions | Partial state, duplicate credentials, inconsistent business records | P0 |
| ARCH-03 | Progress | Course progress uses fixed increments and read-modify-save | Lost updates and lesson/course integrity bugs | P1 |
| ARCH-04 | Cache | Cache/search/change-stream behavior is process-local or replica-dependent | Stale or lost invalidation across replicas | P1 |
| ARCH-05 | Events | Outbox dispatch is `setImmediate`-based and marked dispatched without durable retry | Lost notifications and audit side effects | P1 |
| ARCH-06 | Queue | Media queue is MongoDB FIFO with leases, but no BullMQ implementation exists despite the expected stack | Operational mismatch and limited retries/scheduling | P1 |
| ARCH-07 | Live | Live route is authorization/JWT-oriented but not complete media orchestration | False completeness, participant and recording gaps | P1 |
| ARCH-08 | Storage | Remote deletion and metadata update do not form a compensating transaction | Orphaned objects or broken asset records | P1 |
| ARCH-09 | Search | In-memory search loses public-tenant semantics and is not multi-process consistent | Incorrect discovery and stale results | P2 |
| ARCH-10 | Observability | Health endpoints exist, but structured tracing, metrics, alert thresholds and dashboards are not evidenced | Slow incident detection | P1 |
| ARCH-11 | Frontend auth | JWT is stored in `localStorage` | XSS can expose session bearer | P1 |
| ARCH-12 | API contracts | Runtime frontend types are not validated against API schemas | Silent UI state or data-shape failures | P2 |
| ARCH-13 | Separation | Repository, route, validation and domain rules are interleaved in route handlers | Harder testing and security review | P2 |

## 4. Cross-Tenant Data-Flow Review

A tenant is derived from JWT claims, host subdomain, or development-only headers. Authenticated course, enrollment and admin routes frequently use `institutionId`, while public live and search routes require stronger visibility predicates.

Required invariant:

- Every tenant-scoped read or mutation must establish both the requesting principal and the target resource tenant.
- Public resources must be explicitly public and not merely absent an authenticated barrier.
- Platform-superadmin access must be explicit and separately audited.

## 5. Data Integrity Review

Critical data relationships exist, but MongoDB write operations should use transactions for business invariants spanning multiple collections. At minimum, transaction groups are needed for payment-to-enrollment, assessment-submission-to-certificate, institution-registration-to-initial-admin/audit, and reset-password-to-token revocation.

Course progress should be an append/update of lesson completion rather than a fixed percentage mutation. Assessment submission should produce immutable attempts and a single latest/current grade policy.

## 6. Scalability Review

The current architecture can support modest scale, but horizontal scaling is incomplete:

- Process-local cache and search are not shared across instances.
- Change streams require replica-set MongoDB and may be unavailable in some deployments.
- `setImmediate` event dispatch is process-local and not durable.
- Mongo media queue can scale vertically but lacks standard scheduling, backoff and observability semantics.
- Tenant compound indexes are missing for several high-volume reads.

## 7. Recommended Architecture Direction

Keep the existing stack. Add, rather than replace:

1. A tenant-aware repository/data-access policy in every route.
2. MongoDB sessions/transactions for multi-document invariants.
3. Redis/BullMQ as a production job and distributed cache boundary if infrastructure is provisioned.
4. Durable Mongo or queue-backed outbox delivery.
5. LiveKit room SDK, webhooks and Egress integration.
6. Structured telemetry, metrics and alerts.
7. PWA/offline lesson and progress synchronization.

## 8. Acceptance for Architecture Sign-off

- Every tenant-owned collection has an enforced tenant predicate.
- Cross-tenant route tests pass for platform, institution, instructor and learner roles.
- Multi-document workflows are atomic or use explicit compensating operations.
- Cache, search and event behavior are consistent under two API replicas.
- Queue behavior survives worker restart, duplicates and process failure.
- Production readiness can be measured through health, metrics and release-gate evidence.