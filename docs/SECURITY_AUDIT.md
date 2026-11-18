# EduSphere Security Audit

**Date:** 2026-11-18
**Scope:** Authentication, authorization, tenant isolation, input, uploads, payment, live, media, operations, and frontend storage

## 1. Security Strengths

- bcrypt password hashing and password reset/verification token flows.
- JWT claims include role and tenant identity; token versions provide revocation checks.
- Zod validation for body/query/params and a centralized validation error shape.
- Recursive MongoDB operator/dotted-key sanitization.
- CORS allowlist and security headers.
- Auth and upload-specific rate limits.
- Stripe webhook signature verification and webhook event deduplication.
- Media playback key requests include authentication and authorization middleware.
- Role middleware and institution-confinement checks exist in admin, course, assessment and certificate routes.
- Seeder/seed operations contain production guards.
- HttpOnly, Secure (production), SameSite session cookies are now issued for login, registration, and role switching; bearer authorization remains backward-compatible.
- A restrictive Content-Security-Policy header is applied to API responses.

## 2. Findings

| Severity | Finding | Evidence | Impact | Remediation |
|---|---|---|---|---|
| Critical (mitigated) | JWT in browser local storage | Legacy `edusphere_token` is no longer written by login/register/role-switch flows; legacy bearer support remains for compatibility | Existing or external clients can still place a bearer token in JavaScript storage | Complete cookie-only migration for all supported clients, then remove legacy local-storage behavior |
| High (mitigated) | Public live detail/list routes | `server/src/routes/liveRoutes.ts` | Restricted courses are now filtered by course visibility; real-room lifecycle remains separate | Keep negative tests for authorized and wrong-tenant participants |
| Critical | Public search/tenant discovery | `tenantRoutes.ts`, `searchRoutes.ts` | Tenant or restricted record exposure | Central visibility policy and negative tests |
| High | Multi-document writes lack transactions | Assessment/certificate, payment/enrollment, tenant registration | Partial or inconsistent records | Mongo sessions/transactions and idempotency |
| High | Progress/attendance read-modify-save | `courseRoutes.ts`, `liveRoutes.ts` | Race/lost updates and false completion | Atomic/append-based writes |
| High | Submission retry not unique | `assessmentRoutes.ts`, `Submission` model | Duplicate attempts or unpredictable grading | Add attempt idempotency and latest/attempt policy |
| High | Password reset consumption | `authRoutes.ts` | Failed update can invalidate reset | Transactional consume/update |
| High | Webhook stale lease race | `paymentService.ts`/ledger | Duplicate processing | Atomic lease/processing state and transaction |
| High | Public operational detail | Health and storage telemetry routes | Infrastructure metadata disclosure | Restrict detailed health/telemetry to platform operators |
| Medium | Storage deletion non-atomic | `storageRoutes.ts` | Data retention/orphan inconsistency | Durable deletion status and reconciler |
| Medium | Security-token TTL | Security token model | Stale reset/verify records | TTL index and cleanup tests |
| Medium | QR service external request | `CertificateVerifyPage.tsx` | Privacy/availability dependency | Generate QR locally or remove external dependency |
| Medium | Direct storage download exposure | Signed/public asset logic | Misclassified public assets | Central object ACL and signed URL audit |
| Medium | Missing CSP | Server security headers | XSS defense weaker | Add restrictive CSP after asset/API origin inventory |
| Medium | Missing measured coverage gates | Root/package/CI | Security regression risk | Add coverage/security gates and CI |

## 3. OWASP Review

- **Broken access control:** Tenant and role checks exist but public routes need stronger negative verification. P0 risk.
- **Cryptographic failures:** Password/JWT/Stripe/DRM secrets depend on environment strength and production startup guards. Secret rotation procedures are not fully automated.
- **Injection:** Zod and Mongo sanitize are strong mitigations. Mongoose query construction should continue to avoid raw user predicates.
- **Insecure design:** Partial writes and race-prone updates are primary design defects.
- **Security misconfiguration:** Detailed health/telemetry exposure and Atlas network guidance require validation.
- **Vulnerable/outdated components:** No dependency audit result was included; run `npm audit` and track findings.
- **Authentication failures:** bcrypt and token version checks are strong. Cookie/XSS and MFA remain future work.
- **Data integrity failures:** Repeat submissions, webhook retries and progress updates need stronger atomicity.
- **Logging/monitoring failures:** Audit log exists in source, but SIEM/alerting/SLO evidence is absent.
- **SSRF:** Storage/LiveKit/transcode URL configuration may accept external source URLs; validate host allowlists and private-address blocking.

## 4. Required Security Controls Before Production

1. Cross-tenant tests for every tenant-owned route.
2. Rotate and externally provision all production secrets.
3. Secure HttpOnly cookie or revalidated short-lived token strategy.
4. Content Security Policy and strict CORS.
5. MFA/step-up controls for platform-superadmin operations.
6. Audit logging for login, role switch, tenant status, course publish, grade, revoke, deletion and payout actions.
7. SSRF controls for media source and webhook callback URLs.
8. Object ACL review, signed URL expiry and malware scanning policy.
9. Dependency vulnerability scan and lockfile verification in CI.
10. Incident response, secret rotation, backup restore and rate-limit runbooks.

## 5. Security Acceptance Criteria

- No route can mutate or read a cross-tenant resource as a tenant user.
- Public routes return only explicit public fields.
- Payment, assessment, certificate and enrollment replay tests pass.
- Session theft/rotation tests pass with the final auth mechanism.
- Upload/download/delete tests include MIME, size, private/public and owner boundaries.
- Production detailed health endpoints require operator authorization.
- Audit records exist for every sensitive administrative and academic mutation.
- No live credentials appear in source or test logs.