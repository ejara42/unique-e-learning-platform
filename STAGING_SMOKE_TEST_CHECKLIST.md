# EduSphere — Staging Smoke Test Checklist

> **Execute this checklist in order after completing STAGING_DEPLOYMENT_GUIDE.md.**  
> Each test must produce a clear PASS or FAIL result before moving to the next phase.  
> Do not skip tests. A FAIL must be resolved before proceeding.

---

## Infrastructure Readiness

### T-01: Backend Health Probe

```
GET https://edusphere-api.onrender.com/healthz
```

| Check | Expected | Result |
|:---|:---|:---:|
| HTTP status code | `200 OK` | ⬜ |
| Response body contains `status` | `"ok"` | ⬜ |
| Response body contains `uptime` | Numeric seconds > 0 | ⬜ |

---

### T-02: API Diagnostic Health

```
GET https://edusphere-api.onrender.com/api/health
```

| Check | Expected | Result |
|:---|:---|:---:|
| HTTP status code | `200 OK` | ⬜ |
| `database.connected` | `true` | ⬜ |
| `status` | `"ONLINE"` | ⬜ |
| `environment` | `"production"` | ⬜ |
| `multiTenancy.mode` | `"AsyncLocalStorage Logical Partitioning"` | ⬜ |
| `liveKit.configured` | `true` (if LiveKit configured) | ⬜ |

**PASS condition:** All checks ✅  
**FAIL condition:** `database.connected: false` → Diagnose Atlas URI and network access.

---

### T-03: SPA Routing — Direct URL Navigation

Open browser, go directly to:
```
https://unique-e-learning-platform.pages.dev/login
```

| Check | Expected | Result |
|:---|:---|:---:|
| Page loads | Login form renders | ⬜ |
| Press F5 (hard refresh) | Page still renders login form | ⬜ |
| HTTP status | Not 404 | ⬜ |

**FAIL condition:** 404 Not Found → Verify `client/public/_redirects` deployed correctly.

---

### T-04: CORS Validation

Open browser DevTools → Network tab. Navigate to `https://unique-e-learning-platform.pages.dev/login`.

| Check | Expected | Result |
|:---|:---|:---:|
| No CORS errors in browser console | Console clean of CORS-related errors | ⬜ |
| Preflight OPTIONS for API requests succeeds | 204 or 200 with `access-control-allow-origin` header | ⬜ |
| `access-control-allow-origin` value | Exact Cloudflare Pages domain | ⬜ |

---

## Authentication

### T-05: User Registration

From the frontend, click **Get Started** / **Register**. Fill in:
- Full Name: `Test Learner`
- Email: `testlearner@staging.local`
- Password: `TestPass123!`
- Role: Student

| Check | Expected | Result |
|:---|:---|:---:|
| Registration request returns HTTP 201 | User created | ⬜ |
| JWT token returned | `edusphere_token` stored in localStorage | ⬜ |
| User redirected to learner dashboard | Dashboard visible with user's name | ⬜ |
| Demo credentials not present | No prepopulated demo credentials visible | ⬜ |

---

### T-06: User Login / Logout

Log out. Then log back in with the credentials created in T-05.

| Check | Expected | Result |
|:---|:---|:---:|
| Login returns HTTP 200 | Token issued | ⬜ |
| User role displayed | `STUDENT` | ⬜ |
| Logout clears token | `edusphere_token` removed from localStorage | ⬜ |
| Post-logout navigation | Redirected to landing page or login | ⬜ |

---

### T-07: SuperAdmin Login

Log in with the administrator credentials from the bootstrap step.

| Check | Expected | Result |
|:---|:---|:---:|
| Login succeeds | HTTP 200, token returned | ⬜ |
| Role displayed | `PLATFORM_ADMIN` | ⬜ |
| Admin dashboard accessible | Institution management, metrics, audit logs visible | ⬜ |
| Student cannot access admin routes | 403 when student attempts `/admin` routes via direct API call | ⬜ |

---

### T-08: Unauthorized Access Barrier

Using Postman or `curl`, attempt to access a protected route without a token:

```bash
curl -X GET https://edusphere-api.onrender.com/api/admin/metrics
```

| Check | Expected | Result |
|:---|:---|:---:|
| Response status | `401 Unauthorized` | ⬜ |
| Response body | Error message (not HTML, not 500) | ⬜ |

---

## Multi-Tenancy & Institution Management

### T-09: Institution Registration

From the frontend (as SuperAdmin), navigate to institution management. Alternatively, use the API directly:

```bash
POST /api/tenants/register
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "name": "Staging Test University",
  "slug": "staging-test-university",
  "type": "UNIVERSITY",
  "contactEmail": "contact@staging-test.edu"
}
```

| Check | Expected | Result |
|:---|:---|:---:|
| Institution created | HTTP 201, tenant ID returned | ⬜ |
| Institution appears in admin dashboard | Listed in institutions table | ⬜ |
| Status | `PENDING_VERIFICATION` initially | ⬜ |

---

### T-10: Tenant Isolation Verification

Create a second institution. Create one student in each. Confirm via API that:

```bash
GET /api/courses?tenantId=<tenant-1-id>
Authorization: Bearer <tenant-2-student-token>
```

| Check | Expected | Result |
|:---|:---|:---:|
| Tenant 2 student cannot see Tenant 1 institution-restricted courses | Empty or filtered list | ⬜ |
| No cross-tenant data exposure in responses | Response contains only relevant tenant data | ⬜ |

---

## Core Learning Workflows

### T-11: Course Catalog

Navigate to the course catalog from the learner dashboard.

| Check | Expected | Result |
|:---|:---|:---:|
| Courses loaded from API | HTTP 200, courses array non-empty | ⬜ |
| Course cards render correctly | Title, category, level, instructor visible | ⬜ |
| Search/filter works | Results update when filtering by category | ⬜ |
| No hardcoded demo course IDs in response | Courses are real database records | ⬜ |

---

### T-12: Course Enrollment

Click on a course from the catalog, then enroll.

| Check | Expected | Result |
|:---|:---|:---:|
| `POST /api/courses/:id/enroll` returns 201 | Enrollment record created | ⬜ |
| Course appears in **My Courses** | Enrollment visible with progress 0% | ⬜ |
| Double-enrollment blocked | Second enroll returns 409 Conflict | ⬜ |

---

### T-13: Lesson Player

From My Courses, open a course and start a lesson.

| Check | Expected | Result |
|:---|:---|:---:|
| Lesson player page renders | Video/content area visible | ⬜ |
| `PATCH /api/courses/:id/progress` called | Progress tracking request sent | ⬜ |
| Lesson navigation works | Next/previous lesson advances correctly | ⬜ |

---

### T-14: Assessment / Exam

If a course has an assessment, start the exam.

| Check | Expected | Result |
|:---|:---|:---:|
| Exam player loads questions | Questions rendered correctly | ⬜ |
| Submission processes | `POST /api/assessments/:id/submit` returns score | ⬜ |
| Passing score generates certificate | Certificate URL returned in response | ⬜ |
| Anti-cheating telemetry recorded | Tab-switch events logged (if implemented) | ⬜ |

---

### T-15: Certificate Verification

After obtaining a certificate, copy its verification code and test the public verify endpoint.

```
GET /api/certificates/verify/<code>
```

| Check | Expected | Result |
|:---|:---|:---:|
| Certificate found | `valid: true` | ⬜ |
| Certificate data returned | Learner name, course, issue date visible | ⬜ |
| Invalid code rejected | `valid: false`, not a 500 error | ⬜ |
| Public access (no auth required) | Works without Authorization header | ⬜ |

---

## File Operations

### T-16: Cloudflare R2 / S3 Presigned Upload & Download

Request a presigned upload URL:

```bash
POST /api/storage/presigned-upload
Authorization: Bearer <instructor-or-admin-token>
Content-Type: application/json

{
  "fileName": "lecture1_notes.pdf",
  "fileType": "application/pdf",
  "fileSize": 1048576,
  "category": "COURSE_MATERIAL"
}
```

| Check | Expected | Result |
|:---|:---|:---:|
| Upload URL generated | HTTP 200, contains `X-Amz-Signature` and `assetId` | ⬜ |
| Tenant key prefix | Key contains `tenants/<tenantId>/course_material/...` | ⬜ |
| Confirm upload | `POST /api/storage/confirm-upload` activates asset to `READY` | ⬜ |
| Authorized download | `GET /api/storage/download/:assetId` returns presigned download URL | ⬜ |
| Cross-tenant barrier | Accessing Tenant A asset with Tenant B credentials returns HTTP 403 | ⬜ |

---

## Background Jobs

### T-17: Video Transcoding Job Queue

Trigger a transcoding job via the API:

```bash
POST /api/transcode/enqueue
Content-Type: application/json
Authorization: Bearer <instructor-or-admin-token>

{
  "courseId": "course-1",
  "lessonId": "lesson-1"
}
```

| Check | Expected | Result |
|:---|:---|:---:|
| Job accepted | HTTP 202, job ID returned | ⬜ |
| Poll job status | `GET /api/transcode/:jobId` returns `COMPLETED` within 5 seconds (simulated) | ⬜ |
| HLS manifest endpoint works | `GET /api/transcode/hls/course-1/lesson-1/master.m3u8` returns valid `#EXTM3U` content | ⬜ |
| Health endpoint reflects transcoding mode | `mediaTranscoding.mode` = `STANDALONE_EMBEDDED_WORKER` (if no Redis) | ⬜ |

> ℹ️ Jobs are simulated in-process. They survive the request cycle but are lost on process restart. This is expected staging behavior.

---

## Live Classrooms

### T-18: LiveKit Token Minting

As an instructor, create or join a live session:

```bash
POST /api/live-sessions/:id/join
Authorization: Bearer <instructor-token>
```

| Check | Expected | Result |
|:---|:---|:---:|
| Token returned | JWT token in response | ⬜ |
| `wsUrl` returned | Matches `LIVEKIT_URL` env var | ⬜ |
| Token is well-formed JWT | Three dot-separated Base64 segments | ⬜ |
| Actual video/audio stream | ⚠️ Only works if LiveKit SFU is configured and reachable | ⬜ |

---

## Payments

### T-19: Stripe Checkout (Test Mode)

From the course detail page, attempt payment on a paid course. Stripe will only function properly when the **real `sk_test_*` key** is set.

| Check | Expected | Result |
|:---|:---|:---:|
| Checkout session created | Response contains `paymentUrl` | ⬜ |
| Platform fee calculation | 15% of course price | ⬜ |
| Stripe test card (4242 4242 4242 4242) | Completes payment in Stripe test mode | ⬜ |
| Webhook received and processed | Render logs show checkout completion without signature error | ⬜ |
| Enrollment created after payment | Learner enrolled in course after webhook processed | ⬜ |

---

## Security Regression

### T-20: Privilege Escalation Attempt

Attempt to register a new user with `role: "PLATFORM_ADMIN"` via the API:

```bash
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "Attacker",
  "email": "attacker@evil.com",
  "password": "Attack123!",
  "role": "PLATFORM_ADMIN"
}
```

| Check | Expected | Result |
|:---|:---|:---:|
| Request rejected | HTTP 400 or 403, not 201 | ⬜ |
| User NOT created as admin | If created, role is `STUDENT`, not `PLATFORM_ADMIN` | ⬜ |

---

### T-21: JWT Tampering Attempt

Take a valid student JWT, decode the payload, change `activeRole` to `PLATFORM_ADMIN`, re-encode with an invalid signature, and call:

```bash
GET /api/admin/metrics
Authorization: Bearer <tampered-token>
```

| Check | Expected | Result |
|:---|:---|:---:|
| Request rejected | HTTP 401 or 403 | ⬜ |
| Server does not expose internal error details | Response is generic error message | ⬜ |

---

---

## Transactional Email & Password Recovery

### T-23: Single-Use Password Reset Flow

1. Dispatch password reset:
```bash
POST /api/auth/forgot-password
Content-Type: application/json

{ "email": "testlearner@staging.local" }
```
2. Verify HTTP 200 response with generic message (no user enumeration).
3. Retrieve token from Resend dashboard (or test database).
4. Reset password:
```bash
POST /api/auth/reset-password
Content-Type: application/json

{ "token": "<raw-token>", "newPassword": "NewSecurePassword123!" }
```
5. Attempt second reset with identical token (replay attack).

| Check | Expected | Result |
|:---|:---|:---:|
| Forgot password dispatch | HTTP 200, generic confirmation | ⬜ |
| Valid token reset | HTTP 200, password updated | ⬜ |
| Replay rejection | HTTP 400 (`already used password reset token`) | ⬜ |
| Login with new password | HTTP 200, authentication succeeds | ⬜ |

---

## Dedicated Transcoding Worker

### T-24: Dedicated Background Worker & Multi-Bitrate HLS Output

Enqueue a job and observe processing:
```bash
POST /api/transcode/enqueue
Content-Type: application/json
Authorization: Bearer <instructor-token>

{ "courseId": "course-1", "lessonId": "lesson-video-1", "sourceUrl": "https://storage.edusphere.io/raw/video.mp4" }
```

| Check | Expected | Result |
|:---|:---|:---:|
| Job enqueued in BullMQ | HTTP 202, job status `QUEUED` | ⬜ |
| Duplicate protection | Re-enqueue returns same active `jobId` | ⬜ |
| Worker transcode | Job transitions `PROCESSING` -> `COMPLETED` | ⬜ |
| HLS Master Playlist | Returns valid RFC 8216 manifest with 1080p, 720p, 480p, 360p renditions | ⬜ |
| Temp directory cleanup | Local workspace cleaned up after transcode | ⬜ |

---

## Graceful Shutdown

### T-22: SIGTERM Handling

> This test requires Render access. Trigger a manual re-deploy while the API is serving requests.

| Check | Expected | Result |
|:---|:---|:---:|
| In-flight requests complete | No abrupt 502 errors during deploys | ⬜ |
| Render logs show clean shutdown | `[EduSphere] Received SIGTERM. Shutting down gracefully...` visible | ⬜ |
| MongoDB disconnected cleanly | `[EduSphere DB] Disconnected from MongoDB` in logs | ⬜ |

---

## Summary Scorecard

| Category | Tests | Pass | Fail | Skip |
|:---|:---:|:---:|:---:|:---:|
| Infrastructure | T-01 to T-04 | | | |
| Authentication & Recovery | T-05 to T-08, T-23 | | | |
| Multi-Tenancy | T-09 to T-10 | | | |
| Learning Workflows | T-11 to T-15 | | | |
| File Operations (R2) | T-16 | | | |
| Background Jobs & Worker | T-17, T-24 | | | |
| Live Classrooms | T-18 | | | |
| Payments | T-19 | | | |
| Security | T-20 to T-21 | | | |
| Operations | T-22 | | | |
| **TOTAL** | **24** | | | |

---

## Known Staging Environment Characteristics

| Test | Behavior | Classification | Resolution Path |
|:---|:---|:---:|:---|
| T-18 (Live Video Stream) | A/V stream requires running LiveKit SFU reachable by client | Staging Integration | Confirm `LIVEKIT_URL` is configured with active LiveKit Cloud project |
| T-19 (Stripe Live Payout) | Real Stripe Connect payouts need verified instructor accounts | Live Mode Only | Use Stripe test card `4242...` for automated checkout verification |

