# EduSphere Enterprise Gap Analysis

**Date:** 2026-11-17
**Classification:** P0 = critical; P1 = essential; P2 = competitive; P3 = advanced

## P0 Findings

| Feature | Status | Evidence | Problem | Security/Business Impact | Recommended Solution | Acceptance Criteria |
|---|---|---|---|---|---|---|
| Public live-session routes | Fixed tenant predicate; real media lifecycle remains open | `server/src/routes/liveRoutes.ts` now filters public listing/detail through course visibility | Cross-tenant detail is denied; live-room orchestration still incomplete | Potential cross-tenant discovery and false live-feature completeness | Require tenant/visibility predicate, public-safe projection, and real LiveKit lifecycle | **Verified:** anonymous restricted detail returns 403 in the API suite; remaining listing/enrollment/recording tests are still required |
| Public course/search visibility | Partially implemented | `courseRoutes.ts`, `searchRoutes.ts` | Public routes may omit or misapply restricted tenant filters | Restricted catalog leakage | Centralize visibility policy and tenant-aware repository query | Restricted courses fail public, wrong-tenant and unauthenticated tests |
| Assessment/certificate atomicity | Not atomic | `assessmentRoutes.ts`, `certificateRoutes.ts` | Submission and certificate issuance can partial-write | False credentials and duplicate records | MongoDB transaction or attempt-key deduplication with compensating repair | Submission retry yields one attempt/credential or clear pending state |
| Payment/enrollment atomicity | Not atomic | `paymentRoutes.ts`, `courseRoutes.ts` | Webhook can process before or apart from enrollment | Paid users not enrolled or duplicate side effects | Webhook ledger + transaction + idempotent enrollment | Same event/process replay yields exactly one enrollment and immutable audit event |
| Local JWT storage | Mitigated, legacy compatibility retained | `client/src/api/index.ts`, `auth.ts`, `authRoutes.ts` | New login/register/role-switch flows set an HttpOnly cookie; legacy bearer tokens remain accepted | Existing sessions and external clients remain compatible; local-storage migration is complete only after legacy removal | Keep bearer support during migration; add logout clearing and CSP; remove legacy storage after rollout verification | **Verified:** login/register/switch set cookies, logout clears cookie, CSP is emitted, and security/API suites pass |

## P1 Findings

| Feature | Status | Evidence | Problem | Security/Business Impact | Industry Standard | Solution | Acceptance |
|---|---|---|---|---|---|---|---|
| Assignment workflow | Missing | No assignment submission route/model | Learners cannot submit files/text with rubric feedback | Core LMS workflow absent | Submission, rubric, feedback, grade, regrade | Implement assignment models/routes/repository, storage integration and gradebook | End-to-end submit/review/grade/resubmit/revoke flow passes |
| Manual grading | Missing | Auto-grading only in assessment route | Essay/manual work has no instructor update route | Grades cannot be completed | Gradebook/moderation | Add grade records, reviewer, status, audit and notification | Instructor can grade and learner sees revised grade |
| Progress integrity | Weak | Fixed 20% and read-modify-save | Lost updates and false completion | Academic records unreliable | Lesson completion attempts and course formula | Lesson completion collection + atomic upsert + completion calculation | Concurrent updates and direct lesson access cannot inflate progress |
| Live classroom | Shell | `LiveClassroomPage.tsx`, live route/token | No LiveKit participant/media/chat/egress lifecycle | Feature falsely appears complete | Real room join, permissions, attendance, recording | Add LiveKit SDK/webhooks/Egress/chat and reconnection handling | Two-browser real session, reconnection and recording pass |
| Distributed cache/search | Partial | Process-local cache/search | Horizontal replicas diverge | Stale catalogs and search | Redis/shared cache | Provision Redis or remove distributed claims; implement invalidation | Two-instance consistency test passes |
| Event reliability | Partial | `setImmediate` outbox | Lost notification/audit side effects | Operational inconsistency | Durable worker/outbox | Durable dispatcher/retry/DLQ | Failure/replay test proves eventual processing |
| Queue runtime | Mismatched | Mongo queue + worker vs BullMQ requirement | Less mature scheduling/observability | Job stalls and operational coupling | Redis/BullMQ in stack | Decide/document queue and implement BullMQ or keep Mongo with feature-complete compensation | Recovery, duplicate, retry and metrics tests pass |
| Password reset | Partial | Reset route consumes token before password update | Partial failure can burn reset token | Account recovery denial | Atomic consume/update | Transactional or compensating update | Concurrent reset and failed update leave consistent state |
| Storage deletion | Partial | Asset metadata/update and remote delete | Remote orphan or metadata mismatch | Data leakage/operational cost | Delete state and rollback/GC | Durable deletion state plus scheduled reconciliation | Remote failure leaves recoverable asset and no inaccessible public file |
| Analytics | Basic | Admin metrics/dashboard | No learning-outcome/cohort/risk reporting | Weak institutional value | Cohort, course, learner, outcome, export reports | Define metrics, aggregate job and API/UI | Report acceptance tests with tenant boundaries pass |
| Tenant indexes | Partial | Model indexes | Cross-tenant data queries may scan/perform poorly | Cost and latency | Compound tenant/query indexes | Add indexes and migration tests | Explain plans show tenant-leading index usage |
| CI/CD | Missing | No workflow | Changes lack automated gate | Regression risk | PR gates, staging, release evidence | GitHub Actions or equivalent | Build/unit/API/E2E/release gate run on PR and release |

## P2 Findings

- Native mobile application or PWA support.
- Offline lesson/cache and resumable progress sync.
- SMS/push/email notification preferences.
- Complete localization coverage and RTL audit.
- WCAG 2.2 automated and manual accessibility testing.
- LTI/SCORM external provider certification.
- Transcript, program, cohort and term management.
- Rubrics, competency/outcome frameworks and standards alignment.
- Bulk roster, SIS/LDAP/SSO federation and import/export.
- Rate/usage monitoring and operational dashboards.
- Low-bandwidth asset variants and text-first course rendering.

## P3 Findings

- AI tutor/learning assistant with grounding and privacy controls.
- Adaptive learning paths and question recommendations.
- Plagiarism/originality integration.
- Proctored exams and identity verification.
- Credential blockchain/portable verifiable credentials only if institutions require it.
- Gamification, communities and social learning.
- Regional payment integrations and marketplace payouts.
- Advanced recommendation engine.

## Ethiopia and Low-Bandwidth Opportunities

- Amharic/Oromo/English course content and validation with missing-translation fallback.
- Text-first lesson, audio and HLS video quality controls.
- PWA install, offline course outline and local answer drafts.
- Resumable uploads and lower-resolution media profiles.
- Lightweight SMS/email summaries and USSD/payment adapters where viable.
- Institution-hosted and field-deployable operational documentation.

## Priority Sequence

1. P0 tenant/payment/credential/auth integrity fixes.
2. P1 learning-record correctness and live/assignment workflows.
3. P1 distributed operations and observability.
4. P2 accessibility/localization/mobile/reporting.
5. P3 advanced features only after P0/P1 evidence is stable.