# EduSphere Repository Inventory

**Status:** Initial evidence-based inventory
**Date:** 2026-11-18
**Scope:** Repository structure, frontend, backend, tests, integrations, deployment, and documentation

## 1. Executive Summary

EduSphere is a monorepo-style React/TypeScript frontend and Express/Mongoose backend with substantial implemented functionality. It is not a simple static prototype: authentication, tenant context, course and enrollment APIs, assessments, certificates, Stripe checkout, storage, LiveKit token minting, and a MongoDB-backed media queue exist in source and have test coverage.

However, the repository should not yet be described as enterprise-production-ready. The largest gaps are live classroom media delivery, repeat-submission and grading integrity, transactional consistency, distributed cache/job design, public-route tenant isolation consistency, accessibility verification, and live external-service verification. Several integrations use explicit production guards and remain blocked until credentials and infrastructure are available.

## 2. Repository Map

| Area | Evidence | Purpose |
|---|---|---|
| Root | `package.json`, `render.yaml`, `Dockerfile.worker`, `.env.example` | Monorepo commands, Render deployment, transcode worker, and environment template |
| Frontend | `client/` | React 18, Vite, TypeScript, React Query, Tailwind, Vitest, and Playwright |
| Backend | `server/` | Express, Mongoose, Zod, Stripe, JWT auth, MongoDB queue, storage and media APIs |
| Scripts | `scripts/`, `server/scripts/`, `server/src/scripts/` | Release gate, smoke testing, backup/restore, seeding, admin operations, and DR checks |
| Tests | `client/src/*.test.tsx`, `client/e2e/*.spec.ts`, `server/tests/**/*.test.ts` | Component, E2E, security, API, MongoDB, queue, DRM, infrastructure, and integration tests |
| Documentation | Root `*.md` | Architecture, remediation, deployment, release-gate, readiness, and verification reports |

## 3. Root Configuration

- `package.json` provides development, build, test, integration, queue, DRM, E2E, and release-gate commands.
- The project requires Node.js 20 or newer.
- `render.yaml` defines a Render web API and Docker transcode worker.
- `Dockerfile.worker` creates an FFmpeg-capable worker image.
- `.env.example`, `server/.env.example`, and `client/.env.example` document required environment families without containing live values.
- No `.github/workflows` or equivalent CI workflow was found in the repository inventory.

## 4. Frontend Inventory

### Entry, routing, and state

- `client/src/main.tsx`: application bootstrap with React Query and application context.
- `client/src/App.tsx`: route map with public, authenticated, and role-gated views.
- `client/src/context/AppContext.tsx`: session, role, navigation, localization, and accessibility preference state.
- `client/src/hooks/useData.ts`: React Query data hooks for courses, dashboard, enrollments, assignments, notifications, and certificates.
- `client/src/api/index.ts`: central browser API wrapper, bearer-token handling, timeouts, and error parsing.

### Frontend routes

- `/`: public landing/catalog
- `/login`, `/register`: authentication
- `/dashboard`: role-aware dashboard
- `/courses`: public catalog
- `/courses/:courseId`: course detail/enrollment/payment
- `/my-courses`: learner course portfolio
- `/teacher-studio`: course authoring
- `/institution/register`: institution onboarding
- `/admin`: platform/institution administration
- `/live-classroom`: live classroom shell
- `/lessons/:lessonId`: lesson player
- `/exams/:assessmentId`: assessment player
- `/verify-certificate`: public certificate verification

### Implemented frontend areas

- Authentication and registration with loading, validation, and error states.
- Role guard and role-aware navigation.
- Catalog search/filter/sort and course detail views.
- Learner dashboard and course portfolio.
- Instructor course-authoring shell and assessment creation.
- Institution registration and document-upload form.
- Public certificate lookup and verification view.
- Reusable UI states and accessibility preference controls.

### Partial or incomplete frontend areas

- Live classroom chat, roster, reactions, attendance, network quality, peer media, and recording are simulated or local UI rather than complete LiveKit media signaling and participant workflows.
- Lesson progress is partly optimistic and depends on backend course/lesson verification that is not complete.
- Assessment timer, visibility handling, and submission have stale-state and cleanup risks.
- Several dashboards hide partial API failures and render empty data.
- The public institution flow contains placeholder verification content.
- Direct storage upload logic is exposed through browser/API coordination.
- Localization dictionaries exist, but full English/Oromo/Amharic call-site and RTL validation was not established.

### Frontend testing

- Vitest component suites exist for app routing, admin, authentication, certificates, catalog, course detail, learner dashboard, and role guards.
- Playwright specifications cover learner, instructor, and admin journeys, but the live staging environment and credentials are required.
- No dedicated unit files were identified for live classroom, lesson player, exam player, my-courses, institution registration, or custom hooks.
- API and component tests commonly mock network behavior rather than exercising a live backend.

## 5. Backend Inventory

### Entry and infrastructure

- `server/src/server.ts`: Express bootstrap, security middleware, tenant context, route mounts, health endpoints, startup initialization, and centralized errors.
- `server/src/config/index.ts`: environment parsing and production secret/database constraints.
- `server/src/middleware/auth.ts`: JWT verification and token-version revocation.
- `server/src/middleware/tenant.ts`: tenant resolution from JWT, host subdomain, and development-only header.
- `server/src/middleware/validate.ts`: Zod body/query/params validation.
- `server/src/middleware/mongoSanitize.ts`: MongoDB operator/dotted-key sanitization.

### Route groups

| Area | Key source | Status |
|---|---|---|
| Authentication | `server/src/routes/authRoutes.ts` | Implemented; bcrypt, JWT, role restrictions, reset and profile flows |
| Tenants | `server/src/routes/tenantRoutes.ts` | Implemented; public registration and platform-admin status changes |
| Courses/enrollment | `server/src/routes/courseRoutes.ts` | Implemented; unique enrollment and visibility barriers, but progress integrity is weak |
| Assessments/grading | `server/src/routes/assessmentRoutes.ts` | Implemented for auto-grading; repeat submission and manual grading gaps |
| Certificates | `server/src/routes/certificateRoutes.ts` | Implemented; verification hash, public lookup, revoke and audit |
| Live sessions | `server/src/routes/liveRoutes.ts` | Token/join/attendance shell; recording lifecycle is incomplete |
| Storage/media | `server/src/routes/storageRoutes.ts`, `server/src/routes/mediaRoutes.ts` | Presigned upload/download, scoped keys, and playback tokens |
| Payments | `server/src/routes/paymentRoutes.ts` | Stripe checkout, webhook signature verification, and webhook deduplication |
| Transcoding/jobs | `server/src/server.ts`, `server/src/queue/jobQueue.ts`, `server/src/worker/transcodeWorker.ts` | MongoDB FIFO queue, leases, retries, stall recovery, and FFmpeg worker |
| Search | `server/src/routes/searchRoutes.ts`, `server/src/search/searchService.ts` | Process-local fuzzy/facet search |
| Admin/support | `server/src/routes/adminRoutes.ts`, `server/src/routes/supportRoutes.ts` | Admin metrics, admissions, and support-ticket APIs |

### Data model

Primary Mongoose models and the data repository are in `server/src/models/index.ts` and `server/src/data/dbRepository.ts`. Relationships include tenant-to-users/courses, course-to-enrollment/assessment/live session/review, learner-to-certificate/submission, and owner-to-file asset.

Unique/compound indexes support critical duplicate prevention in several areas. Gaps remain for tenant compounds on some models, repeat assessment submissions, live-session isolation, and TTL cleanup for security tokens.

### Event/cache/search behavior

- `server/src/cache/cacheService.ts` is process-local TTL/tag cache; it does not provide distributed Redis operations despite Redis configuration being present elsewhere.
- `server/src/cache/mongoChangeStreamWatcher.ts` provides invalidation for Mongo change streams, with replica-set requirements.
- `server/src/events/eventBus.ts` persists outbox records but dispatches via `setImmediate` rather than a durable worker retry loop.
- `server/src/search/searchService.ts` is process-local and startup-indexed.

## 6. Security Inventory

The backend has meaningful controls: bcrypt password hashing, JWT token versions, role middleware, tenant context middleware, Zod validation, Mongo operator sanitization, CORS, security headers, auth and upload rate limits, Stripe webhook verification, and media authorization.

Unresolved security risks include:

- JWT bearer storage in browser `localStorage`.
- Inconsistent tenant predicates on public/detail/live/search routes.
- Transaction gaps across assessment-to-certificate and payment-to-enrollment workflows.
- Races in progress, attendance, queue lease and webhook processing.
- Public or unauthenticated operational/status endpoints that can disclose system metadata.
- Browser-mediated direct upload confirmation and storage deletion rollback gaps.
- No CI evidence and no measured end-to-end coverage threshold.

## 7. Test and Operations Inventory

- Server scripts cover Mongo schema, replica behavior, full enterprise, security, API/tenant isolation, queue concurrency, DRM, and infrastructure.
- Frontend scripts cover Vitest and Playwright.
- `scripts/releaseGate.mjs` invokes a release gate and fail-closes on suite failures.
- MongoDB integration evidence exists, including explicit blocked results for unavailable infrastructure.
- FFmpeg is genuine in the worker image.
- LiveKit token generation exists with HS256 and explicit reachability reporting.
- Stripe and payment webhook code uses the official SDK; live end-to-end payout/checkout verification remains credential-dependent.
- Redis support is custom-protocol/TLS oriented; `bullmq`/`ioredis` are not dependencies and the active transcode queue is MongoDB-based.
- Backup and restore scripts exist for Linux and Windows, plus DR verification tooling.
- No automated CI workflow or scheduled backup validation was found.

## 8. Deployment Inventory

- Render web service: Node API with `/healthz` health check.
- Render worker: Docker image with FFmpeg and transcode worker command.
- Frontend deployment: Cloudflare Pages documented in the staging guide.
- MongoDB is required for ready-state and startup in production-like configuration.
- R2/S3, Resend, LiveKit, Stripe, Redis/TLS, LTI keys, and E2E credentials are external configuration families that require live verification.

## 9. Evidence Quality

This inventory distinguishes source evidence, test evidence, and external verification status:

- **Implemented:** Source and route/model wiring exist.
- **Verified locally:** A relevant test or build command covers behavior.
- **Integration-blocked:** Source exists, but credentials or reachable infrastructure were unavailable.
- **Unknown:** No repository evidence establishes the claim.

Where source reports and repository behavior conflict, this inventory treats source behavior and actual tests as stronger evidence than prose claims.

## 10. Immediate Next Inventory Questions

1. Which public routes can reveal cross-tenant or unapproved catalog data?
2. Where are multi-document writes not transactional?
3. Which live routes remain UI-only rather than actual media workflows?
4. What is the measured test pass/build status at the current workspace state?
5. Which external credentials and domains are actually provisioned versus merely documented?
