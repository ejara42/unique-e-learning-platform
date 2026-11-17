# EduSphere Known Limitations

**Date:** 2026-11-17

## 1. Feature Limitations

- Live classroom UI is more complete than real WebRTC collaboration. Chat, attendance, network quality and roster behavior are not yet a verified LiveKit participant lifecycle.
- Recording is only a route/UI state; LiveKit Egress integration is not evidenced.
- Assignment submission, rubric, grading and feedback are not complete learning workflows.
- Manual essay grading and gradebook revision routes are missing.
- Assessment attempts are not uniquely constrained and repeat-submission semantics are incomplete.
- Course progress is fixed-increment and race-prone rather than lesson-completion-driven.
- Payment payout to instructors/tenants is not implemented; checkout is not a complete marketplace settlement workflow.
- Native mobile applications do not exist; the repository provides responsive web behavior only.
- LMS reporting is mostly dashboard metrics rather than outcome/cohort/export analytics.
- Offline and low-bandwidth learning are design opportunities, not complete product capabilities.

## 2. Integration Limitations

- Redis is a custom protocol client; Redis-backed cache and BullMQ are not fully established.
- The active queue is MongoDB-backed despite BullMQ being in the intended stack.
- R2/S3 and Resend require live credentials and domain/bucket configuration.
- Stripe live checkout/payout reconciliation remains unverified.
- LiveKit room join, chat, Egress and recording require live credentials and SDK integration.
- LTI 1.3 and SCORM routes exist but external Canvas/Blackboard/provider certification is unverified.
- `BULLMQ`/Redis process assumptions should not be used in readiness claims.

## 3. Security Limitations

- JWT in `localStorage` is exposed to XSS theft risk.
- Public live/search routes need stronger explicit tenant visibility tests.
- Several multi-document writes are not transactional.
- Detailed health/telemetry should be restricted from public access.
- CSP, MFA, IP/device controls and formal incident/secret rotation runbooks are incomplete.
- A dependency vulnerability baseline is not pinned in this document; run CI scanning before release.

## 4. Localization and Accessibility Limitations

- English, Amharic and Oromo dictionaries exist, plus Arabic/French.
- Full call-site translation coverage is not audited.
- RTL behavior and complex UI layouts are not verified.
- Automated and manual WCAG 2.2 testing is not present.
- Low-bandwidth, screen-reader and keyboard-only journeys are not release-tested.

## 5. Testing Limitations

- Component tests mock many API calls and do not prove backend/database behavior.
- E2E tests require live credentials and staging environment.
- No dedicated assignment, live classroom, lesson, exam or institution unit suite was identified.
- No load/performance suite or accessibility suite was identified.
- No CI workflow is present in the repository.
- External integration failures may be reported as blocked rather than pass.

## 6. Operational Limitations

- No live SLA/SLO/SIEM/alert dashboard evidence.
- Scheduled backup and restore validation is not CI-integrated.
- Replica consistency and change-stream behavior depend on MongoDB topology.
- Horizontal cache/search/event behavior is not proven.
- Local process outbox dispatch can lose in-flight work during process failure.

## 7. Conditions for Updating This Report

Add/remove entries only after source and executable verification exist. Integration features remain limited until credentials and real deployed workflows are tested. A UI route, DTO, or mock is not sufficient to mark a limitation resolved.